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
    ios_udid="$(<"$target_file")"
    target_args=(--udid "$ios_udid")
    ;;
  *) fail "Platform must be 'android' or 'ios'." ;;
esac

agent_device() {
  AGENT_DEVICE_SESSION="$session_name" "$agent_device_bin" "$@" "${target_args[@]}"
}

mkdir -p "$PROJECT_ROOT/.vrt/report"
artifacts_root="$PROJECT_ROOT/.vrt/agent-device/$platform"

# The daemon log is the only record of what a hung command was waiting on, and
# the session's runner.log holds the XCTest runner's build and start output.
save_agent_device_logs() {
  local state_dir
  state_dir="$("$agent_device_bin" session state-dir 2>/dev/null)" || return 0
  mkdir -p "$artifacts_root"
  cp "$state_dir/daemon.log" "$artifacts_root/" 2>/dev/null || true
  find "$state_dir/sessions/$session_name" -name '*.log' -type f \
    -exec cp {} "$artifacts_root/" \; 2>/dev/null || true
}

if [[ "$platform" == "ios" ]]; then
  # Without the approval setup writes, a cold deep link stops at an "Open in
  # PlainText?" prompt and fails in ways that look like a slow launch.
  approved_app="$(xcrun simctl spawn "$ios_udid" defaults read \
    com.apple.launchservices.schemeapproval \
    "com.apple.CoreSimulator.CoreSimulatorBridge-->$VRT_APP_SCHEME" 2>/dev/null || true)"
  [[ "$approved_app" == "$VRT_APP_ID" ]] || fail \
    "The simulator has not approved '$VRT_APP_SCHEME' deep links for $VRT_APP_ID. Run 'yarn vrt ios setup'."
  # Building the XCTest runner usually takes 1-2 minutes, but a slow CI runner
  # outlasted agent-device's default 240 s budget.
  if ! agent_device prepare ios-runner --timeout 600000; then
    save_agent_device_logs
    fail "Could not prepare the iOS runner. Logs: $artifacts_root"
  fi
  # The first launch after install is the slowest. Pay it here with a plain
  # launch, which agent-device retries, so it doesn't count against the cold
  # deep link below.
  agent_device open "$VRT_APP_ID" --relaunch --timeout 60000
  agent_device wait 'id="vrt-screen"' 30000 >/dev/null
  agent_device close >/dev/null
fi

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

# Runs a command, killing it after the given number of seconds. macOS has no
# `timeout`; an alarm set before exec survives it.
run_bounded() {
  local seconds="$1"
  shift
  perl -e 'alarm shift; exec @ARGV or die "exec: $!\n"' "$seconds" "$@"
}

# A failed iOS open closes agent-device's session before it can capture the
# screen ("Screen: unavailable (no-session)"), so take the evidence from the
# simulator itself. SpringBoard's log says why a launch was refused or timed out.
save_ios_failure_evidence() {
  local dir="$1"
  mkdir -p "$dir"
  xcrun simctl io "$ios_udid" screenshot "$dir/failure.png" >/dev/null 2>&1 || true
  run_bounded 60 xcrun simctl spawn "$ios_udid" log show --last 3m --style compact \
    --predicate 'process == "SpringBoard" OR process == "CoreSimulatorBridge" OR process == "PlainTextExample"' \
    > "$dir/system.log" 2>&1 || true
}

# iOS runs the cold deep link itself rather than through vrt-deep-link-cold.ad:
# agent-device gives `simctl openurl` a fixed 15 s with no retry, which cold
# launches on CI exceed. The check is that the link, starting the app, reaches
# the capture screen, so openurl's exit status is only logged.
run_ios_cold_deep_link() {
  local dir="$1" status=0 started openurl_s
  mkdir -p "$dir"
  xcrun simctl terminate "$ios_udid" "$VRT_APP_ID" >/dev/null 2>&1 || true
  started=$SECONDS
  run_bounded 60 xcrun simctl openurl "$ios_udid" "$deep_link" > "$dir/openurl.log" 2>&1 || status=$?
  openurl_s=$((SECONDS - started))
  if [[ "$status" != "0" ]]; then
    printf 'simctl openurl exited %s after %ss; checking the screen anyway:\n' "$status" "$openurl_s" >&2
    sed 's/^/  /' "$dir/openurl.log" >&2
  fi
  # Without --relaunch this binds the session to the app the link started. If the
  # link never started it, this launches it plainly and the wait fails, as it
  # should: after clear-app-state, only the link can reach the capture screen.
  agent_device open "$VRT_APP_ID" --timeout 60000 >/dev/null &&
    agent_device wait "id=\"$capture_id\"" 30000 >/dev/null &&
    agent_device wait stable 200 5000 >/dev/null || return 1
  # openurl's time shows how close cold launches run to agent-device's 15 s.
  printf '✓ cold deep link (openurl %ss, screen %ss)\n' "$openurl_s" "$((SECONDS - started - openurl_s))"
}

run_cold_attempt() {
  local run="$1" dir="$artifacts_root/cold-$1" status=0
  if [[ "$platform" == "android" ]]; then
    run_e2e_test vrt-deep-link-cold "cold-$run" --retries 1
    return
  fi
  run_ios_cold_deep_link "$dir" || status=$?
  [[ "$status" == "0" ]] || save_ios_failure_evidence "$dir"
  agent_device close >/dev/null 2>&1 || true
  return "$status"
}

# Each cold run starts from cleared app state. On Android it also gets a fresh
# retry budget, since a hung attempt ends agent-device's own retries. Cold and
# warm run separately so a cold hang can't keep the warm test from reporting.
cold_runs=3
cold_passed=0
for run in $(seq 1 "$cold_runs"); do
  close_stale_sessions
  agent_device settings clear-app-state "$VRT_APP_ID"
  if run_cold_attempt "$run"; then
    cold_passed=1
    break
  fi
  printf 'Cold deep-link run %s/%s failed.\n' "$run" "$cold_runs" >&2
done

close_stale_sessions
warm_passed=0
if run_e2e_test vrt-deep-link-warm warm --retries 2; then
  warm_passed=1
elif [[ "$platform" == "ios" ]]; then
  save_ios_failure_evidence "$artifacts_root/warm"
fi

if [[ "$cold_passed" != "1" || "$warm_passed" != "1" ]]; then
  save_agent_device_logs
  fail "Deep-link e2e failed (cold passed: $cold_passed, warm passed: $warm_passed). Artifacts: $artifacts_root"
fi
