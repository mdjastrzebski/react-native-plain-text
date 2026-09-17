#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=./load-android-vrt-config.sh
source "$SCRIPT_DIR/load-android-vrt-config.sh"

bool_output() {
  case "$1" in
    true | false) printf '%s' "$1" ;;
    *)
      printf 'Error: expected a boolean, received %s.\n' "$1" >&2
      exit 1
      ;;
  esac
}

printf 'api_level=%s\n' "$ANDROID_API_LEVEL"
printf 'target=%s\n' "$ANDROID_SYSTEM_IMAGE_TARGET"
printf 'arch=%s\n' "$ANDROID_SYSTEM_IMAGE_ARCHITECTURE"
printf 'profile=%s\n' "$ANDROID_DEVICE_TYPE"
printf 'cores=%s\n' "$ANDROID_CORES"
printf 'ram_size=%s\n' "$ANDROID_RAM_SIZE"
printf 'heap_size=%s\n' "$ANDROID_HEAP_SIZE"
printf 'disk_size=%s\n' "$ANDROID_DISK_SIZE"
printf 'avd_name=%s\n' "$ANDROID_AVD_NAME"
printf 'force_avd_creation=%s\n' "$(bool_output "$ANDROID_FORCE_RECREATE")"
printf 'boot_timeout=%s\n' "$ANDROID_BOOT_TIMEOUT_SECONDS"
printf 'emulator_port=%s\n' "$ANDROID_EMULATOR_PORT"
printf 'emulator_options=%s\n' "$ANDROID_EMULATOR_OPTIONS"
printf 'disable_animations=%s\n' "$(bool_output "$ANDROID_DISABLE_ANIMATIONS")"
printf 'disable_spellchecker=%s\n' "$(bool_output "$ANDROID_DISABLE_SPELL_CHECKER")"
printf 'disable_linux_hw_accel=%s\n' "$(bool_output "$ANDROID_DISABLE_LINUX_HW_ACCEL")"
printf 'enable_hw_keyboard=%s\n' "$(bool_output "$ANDROID_HARDWARE_KEYBOARD")"
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
printf 'command_line_tools_version=%s\n' "$ANDROID_COMMAND_LINE_TOOLS_VERSION"
printf 'command_line_tools_linux_sha256=%s\n' "$ANDROID_COMMAND_LINE_TOOLS_LINUX_SHA256"
