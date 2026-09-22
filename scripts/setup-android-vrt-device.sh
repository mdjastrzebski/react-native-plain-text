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

android_sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
[[ -n "$android_sdk_root" ]] || fail \
  "ANDROID_HOME or ANDROID_SDK_ROOT must identify the Android SDK."
adb="$android_sdk_root/platform-tools/adb"
[[ -x "$adb" ]] || fail "adb not found at $adb."

serial="${ANDROID_SERIAL:-}"
if [[ -z "$serial" ]]; then
  while read -r candidate; do
    candidate_name="$($adb -s "$candidate" emu avd name 2>/dev/null | sed -n '1p' | tr -d '\r')"
    if [[ "$candidate_name" == "$ANDROID_AVD_NAME" ]]; then
      serial="$candidate"
      break
    fi
  done < <("$adb" devices | awk '$1 ~ /^emulator-/ && $2 == "device" { print $1 }')
fi
if [[ -z "$serial" ]]; then
  serial="$($SCRIPT_DIR/start-android-vrt-emulator.sh)"
  # The start script logs progress before printing the serial. Keep its last line.
  serial="$(tail -n 1 <<< "$serial")"
fi

"$adb" -s "$serial" get-state >/dev/null
actual_avd_name="$($adb -s "$serial" emu avd name 2>/dev/null | sed -n '1p' | tr -d '\r')"
[[ "$actual_avd_name" == "$ANDROID_AVD_NAME" ]] || fail \
  "ANDROID_SERIAL '$serial' is '$actual_avd_name', expected '$ANDROID_AVD_NAME'."
actual_api_level="$($adb -s "$serial" shell getprop ro.build.version.sdk | tr -d '\r')"
[[ "$actual_api_level" == "$ANDROID_API_LEVEL" ]] || fail \
  "Android API $ANDROID_API_LEVEL is required, but '$serial' runs API $actual_api_level."

system_image_architecture="$ANDROID_SYSTEM_IMAGE_ARCHITECTURE"
[[ "$system_image_architecture" != "unsupported" ]] || fail \
  "Unsupported Android VRT host: $(uname -s)-$(uname -m)."
source_properties="$android_sdk_root/system-images/android-$ANDROID_API_LEVEL/$ANDROID_SYSTEM_IMAGE_TARGET/$system_image_architecture/source.properties"
[[ -f "$source_properties" ]] || fail "System image metadata not found at $source_properties."
actual_revision="$(sed -n 's/^Pkg.Revision=//p' "$source_properties")"
[[ "$actual_revision" == "$ANDROID_SYSTEM_IMAGE_REVISION" ]] || fail \
  "Android system image revision $ANDROID_SYSTEM_IMAGE_REVISION is required, but revision $actual_revision is installed."

device_adb=("$adb" -s "$serial")
[[ "$("${device_adb[@]}" shell getprop sys.boot_completed | tr -d '\r')" == "1" ]] || fail \
  "Android emulator '$serial' has not completed booting."
"${device_adb[@]}" shell wm size "$ANDROID_RESOLUTION"
"${device_adb[@]}" shell wm density "$ANDROID_DENSITY"
"${device_adb[@]}" shell settings put system font_scale "$ANDROID_FONT_SCALE"
"${device_adb[@]}" shell settings put system accelerometer_rotation 0
"${device_adb[@]}" shell settings put system user_rotation 0
"${device_adb[@]}" shell wm user-rotation lock 0
"${device_adb[@]}" shell settings put global window_animation_scale 0
"${device_adb[@]}" shell settings put global transition_animation_scale 0
"${device_adb[@]}" shell settings put global animator_duration_scale 0
"${device_adb[@]}" shell settings put secure spell_checker_enabled 0
"${device_adb[@]}" shell settings put secure ui_night_mode 1
"${device_adb[@]}" shell cmd uimode night no >/dev/null
"${device_adb[@]}" shell settings put system system_locales "$ANDROID_LOCALE"
"${device_adb[@]}" shell cmd alarm set-timezone "$ANDROID_TIMEZONE"
"${device_adb[@]}" shell input keyevent KEYCODE_WAKEUP
"${device_adb[@]}" shell wm dismiss-keyguard

