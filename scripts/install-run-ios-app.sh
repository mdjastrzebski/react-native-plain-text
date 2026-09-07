#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

IOS_WORKSPACE="$PROJECT_ROOT/example/ios/PlainText.xcworkspace"
APP_PATH="${1:-$PROJECT_ROOT/example/ios/build/Build/Products/Release-iphonesimulator/PlainText.app}"
IOS_APP_ID="${IOS_APP_ID:-plaintext.example}"

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

command -v xcrun >/dev/null 2>&1 || fail "Xcode Command Line Tools are not installed."
xcrun simctl help >/dev/null 2>&1 || fail "simctl is unavailable. Select a full Xcode installation with xcode-select."

if [[ ! -d "$APP_PATH" ]]; then
  if [[ $# -gt 0 ]]; then
    fail "iOS app not found at $APP_PATH."
  fi

  if [[ ! -d "$IOS_WORKSPACE" ]]; then
    printf 'Generated iOS project not found. Running Expo prebuild...\n'
    (
      cd "$PROJECT_ROOT"
      yarn example expo prebuild --platform ios --yarn
    )
  fi

  [[ -d "$IOS_WORKSPACE" ]] || fail "Expo prebuild completed without producing $IOS_WORKSPACE."

  printf 'Release iOS app not found. Building the example iOS app...\n'
  (
    cd "$PROJECT_ROOT"
    yarn example build:ios:release
  )
fi

[[ -d "$APP_PATH" ]] || fail "iOS release build completed without producing $APP_PATH."

requested_udid="${IOS_SIMULATOR_UDID:-${VRT_SIMULATOR_UDID:-}}"
if [[ -n "$requested_udid" ]]; then
  simulator_udid="$requested_udid"
  if ! xcrun simctl list devices booted | grep -F "($simulator_udid) (Booted)" >/dev/null; then
    fail "iOS simulator '$simulator_udid' is not booted."
  fi
else
  booted_simulators=()
  while IFS= read -r udid; do
    booted_simulators+=("$udid")
  done < <(
    xcrun simctl list devices booted \
      | sed -nE 's/^[[:space:]]+.*\(([0-9A-Fa-f-]{36})\) \(Booted\)[[:space:]]*$/\1/p'
  )

  case "${#booted_simulators[@]}" in
    0)
      fail "No booted iOS simulator found."
      ;;
    1)
      simulator_udid="${booted_simulators[0]}"
      ;;
    *)
      printf 'Booted iOS simulators:\n' >&2
      printf '  %s\n' "${booted_simulators[@]}" >&2
      fail "Multiple simulators found. Set IOS_SIMULATOR_UDID to select one."
      ;;
  esac
fi

printf 'Installing %s on %s...\n' "$APP_PATH" "$simulator_udid"
xcrun simctl install "$simulator_udid" "$APP_PATH"

printf 'Starting %s...\n' "$IOS_APP_ID"
xcrun simctl terminate "$simulator_udid" "$IOS_APP_ID" >/dev/null 2>&1 || true
xcrun simctl launch "$simulator_udid" "$IOS_APP_ID"

printf 'iOS app is running on %s.\n' "$simulator_udid"
