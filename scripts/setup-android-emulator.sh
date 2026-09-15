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

case "$VRT_RESET_DEVICE" in
  0 | 1) ;;
  *) fail "VRT_RESET_DEVICE must be '0' or '1'." ;;
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

if [[ -z "$(installed_android_sdk_package_version "$ANDROID_SDK_ROOT" platform-tools)" ]]; then
  printf 'Installing Android SDK Platform-Tools...\n'
  install_sdk_package "$sdkmanager" platform-tools
fi

[[ -x "$adb" ]] || fail "adb was not installed at $adb."

installed_emulator_version="$(installed_android_sdk_package_version "$ANDROID_SDK_ROOT" emulator)"
if [[ "$installed_emulator_version" != "$ANDROID_EMULATOR_VERSION" ]]; then
  printf 'Installing Android Emulator %s...\n' "$ANDROID_EMULATOR_VERSION"
  install_sdk_package "$sdkmanager" emulator
  installed_emulator_version="$(installed_android_sdk_package_version "$ANDROID_SDK_ROOT" emulator)"
fi

[[ "$installed_emulator_version" == "$ANDROID_EMULATOR_VERSION" ]] || fail \
  "Android Emulator $ANDROID_EMULATOR_VERSION is required, but sdkmanager provides ${installed_emulator_version:-none}. sdkmanager cannot select a historical revision; update the VRT profile and baselines intentionally."
installed_emulator_build="$(installed_android_sdk_package_build "$ANDROID_SDK_ROOT" emulator)"
[[ "$installed_emulator_build" == "$ANDROID_EMULATOR_BUILD" ]] || fail \
  "Android Emulator build $ANDROID_EMULATOR_BUILD is required, but build ${installed_emulator_build:-none} is installed. Update the VRT profile and baselines intentionally."
[[ -x "$emulator" ]] || fail "Android Emulator was not installed at $emulator."

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

android_avd_home="${ANDROID_AVD_HOME:-${ANDROID_USER_HOME:-$HOME/.android}/avd}"
avd_config="$android_avd_home/$ANDROID_AVD_NAME.avd/config.ini"

if ! "$avdmanager" list avd | grep -F "Name: $ANDROID_AVD_NAME" >/dev/null; then
  printf 'Creating AVD %s...\n' "$ANDROID_AVD_NAME"
  printf 'no\n' | "$avdmanager" create avd \
    --force \
    --name "$ANDROID_AVD_NAME" \
    --package "$ANDROID_SYSTEM_IMAGE" \
    --device "$ANDROID_DEVICE_TYPE"
else
  [[ -f "$avd_config" ]] || fail "Configuration for AVD '$ANDROID_AVD_NAME' was not found at $avd_config."

  expected_image_sysdir="$(tr ';' '/' <<< "$ANDROID_SYSTEM_IMAGE")/"
  actual_image_sysdir="$(awk -F '=' '$1 ~ /^[[:space:]]*image\.sysdir\.1[[:space:]]*$/ { value = $2; gsub(/^[[:space:]]+|[[:space:]]+$/, "", value); print value; exit }' "$avd_config")"
  actual_device_type="$(awk -F '=' '$1 ~ /^[[:space:]]*hw\.device\.name[[:space:]]*$/ { value = $2; gsub(/^[[:space:]]+|[[:space:]]+$/, "", value); print value; exit }' "$avd_config")"

  [[ "$actual_image_sysdir" == "$expected_image_sysdir" ]] || fail \
    "AVD '$ANDROID_AVD_NAME' uses '${actual_image_sysdir:-an unknown system image}', not '$expected_image_sysdir'. Rename the AVD or recreate it intentionally."
  [[ "$actual_device_type" == "$ANDROID_DEVICE_TYPE" ]] || fail \
    "AVD '$ANDROID_AVD_NAME' uses device type '${actual_device_type:-unknown}', not '$ANDROID_DEVICE_TYPE'. Rename the AVD or recreate it intentionally."
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

if [[ -n "$running_serial" && "$VRT_RESET_DEVICE" == "1" ]]; then
  printf 'Stopping AVD %s before the CI reset...\n' "$ANDROID_AVD_NAME"
  "$adb" -s "$running_serial" emu kill >/dev/null

  for _ in {1..30}; do
    running_serial="$(find_running_serial)"
    [[ -z "$running_serial" ]] && break
    sleep 1
  done

  [[ -z "$running_serial" ]] || fail "Android emulator $running_serial did not stop."
fi

if [[ -z "$running_serial" ]]; then
  emulator_gpu="auto"
  if [[ "$ANDROID_EMULATOR_HEADLESS" == "1" ]]; then
    # Headless CI runners do not provide a reliable host graphics context.
    # Use the emulator's software renderer instead of leaving auto-selection
    # to choose a renderer that may require a window server.
    emulator_gpu="swiftshader"
  fi

  emulator_args=(
    -avd "$ANDROID_AVD_NAME"
    -gpu "$emulator_gpu"
    -no-metrics
    -no-boot-anim
    -no-snapshot
    -prop "persist.sys.locale=$ANDROID_LOCALE"
    -skin "$ANDROID_RESOLUTION"
    -timezone "$ANDROID_TIMEZONE"
  )

  if [[ "$VRT_RESET_DEVICE" == "1" ]]; then
    emulator_args+=(-wipe-data)
  fi

  if [[ "$ANDROID_EMULATOR_HEADLESS" == "1" ]]; then
    emulator_args+=(-no-window -noaudio)
  fi

  printf 'Starting AVD %s...\n' "$ANDROID_AVD_NAME"
  "$emulator" "${emulator_args[@]}" \
    >/tmp/react-native-plain-text-vrt-emulator.log 2>&1 &
  emulator_pid="$!"

  for _ in {1..60}; do
    running_serial="$(find_running_serial)"
    [[ -n "$running_serial" ]] && break

    if ! kill -0 "$emulator_pid" 2>/dev/null; then
      emulator_status=0
      wait "$emulator_pid" || emulator_status="$?"
      tail -100 /tmp/react-native-plain-text-vrt-emulator.log >&2 || true
      fail "Android emulator exited with status $emulator_status before registering with adb."
    fi

    sleep 2
  done
fi

if [[ -z "$running_serial" ]]; then
  tail -100 /tmp/react-native-plain-text-vrt-emulator.log >&2 || true
  fail "No running Android emulator was found."
fi

printf 'Waiting for %s to finish booting...\n' "$running_serial"
for _ in {1..120}; do
  if [[ "$("$adb" -s "$running_serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
    ANDROID_SERIAL="$running_serial" "$SCRIPT_DIR/configure-android-vrt-device.sh"
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
