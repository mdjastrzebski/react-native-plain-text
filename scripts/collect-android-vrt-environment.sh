#!/usr/bin/env bash

# Collect the effective emulator and device configuration without making the
# VRT run fail when an individual diagnostic is unavailable.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=./load-android-vrt-config.sh
source "$SCRIPT_DIR/load-android-vrt-config.sh"

output_dir="$PROJECT_ROOT/build/vrt/environment/android-details"
mkdir -p "$output_dir"

section() {
  printf '\n===== %s =====\n' "$1"
}

capture_file() {
  local label="$1"
  local source_file="$2"
  local destination_file="$3"

  section "$label"
  if [[ -f "$source_file" ]]; then
    tee "$destination_file" < "$source_file"
  else
    printf 'Unavailable: %s\n' "$source_file" | tee "$destination_file"
  fi
}

capture_file \
  "Repository emulator.config.json" \
  "$PROJECT_ROOT/emulator.config.json" \
  "$output_dir/emulator.config.json"

section "Repository and workflow identity"
{
  printf 'commit=%s\n' "$(git -C "$PROJECT_ROOT" rev-parse HEAD)"
  sed -n '/ReactiveCircus\/android-emulator-runner@/p' \
    "$PROJECT_ROOT/.github/workflows/visual-test.yml"
} 2>&1 | tee "$output_dir/source.txt"

section "Declared android-emulator-runner inputs"
{
  printf 'api_level=%s\n' "$ANDROID_API_LEVEL"
  printf 'target=%s\n' "$ANDROID_SYSTEM_IMAGE_TARGET"
  printf 'arch=%s\n' "$ANDROID_SYSTEM_IMAGE_ARCHITECTURE"
  printf 'profile=%s\n' "$ANDROID_DEVICE_TYPE"
  printf 'cores=%s\n' "$ANDROID_CORES"
  printf 'ram_size=%s\n' "$ANDROID_RAM_SIZE"
  printf 'heap_size=%s\n' "$ANDROID_HEAP_SIZE"
  printf 'disk_size=%s\n' "$ANDROID_DISK_SIZE"
  printf 'avd_name=%s\n' "$ANDROID_AVD_NAME"
  printf 'force_avd_creation=%s\n' "$ANDROID_FORCE_RECREATE"
  printf 'boot_timeout=%s\n' "$ANDROID_BOOT_TIMEOUT_SECONDS"
  printf 'emulator_port=%s\n' "$ANDROID_EMULATOR_PORT"
  printf 'emulator_options=%s\n' "$ANDROID_EMULATOR_OPTIONS"
  printf 'disable_animations=%s\n' "$ANDROID_DISABLE_ANIMATIONS"
  printf 'disable_spellchecker=%s\n' "$ANDROID_DISABLE_SPELL_CHECKER"
  printf 'disable_linux_hw_accel=%s\n' "$ANDROID_DISABLE_LINUX_HW_ACCEL"
  printf 'enable_hw_keyboard=%s\n' "$ANDROID_HARDWARE_KEYBOARD"
  printf 'emulator_build=%s\n' "$ANDROID_EMULATOR_BUILD"
  printf 'expected_emulator_version=%s\n' "$ANDROID_EMULATOR_VERSION"
  printf 'system_image=%s\n' "$ANDROID_SYSTEM_IMAGE"
  printf 'configured_system_image_revision=%s\n' "$ANDROID_SYSTEM_IMAGE_REVISION"
  printf 'resolution=%s\n' "$ANDROID_RESOLUTION"
  printf 'density=%s\n' "$ANDROID_DENSITY"
  printf 'font_scale=%s\n' "$ANDROID_FONT_SCALE"
  printf 'locale=%s\n' "$ANDROID_LOCALE"
  printf 'timezone=%s\n' "$ANDROID_TIMEZONE"
  printf 'channel=%s\n' "$ANDROID_SDK_CHANNEL"
} | tee "$output_dir/action-inputs.txt"

section "Host"
{
  uname -a
  if [[ -f /etc/os-release ]]; then
    sed -n '1,80p' /etc/os-release
  fi
  command -v lscpu >/dev/null 2>&1 && lscpu
  if [[ -e /dev/kvm ]]; then
    ls -l /dev/kvm
  else
    printf '/dev/kvm is unavailable\n'
  fi
} 2>&1 | tee "$output_dir/host.txt"

android_sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [[ -z "$android_sdk_root" ]]; then
  printf 'ANDROID_HOME and ANDROID_SDK_ROOT are unset.\n' | tee "$output_dir/sdk-error.txt"
  exit 0
fi

