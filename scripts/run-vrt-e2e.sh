#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=./vrt-config.sh
source "$SCRIPT_DIR/vrt-config.sh"

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

platform="${1:-}"
capture_id="${VRT_E2E_CAPTURE_ID:-vrt-features-font-size-48}"
deep_link="$VRT_APP_SCHEME://vrt?testID=$capture_id"
session_name="plaintext-vrt-e2e-$platform"
agent_device_bin="$PROJECT_ROOT/node_modules/.bin/agent-device"

"$SCRIPT_DIR/vrt-app-state.sh" verify-installed "$platform"
# A capture leaves the device at its suite's text size, so put it back at this
# suite's before checking the environment.
"$SCRIPT_DIR/apply-vrt-text-size.sh" "$platform"
"$SCRIPT_DIR/verify-vrt-environment.sh" "$platform"
[[ -x "$agent_device_bin" ]] || fail "agent-device is not installed. Run 'yarn'."

case "$platform" in
  android)
    target_file="$PROJECT_ROOT/.vrt/devices/android-serial"
    [[ -f "$target_file" ]] || fail "Run 'yarn vrt android setup' first."
    target_args=(--serial "$(<"$target_file")")
    ;;
  ios)
    target_file="$PROJECT_ROOT/.vrt/devices/ios-udid"
    [[ -f "$target_file" ]] || fail "Run 'yarn vrt ios setup' first."
    target_args=(--udid "$(<"$target_file")")
    ;;
  *) fail "Platform must be 'android' or 'ios'." ;;
esac

agent_device() {
  AGENT_DEVICE_SESSION="$session_name" "$agent_device_bin" "$@" "${target_args[@]}"
}

if [[ "$platform" == "ios" ]]; then
  # Without the approval setup writes, a cold deep link stops at an "Open in
  # PlainText?" prompt and fails in ways that look like a slow launch.
  approved_app="$(xcrun simctl spawn "$(<"$target_file")" defaults read \
    com.apple.launchservices.schemeapproval \
    "com.apple.CoreSimulator.CoreSimulatorBridge-->$VRT_APP_SCHEME" 2>/dev/null || true)"
  [[ "$approved_app" == "$VRT_APP_ID" ]] || fail \
    "The simulator has not approved '$VRT_APP_SCHEME' deep links for $VRT_APP_ID. Run 'yarn vrt ios setup'."
  agent_device prepare ios-runner
  # The first app launch on a freshly booted simulator is slow enough that
  # `simctl openurl` gives up ("failed to open", operation timed out) even though
  # the app opens. Pay that once here with a plain launch; later cold launches
  # take about a second.
  agent_device open "$VRT_APP_ID" --relaunch --timeout 60000
  agent_device wait 'id="vrt-screen"' 30000 >/dev/null
  agent_device close >/dev/null
fi
mkdir -p "$PROJECT_ROOT/.vrt/report"
artifacts_root="$PROJECT_ROOT/.vrt/agent-device/$platform"

# A passing cold attempt takes under 30 s, so this only bounds a hang.
attempt_timeout_ms=90000

run_e2e_test() {
  local name="$1" report="$2"
  shift 2
  agent_device test "$PROJECT_ROOT/.agent-device/$name.ad" \
    --env "VRT_APP_ID=$VRT_APP_ID" \
    --env "VRT_DEEP_LINK=$deep_link" \
    --env "VRT_CAPTURE_ID=$capture_id" \
    --artifacts-dir "$artifacts_root/$report" \
    --report-junit "$PROJECT_ROOT/.vrt/report/$platform-e2e-$report.xml" \
    --timeout "$attempt_timeout_ms" \
    "$@"
}

# A timed-out attempt whose command ignores the cancel (a hung cold open) is an
# infrastructure failure to agent-device: it stops retrying and leaves that
# attempt's session open on the device. Close such leftovers before a new run.
close_stale_sessions() {
  local sessions name
  sessions="$("$agent_device_bin" session list --json 2>/dev/null)" || return 0
  while IFS= read -r name; do
    [[ -n "$name" ]] || continue
    printf 'Closing stale session %s\n' "$name" >&2
    AGENT_DEVICE_SESSION="$name" "$agent_device_bin" close "${target_args[@]}" >/dev/null 2>&1 || true
  done < <(
    printf '%s' "$sessions" | node -e '
      const prefix = process.argv[1] + ":";
      let input = "";
      process.stdin.on("data", (chunk) => (input += chunk));
      process.stdin.on("end", () => {
        const sessions = JSON.parse(input).data?.sessions ?? [];
        for (const { name } of sessions) if (name?.startsWith(prefix)) console.log(name);
      });
    ' "$session_name" 2>/dev/null
  )
}

# The daemon log is the only record of what a hung command was waiting on.
save_daemon_log() {
  local state_dir
  state_dir="$("$agent_device_bin" session state-dir 2>/dev/null)" || return 0
  [[ -f "$state_dir/daemon.log" ]] || return 0
  mkdir -p "$artifacts_root"
  cp "$state_dir/daemon.log" "$artifacts_root/daemon.log" || true
}

# The cold launch stays intermittently slow, and a hung attempt ends
# agent-device's own retries, so each run here starts from cleared state with a
# fresh retry budget. Cold and warm run separately so a cold hang can't keep the
# warm test from reporting.
cold_runs=3
cold_passed=0
for run in $(seq 1 "$cold_runs"); do
  close_stale_sessions
  agent_device settings clear-app-state "$VRT_APP_ID"
  if run_e2e_test vrt-deep-link-cold "cold-$run" --retries 1; then
    cold_passed=1
    break
  fi
  printf 'Cold deep-link run %s/%s failed.\n' "$run" "$cold_runs" >&2
done

close_stale_sessions
warm_passed=0
run_e2e_test vrt-deep-link-warm warm --retries 2 && warm_passed=1

if [[ "$cold_passed" != "1" || "$warm_passed" != "1" ]]; then
  save_daemon_log
  fail "Deep-link e2e failed (cold passed: $cold_passed, warm passed: $warm_passed). Artifacts: $artifacts_root"
fi
