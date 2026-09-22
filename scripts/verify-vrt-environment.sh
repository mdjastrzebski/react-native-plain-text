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

expect() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  [[ "$actual" == "$expected" ]] || fail \
    "$name must be '$expected', but is '${actual:-missing}'."
  printf '%s=%s\n' "$name" "$actual"
}

property() {
  local file="$1"
  local name="$2"
  awk -v prefix="$name=" \
    'index($0, prefix) == 1 { value = substr($0, length(prefix) + 1) } END { print value }' \
    "$file"
}

without_megabyte_suffix() {
  printf '%s' "${1%M}"
}

platform="${1:-}"
metadata_dir="$PROJECT_ROOT/build/vrt/environment"
mkdir -p "$metadata_dir"

[[ -x "$PROJECT_ROOT/node_modules/.bin/agent-device" ]] || fail \
  "agent-device is not installed. Run 'yarn'."
: > "$metadata_dir/$platform.txt"

case "$platform" in
  android)
    android_sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
    [[ -n "$android_sdk_root" ]] || fail \
      "ANDROID_HOME or ANDROID_SDK_ROOT must identify the Android SDK."
    adb="$android_sdk_root/platform-tools/adb"
    serial_file="$PROJECT_ROOT/build/vrt/devices/android-serial"
    emulator_properties="$android_sdk_root/emulator/source.properties"
    system_image_properties="$android_sdk_root/system-images/android-$ANDROID_API_LEVEL/$ANDROID_SYSTEM_IMAGE_TARGET/$ANDROID_SYSTEM_IMAGE_ARCHITECTURE/source.properties"
    [[ -x "$adb" ]] || fail "adb not found at $adb."
    [[ -f "$serial_file" ]] || fail "Run 'yarn vrt android setup' first."
    [[ -f "$emulator_properties" ]] || fail "Emulator metadata not found at $emulator_properties."
    [[ -f "$system_image_properties" ]] || fail \
      "System image metadata not found at $system_image_properties."

    serial="$(<"$serial_file")"
    expected_serial="emulator-$ANDROID_EMULATOR_PORT"
    expect android_serial "$expected_serial" "$serial"
    device_adb=("$adb" -s "$serial")
    "${device_adb[@]}" get-state >/dev/null

    avd_name="$("${device_adb[@]}" emu avd name 2>/dev/null | sed -n '1p' | tr -d '\r')"
    expect android_avd_name "$ANDROID_AVD_NAME" "$avd_name"
    expect android_emulator_version "$ANDROID_EMULATOR_VERSION" \
      "$(property "$emulator_properties" Pkg.Revision)"
    expect android_emulator_build "$ANDROID_EMULATOR_BUILD" \
      "$(property "$emulator_properties" Pkg.BuildId)"
    expect android_system_image_revision "$ANDROID_SYSTEM_IMAGE_REVISION" \
      "$(property "$system_image_properties" Pkg.Revision)"
    expect android_api_level "$ANDROID_API_LEVEL" \
      "$("${device_adb[@]}" shell getprop ro.build.version.sdk | tr -d '\r')"
    expect android_architecture "$ANDROID_SYSTEM_IMAGE_ARCHITECTURE" \
      "$("${device_adb[@]}" shell getprop ro.product.cpu.abi | tr -d '\r')"

    avd_root="${ANDROID_AVD_HOME:-${ANDROID_USER_HOME:-${HOME}/.android}/avd}"
    avd_config="$avd_root/$ANDROID_AVD_NAME.avd/config.ini"
    [[ -f "$avd_config" ]] || fail "AVD configuration not found at $avd_config."
    expect android_device_type "$ANDROID_DEVICE_TYPE" \
      "$(property "$avd_config" hw.device.name)"
    expect android_cores "$ANDROID_CORES" "$(property "$avd_config" hw.cpu.ncore)"
    expect android_ram "$(without_megabyte_suffix "$ANDROID_RAM_SIZE")" \
      "$(without_megabyte_suffix "$(property "$avd_config" hw.ramSize)")"
    expect android_heap "$(without_megabyte_suffix "$ANDROID_HEAP_SIZE")" \
      "$(without_megabyte_suffix "$(property "$avd_config" hw.heapSize)")"
    expect android_disk "$ANDROID_DISK_SIZE" "$(property "$avd_config" disk.dataPartition.size)"
    expect android_hardware_keyboard "$ANDROID_HARDWARE_KEYBOARD" \
      "$(property "$avd_config" hw.keyboard)"
    expect android_system_image \
      "system-images/android-$ANDROID_API_LEVEL/$ANDROID_SYSTEM_IMAGE_TARGET/$ANDROID_SYSTEM_IMAGE_ARCHITECTURE/" \
      "$(property "$avd_config" image.sysdir.1)"

    expect android_boot_completed 1 \
      "$("${device_adb[@]}" shell getprop sys.boot_completed | tr -d '\r')"
    expect android_resolution "$ANDROID_RESOLUTION" \
      "$("${device_adb[@]}" shell wm size | tr -d '\r' | awk -F ': ' '/Physical size|Override size/ { value = $2 } END { print value }')"
    expect android_density "$ANDROID_DENSITY" \
      "$("${device_adb[@]}" shell wm density | tr -d '\r' | awk -F ': ' '/Physical density|Override density/ { value = $2 } END { print value }')"
    expect android_font_scale "$ANDROID_FONT_SCALE" \
      "$("${device_adb[@]}" shell settings get system font_scale | tr -d '\r')"
    expect android_locale "$ANDROID_LOCALE" \
      "$("${device_adb[@]}" shell settings get system system_locales | tr -d '\r')"
    expect android_timezone "$ANDROID_TIMEZONE" \
      "$("${device_adb[@]}" shell getprop persist.sys.timezone | tr -d '\r')"
    expect android_rotation_locked 0 \
      "$("${device_adb[@]}" shell settings get system accelerometer_rotation | tr -d '\r')"
    expect android_rotation 0 \
      "$("${device_adb[@]}" shell settings get system user_rotation | tr -d '\r')"
    expect android_window_animation 0 \
      "$("${device_adb[@]}" shell settings get global window_animation_scale | tr -d '\r')"
    expect android_transition_animation 0 \
      "$("${device_adb[@]}" shell settings get global transition_animation_scale | tr -d '\r')"
    expect android_animator_duration 0 \
      "$("${device_adb[@]}" shell settings get global animator_duration_scale | tr -d '\r')"
    expect android_spell_checker 0 \
      "$("${device_adb[@]}" shell settings get secure spell_checker_enabled | tr -d '\r')"
    expect android_night_mode no \
      "$("${device_adb[@]}" shell cmd uimode night 2>/dev/null | tr -d '\r' | awk -F ': ' '/Night mode/ { print $2 }')"
    ;;
  ios)
    udid_file="$PROJECT_ROOT/build/vrt/devices/ios-udid"
    [[ -f "$udid_file" ]] || fail "Run 'yarn vrt ios setup' first."
    ios_udid="$(<"$udid_file")"

    xcode_output="$(xcrun xcodebuild -version)"
    expect ios_xcode_version "$IOS_XCODE_VERSION" \
      "$(awk 'NR == 1 { print $2 }' <<< "$xcode_output")"
    expect ios_xcode_build "$IOS_XCODE_BUILD" \
      "$(awk 'NR == 2 { print $3 }' <<< "$xcode_output")"

    runtimes_json="$(xcrun simctl list runtimes --json)"
    devices_json="$(xcrun simctl list devices --json)"
    expect ios_runtime_build "$IOS_RUNTIME_BUILD" \
      "$(jq -r --arg id "$IOS_RUNTIME_ID" '.runtimes[] | select(.identifier == $id) | .buildversion' <<< "$runtimes_json")"
    device_json="$(jq -ec --arg runtime "$IOS_RUNTIME_ID" --arg udid "$ios_udid" '.devices[$runtime][] | select(.udid == $udid)' <<< "$devices_json")" || fail \
      "Simulator '$ios_udid' is not an $IOS_RUNTIME_ID device."
    expect ios_device_name "$IOS_SIMULATOR_NAME" "$(jq -r '.name' <<< "$device_json")"
    expect ios_device_type "$IOS_DEVICE_TYPE_ID" \
      "$(jq -r '.deviceTypeIdentifier' <<< "$device_json")"
    expect ios_simulator_state Booted "$(jq -r '.state' <<< "$device_json")"
    expect ios_locale "$IOS_LOCALE" \
      "$(xcrun simctl spawn "$ios_udid" defaults read NSGlobalDomain AppleLocale)"
    expect ios_language "$IOS_LANGUAGE" \
      "$(xcrun simctl spawn "$ios_udid" defaults read NSGlobalDomain AppleLanguages | sed -n '2s/[[:space:]"",]//gp')"
    expect ios_appearance light "$(xcrun simctl ui "$ios_udid" appearance)"
    expect ios_content_size large "$(xcrun simctl ui "$ios_udid" content_size)"
    ;;
  *) fail "Platform must be 'android' or 'ios'." ;;
esac | tee -a "$metadata_dir/$platform.txt"

printf 'VRT environment verified: %s\n' "$metadata_dir/$platform.txt"