emulator="$android_sdk_root/emulator/emulator"
adb="$android_sdk_root/platform-tools/adb"
sdkmanager=""
avdmanager=""
for candidate in \
  "$android_sdk_root/cmdline-tools/latest/bin/sdkmanager" \
  "$android_sdk_root"/cmdline-tools/latest-*/bin/sdkmanager \
  "$android_sdk_root"/cmdline-tools/*/bin/sdkmanager \
  "$android_sdk_root/tools/bin/sdkmanager"; do
  if [[ -x "$candidate" ]]; then
    sdkmanager="$candidate"
    avdmanager="$(dirname "$candidate")/avdmanager"
    break
  fi
done

section "Emulator version and acceleration"
{
  "$emulator" -version
  "$emulator" -accel-check
} 2>&1 | tee "$output_dir/emulator-version.txt" || true

section "Installed SDK packages"
if [[ -n "$sdkmanager" ]]; then
  "$sdkmanager" --list_installed 2>&1 | tee "$output_dir/sdk-packages.txt" || true
else
  printf 'sdkmanager not found under %s\n' "$android_sdk_root" \
    | tee "$output_dir/sdk-packages.txt"
fi

section "Available AVD hardware profiles"
if [[ -x "$avdmanager" ]]; then
  "$avdmanager" list device 2>&1 | tee "$output_dir/avd-device-profiles.txt" || true
else
  printf 'avdmanager not found under %s\n' "$android_sdk_root" \
    | tee "$output_dir/avd-device-profiles.txt"
fi

avd_home="${ANDROID_AVD_HOME:-${ANDROID_USER_HOME:-$HOME/.android}/avd}"
avd_dir="$avd_home/$ANDROID_AVD_NAME.avd"
capture_file "AVD config.ini" "$avd_dir/config.ini" "$output_dir/avd-config.ini"
capture_file "AVD hardware-qemu.ini" "$avd_dir/hardware-qemu.ini" "$output_dir/hardware-qemu.ini"

section "Emulator process command line"
ps -eo pid,args 2>&1 | awk '/[e]mulator.*-avd/ { print }' \
  | tee "$output_dir/emulator-command.txt" || true

system_image_dir="$android_sdk_root/system-images/android-$ANDROID_API_LEVEL/$ANDROID_SYSTEM_IMAGE_TARGET/$ANDROID_SYSTEM_IMAGE_ARCHITECTURE"
capture_file \
  "System image source.properties" \
  "$system_image_dir/source.properties" \
  "$output_dir/system-image-source.properties"

if [[ ! -x "$adb" ]]; then
  printf 'adb not found at %s\n' "$adb" | tee "$output_dir/adb-error.txt"
  exit 0
fi

running_serial="${ANDROID_SERIAL:-}"
if [[ -z "$running_serial" ]]; then
  while read -r serial; do
    running_avd_name="$($adb -s "$serial" emu avd name 2>/dev/null | sed -n '1p' | tr -d '\r')"
    if [[ "$running_avd_name" == "$ANDROID_AVD_NAME" ]]; then
      running_serial="$serial"
      break
    fi
  done < <("$adb" devices | awk '$1 ~ /^emulator-/ && $2 == "device" { print $1 }')
fi

if [[ -z "$running_serial" ]]; then
  printf 'No running emulator named %s was found.\n' "$ANDROID_AVD_NAME" \
    | tee "$output_dir/adb-error.txt"
  exit 0
fi

device_adb=("$adb" -s "$running_serial")

section "Android device properties"
"${device_adb[@]}" shell getprop 2>&1 | tr -d '\r' \
  | tee "$output_dir/device-properties.txt" || true

section "Android display and renderer"
{
  "${device_adb[@]}" shell wm size
  "${device_adb[@]}" shell wm density
  "${device_adb[@]}" shell dumpsys display
  "${device_adb[@]}" shell dumpsys SurfaceFlinger \
    | grep -E 'GLES|Display|Color|density|orientation' || true
} 2>&1 | tr -d '\r' | tee "$output_dir/display.txt" || true

for settings_namespace in system global secure; do
  section "Android $settings_namespace settings"
  "${device_adb[@]}" shell settings list "$settings_namespace" 2>&1 \
    | tr -d '\r' \
    | tee "$output_dir/settings-$settings_namespace.txt" || true
done

section "Android system fonts"
"${device_adb[@]}" shell \
  'find /system/fonts -type f -exec sha256sum {} \; 2>/dev/null; sha256sum /system/etc/fonts.xml 2>/dev/null' \
  2>&1 | tr -d '\r' | tee "$output_dir/fonts.txt" || true

section "Android logcat"
"${device_adb[@]}" logcat -d -v threadtime 2>&1 | tr -d '\r' \
  | tee "$output_dir/logcat.txt" || true

section "Android package and build identity"
{
  printf 'serial=%s\n' "$running_serial"
  printf 'avd_name=%s\n' \
    "$("${device_adb[@]}" emu avd name 2>/dev/null | sed -n '1p' | tr -d '\r')"
  printf 'system_image=%s\n' "$ANDROID_SYSTEM_IMAGE"
  printf 'configured_system_image_revision=%s\n' "$ANDROID_SYSTEM_IMAGE_REVISION"
} 2>&1 | tee "$output_dir/identity.txt"

find "$avd_dir" -maxdepth 1 -type f -name '*.log' -exec cp -a {} "$output_dir/" \; 2>/dev/null || true
