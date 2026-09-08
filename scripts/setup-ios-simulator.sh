#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=./vrt-config.sh
source "$SCRIPT_DIR/vrt-config.sh"

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

command -v xcrun >/dev/null 2>&1 || fail "Xcode Command Line Tools are not installed."
xcrun xcodebuild -version >/dev/null 2>&1 || fail "Select a full Xcode installation with xcode-select."

if ! xcrun simctl list runtimes available | grep -F "$IOS_RUNTIME_ID" >/dev/null; then
  fail "iOS $IOS_VERSION Simulator runtime is not installed. Install it in Xcode > Settings > Components, or set IOS_VERSION."
fi

device_type_id="${IOS_DEVICE_TYPE_ID:-}"
if [[ -z "$device_type_id" ]]; then
  device_type_id="$(
    xcrun simctl list devicetypes \
      | awk -v device="$IOS_DEVICE_TYPE (" 'index($0, device) { print; exit }' \
      | sed -E 's/.*\(([^()]*)\)$/\1/'
  )"
fi

[[ -n "$device_type_id" ]] || fail "Simulator device type '$IOS_DEVICE_TYPE' is not installed."

simulator_udid="$(
  xcrun simctl list devices available \
    | awk -v simulator="    $IOS_SIMULATOR_NAME (" 'index($0, simulator) == 1 { print; exit }' \
    | sed -E 's/.*\(([0-9A-Fa-f-]{36})\).*/\1/'
)"

if [[ -z "$simulator_udid" ]]; then
  printf 'Creating simulator %s...\n' "$IOS_SIMULATOR_NAME"
  simulator_udid="$(xcrun simctl create "$IOS_SIMULATOR_NAME" "$device_type_id" "$IOS_RUNTIME_ID")"
fi

state="$(
  xcrun simctl list devices \
    | awk -v udid="$simulator_udid" 'index($0, udid) { print; exit }' \
    | sed -E 's/.*\(([^()]*)\)[[:space:]]*$/\1/'
)"

if [[ "$state" != "Booted" ]]; then
  printf 'Booting simulator %s...\n' "$IOS_SIMULATOR_NAME"
  xcrun simctl boot "$simulator_udid"
fi

xcrun simctl bootstatus "$simulator_udid" -b
xcrun simctl status_bar "$simulator_udid" override \
  --time 9:41 \
  --batteryLevel 100 \
  --batteryState charged \
  --cellularBars 4 \
  --wifiBars 3

if [[ "$OPEN_SIMULATOR" == "1" ]]; then
  open -a Simulator --args -CurrentDeviceUDID "$simulator_udid"
fi

printf 'iOS VRT simulator is ready: %s (%s)\n' "$IOS_SIMULATOR_NAME" "$simulator_udid"
