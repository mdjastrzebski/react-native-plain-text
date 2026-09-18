#!/usr/bin/env bash

# Resolve the Android rendering contract directly from emulator.config.json.
# Callers must define PROJECT_ROOT before sourcing this file.

[[ -n "${PROJECT_ROOT:-}" ]] || {
  printf 'Error: PROJECT_ROOT must be set before loading Android VRT configuration.\n' >&2
  return 1
}

android_vrt_config_json="$(jq -ec '.' "$PROJECT_ROOT/emulator.config.json")"

android_config_value() {
  jq -er "$@" <<< "$android_vrt_config_json"
}

android_extra_arg_value() {
  jq -er --arg flag "$1" '
    .launch.extraArgs as $args
    | ($args | index($flag)) as $index
    | if $index == null or $index + 1 >= ($args | length)
      then error("missing launch argument " + $flag)
      else $args[$index + 1]
      end
  ' <<< "$android_vrt_config_json"
}

android_property_value() {
  jq -er --arg property "$1" '
    [
      .launch.extraArgs[]
      | select(startswith($property + "="))
      | ltrimstr($property + "=")
    ][0] // error("missing launch property " + $property)
  ' <<< "$android_vrt_config_json"
}

case "$(uname -s)-$(uname -m)" in
  Darwin-arm64) android_config_host="darwin-arm64" ;;
  Darwin-x86_64) android_config_host="darwin-x64" ;;
  Linux-x86_64) android_config_host="linux-x64" ;;
  *)
    printf 'Error: unsupported Android VRT host: %s-%s\n' \
      "$(uname -s)" "$(uname -m)" >&2
    return 1
    ;;
esac

case "$android_config_host" in
  *-arm64) export VRT_HOST_ARCHITECTURE="arm64" ;;
  *-x64) export VRT_HOST_ARCHITECTURE="x86_64" ;;
esac

export ANDROID_SDK_CHANNEL="$(android_config_value '.sdk.channel')"
export ANDROID_COMMAND_LINE_TOOLS_VERSION="$(android_config_value '.sdk.commandLineToolsVersion')"
export ANDROID_COMMAND_LINE_TOOLS_LINUX_SHA256="$(android_config_value '.sdk.commandLineToolsLinuxSha256')"
export ANDROID_API_LEVEL="$(android_config_value '.systemImage.apiLevel')"
export ANDROID_SYSTEM_IMAGE_TARGET="$(android_config_value '.systemImage.target')"
export ANDROID_SYSTEM_IMAGE_ARCHITECTURE="$(android_config_value \
  --arg host "$android_config_host" '.systemImage.architectureByHost[$host]')"
export ANDROID_AVD_NAME="$(android_config_value \
  '.avd.namePrefix + "_api" + .systemImage.apiLevel + "_" + (.avd.device | gsub("_"; ""))')"
export ANDROID_DEVICE_TYPE="$(android_config_value '.avd.device')"
export ANDROID_SYSTEM_IMAGE="system-images;android-$ANDROID_API_LEVEL;$ANDROID_SYSTEM_IMAGE_TARGET;$ANDROID_SYSTEM_IMAGE_ARCHITECTURE"
export ANDROID_SYSTEM_IMAGE_REVISION="$(android_config_value '.systemImage.revision')"
export ANDROID_EMULATOR_VERSION="$(android_config_value '.emulator.version')"
export ANDROID_EMULATOR_BUILD="$(android_config_value '.emulator.buildId')"
export ANDROID_CORES="$(android_config_value '.avd.cores')"
export ANDROID_RAM_SIZE="$(android_config_value '.avd.ramSize')"
export ANDROID_HEAP_SIZE="$(android_config_value '.avd.heapSize')"
export ANDROID_DISK_SIZE="$(android_config_value '.avd.diskSize')"
export ANDROID_HARDWARE_KEYBOARD="$(android_config_value '.avd.hardwareKeyboard')"
export ANDROID_FORCE_RECREATE="$(android_config_value '.avd.forceRecreate')"
export ANDROID_BOOT_TIMEOUT_SECONDS="$(android_config_value '.launch.bootTimeoutSeconds')"
export ANDROID_EMULATOR_PORT="$(android_config_value '.launch.port')"
export ANDROID_DISABLE_ANIMATIONS="$(android_config_value '.launch.disableAnimations')"
export ANDROID_DISABLE_SPELL_CHECKER="$(android_config_value '.launch.disableSpellChecker')"
export ANDROID_DISABLE_LINUX_HW_ACCEL="$(android_config_value '.launch.disableLinuxHardwareAcceleration')"
export ANDROID_RESOLUTION="$(android_extra_arg_value '-skin')"
export ANDROID_DENSITY="$(android_property_value 'qemu.vrt.density')"
export ANDROID_FONT_SCALE="$(android_property_value 'qemu.vrt.font_scale')"
export ANDROID_LOCALE="$(android_config_value '.launch.locale')"
export ANDROID_TIMEZONE="$(android_config_value '.launch.timezone')"
export ANDROID_EMULATOR_OPTIONS="$(android_config_value '
  [
    (if .launch.headless then "-no-window" else empty end),
    "-gpu", .launch.gpu,
    (if .launch.noSnapshot then "-no-snapshot" else empty end),
    (if .launch.noAudio then "-noaudio" else empty end),
    (if .launch.noBootAnimation then "-no-boot-anim" else empty end)
  ] + .launch.extraArgs | join(" ")
')"
export ANDROID_VRT_PROFILE="$ANDROID_AVD_NAME"
export ANDROID_VRT_BASELINE_PROFILE="$ANDROID_AVD_NAME"

unset android_config_host android_vrt_config_json
unset -f android_config_value android_extra_arg_value android_property_value
