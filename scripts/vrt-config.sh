#!/usr/bin/env bash

# Shared VRT defaults. Every value can be overridden by the caller.
export VRT_APP_ID="${VRT_APP_ID:-plaintext.example}"
export VRT_APP_SCHEME="${VRT_APP_SCHEME:-exp+react-native-plain-text-example}"
# iOS ONLY
export VRT_RESET_DEVICE="${VRT_RESET_DEVICE:-0}"

# Pixel-level comparison policy. matchingThreshold controls how different a
# pixel must be to count as changed. thresholdPixel controls how many changed
# pixels the suite permits after that classification.
export ANDROID_VRT_MATCHING_THRESHOLD="${ANDROID_VRT_MATCHING_THRESHOLD:-0.02}"
export IOS_VRT_MATCHING_THRESHOLD="${IOS_VRT_MATCHING_THRESHOLD:-0}"
export VRT_THRESHOLD_PIXEL="${VRT_THRESHOLD_PIXEL:-0}"

export ANDROID_AVD_NAME="${ANDROID_AVD_NAME:-plaintext_vrt_api36_pixel9}"
export ANDROID_API_LEVEL="${ANDROID_API_LEVEL:-36}"
export ANDROID_SYSTEM_IMAGE_TARGET="${ANDROID_SYSTEM_IMAGE_TARGET:-google_apis}"
export ANDROID_SYSTEM_IMAGE_REVISION="${ANDROID_SYSTEM_IMAGE_REVISION:-7}"
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64) default_android_architecture="arm64-v8a" ;;
  Darwin-x86_64 | Linux-x86_64) default_android_architecture="x86_64" ;;
  *) default_android_architecture="unsupported" ;;
esac
export ANDROID_SYSTEM_IMAGE_ARCHITECTURE="${ANDROID_SYSTEM_IMAGE_ARCHITECTURE:-$default_android_architecture}"
unset default_android_architecture
export ANDROID_EMULATOR_VERSION="${ANDROID_EMULATOR_VERSION:-37.1.11}"
export ANDROID_EMULATOR_BUILD="${ANDROID_EMULATOR_BUILD:-15917651}"
export ANDROID_EMULATOR_PORT="${ANDROID_EMULATOR_PORT:-5554}"
export ANDROID_BOOT_TIMEOUT_SECONDS="${ANDROID_BOOT_TIMEOUT_SECONDS:-600}"
export ANDROID_GPU_MODE="${ANDROID_GPU_MODE:-swiftshader_indirect}"
export ANDROID_HEADLESS="${ANDROID_HEADLESS:-0}"
export ANDROID_DEVICE_TYPE="${ANDROID_DEVICE_TYPE:-pixel_9}"
export ANDROID_CORES="${ANDROID_CORES:-4}"
export ANDROID_RAM_SIZE="${ANDROID_RAM_SIZE:-2048M}"
export ANDROID_HEAP_SIZE="${ANDROID_HEAP_SIZE:-512M}"
export ANDROID_DISK_SIZE="${ANDROID_DISK_SIZE:-6G}"
export ANDROID_HARDWARE_KEYBOARD="${ANDROID_HARDWARE_KEYBOARD:-yes}"
export ANDROID_RESOLUTION="${ANDROID_RESOLUTION:-1080x2400}"
export ANDROID_DENSITY="${ANDROID_DENSITY:-420}"
export ANDROID_FONT_SCALE="${ANDROID_FONT_SCALE:-1}"
export ANDROID_LOCALE="${ANDROID_LOCALE:-en-US}"
export ANDROID_TIMEZONE="${ANDROID_TIMEZONE:-UTC}"

export IOS_VERSION="${IOS_VERSION:-26.5}"
export IOS_RUNTIME_BUILD="${IOS_RUNTIME_BUILD:-23F77}"
# Pixels come from the simulator runtime pinned above, not from Xcode, so any
# Xcode of this major version is accepted locally. CI still pins the exact
# Xcode in .github/workflows/visual-test.yml.
export IOS_XCODE_MAJOR="${IOS_XCODE_MAJOR:-26}"
export IOS_SIMULATOR_NAME="${IOS_SIMULATOR_NAME:-PlainText VRT iOS ${IOS_VERSION}}"
export IOS_RUNTIME_ID="${IOS_RUNTIME_ID:-com.apple.CoreSimulator.SimRuntime.iOS-${IOS_VERSION//./-}}"
export IOS_DEVICE_TYPE_ID="${IOS_DEVICE_TYPE_ID:-com.apple.CoreSimulator.SimDeviceType.iPhone-16-Pro}"
export IOS_LANGUAGE="${IOS_LANGUAGE:-en}"
export IOS_LOCALE="${IOS_LOCALE:-en_US}"
# Screenshots are requested at the pinned device's scale (iPhone 16 Pro is @3x).
# Baselines were captured at this density, so changing it invalidates every iOS
# image rather than rescaling it.
export IOS_VRT_PIXEL_DENSITY="${IOS_VRT_PIXEL_DENSITY:-3}"

# A scenario's image is named after its test ID, `vrt-<name>.png`. Baselines
# recorded before the test IDs were renamed use `vrt-capture-<name>.png`, so every
# baseline lookup tries the current name first and falls back to the legacy one.
# `yarn vrt <platform> update` rewrites a platform's baselines under the current
# names, after which the fallback is dead for that platform.

# vrt_legacy_image_name <image>: the pre-rename file name of a current image name.
vrt_legacy_image_name() {
  printf 'vrt-capture-%s\n' "${1#vrt-}"
}

# Reads image file names on stdin and writes each under its current name.
vrt_current_image_names() {
  sed 's/^vrt-capture-/vrt-/'
}

# vrt_baseline_path <directory> <image>: the baseline file for a current image
# name, falling back to its legacy name. Fails when neither exists.
vrt_baseline_path() {
  local legacy
  legacy="$(vrt_legacy_image_name "$2")"
  if [[ -f "$1/$2" ]]; then
    printf '%s\n' "$1/$2"
  elif [[ -f "$1/$legacy" ]]; then
    printf '%s\n' "$1/$legacy"
  else
    return 1
  fi
}
