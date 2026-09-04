#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

APK_PATH="${1:-$PROJECT_ROOT/example/android/app/build/outputs/apk/release/app-release.apk}"
ANDROID_APP_ID="${ANDROID_APP_ID:-plaintext.example}"
ANDROID_ACTIVITY="${ANDROID_ACTIVITY:-.MainActivity}"

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

find_adb() {
  if command -v adb >/dev/null 2>&1; then
    command -v adb
  elif [[ -n "${ANDROID_HOME:-}" && -x "$ANDROID_HOME/platform-tools/adb" ]]; then
    printf '%s\n' "$ANDROID_HOME/platform-tools/adb"
  elif [[ -n "${ANDROID_SDK_ROOT:-}" && -x "$ANDROID_SDK_ROOT/platform-tools/adb" ]]; then
    printf '%s\n' "$ANDROID_SDK_ROOT/platform-tools/adb"
  elif [[ -x "$HOME/Library/Android/sdk/platform-tools/adb" ]]; then
    printf '%s\n' "$HOME/Library/Android/sdk/platform-tools/adb"
  elif [[ -x "$HOME/Android/Sdk/platform-tools/adb" ]]; then
    printf '%s\n' "$HOME/Android/Sdk/platform-tools/adb"
  else
    fail "adb not found. Install Android SDK Platform Tools or set ANDROID_HOME."
  fi
}

if [[ ! -f "$APK_PATH" ]]; then
  if [[ $# -gt 0 ]]; then
    fail "APK not found at $APK_PATH."
  fi

  printf 'Release APK not found. Building the example Android app...\n'
  (
    cd "$PROJECT_ROOT"
    yarn example build:android:release
  )
fi

[[ -f "$APK_PATH" ]] || fail "Android release build completed without producing $APK_PATH."

adb="$(find_adb)"

if [[ -n "${ANDROID_SERIAL:-}" ]]; then
  emulator_serial="$ANDROID_SERIAL"
  emulator_state="$("$adb" -s "$emulator_serial" get-state 2>/dev/null || true)"
  [[ "$emulator_state" == "device" ]] || fail "ANDROID_SERIAL '$emulator_serial' is not connected."
else
  running_emulators=()
  while IFS= read -r serial; do
    running_emulators+=("$serial")
  done < <("$adb" devices | awk '$1 ~ /^emulator-/ && $2 == "device" { print $1 }')

  case "${#running_emulators[@]}" in
    0)
      fail "No running Android emulator found."
      ;;
    1)
      emulator_serial="${running_emulators[0]}"
      ;;
    *)
      printf 'Running emulators:\n' >&2
      printf '  %s\n' "${running_emulators[@]}" >&2
      fail "Multiple emulators found. Set ANDROID_SERIAL to select one."
      ;;
  esac
fi

printf 'Installing %s on %s...\n' "$APK_PATH" "$emulator_serial"
"$adb" -s "$emulator_serial" install -r "$APK_PATH"

component="$ANDROID_APP_ID/$ANDROID_ACTIVITY"
printf 'Starting %s...\n' "$component"
"$adb" -s "$emulator_serial" shell am force-stop "$ANDROID_APP_ID"
"$adb" -s "$emulator_serial" shell am start -W -n "$component"

printf 'Android app is running on %s.\n' "$emulator_serial"
