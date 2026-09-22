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

platform="${1:-}"
case "$platform" in
  android)
    serial_file="$PROJECT_ROOT/build/vrt/devices/android-serial"
    [[ -f "$serial_file" ]] || fail "Run 'yarn vrt android setup' first."
    android_serial="$(<"$serial_file")"

    VRT_ENABLED=1 ANDROID_SERIAL="$android_serial" \
      yarn android:release --device "$ANDROID_AVD_NAME" --no-bundler

    source_apk="$PROJECT_ROOT/example/android/app/build/outputs/apk/release/app-release.apk"
    target_apk="$PROJECT_ROOT/build/vrt/apps/android/app-release.apk"
    [[ -f "$source_apk" ]] || fail "Expo did not produce $source_apk."
    mkdir -p "$(dirname "$target_apk")"
    cp -a "$source_apk" "$target_apk"
    "$SCRIPT_DIR/vrt-app-state.sh" write-artifact android
    printf 'Android Release artifact: %s\n' "$target_apk"
    ;;
  ios)
    expo_output="$PROJECT_ROOT/build/vrt/expo-ios"
    target_app="$PROJECT_ROOT/build/vrt/apps/ios/PlainTextExample.app"
    yarn del-cli "$expo_output" "$target_app"

    VRT_ENABLED=1 yarn ios:release --device generic --no-bundler --output "$expo_output"

    mapfile_command="mapfile"
    if ! command -v "$mapfile_command" >/dev/null 2>&1; then
      # macOS ships Bash 3, which has no mapfile.
      ios_apps=()
      while IFS= read -r app; do ios_apps+=("$app"); done \
        < <(find "$expo_output" -type d -name '*.app' -prune)
    else
      mapfile -t ios_apps < <(find "$expo_output" -type d -name '*.app' -prune)
    fi
    [[ "${#ios_apps[@]}" -eq 1 ]] || fail \
      "Expected one iOS app under $expo_output, found ${#ios_apps[@]}."
    mkdir -p "$(dirname "$target_app")"
    cp -a "${ios_apps[0]}" "$target_app"
    "$SCRIPT_DIR/vrt-app-state.sh" write-artifact ios
    printf 'iOS Release artifact: %s\n' "$target_app"
    ;;
  *) fail "Platform must be 'android' or 'ios'." ;;
esac
