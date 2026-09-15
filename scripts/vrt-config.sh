#!/usr/bin/env bash

# Shared VRT profile defaults. Callers may override any value through the
# environment before invoking a VRT command.

export VRT_HOST_ARCHITECTURE="${VRT_HOST_ARCHITECTURE:-arm64}"
export VRT_AGENT_DEVICE_VERSION="${VRT_AGENT_DEVICE_VERSION:-0.21.0}"
# CI starts from an erased device. Local development preserves device state so
# setup can be rerun without disrupting an emulator or simulator in use.
export VRT_RESET_DEVICE="${VRT_RESET_DEVICE:-0}"

export ANDROID_API_LEVEL="${ANDROID_API_LEVEL:-36}"
export ANDROID_AVD_NAME="${ANDROID_AVD_NAME:-plaintext_vrt_api${ANDROID_API_LEVEL}_pixel9_arm64_v8a}"
export ANDROID_VRT_PROFILE="${ANDROID_VRT_PROFILE:-$ANDROID_AVD_NAME}"
# A CI host may need a different guest ABI while still comparing the same
# Android device/API rendering contract. Keep the capture profile truthful and
# make cross-profile baseline reuse explicit instead of hiding it in the name.
export ANDROID_VRT_BASELINE_PROFILE="${ANDROID_VRT_BASELINE_PROFILE:-$ANDROID_VRT_PROFILE}"
export ANDROID_DEVICE_TYPE="${ANDROID_DEVICE_TYPE:-pixel_9}"
export ANDROID_SYSTEM_IMAGE="${ANDROID_SYSTEM_IMAGE:-system-images;android-${ANDROID_API_LEVEL};google_apis_playstore;arm64-v8a}"
export ANDROID_SYSTEM_IMAGE_REVISION="${ANDROID_SYSTEM_IMAGE_REVISION:-7}"
export ANDROID_EMULATOR_VERSION="${ANDROID_EMULATOR_VERSION:-37.1.11}"
export ANDROID_EMULATOR_BUILD="${ANDROID_EMULATOR_BUILD:-15917651}"
export ANDROID_RUNTIME="${ANDROID_RUNTIME:-API ${ANDROID_API_LEVEL} Google Play arm64-v8a}"
export ANDROID_RESOLUTION="${ANDROID_RESOLUTION:-1080x2400}"
export ANDROID_DENSITY="${ANDROID_DENSITY:-420}"
export ANDROID_FONT_SCALE="${ANDROID_FONT_SCALE:-1}"
export ANDROID_LOCALE="${ANDROID_LOCALE:-en-US}"
export ANDROID_TIMEZONE="${ANDROID_TIMEZONE:-UTC}"
export ANDROID_EMULATOR_HEADLESS="${ANDROID_EMULATOR_HEADLESS:-0}"

export VRT_DEV_SERVER_PORT="${VRT_DEV_SERVER_PORT:-8081}"
export VRT_APP_SCHEME="${VRT_APP_SCHEME:-exp+react-native-plain-text-example}"
default_vrt_dev_client_url="exp+react-native-plain-text-example://expo-development-client/?url=http%3A%2F%2Flocalhost%3A${VRT_DEV_SERVER_PORT}"
export VRT_DEV_CLIENT_URL="${VRT_DEV_CLIENT_URL:-$default_vrt_dev_client_url}"
unset default_vrt_dev_client_url

export IOS_VERSION="${IOS_VERSION:-26.5}"
export IOS_RUNTIME_BUILD="${IOS_RUNTIME_BUILD:-23F77}"
export IOS_XCODE_VERSION="${IOS_XCODE_VERSION:-26.5}"
export IOS_XCODE_BUILD="${IOS_XCODE_BUILD:-17F42}"
export IOS_LANGUAGE="${IOS_LANGUAGE:-en}"
export IOS_LOCALE="${IOS_LOCALE:-en_US}"
export IOS_APPEARANCE="${IOS_APPEARANCE:-light}"
export IOS_CONTENT_SIZE="${IOS_CONTENT_SIZE:-large}"
export IOS_DEVICE_TYPE="${IOS_DEVICE_TYPE:-iPhone 16 Pro}"
export IOS_SIMULATOR_NAME="${IOS_SIMULATOR_NAME:-PlainText VRT iOS ${IOS_VERSION}}"
export IOS_RUNTIME_ID="${IOS_RUNTIME_ID:-com.apple.CoreSimulator.SimRuntime.iOS-${IOS_VERSION//./-}}"
export IOS_VRT_PROFILE="${IOS_VRT_PROFILE:-plaintext_vrt_ios_${IOS_VERSION//./_}}"
export OPEN_SIMULATOR="${OPEN_SIMULATOR:-1}"
