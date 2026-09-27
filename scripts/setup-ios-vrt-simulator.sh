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

case "$VRT_RESET_DEVICE" in
  0 | 1) ;;
  *) fail "VRT_RESET_DEVICE must be '0' or '1'." ;;
esac

actual_xcode_version="$(xcrun xcodebuild -version | awk 'NR == 1 { print $2 }')"
[[ "${actual_xcode_version%%.*}" == "$IOS_XCODE_MAJOR" ]] || fail \
  "Xcode $IOS_XCODE_MAJOR.x is required, but version $actual_xcode_version is selected."

runtime_build="$(xcrun simctl list runtimes --json | jq -r --arg id "$IOS_RUNTIME_ID" '.runtimes[] | select(.identifier == $id) | .buildversion')"
[[ "$runtime_build" == "$IOS_RUNTIME_BUILD" ]] || fail \
  "iOS runtime build $IOS_RUNTIME_BUILD is required, but build ${runtime_build:-none} is installed."

simulator_udid="${IOS_SIMULATOR_UDID:-}"
if [[ -z "$simulator_udid" ]]; then
  simulator_udid="$(xcrun simctl list devices --json | jq -r --arg runtime "$IOS_RUNTIME_ID" --arg name "$IOS_SIMULATOR_NAME" '.devices[$runtime][]? | select(.name == $name) | .udid' | head -n 1)"
fi
if [[ -z "$simulator_udid" ]]; then
  simulator_udid="$(xcrun simctl create "$IOS_SIMULATOR_NAME" "$IOS_DEVICE_TYPE_ID" "$IOS_RUNTIME_ID")"
fi

device_json="$(xcrun simctl list devices --json | jq -ec --arg runtime "$IOS_RUNTIME_ID" --arg udid "$simulator_udid" '.devices[$runtime][] | select(.udid == $udid)')" || fail \
  "Simulator '$simulator_udid' is not an $IOS_RUNTIME_ID device."
actual_device_type="$(jq -r '.deviceTypeIdentifier' <<< "$device_json")"
[[ "$actual_device_type" == "$IOS_DEVICE_TYPE_ID" ]] || fail \
  "Simulator '$simulator_udid' uses '$actual_device_type', expected '$IOS_DEVICE_TYPE_ID'."

state="$(jq -r '.state' <<< "$device_json")"
if [[ "$state" == "Booted" ]]; then
  xcrun simctl shutdown "$simulator_udid"
fi
if [[ "$VRT_RESET_DEVICE" == "1" ]]; then
  xcrun simctl erase "$simulator_udid"
fi

xcrun simctl boot "$simulator_udid"
xcrun simctl bootstatus "$simulator_udid" -b
xcrun simctl spawn "$simulator_udid" defaults write NSGlobalDomain AppleLanguages -array "$IOS_LANGUAGE"
xcrun simctl spawn "$simulator_udid" defaults write NSGlobalDomain AppleLocale -string "$IOS_LOCALE"
# Restart after changing language and locale so applications inherit them.
xcrun simctl shutdown "$simulator_udid"
xcrun simctl boot "$simulator_udid"
xcrun simctl bootstatus "$simulator_udid" -b
xcrun simctl ui "$simulator_udid" appearance light
xcrun simctl ui "$simulator_udid" content_size "$IOS_CONTENT_SIZE"
xcrun simctl status_bar "$simulator_udid" override --time 9:41 --batteryLevel 100 --batteryState charged --cellularBars 4 --wifiBars 3

mkdir -p "$PROJECT_ROOT/.vrt/devices"
printf '%s\n' "$simulator_udid" > "$PROJECT_ROOT/.vrt/devices/ios-udid"
printf 'iOS VRT simulator is ready: %s (%s).\n' "$IOS_SIMULATOR_NAME" "$simulator_udid"
