#!/usr/bin/env bash

# Resolve the Android rendering contract from emulator.config.json through the
# vendored CLI. Callers must define PROJECT_ROOT before sourcing this file.

[[ -n "${PROJECT_ROOT:-}" ]] || {
  printf 'Error: PROJECT_ROOT must be set before loading Android VRT configuration.\n' >&2
  return 1
}

android_vrt_config_json="$(cd "$PROJECT_ROOT" && yarn vrt-emulator config)"

android_config_value() {
  jq -er "$1" <<< "$android_vrt_config_json"
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

export VRT_HOST_ARCHITECTURE="$(android_config_value '
  .host
  | if endswith("-arm64") then "arm64"
    elif endswith("-x64") then "x86_64"
    else error("unsupported host architecture")
    end
')"
export ANDROID_API_LEVEL="$(android_config_value '.systemImage.apiLevel')"
export ANDROID_AVD_NAME="$(android_config_value '.avd.name')"
export ANDROID_DEVICE_TYPE="$(android_config_value '.avd.device')"
export ANDROID_SYSTEM_IMAGE="$(android_config_value '.systemImagePackage')"
export ANDROID_SYSTEM_IMAGE_REVISION="$(android_config_value '.systemImage.revision')"
export ANDROID_EMULATOR_VERSION="$(android_config_value '.emulator.version')"
export ANDROID_EMULATOR_BUILD="$(android_config_value '.emulator.buildId')"
export ANDROID_RESOLUTION="$(android_extra_arg_value '-skin')"
export ANDROID_DENSITY="$(android_property_value 'qemu.vrt.density')"
export ANDROID_FONT_SCALE="$(android_property_value 'qemu.vrt.font_scale')"
export ANDROID_LOCALE="$(android_property_value 'persist.sys.locale')"
export ANDROID_TIMEZONE="$(android_extra_arg_value '-timezone')"
export ANDROID_VRT_PROFILE="$ANDROID_AVD_NAME"
export ANDROID_VRT_BASELINE_PROFILE="$ANDROID_AVD_NAME"

unset android_vrt_config_json
unset -f android_config_value android_extra_arg_value android_property_value
