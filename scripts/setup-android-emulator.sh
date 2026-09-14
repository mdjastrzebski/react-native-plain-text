#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=./vrt-config.sh
source "$SCRIPT_DIR/vrt-config.sh"
# shellcheck source=./android-sdk-packages.sh
source "$SCRIPT_DIR/android-sdk-packages.sh"

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

sdk_tool_candidates() {
  local tool="$1"
  local candidate

  for candidate in \
    "$ANDROID_SDK_ROOT/cmdline-tools/latest/bin/$tool" \
    "$ANDROID_SDK_ROOT"/cmdline-tools/latest-*/bin/"$tool" \
    "$ANDROID_SDK_ROOT"/cmdline-tools/*/bin/"$tool" \
    "$ANDROID_SDK_ROOT/cmdline-tools/bin/$tool" \
    "$ANDROID_SDK_ROOT/tools/bin/$tool"; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
    fi
  done

  command -v "$tool" 2>/dev/null || true
}

find_sdk_tool() {
  local tool="$1"
  local candidate

  while IFS= read -r candidate; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return
    fi
  done < <(sdk_tool_candidates "$tool")

  fail "$tool not found. Install Android SDK Command-line Tools."
}

install_sdk_package() {
  local sdkmanager_path="$1"
  shift
  local status

  # sdkmanager may prompt for licenses that are not covered by the runner's
  # preinstalled Android license files (for example, ARM system images).
  # Disable pipefail just for this pipeline because yes is expected to receive
  # SIGPIPE once sdkmanager has read all the answers it needs.
  set +o pipefail
  yes | "$sdkmanager_path" --install "$@"
  status="${PIPESTATUS[1]}"
  set -o pipefail

  return "$status"
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

installed_emulator_version="$(installed_android_sdk_package_version "$ANDROID_SDK_ROOT" emulator)"
if [[ "$installed_emulator_version" != "$ANDROID_EMULATOR_VERSION" ]]; then
  printf 'Installing Android Emulator %s...\n' "$ANDROID_EMULATOR_VERSION"
  install_sdk_package "$sdkmanager" emulator
  installed_emulator_version="$(installed_android_sdk_package_version "$ANDROID_SDK_ROOT" emulator)"
fi

[[ "$installed_emulator_version" == "$ANDROID_EMULATOR_VERSION" ]] || fail \
  "Android Emulator $ANDROID_EMULATOR_VERSION is required, but sdkmanager provides ${installed_emulator_version:-none}. Update the VRT profile and baselines intentionally."

avdmanager_has_device_type() {
  local candidate="$1"

  "$candidate" list device 2>/dev/null \
    | grep -Fi -- "or \"$ANDROID_DEVICE_TYPE\"" >/dev/null
}

find_avdmanager_with_device_type() {
  local candidate

  while IFS= read -r candidate; do
    if [[ -x "$candidate" ]] && avdmanager_has_device_type "$candidate"; then
      printf '%s\n' "$candidate"
      return
    fi
  done < <(sdk_tool_candidates avdmanager)

  return 1
}

if matching_avdmanager="$(find_avdmanager_with_device_type)"; then
  avdmanager="$matching_avdmanager"
else
  printf 'Android device profile %s is not installed. Updating Android SDK Command-line Tools...\n' \
    "$ANDROID_DEVICE_TYPE"
  install_sdk_package "$sdkmanager" "cmdline-tools;latest"

  matching_avdmanager="$(find_avdmanager_with_device_type)" || fail \
    "Android device profile '$ANDROID_DEVICE_TYPE' is unavailable after updating cmdline-tools;latest."
  avdmanager="$matching_avdmanager"
fi

# Keep both tools from the same command-line tools installation. On hosted
# runners, updating a stale `latest` directory can install the new package as
# `latest-2`; continuing with the original sdkmanager would use the stale tool.
sdkmanager="${avdmanager%/avdmanager}/sdkmanager"
[[ -x "$sdkmanager" ]] || fail "sdkmanager not found next to $avdmanager."

if [[ -z "$(installed_android_sdk_package_version "$ANDROID_SDK_ROOT" "$ANDROID_SYSTEM_IMAGE")" ]]; then
  printf 'Installing %s...\n' "$ANDROID_SYSTEM_IMAGE"
  install_sdk_package "$sdkmanager" "$ANDROID_SYSTEM_IMAGE"
fi

installed_system_image_revision="$(installed_android_sdk_package_version "$ANDROID_SDK_ROOT" "$ANDROID_SYSTEM_IMAGE")"
[[ "$installed_system_image_revision" == "$ANDROID_SYSTEM_IMAGE_REVISION" ]] || fail \
  "Android system image revision $ANDROID_SYSTEM_IMAGE_REVISION is required, but revision ${installed_system_image_revision:-none} is installed. Update the VRT profile and baselines intentionally."

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
    -no-snapshot
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
