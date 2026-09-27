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

# Puts the booted VRT device at VRT_SUITE's system text size, so the suites can
# run one after another without a full setup in between. When the size changes,
# the app is stopped: the example's MainActivity handles fontScale changes itself,
# and a running app keeps the text size it started with on either platform.
platform="${1:-}"
case "$platform" in
  android)
    android_sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
    [[ -n "$android_sdk_root" ]] || fail \
      "ANDROID_HOME or ANDROID_SDK_ROOT must identify the Android SDK."
    serial_file="$PROJECT_ROOT/.vrt/devices/android-serial"
    [[ -f "$serial_file" ]] || fail "Run 'yarn vrt android setup' first."
    device_adb=("$android_sdk_root/platform-tools/adb" -s "$(<"$serial_file")")
    current="$("${device_adb[@]}" shell settings get system font_scale | tr -d '\r')"
    [[ "$current" == "$ANDROID_FONT_SCALE" ]] && exit 0
    "${device_adb[@]}" shell settings put system font_scale "$ANDROID_FONT_SCALE"
    "${device_adb[@]}" shell am force-stop "$VRT_APP_ID"
    printf 'Android font scale: %s -> %s\n' "$current" "$ANDROID_FONT_SCALE"
    ;;
  ios)
    udid_file="$PROJECT_ROOT/.vrt/devices/ios-udid"
    [[ -f "$udid_file" ]] || fail "Run 'yarn vrt ios setup' first."
    udid="$(<"$udid_file")"
    current="$(xcrun simctl ui "$udid" content_size)"
    [[ "$current" == "$IOS_CONTENT_SIZE" ]] && exit 0
    xcrun simctl ui "$udid" content_size "$IOS_CONTENT_SIZE"
    xcrun simctl terminate "$udid" "$VRT_APP_ID" 2>/dev/null || true
    printf 'iOS content size: %s -> %s\n' "$current" "$IOS_CONTENT_SIZE"
    ;;
  *) fail "Platform must be 'android' or 'ios'." ;;
esac
