#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=./vrt-config.sh
source "$SCRIPT_DIR/vrt-config.sh"

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

case "$ANDROID_EMULATOR_HEADLESS" in
  0 | 1) ;;
  *) fail "ANDROID_EMULATOR_HEADLESS must be '0' or '1'." ;;
esac

find_android_sdk() {
  if [[ -n "${ANDROID_HOME:-}" ]]; then
    printf '%s\n' "$ANDROID_HOME"
  elif [[ -n "${ANDROID_SDK_ROOT:-}" ]]; then
    printf '%s\n' "$ANDROID_SDK_ROOT"
  elif [[ -d "$HOME/Library/Android/sdk" ]]; then
    printf '%s\n' "$HOME/Library/Android/sdk"
  elif [[ -d "$HOME/Android/Sdk" ]]; then
    printf '%s\n' "$HOME/Android/Sdk"
  else
    fail "Android SDK not found. Set ANDROID_HOME or ANDROID_SDK_ROOT."
  fi
}

find_sdk_tool() {
  local tool="$1"
  local candidate

  if command -v "$tool" >/dev/null 2>&1; then
    command -v "$tool"
    return
  fi

  for candidate in \
    "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/$tool" \
    "$ANDROID_SDK_ROOT/cmdline-tools/bin/$tool" \
    "$ANDROID_SDK_ROOT/tools/bin/$tool"; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return
    fi
  done

  fail "$tool not found. Install Android SDK Command-line Tools."
}

ANDROID_SDK_ROOT="$(find_android_sdk)"
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export ANDROID_SDK_ROOT
export PATH="$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$PATH"

sdkmanager="$(find_sdk_tool sdkmanager)"
avdmanager="$(find_sdk_tool avdmanager)"
emulator="$ANDROID_SDK_ROOT/emulator/emulator"
adb="$ANDROID_SDK_ROOT/platform-tools/adb"

[[ -x "$emulator" ]] || fail "Android Emulator not found at $emulator."
[[ -x "$adb" ]] || fail "adb not found at $adb."

has_android_device_type() {
  "$avdmanager" list device \
    | grep -Fi -- "or \"$ANDROID_DEVICE_TYPE\"" >/dev/null
}

if ! has_android_device_type; then
  printf 'Android device profile %s is not installed. Updating Android SDK Command-line Tools...\n' \
    "$ANDROID_DEVICE_TYPE"
  "$sdkmanager" --install "cmdline-tools;latest"

  avdmanager="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/avdmanager"
  [[ -x "$avdmanager" ]] || fail \
    "avdmanager was not installed at $avdmanager."

  has_android_device_type || fail \
    "Android device profile '$ANDROID_DEVICE_TYPE' is unavailable after updating cmdline-tools;latest."
fi

if ! "$sdkmanager" --list_installed | grep -F "$ANDROID_SYSTEM_IMAGE" >/dev/null; then
  printf 'Installing %s...\n' "$ANDROID_SYSTEM_IMAGE"
  "$sdkmanager" "$ANDROID_SYSTEM_IMAGE"
fi

if ! "$avdmanager" list avd | grep -F "Name: $ANDROID_AVD_NAME" >/dev/null; then
  printf 'Creating AVD %s...\n' "$ANDROID_AVD_NAME"
  printf 'no\n' | "$avdmanager" create avd \
    --force \
    --name "$ANDROID_AVD_NAME" \
    --package "$ANDROID_SYSTEM_IMAGE" \
    --device "$ANDROID_DEVICE_TYPE"
fi

find_running_serial() {
  local avd_name
  local serial

  while read -r serial; do
    avd_name="$("$adb" -s "$serial" emu avd name 2>/dev/null | sed -n '1p' | tr -d '\r')"
    if [[ "$avd_name" == "$ANDROID_AVD_NAME" ]]; then
      printf '%s\n' "$serial"
      return
    fi
  done < <("$adb" devices | awk '$1 ~ /^emulator-/ && $2 == "device" { print $1 }')
}

running_serial="$(find_running_serial)"

if [[ -z "$running_serial" ]]; then
  emulator_args=(
    -avd "$ANDROID_AVD_NAME"
    -gpu auto
    -no-boot-anim
    -no-snapshot-save
    -prop "persist.sys.locale=$ANDROID_LOCALE"
    -skin "$ANDROID_RESOLUTION"
    -timezone "$ANDROID_TIMEZONE"
    -wipe-data
  )

  if [[ "$ANDROID_EMULATOR_HEADLESS" == "1" ]]; then
    emulator_args+=(-no-window -noaudio)
  fi

  printf 'Starting AVD %s...\n' "$ANDROID_AVD_NAME"
  "$emulator" "${emulator_args[@]}" \
    >/tmp/react-native-plain-text-vrt-emulator.log 2>&1 &

  for _ in {1..60}; do
    running_serial="$(find_running_serial)"
    [[ -n "$running_serial" ]] && break
    sleep 2
  done
fi

[[ -n "$running_serial" ]] || fail "No running Android emulator was found."

printf 'Waiting for %s to finish booting...\n' "$running_serial"
for _ in {1..120}; do
  if [[ "$("$adb" -s "$running_serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
    "$adb" -s "$running_serial" shell wm size "$ANDROID_RESOLUTION"
    "$adb" -s "$running_serial" shell wm density "$ANDROID_DENSITY"
    "$adb" -s "$running_serial" shell settings put system font_scale "$ANDROID_FONT_SCALE"
    "$adb" -s "$running_serial" shell settings put system accelerometer_rotation 0
    "$adb" -s "$running_serial" shell settings put system user_rotation 0
    "$adb" -s "$running_serial" shell settings put global window_animation_scale 0
    "$adb" -s "$running_serial" shell settings put global transition_animation_scale 0
    "$adb" -s "$running_serial" shell settings put global animator_duration_scale 0
    "$adb" -s "$running_serial" shell cmd uimode night no
    "$adb" -s "$running_serial" shell settings put system system_locales "$ANDROID_LOCALE"
    "$adb" -s "$running_serial" shell cmd alarm set-timezone "$ANDROID_TIMEZONE"
    printf 'Android VRT emulator is ready: %s (%s)\n' "$ANDROID_AVD_NAME" "$running_serial"
    printf 'Profile: %s, %s, %s at %s dpi, font scale %s, %s, %s\n' \
      "$ANDROID_VRT_PROFILE" \
      "$ANDROID_RUNTIME" \
      "$ANDROID_RESOLUTION" \
      "$ANDROID_DENSITY" \
      "$ANDROID_FONT_SCALE" \
      "$ANDROID_LOCALE" \
      "$ANDROID_TIMEZONE"
    exit 0
  fi
  sleep 2
done

fail "Android emulator did not finish booting. See /tmp/react-native-plain-text-vrt-emulator.log."
