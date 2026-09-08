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
  local actual_dir baseline_dir baseline_parent creating_baseline dev_capture_id
  local dev_mode diff_dir maestro_dir profile screenshots_dir

  case "$platform" in
    android) profile="$ANDROID_VRT_PROFILE" ;;
    ios) profile="$IOS_VRT_PROFILE" ;;
  esac

  actual_dir="build/vrt/actual/$platform/$profile"
  diff_dir="build/vrt/diff/$platform/$profile"
  maestro_dir="build/vrt/maestro/$platform/$profile"
  screenshots_dir="$maestro_dir/screenshots"
  dev_capture_id="vrt-capture-features-font-size-48"
  dev_mode="${VRT_MODE_DEV:-0}"

  case "$dev_mode" in
    0 | 1) ;;
    *) fail "VRT_MODE_DEV must be '0' or '1'." ;;
  esac

  if [[ "$dev_mode" -eq 1 ]]; then
    baseline_parent="build/vrt/baseline-dev/$platform"
    baseline_dir="$baseline_parent/$profile"

    if [[ -d "$baseline_dir" ]]; then
      creating_baseline=0
      printf 'Dev mode: comparing %s for %s/%s.\n' \
        "$dev_capture_id" "$platform" "$profile"
    else
      creating_baseline=1
      printf 'Dev mode: creating an ignored baseline for %s.\n' \
        "$dev_capture_id"
    fi
  else
    baseline_parent="baselines/$platform"
    baseline_dir="$baseline_parent/$profile"

    if [[ -d "$baseline_dir" ]]; then
      creating_baseline=0
      printf 'Capturing actual images for %s/%s.\n' "$platform" "$profile"
    else
      creating_baseline=1
      printf 'No baseline found for %s/%s. Creating it in %s.\n' \
        "$platform" "$profile" "$baseline_dir"
    fi
  fi

  yarn del-cli "$actual_dir" "$diff_dir" "$maestro_dir"

  maestro test \
    --platform "$platform" \
    --env "VRT_MODE_DEV=$dev_mode" \
    --env "VRT_DEV_CAPTURE_ID=$dev_capture_id" \
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
    mkdir -p "$baseline_parent"
    mv "$actual_dir" "$baseline_dir"

    if [[ "$dev_mode" -eq 1 ]]; then
      printf 'Ignored dev baseline created in %s.\n' "$baseline_dir"
    else
      printf 'Baseline created in %s. Review and commit the PNG files.\n' \
        "$baseline_dir"
    fi
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
