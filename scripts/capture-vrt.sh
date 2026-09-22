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

agent_device() {
  AGENT_DEVICE_SESSION="$session_name" "$agent_device_bin" "$@" "${target_args[@]}"
}

close_session() {
  if [[ "$session_open" == "1" ]]; then
    agent_device close >/dev/null 2>&1 || true
  fi
}
trap close_session EXIT

yarn del-cli "$actual_dir"
mkdir -p "$actual_dir"

while read -r capture_platform capture_id extra; do
  [[ -z "$capture_platform" || "$capture_platform" == "#"* ]] && continue
  [[ -z "$extra" ]] || fail "Invalid capture manifest line for '$capture_id'."
  [[ "$capture_platform" == "all" || "$capture_platform" == "$platform" ]] || continue

  printf 'Capturing %s\n' "$capture_id"
  deep_link="$VRT_APP_SCHEME://vrt?testID=$capture_id"
  agent_device open "$VRT_APP_ID" "$deep_link" --foreground >/dev/null
  session_open=1
  agent_device wait "id=\"$capture_id\"" 15000 >/dev/null
  agent_device wait stable 200 5000 >/dev/null
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
