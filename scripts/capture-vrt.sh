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
manifest="$PROJECT_ROOT/.agent-device/vrt-captures.txt"
actual_dir="$PROJECT_ROOT/build/vrt/actual/$platform"
session_name="plaintext-vrt-capture-$platform"
session_open=0
agent_device_bin="$PROJECT_ROOT/node_modules/.bin/agent-device"

"$SCRIPT_DIR/vrt-app-state.sh" verify-installed "$platform"
[[ -x "$agent_device_bin" ]] || fail "agent-device is not installed. Run 'yarn'."
[[ -f "$manifest" ]] || fail "Capture manifest not found at $manifest."
case "$platform" in
  android)
    target_file="$PROJECT_ROOT/build/vrt/devices/android-serial"
    [[ -f "$target_file" ]] || fail "Run 'yarn vrt android setup' first."
    target_args=(--platform android --serial "$(<"$target_file")")
    ;;
  ios)
    target_file="$PROJECT_ROOT/build/vrt/devices/ios-udid"
    [[ -f "$target_file" ]] || fail "Run 'yarn vrt ios setup' first."
    target_args=(--platform ios --udid "$(<"$target_file")")
    ;;
  *) fail "Platform must be 'android' or 'ios'." ;;
esac

# Refresh the metadata that comparison binds to these captures. Keeping this in
# the capture stage makes a standalone capture as trustworthy as the full VRT
# workflow, without making the cheap compare stage require a running device.
"$SCRIPT_DIR/verify-vrt-environment.sh" "$platform" >/dev/null

agent_device() {
  AGENT_DEVICE_SESSION="$session_name" "$agent_device_bin" "$@" "${target_args[@]}"
}

# shellcheck source=./vrt-appduct.sh
source "$SCRIPT_DIR/vrt-appduct.sh"

close_session() {
  appduct_disconnect || true
  if [[ "$session_open" == "1" ]]; then
    agent_device close >/dev/null 2>&1 || true
  fi
}
trap close_session EXIT

yarn del-cli "$actual_dir"
mkdir -p "$actual_dir"

# One Appduct session for the whole run: the specimen is switched in-process with the
# `show_specimen` tool instead of opening a deep link per capture.
appduct_connect "$platform"

while read -r capture_platform capture_id extra; do
  [[ -z "$capture_platform" || "$capture_platform" == "#"* ]] && continue
  [[ -z "$extra" ]] || fail "Invalid capture manifest line for '$capture_id'."
  [[ "$capture_platform" == "all" || "$capture_platform" == "$platform" ]] || continue

  printf 'Capturing %s\n' "$capture_id"
  session_open=1
  rendered=0
  # First try rides the stage's session. A specimen swap can lag one accessibility refresh
  # behind, or the long run can wedge the app's JS thread (the socket stays "active", so
  # that is not detectable from the daemon) — on a retry, relaunch a fresh app via a full
  # reconnect rather than only when the session has actually dropped.
  for attempt in 1 2 3; do
    if [[ "$attempt" == "1" ]]; then
      appduct_is_active || appduct_connect "$platform" || true
    else
      printf 'Recovering with a fresh app before %s (attempt %s).\n' "$capture_id" "$attempt" >&2
      appduct_connect "$platform" || true
    fi
    appduct_invoke show_specimen "{\"testID\":\"$capture_id\"}" >/dev/null 2>&1 || true
    if agent_device wait "id=\"$capture_id\"" 15000 >/dev/null 2>&1 &&
      agent_device wait stable 200 5000 >/dev/null 2>&1; then
      rendered=1
      break
    fi
    printf 'Specimen %s did not settle (attempt %s).\n' "$capture_id" "$attempt" >&2
  done
  [[ "$rendered" == "1" ]] || fail "Specimen '$capture_id' never rendered."
  screenshot_command=(
    screenshot
    "$actual_dir/$capture_id.png"
    --crop-on "id=\"$capture_id\""
  )
  if [[ "$platform" == "ios" ]]; then
    screenshot_command+=(--pixel-density 3)
  fi
  agent_device "${screenshot_command[@]}" >/dev/null
done < "$manifest"

agent_device close >/dev/null
session_open=0
printf 'VRT captures: %s\n' "$actual_dir"
