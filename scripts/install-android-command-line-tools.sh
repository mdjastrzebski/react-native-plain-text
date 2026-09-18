#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=./load-android-vrt-config.sh
source "$SCRIPT_DIR/load-android-vrt-config.sh"

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

[[ "$(uname -s)" == "Linux" ]] || fail "This installer is for Linux CI only."

android_sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
[[ -n "$android_sdk_root" ]] || fail \
  "ANDROID_HOME or ANDROID_SDK_ROOT must identify the Android SDK."

tools_root="$android_sdk_root/cmdline-tools"
tools_dir="$tools_root/latest"
[[ ! -e "$tools_dir" ]] || fail "Command-line tools already exist at $tools_dir."

download_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$download_dir"
}
trap cleanup EXIT

archive="$download_dir/command-line-tools.zip"
download_url="https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_COMMAND_LINE_TOOLS_VERSION}_latest.zip"

printf 'Downloading Android SDK command-line tools %s.\n' \
  "$ANDROID_COMMAND_LINE_TOOLS_VERSION"
curl --fail --location --silent --show-error "$download_url" --output "$archive"

printf '%s  %s\n' "$ANDROID_COMMAND_LINE_TOOLS_LINUX_SHA256" "$archive" \
  | sha256sum --check --status \
  || fail "Command-line tools checksum verification failed."

mkdir -p "$tools_root"
unzip -q "$archive" -d "$download_dir/extracted"
mv "$download_dir/extracted/cmdline-tools" "$tools_dir"

avdmanager="$tools_dir/bin/avdmanager"
[[ -x "$avdmanager" ]] || fail "avdmanager was not installed at $avdmanager."

device_catalog="$($avdmanager list device)"
grep -Eq 'id: [0-9]+ or "pixel_9"' <<< "$device_catalog" \
  || fail "Command-line tools do not provide the pixel_9 hardware profile."

printf 'Android SDK command-line tools %s include the pixel_9 profile.\n' \
  "$ANDROID_COMMAND_LINE_TOOLS_VERSION"
