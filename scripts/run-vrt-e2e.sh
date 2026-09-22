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
  # A fresh simulator asks for confirmation the first time a custom-scheme URL
  # opens a stopped app. Accept that one-time prompt before testing cold launch.
  agent_device open "$VRT_APP_ID" "$deep_link" --relaunch >/dev/null
  agent_device alert accept >/dev/null 2>&1 || true
  agent_device close >/dev/null
fi
agent_device settings clear-app-state "$VRT_APP_ID"
mkdir -p "$PROJECT_ROOT/build/vrt/report"
agent_device test \
  "$PROJECT_ROOT/.agent-device/vrt-deep-link-cold.ad" \
  "$PROJECT_ROOT/.agent-device/vrt-deep-link-warm.ad" \
  --env "VRT_APP_ID=$VRT_APP_ID" \
  --env "VRT_DEEP_LINK=$deep_link" \
  --env "VRT_CAPTURE_ID=$capture_id" \
  --artifacts-dir "$PROJECT_ROOT/build/vrt/agent-device/$platform" \
  --report-junit "$PROJECT_ROOT/build/vrt/report/$platform-e2e.xml" \
  --retries 1 \
  --fail-fast
