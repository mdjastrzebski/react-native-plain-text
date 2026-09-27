#!/usr/bin/env bash

# Checks the Android SDK packages that render VRT pixels (the emulator and the
# system image) against the pinned versions. When one is missing or different,
# a person at a terminal is offered an sdkmanager install; CI and other
# non-interactive runs fail with the reason instead.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=./vrt-config.sh
source "$SCRIPT_DIR/vrt-config.sh"

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

property() {
  [[ -f "$1" ]] || return 0
  sed -n "s/^$2=//p" "$1" | tail -n 1
}

android_sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
[[ -n "$android_sdk_root" ]] || fail \
  "ANDROID_HOME or ANDROID_SDK_ROOT must identify the Android SDK."
[[ "$ANDROID_SYSTEM_IMAGE_ARCHITECTURE" != "unsupported" ]] || fail \
  "Unsupported Android VRT host: $(uname -s)-$(uname -m)."

adb="$android_sdk_root/platform-tools/adb"
sdkmanager="$android_sdk_root/cmdline-tools/latest/bin/sdkmanager"
emulator_properties="$android_sdk_root/emulator/source.properties"
system_image="system-images;android-$ANDROID_API_LEVEL;$ANDROID_SYSTEM_IMAGE_TARGET;$ANDROID_SYSTEM_IMAGE_ARCHITECTURE"
system_image_properties="$android_sdk_root/system-images/android-$ANDROID_API_LEVEL/$ANDROID_SYSTEM_IMAGE_TARGET/$ANDROID_SYSTEM_IMAGE_ARCHITECTURE/source.properties"

packages=()
problems=()
emulator_version="$(property "$emulator_properties" Pkg.Revision)"
emulator_build="$(property "$emulator_properties" Pkg.BuildId)"
if [[ "$emulator_version" != "$ANDROID_EMULATOR_VERSION" || "$emulator_build" != "$ANDROID_EMULATOR_BUILD" ]]; then
  packages+=("emulator")
  problems+=("Android emulator $ANDROID_EMULATOR_VERSION ($ANDROID_EMULATOR_BUILD) is required, but ${emulator_version:-none} (${emulator_build:-none}) is installed.")
fi
image_revision="$(property "$system_image_properties" Pkg.Revision)"
if [[ "$image_revision" != "$ANDROID_SYSTEM_IMAGE_REVISION" ]]; then
  packages+=("$system_image")
  problems+=("'$system_image' revision $ANDROID_SYSTEM_IMAGE_REVISION is required, but ${image_revision:-none} is installed.")
fi

[[ ${#packages[@]} -gt 0 ]] || exit 0

printf '%s\n' "${problems[@]}" >&2
if [[ -n "${CI:-}" ]] || ! { : < /dev/tty; } 2>/dev/null; then
  fail "Install the pinned Android SDK packages before running Android VRT."
fi
[[ -x "$sdkmanager" ]] || fail \
  "sdkmanager not found at $sdkmanager. Install 'Android SDK Command-line Tools (latest)' from Android Studio's SDK Manager (SDK Tools tab)."

printf 'Install %s with sdkmanager? [y/N] ' "${packages[*]}" >&2
answer=""
read -r answer < /dev/tty || true
[[ "$answer" == [yY] || "$answer" == [yY][eE][sS] ]] || \
  fail "Install the pinned Android SDK packages before running Android VRT."

# sdkmanager may ask to accept licenses, so it reads from the terminal.
"$sdkmanager" "${packages[@]}" < /dev/tty >&2

# sdkmanager installs the newest package on its channel, which is not always the
# pinned one. Say so plainly rather than let a later stage report a mismatch.
[[ "$(property "$emulator_properties" Pkg.Revision)" == "$ANDROID_EMULATOR_VERSION" &&
  "$(property "$emulator_properties" Pkg.BuildId)" == "$ANDROID_EMULATOR_BUILD" ]] || fail \
  "sdkmanager did not install Android emulator $ANDROID_EMULATOR_VERSION ($ANDROID_EMULATOR_BUILD). It may only be offered on another channel (--channel=1 beta, --channel=3 canary)."
[[ "$(property "$system_image_properties" Pkg.Revision)" == "$ANDROID_SYSTEM_IMAGE_REVISION" ]] || fail \
  "sdkmanager did not install '$system_image' revision $ANDROID_SYSTEM_IMAGE_REVISION."

# A VRT emulator started before the update still runs the old binary. Stop it so
# setup boots the new one.
if [[ " ${packages[*]} " == *" emulator "* && -x "$adb" ]]; then
  while read -r candidate; do
    candidate_name="$("$adb" -s "$candidate" emu avd name 2>/dev/null | sed -n '1p' | tr -d '\r')"
    [[ "$candidate_name" == "$ANDROID_AVD_NAME" ]] || continue
    printf 'Stopping %s, which runs the previous emulator.\n' "$candidate" >&2
    "$adb" -s "$candidate" emu kill >/dev/null 2>&1 || true
    stop_deadline=$((SECONDS + 60))
    while "$adb" -s "$candidate" get-state >/dev/null 2>&1; do
      ((SECONDS < stop_deadline)) || fail "Emulator $candidate did not stop."
      sleep 1
    done
  done < <("$adb" devices | awk '$1 ~ /^emulator-/ { print $1 }')
fi

printf 'Android SDK packages are up to date.\n' >&2
