#!/usr/bin/env bash

# Shared VRT profile defaults. Callers may override any value through the
# environment before invoking a VRT command.

export ANDROID_API_LEVEL="${ANDROID_API_LEVEL:-36}"
export ANDROID_AVD_NAME="${ANDROID_AVD_NAME:-plaintext_vrt_api${ANDROID_API_LEVEL}_pixel9_arm64_v8a}"
export ANDROID_VRT_PROFILE="${ANDROID_VRT_PROFILE:-$ANDROID_AVD_NAME}"
export ANDROID_DEVICE_TYPE="${ANDROID_DEVICE_TYPE:-pixel_9}"
export ANDROID_SYSTEM_IMAGE="${ANDROID_SYSTEM_IMAGE:-system-images;android-${ANDROID_API_LEVEL};google_apis_playstore;arm64-v8a}"
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
export IOS_DEVICE_TYPE="${IOS_DEVICE_TYPE:-iPhone 16 Pro}"
export IOS_SIMULATOR_NAME="${IOS_SIMULATOR_NAME:-PlainText VRT iOS ${IOS_VERSION}}"
export IOS_RUNTIME_ID="${IOS_RUNTIME_ID:-com.apple.CoreSimulator.SimRuntime.iOS-${IOS_VERSION//./-}}"
export IOS_VRT_PROFILE="${IOS_VRT_PROFILE:-plaintext_vrt_ios_${IOS_VERSION//./_}}"
export OPEN_SIMULATOR="${OPEN_SIMULATOR:-1}"