# API 36 can briefly restore sensor rotation while System UI finishes booting.
# Require the locked state to remain observable before handing the device off.
rotation_deadline=$((SECONDS + 15))
rotation_stable_reads=0
while ((SECONDS < rotation_deadline)); do
  accelerometer_rotation="$("${device_adb[@]}" shell settings get system accelerometer_rotation | tr -d '\r')"
  user_rotation="$("${device_adb[@]}" shell settings get system user_rotation | tr -d '\r')"
  if [[ "$accelerometer_rotation" == "0" && "$user_rotation" == "0" ]]; then
    rotation_stable_reads=$((rotation_stable_reads + 1))
    if [[ "$rotation_stable_reads" -eq 3 ]]; then
      break
    fi
  else
    rotation_stable_reads=0
    "${device_adb[@]}" shell wm user-rotation lock 0
  fi
  sleep 1
done
[[ "$rotation_stable_reads" -eq 3 ]] || fail \
  "Android rotation did not remain locked at ROTATION_0."

appearance_deadline=$((SECONDS + 15))
appearance_stable_reads=0
while ((SECONDS < appearance_deadline)); do
  night_mode="$("${device_adb[@]}" shell cmd uimode night 2>/dev/null | tr -d '\r' | awk -F ': ' '/Night mode/ { print $2 }')"
  if [[ "$night_mode" == "no" ]]; then
    appearance_stable_reads=$((appearance_stable_reads + 1))
    if [[ "$appearance_stable_reads" -eq 3 ]]; then
      break
    fi
  else
    appearance_stable_reads=0
    "${device_adb[@]}" shell settings put secure ui_night_mode 1
    "${device_adb[@]}" shell cmd uimode night no >/dev/null
  fi
  sleep 1
done
[[ "$appearance_stable_reads" -eq 3 ]] || fail \
  "Android appearance did not remain in light mode."

actual_resolution="$("${device_adb[@]}" shell wm size | tr -d '\r' | awk -F ': ' '/Physical size|Override size/ { value = $2 } END { print value }')"
actual_density="$("${device_adb[@]}" shell wm density | tr -d '\r' | awk -F ': ' '/Physical density|Override density/ { value = $2 } END { print value }')"
actual_font_scale="$("${device_adb[@]}" shell settings get system font_scale | tr -d '\r')"
actual_locale="$("${device_adb[@]}" shell settings get system system_locales | tr -d '\r')"
actual_timezone="$("${device_adb[@]}" shell getprop persist.sys.timezone | tr -d '\r')"
[[ "$actual_resolution" == "$ANDROID_RESOLUTION" ]] || fail \
  "Android resolution is '$actual_resolution', expected '$ANDROID_RESOLUTION'."
[[ "$actual_density" == "$ANDROID_DENSITY" ]] || fail \
  "Android density is '$actual_density', expected '$ANDROID_DENSITY'."
[[ "$actual_font_scale" == "$ANDROID_FONT_SCALE" ]] || fail \
  "Android font scale is '$actual_font_scale', expected '$ANDROID_FONT_SCALE'."
[[ "$actual_locale" == "$ANDROID_LOCALE" ]] || fail \
  "Android locale is '$actual_locale', expected '$ANDROID_LOCALE'."
[[ "$actual_timezone" == "$ANDROID_TIMEZONE" ]] || fail \
  "Android timezone is '$actual_timezone', expected '$ANDROID_TIMEZONE'."

mkdir -p "$PROJECT_ROOT/build/vrt/devices"
printf '%s\n' "$serial" > "$PROJECT_ROOT/build/vrt/devices/android-serial"
printf 'Android VRT device is ready: %s (%s).\n' "$actual_avd_name" "$serial"
