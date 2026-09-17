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

if [[ "$platform" == "android" ]]; then
  # shellcheck source=./load-android-vrt-config.sh
  source "$SCRIPT_DIR/load-android-vrt-config.sh"
fi

case "$stage" in
  all | setup | run | test) ;;
  *) fail "Stage must be 'all', 'setup', 'run', or 'test'." ;;
esac

run_setup() {
  local setup_status

  case "$platform" in
    android)
      "$SCRIPT_DIR/configure-android-vrt-device.sh"
      "$SCRIPT_DIR/verify-vrt-environment.sh" "$platform"
      ;;
    ios)
      if "$SCRIPT_DIR/setup-ios-simulator.sh"; then
        "$SCRIPT_DIR/verify-vrt-environment.sh" "$platform"
      else
        setup_status=$?
        "$SCRIPT_DIR/verify-vrt-environment.sh" "$platform" || true
        return "$setup_status"
      fi
      ;;
  esac
}

run_app() {
  case "$platform" in
    android)
      # Expo resolves --device by AVD name, not by its adb serial.
      yarn android:release --device "$ANDROID_AVD_NAME"
      ;;
    ios)
      yarn ios:release --device "$IOS_SIMULATOR_NAME"
      ;;
  esac
}

sync_baselines() {
  printf 'Syncing the baseline submodule with origin/main branch\n'
  git submodule sync -- baselines
  git submodule update --init --remote --depth 1 --checkout baselines
}

run_test() {
  local actual_dir baseline_dir baseline_parent creating_baseline dev_capture_id
  local canonical_baseline_dir
  local baseline_profile comparison_status dev_mode diff_dir json_file matching_threshold
  local profile report_file

  case "$platform" in
    android)
      profile="$ANDROID_VRT_PROFILE"
      baseline_profile="$ANDROID_VRT_BASELINE_PROFILE"
      matching_threshold=0.004
      ;;
    ios)
      profile="$IOS_VRT_PROFILE"
      baseline_profile="$profile"
      matching_threshold=0
      ;;
  esac

  actual_dir="build/vrt/actual/$platform/$profile"
  diff_dir="build/vrt/diff/$platform/$profile"
  json_file="build/vrt/report/$platform/$profile.json"
  report_file="build/vrt/report/$platform/$profile.html"
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
    sync_baselines

    baseline_parent="baselines/$platform"
    canonical_baseline_dir="$baseline_parent/$baseline_profile"

    if [[ -d "$canonical_baseline_dir" ]]; then
      creating_baseline=0
      baseline_parent="build/vrt/baseline-reviewed/$platform"
      baseline_dir="$baseline_parent/$baseline_profile"
      yarn del-cli "$baseline_dir"
      mkdir -p "$baseline_dir"
      cp -a "$canonical_baseline_dir/." "$baseline_dir/"
      printf 'Capturing actual images for %s/%s against baseline profile %s.\n' \
        "$platform" "$profile" "$baseline_profile"
    else
      creating_baseline=1
      baseline_parent="baselines/$platform"
      baseline_dir="$canonical_baseline_dir"
      printf 'No baseline found for %s/%s. Creating it in %s.\n' \
        "$platform" "$profile" "$baseline_dir"
    fi
  fi

  yarn del-cli "$actual_dir" "$diff_dir"

  if [[ "$dev_mode" -eq 1 && "$platform" == "android" ]]; then
    adb reverse "tcp:$VRT_DEV_SERVER_PORT" "tcp:$VRT_DEV_SERVER_PORT"
  fi

  VRT_MODE_DEV="$dev_mode" \
    "$SCRIPT_DIR/vrt-capture.sh" "$platform" "$actual_dir"

  if [[ "$creating_baseline" -eq 0 ]]; then
    if yarn reg-cli \
      "$actual_dir" \
      "$baseline_dir" \
      "$diff_dir" \
      --extendedErrors \
      --enableAntialias \
      -J "$json_file" \
      --matchingThreshold "$matching_threshold" \
      -R "$report_file" \
      --thresholdPixel 0; then
      comparison_status=0
    else
      comparison_status=$?
    fi

    if [[ -n "$(find "$diff_dir" -type f -print -quit 2>/dev/null)" ]]; then
      printf '\nOpen the visual comparison report:\n  open %s\n' "$report_file"
    fi

    return "$comparison_status"
  else
    mkdir -p "$baseline_parent"
    mv "$actual_dir" "$baseline_dir"

    if [[ "$dev_mode" -eq 1 ]]; then
      printf 'Ignored dev baseline created in %s.\n' "$baseline_dir"
    else
      printf 'Baseline created in %s. Commit it in the baseline repository, then update the submodule pointer in this repository.\n' \
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
