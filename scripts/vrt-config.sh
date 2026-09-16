#!/usr/bin/env bash

# Shared VRT profile defaults. Callers may override any value through the
# environment before invoking a VRT command.

export VRT_HOST_ARCHITECTURE="${VRT_HOST_ARCHITECTURE:-arm64}"
export VRT_AGENT_DEVICE_VERSION="${VRT_AGENT_DEVICE_VERSION:-0.21.0}"
# CI starts from an erased iOS simulator. Local iOS development preserves
# simulator state so setup does not disrupt a device in use. Android lifecycle
# isolation comes from emulator.config.json.
export VRT_RESET_DEVICE="${VRT_RESET_DEVICE:-0}"

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
