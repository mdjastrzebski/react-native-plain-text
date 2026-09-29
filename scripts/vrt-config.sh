#!/usr/bin/env bash

# Shared VRT defaults. Every value can be overridden by the caller.
export VRT_APP_ID="${VRT_APP_ID:-plaintext.example}"
export VRT_APP_SCHEME="${VRT_APP_SCHEME:-exp+react-native-plain-text-example}"
# iOS only.
export VRT_RESET_DEVICE="${VRT_RESET_DEVICE:-0}"

# The suite picks which scenarios run (the `suite` of their groups in
# examples/shared/src/vrt/groups.tsx) and the system text size they are captured at.
# Each suite keeps its own captures, reports and baselines.
#   default     all other scenarios, at the platform's default text size
#   font-scale  the font-scaling scenarios, at a large but common text size:
#               Android's 1.3 and iOS's largest non-accessibility size (1.353x)
export VRT_SUITE="${VRT_SUITE:-default}"
case "$VRT_SUITE" in
  default)
    suite_android_font_scale=1
    suite_ios_content_size=large
    ;;
  font-scale)
    suite_android_font_scale=1.3
    suite_ios_content_size=extra-extra-extra-large
    ;;
  *)
    printf "Error: VRT_SUITE must be 'default' or 'font-scale', not '%s'.\n" "$VRT_SUITE" >&2
    exit 1
    ;;
esac

# The name a platform's captures, reports and baselines use in this suite:
# `android` in the default suite, `android-font-scale` in the font-scale one.
vrt_target() {
  if [[ "$VRT_SUITE" == "default" ]]; then
    printf '%s' "$1"
  else
    printf '%s-%s' "$1" "$VRT_SUITE"
  fi
}

# Pixel-level comparison policy. matchingThreshold controls how different a
# pixel must be to count as changed. thresholdPixel controls how many changed
# pixels the suite permits after that classification.
export ANDROID_VRT_MATCHING_THRESHOLD="${ANDROID_VRT_MATCHING_THRESHOLD:-0.02}"
export IOS_VRT_MATCHING_THRESHOLD="${IOS_VRT_MATCHING_THRESHOLD:-0}"
export VRT_THRESHOLD_PIXEL="${VRT_THRESHOLD_PIXEL:-0}"

export ANDROID_AVD_NAME="${ANDROID_AVD_NAME:-plaintext_vrt_api36_pixel9}"
export ANDROID_API_LEVEL="${ANDROID_API_LEVEL:-36}"
export ANDROID_SYSTEM_IMAGE_TARGET="${ANDROID_SYSTEM_IMAGE_TARGET:-google_apis}"
# sdkmanager (and android-emulator-runner in CI) only installs the newest
# revision, so a new Google release breaks Android VRT until this and
# VRT_TOOLCHAIN in .github/workflows/vrt.yml are bumped. See
# docs/contributing/visual-regression-testing.md.
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
export ANDROID_FONT_SCALE="${ANDROID_FONT_SCALE:-$suite_android_font_scale}"
# Android formats the stored scale itself, so the '1' set here can read back as
# '1.0'. Compare the numbers, not the strings.
android_font_scale_is() {
  awk -v actual="$1" -v expected="$2" 'BEGIN { exit !(actual != "" && actual + 0 == expected + 0) }'
}
export ANDROID_LOCALE="${ANDROID_LOCALE:-en-US}"
export ANDROID_TIMEZONE="${ANDROID_TIMEZONE:-UTC}"

export IOS_VERSION="${IOS_VERSION:-26.5}"
export IOS_RUNTIME_BUILD="${IOS_RUNTIME_BUILD:-23F77}"
# Pixels come from the simulator runtime pinned above, not from Xcode, so any
# Xcode of this major version is accepted locally. CI still pins the exact
# Xcode in .github/workflows/vrt.yml.
export IOS_XCODE_MAJOR="${IOS_XCODE_MAJOR:-26}"
export IOS_SIMULATOR_NAME="${IOS_SIMULATOR_NAME:-PlainText VRT iOS ${IOS_VERSION}}"
export IOS_RUNTIME_ID="${IOS_RUNTIME_ID:-com.apple.CoreSimulator.SimRuntime.iOS-${IOS_VERSION//./-}}"
export IOS_DEVICE_TYPE_ID="${IOS_DEVICE_TYPE_ID:-com.apple.CoreSimulator.SimDeviceType.iPhone-16-Pro}"
export IOS_LANGUAGE="${IOS_LANGUAGE:-en}"
export IOS_LOCALE="${IOS_LOCALE:-en_US}"
export IOS_CONTENT_SIZE="${IOS_CONTENT_SIZE:-$suite_ios_content_size}"
unset suite_android_font_scale suite_ios_content_size
# Screenshots use the device's scale (iPhone 16 Pro is @3x). Changing it
# invalidates every iOS baseline rather than rescaling it.
export IOS_VRT_PIXEL_DENSITY="${IOS_VRT_PIXEL_DENSITY:-3}"
