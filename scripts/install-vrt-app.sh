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
case "$platform" in
  android)
    serial_file="$PROJECT_ROOT/build/vrt/devices/android-serial"
    apk="$PROJECT_ROOT/build/vrt/apps/android/app-release.apk"
    [[ -f "$serial_file" ]] || fail "Run 'yarn vrt android setup' first."
    [[ -f "$apk" ]] || fail "Run 'yarn vrt android build' first."
    "$SCRIPT_DIR/vrt-app-state.sh" verify-artifact android
    android_serial="$(<"$serial_file")"
    android_sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
    [[ -n "$android_sdk_root" ]] || fail \
      "ANDROID_HOME or ANDROID_SDK_ROOT must identify the Android SDK."
    adb="$android_sdk_root/platform-tools/adb"
    [[ -x "$adb" ]] || fail "adb not found at $adb."
    "$adb" -s "$android_serial" install -r "$apk"
    "$adb" -s "$android_serial" shell pm path "$VRT_APP_ID" >/dev/null
    ;;
  ios)
    udid_file="$PROJECT_ROOT/build/vrt/devices/ios-udid"
    app="$PROJECT_ROOT/build/vrt/apps/ios/PlainTextExample.app"
    [[ -f "$udid_file" ]] || fail "Run 'yarn vrt ios setup' first."
    [[ -d "$app" ]] || fail "Run 'yarn vrt ios build' first."
    "$SCRIPT_DIR/vrt-app-state.sh" verify-artifact ios
    ios_udid="$(<"$udid_file")"
    xcrun simctl install "$ios_udid" "$app"
    xcrun simctl get_app_container "$ios_udid" "$VRT_APP_ID" app >/dev/null
    ;;
  *) fail "Platform must be 'android' or 'ios'." ;;
esac

"$SCRIPT_DIR/vrt-app-state.sh" mark-installed "$platform"
printf '%s VRT application installed.\n' "$platform"
