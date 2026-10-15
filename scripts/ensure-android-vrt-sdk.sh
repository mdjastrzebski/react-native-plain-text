#!/usr/bin/env bash

# Checks the pinned emulator and system image. A person at a terminal is offered
# an sdkmanager install; CI and other non-interactive runs fail with the reason.

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

# sdkmanager only installs the newest emulator on its channel, so it can neither
# pin nor downgrade it. Fetch the pinned build from Google's repository instead.
install_emulator() {
  local host
  case "$(uname -s)-$(uname -m)" in
    Darwin-arm64) host="darwin_aarch64" ;;
    Darwin-x86_64) host="darwin_x64" ;;
    Linux-x86_64) host="linux_x64" ;;
    *) fail "No pinned Android emulator download for $(uname -s)-$(uname -m)." ;;
  esac
  local url="https://dl.google.com/android/repository/emulator-$host-$ANDROID_EMULATOR_BUILD.zip"
  local work
  work="$(mktemp -d)"

  printf 'Downloading %s\n' "$url" >&2
  curl -fL --progress-bar -o "$work/emulator.zip" "$url" || fail "Could not download $url."
  unzip -q "$work/emulator.zip" -d "$work" || fail "Could not unpack $url."

  # avdmanager only sees packages that have the package.xml sdkmanager writes.
  local major minor micro
  IFS=. read -r major minor micro <<<"$ANDROID_EMULATOR_VERSION"
  cat >"$work/emulator/package.xml" <<XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ns2:repository
    xmlns:ns2="http://schemas.android.com/repository/android/common/02"
    xmlns:ns3="http://schemas.android.com/repository/android/generic/02"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <localPackage path="emulator" obsolete="false">
    <type-details xsi:type="ns3:genericDetailsType"/>
    <revision><major>$major</major><minor>$minor</minor><micro>$micro</micro></revision>
    <display-name>Android Emulator</display-name>
  </localPackage>
</ns2:repository>
XML

  rm -rf "$android_sdk_root/emulator"
  mv "$work/emulator" "$android_sdk_root/emulator"
  rm -rf "$work"
}

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

sdk_packages=()
for package in "${packages[@]}"; do
  if [[ "$package" == "emulator" ]]; then
    install_emulator
  else
    sdk_packages+=("$package")
  fi
done

# sdkmanager may ask to accept licenses, so it reads from the terminal.
if [[ ${#sdk_packages[@]} -gt 0 ]]; then
  "$sdkmanager" "${sdk_packages[@]}" < /dev/tty >&2
fi

[[ "$(property "$emulator_properties" Pkg.Revision)" == "$ANDROID_EMULATOR_VERSION" &&
  "$(property "$emulator_properties" Pkg.BuildId)" == "$ANDROID_EMULATOR_BUILD" ]] || fail \
  "Emulator build $ANDROID_EMULATOR_BUILD is not version $ANDROID_EMULATOR_VERSION. Fix the pair in scripts/vrt-config.sh."
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
