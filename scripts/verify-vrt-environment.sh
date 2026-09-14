#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=./vrt-config.sh
source "$SCRIPT_DIR/vrt-config.sh"
# shellcheck source=./android-sdk-packages.sh
source "$SCRIPT_DIR/android-sdk-packages.sh"

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

platform="${1:-}"
[[ "$platform" == "android" || "$platform" == "ios" ]] || \
  fail "Platform must be 'android' or 'ios'."

metadata_dir="$PROJECT_ROOT/build/vrt/environment"
metadata_file="$metadata_dir/$platform.txt"
mkdir -p "$metadata_dir"

record() {
  printf '%s=%s\n' "$1" "$2" | tee -a "$metadata_file"
}

expect() {
  local name="$1"
  local expected="$2"
  local actual="$3"

  record "$name" "$actual"
  [[ "$actual" == "$expected" ]] || fail \
    "$name must be '$expected', but is '${actual:-missing}'."
}

: > "$metadata_file"
record platform "$platform"
expect host_architecture "$VRT_HOST_ARCHITECTURE" "$(uname -m)"
record host_os "$(sw_vers -productVersion) ($(sw_vers -buildVersion))"
expect agent_device_version "$VRT_AGENT_DEVICE_VERSION" \
  "$(agent-device --version)"

