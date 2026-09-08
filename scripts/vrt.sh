#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=./vrt-config.sh
source "$SCRIPT_DIR/vrt-config.sh"

usage() {
  printf 'Usage: yarn vrt <android|ios> [all|setup|run|test]\n'
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  usage >&2
  exit 1
}

platform="${1:-}"
stage="${2:-all}"

[[ $# -le 2 ]] || fail "Too many arguments."

case "$platform" in
  android | ios) ;;
  -h | --help)
    usage
    exit 0
    ;;
  *) fail "Platform must be 'android' or 'ios'." ;;
esac

case "$stage" in
  all | setup | run | test) ;;
  *) fail "Stage must be 'all', 'setup', 'run', or 'test'." ;;
esac

run_setup() {
  case "$platform" in
    android) "$SCRIPT_DIR/setup-android-emulator.sh" ;;
    ios) "$SCRIPT_DIR/setup-ios-simulator.sh" ;;
  esac
}

run_app() {
  case "$platform" in
    android)
      yarn android:release --device "$ANDROID_AVD_NAME"
      ;;
    ios)
      yarn ios:release --device "$IOS_SIMULATOR_NAME"
      ;;
  esac
}

run_test() {
  local profile

  case "$platform" in
    android) profile="$ANDROID_VRT_PROFILE" ;;
    ios) profile="$IOS_VRT_PROFILE" ;;
  esac

  maestro test \
    --platform "$platform" \
    --env "VRT_PROFILE=$profile" \
    --test-output-dir build/vrt \
    .maestro/vrt.yaml
}

cd "$PROJECT_ROOT"

case "$stage" in
  all)
    run_setup
    run_app
    run_test
    ;;
  setup) run_setup ;;
  run) run_app ;;
  test) run_test ;;
esac
