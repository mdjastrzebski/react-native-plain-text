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
  local actual_dir baseline_dir creating_baseline diff_dir maestro_dir profile screenshots_dir

  case "$platform" in
    android) profile="$ANDROID_VRT_PROFILE" ;;
    ios) profile="$IOS_VRT_PROFILE" ;;
  esac

  baseline_dir="baselines/$platform/$profile"
  actual_dir="build/vrt/actual/$platform/$profile"
  diff_dir="build/vrt/diff/$platform/$profile"
  maestro_dir="build/vrt/maestro/$platform/$profile"
  screenshots_dir="$maestro_dir/screenshots"

  if [[ -d "$baseline_dir" ]]; then
    creating_baseline=0
    printf 'Capturing actual images for %s/%s.\n' "$platform" "$profile"
  else
    creating_baseline=1
    printf 'No baseline found for %s/%s. Creating it in %s.\n' \
      "$platform" "$profile" "$baseline_dir"
  fi

  yarn del-cli "$actual_dir" "$diff_dir" "$maestro_dir"

  maestro test \
    --platform "$platform" \
    --test-output-dir "$maestro_dir" \
    .maestro/vrt.yaml

  [[ -d "$screenshots_dir" ]] || \
    fail "Maestro did not produce a screenshots directory."

  mkdir -p "build/vrt/actual/$platform"
  mv "$screenshots_dir" "$actual_dir"

  if [[ "$creating_baseline" -eq 0 ]]; then
    yarn reg-cli \
      "$actual_dir" \
      "$baseline_dir" \
      "$diff_dir" \
      --extendedErrors \
      --json build/vrt/reg.json \
      --matchingThreshold 0 \
      --thresholdPixel 0
  else
    mkdir -p "baselines/$platform"
    mv "$actual_dir" "$baseline_dir"
    printf 'Baseline created in %s. Review and commit the PNG files.\n' \
      "$baseline_dir"
  fi
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
