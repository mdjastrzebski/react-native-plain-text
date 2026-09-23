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
capture_id="${VRT_E2E_CAPTURE_ID:-vrt-capture-features-font-size-48}"
deep_link="$VRT_APP_SCHEME://vrt?testID=$capture_id"
session_name="plaintext-vrt-e2e-$platform"
agent_device_bin="$PROJECT_ROOT/node_modules/.bin/agent-device"

"$SCRIPT_DIR/vrt-app-state.sh" verify-installed "$platform"
"$SCRIPT_DIR/verify-vrt-environment.sh" "$platform"
[[ -x "$agent_device_bin" ]] || fail "agent-device is not installed. Run 'yarn'."

case "$platform" in
  android)
    target_file="$PROJECT_ROOT/build/vrt/devices/android-serial"
    [[ -f "$target_file" ]] || fail "Run 'yarn vrt android setup' first."
    target_args=(--serial "$(<"$target_file")")
    ;;
  ios)
    target_file="$PROJECT_ROOT/build/vrt/devices/ios-udid"
    [[ -f "$target_file" ]] || fail "Run 'yarn vrt ios setup' first."
    target_args=(--udid "$(<"$target_file")")
    ;;
  *) fail "Platform must be 'android' or 'ios'." ;;
esac

agent_device() {
  AGENT_DEVICE_SESSION="$session_name" "$agent_device_bin" "$@" "${target_args[@]}"
}

if [[ "$platform" == "ios" ]]; then
  agent_device prepare ios-runner
  # A fresh simulator gates the first custom-scheme deep link behind a one-time
  # "Open in app?" confirmation dialog. Until it is accepted, launching
  # "$deep_link" on a stopped app fails with "Simulator device failed to open".
  # Disarm that dialog before the cold test exercises it, then require the app to
  # reach the deep-link screen so the "always open" choice is committed before we
  # clear app state.
  #
  # Each attempt arms the scheme with a cold open (that is what surfaces the
  # dialog) but confirms over the warm foreground path, the same open every
  # capture uses: once the app is running it delivers the URL through the 'url'
  # event reliably, whereas the very first launch right after accepting the
  # dialog can drop the URL and render every specimen instead of the requested
  # one. The genuinely cold deep link is still exercised, with its own retries,
  # by vrt-deep-link-cold.ad below. Retry so one slow or URL-dropping launch
  # cannot hard-fail the job the way a single unguarded wait did.
  #
  # Every attempt is logged rather than sent to /dev/null. This stage gates the
  # whole job, so a run that exhausts the budget has to say what the simulator
  # actually did on each attempt.
  diagnostics_dir="$PROJECT_ROOT/build/vrt/agent-device/$platform/prewarm"
  mkdir -p "$diagnostics_dir"
  armed=0
  for attempt in 1 2 3; do
    attempt_log="$diagnostics_dir/attempt-$attempt.log"
    {
      printf '=== attempt %s: cold open\n' "$attempt"
      agent_device open "$VRT_APP_ID" "$deep_link" --relaunch --timeout 30000 ||
        printf 'cold open exited %s\n' "$?"
      printf '=== attempt %s: confirmation dialog\n' "$attempt"
      # The dialog is armed by a cold open on a simulator that has never accepted
      # this scheme, so it is either up within a moment or not coming. An unaccepted
      # dialog surfaces as the wait below failing, not as this one timing out.
      if agent_device alert wait 1500; then
        agent_device alert accept || printf 'alert accept exited %s\n' "$?"
      else
        printf 'no alert to accept\n'
      fi
      printf '=== attempt %s: warm open\n' "$attempt"
      agent_device open "$VRT_APP_ID" "$deep_link" --foreground --timeout 30000 ||
        printf 'warm open exited %s\n' "$?"
      printf '=== attempt %s: wait for %s\n' "$attempt" "$capture_id"
      agent_device wait "id=\"$capture_id\"" 20000
    } > "$attempt_log" 2>&1 && armed=1 && break
    printf 'Prewarm attempt %s did not reach %s; see %s\n' "$attempt" "$capture_id" "$attempt_log" >&2
  done
  if [[ "$armed" != "1" ]]; then
    tail -n 40 "$diagnostics_dir/attempt-3.log" >&2 || true
    agent_device screenshot "$diagnostics_dir/failure.png" || true
    fail "iOS deep-link pre-warm never reached '$capture_id'; cold launch is not armed. Logs: $diagnostics_dir"
  fi
  agent_device close >/dev/null
fi
agent_device settings clear-app-state "$VRT_APP_ID"
mkdir -p "$PROJECT_ROOT/build/vrt/report"
# The cold deep-link launch stays intermittently slow even once the confirmation
# dialog is disarmed, so keep a retry budget. Without --fail-fast a cold failure
# still lets the independent warm test run, so a flake never hides its result.
agent_device test \
  "$PROJECT_ROOT/.agent-device/vrt-deep-link-cold.ad" \
  "$PROJECT_ROOT/.agent-device/vrt-deep-link-warm.ad" \
  --env "VRT_APP_ID=$VRT_APP_ID" \
  --env "VRT_DEEP_LINK=$deep_link" \
  --env "VRT_CAPTURE_ID=$capture_id" \
  --artifacts-dir "$PROJECT_ROOT/build/vrt/agent-device/$platform" \
  --report-junit "$PROJECT_ROOT/build/vrt/report/$platform-e2e.xml" \
  --timeout 180000 \
  --retries 2