case "$platform" in
  android)
    android_sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
    [[ -n "$android_sdk_root" ]] || fail \
      "ANDROID_HOME or ANDROID_SDK_ROOT must identify the Android SDK."

    sdkmanager=""
    for candidate in \
      "$android_sdk_root/cmdline-tools/latest/bin/sdkmanager" \
      "$android_sdk_root"/cmdline-tools/latest-*/bin/sdkmanager \
      "$android_sdk_root"/cmdline-tools/*/bin/sdkmanager \
      "$android_sdk_root/cmdline-tools/bin/sdkmanager" \
      "$android_sdk_root/tools/bin/sdkmanager"; do
      if [[ -x "$candidate" ]]; then
        sdkmanager="$candidate"
        break
      fi
    done
    adb="$android_sdk_root/platform-tools/adb"
    [[ -n "$sdkmanager" ]] || fail \
      "sdkmanager not found under $android_sdk_root."
    [[ -x "$adb" ]] || fail "adb not found at $adb."

    IFS=';' read -r package_type system_api target expected_architecture \
      <<< "$ANDROID_SYSTEM_IMAGE"
    [[ "$package_type" == "system-images" && -n "$system_api" && -n "$target" && -n "$expected_architecture" ]] || \
      fail "Invalid Android system image package: $ANDROID_SYSTEM_IMAGE"

    record profile "$ANDROID_VRT_PROFILE"
    expect emulator_version "$ANDROID_EMULATOR_VERSION" \
      "$(installed_android_sdk_package_version "$android_sdk_root" emulator)"
    record system_image "$ANDROID_SYSTEM_IMAGE"
    expect system_image_revision "$ANDROID_SYSTEM_IMAGE_REVISION" \
      "$(installed_android_sdk_package_version "$android_sdk_root" "$ANDROID_SYSTEM_IMAGE")"

    running_serial=""
    while read -r serial; do
      running_avd_name="$($adb -s "$serial" emu avd name 2>/dev/null | sed -n '1p' | tr -d '\r')"
      if [[ "$running_avd_name" == "$ANDROID_AVD_NAME" ]]; then
        running_serial="$serial"
        break
      fi
    done < <("$adb" devices | awk '$1 ~ /^emulator-/ && $2 == "device" { print $1 }')

    [[ -n "$running_serial" ]] || fail \
      "The configured Android emulator '$ANDROID_AVD_NAME' is not running."
    device_adb=("$adb" -s "$running_serial")

    record device_serial "$running_serial"
    expect avd_name "$ANDROID_AVD_NAME" "$running_avd_name"
    expect api_level "$ANDROID_API_LEVEL" \
      "$("${device_adb[@]}" shell getprop ro.build.version.sdk | tr -d '\r')"
    expect architecture "$expected_architecture" \
      "$("${device_adb[@]}" shell getprop ro.product.cpu.abi | tr -d '\r')"
    expect resolution "$ANDROID_RESOLUTION" \
      "$("${device_adb[@]}" shell wm size | tr -d '\r' | awk -F ': ' '/Physical size|Override size/ { value = $2 } END { print value }')"
    expect density "$ANDROID_DENSITY" \
      "$("${device_adb[@]}" shell wm density | tr -d '\r' | awk -F ': ' '/Physical density|Override density/ { value = $2 } END { print value }')"
    expect font_scale "$ANDROID_FONT_SCALE" \
      "$("${device_adb[@]}" shell settings get system font_scale | tr -d '\r')"
    expect locale "$ANDROID_LOCALE" \
      "$("${device_adb[@]}" shell settings get system system_locales | tr -d '\r')"
    expect timezone "$ANDROID_TIMEZONE" \
      "$("${device_adb[@]}" shell getprop persist.sys.timezone | tr -d '\r')"
    ;;
  ios)
    xcode_output="$(xcrun xcodebuild -version)"
    runtime_output="$(xcrun simctl list runtimes --json)"
    device_types_output="$(xcrun simctl list devicetypes --json)"
    devices_output="$(xcrun simctl list devices --json)"

    record cocoapods_version "$(pod --version)"
    record profile "$IOS_VRT_PROFILE"
    expect xcode_version "$IOS_XCODE_VERSION" \
      "$(awk 'NR == 1 { print $2 }' <<< "$xcode_output")"
    expect xcode_build "$IOS_XCODE_BUILD" \
      "$(awk 'NR == 2 { print $3 }' <<< "$xcode_output")"
    expect runtime_version "$IOS_VERSION" \
      "$(jq -r --arg runtime "$IOS_RUNTIME_ID" \
        '.runtimes[] | select(.identifier == $runtime) | .version' \
        <<< "$runtime_output")"
    expect runtime_build "$IOS_RUNTIME_BUILD" \
      "$(jq -r --arg runtime "$IOS_RUNTIME_ID" \
        '.runtimes[] | select(.identifier == $runtime) | .buildversion' \
        <<< "$runtime_output")"

    expected_device_type_id="$(
      jq -r --arg name "$IOS_DEVICE_TYPE" \
        '.devicetypes[] | select(.name == $name) | .identifier' \
        <<< "$device_types_output"
    )"
    actual_device_type_id="$(
      jq -r --arg runtime "$IOS_RUNTIME_ID" --arg name "$IOS_SIMULATOR_NAME" \
        '.devices[$runtime][] | select(.name == $name) | .deviceTypeIdentifier' \
        <<< "$devices_output"
    )"
    actual_simulator_state="$(
      jq -r --arg runtime "$IOS_RUNTIME_ID" --arg name "$IOS_SIMULATOR_NAME" \
        '.devices[$runtime][] | select(.name == $name) | .state' \
        <<< "$devices_output"
    )"

    expect device_type_id "$expected_device_type_id" "$actual_device_type_id"
    record device_type "$IOS_DEVICE_TYPE"
    record simulator_name "$IOS_SIMULATOR_NAME"
    expect simulator_state Booted "$actual_simulator_state"
    expect locale "$IOS_LOCALE" \
      "$(xcrun simctl spawn "$IOS_SIMULATOR_NAME" defaults read NSGlobalDomain AppleLocale)"
    expect appearance "$IOS_APPEARANCE" \
      "$(xcrun simctl ui "$IOS_SIMULATOR_NAME" appearance)"
    expect content_size "$IOS_CONTENT_SIZE" \
      "$(xcrun simctl ui "$IOS_SIMULATOR_NAME" content_size)"
    ;;
esac

printf 'VRT environment verified. Metadata: %s\n' "$metadata_file"
