#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=./vrt-config.sh
source "$SCRIPT_DIR/vrt-config.sh"
# shellcheck source=./load-android-vrt-config.sh
source "$SCRIPT_DIR/load-android-vrt-config.sh"

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

android_sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
[[ -n "$android_sdk_root" ]] || fail \
  "ANDROID_HOME or ANDROID_SDK_ROOT must identify the Android SDK."

adb="$android_sdk_root/platform-tools/adb"
[[ -x "$adb" ]] || fail "adb not found at $adb."

running_serial="${ANDROID_SERIAL:-}"
if [[ -z "$running_serial" ]]; then
  while read -r serial; do
    running_avd_name="$($adb -s "$serial" emu avd name 2>/dev/null | sed -n '1p' | tr -d '\r')"
    if [[ "$running_avd_name" == "$ANDROID_AVD_NAME" ]]; then
      running_serial="$serial"
      break
    fi
  done < <("$adb" devices | awk '$1 ~ /^emulator-/ && $2 == "device" { print $1 }')
fi

[[ -n "$running_serial" ]] || fail \
  "The configured Android emulator '$ANDROID_AVD_NAME' is not running."
"$adb" -s "$running_serial" get-state >/dev/null

device_adb=("$adb" -s "$running_serial")
"${device_adb[@]}" shell wm size "$ANDROID_RESOLUTION"
"${device_adb[@]}" shell wm density "$ANDROID_DENSITY"
"${device_adb[@]}" shell settings put system font_scale "$ANDROID_FONT_SCALE"
"${device_adb[@]}" shell settings put system accelerometer_rotation 0
"${device_adb[@]}" shell settings put system user_rotation 0
"${device_adb[@]}" shell settings put global window_animation_scale 0
"${device_adb[@]}" shell settings put global transition_animation_scale 0
"${device_adb[@]}" shell settings put global animator_duration_scale 0
"${device_adb[@]}" shell cmd uimode night no
"${device_adb[@]}" shell settings put system system_locales "$ANDROID_LOCALE"
"${device_adb[@]}" shell cmd alarm set-timezone "$ANDROID_TIMEZONE"

printf 'Configured Android VRT device %s: %s at %s dpi, font scale %s, %s, %s.\n' \
  "$running_serial" \
  "$ANDROID_RESOLUTION" \
  "$ANDROID_DENSITY" \
  "$ANDROID_FONT_SCALE" \
  "$ANDROID_LOCALE" \
  "$ANDROID_TIMEZONE"
