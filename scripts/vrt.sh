#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  printf 'Usage: yarn vrt <android|ios> [all|setup|build|install|verify|e2e|capture|compare|update]\n'
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  usage >&2
  exit 1
}

platform="${1:-}"
stage="${2:-all}"
[[ $# -le 2 ]] || fail "Too many arguments."
if [[ "$platform" == "-h" || "$platform" == "--help" ]]; then
  usage
  exit 0
fi
case "$platform" in android | ios) ;; *) fail "Platform must be 'android' or 'ios'." ;; esac
case "$stage" in all | setup | build | install | verify | e2e | capture | compare | update) ;; *) fail "Unknown stage '$stage'." ;; esac

run_setup() {
  case "$platform" in
    android) "$SCRIPT_DIR/setup-android-vrt-device.sh" ;;
    ios) "$SCRIPT_DIR/setup-ios-vrt-simulator.sh" ;;
  esac
}

run_build() { "$SCRIPT_DIR/build-vrt-app.sh" "$platform"; }
run_install() { "$SCRIPT_DIR/install-vrt-app.sh" "$platform"; }
run_verify() { "$SCRIPT_DIR/verify-vrt-environment.sh" "$platform"; }
run_e2e() { "$SCRIPT_DIR/run-vrt-e2e.sh" "$platform"; }
run_capture() { "$SCRIPT_DIR/capture-vrt.sh" "$platform"; }
run_compare() { "$SCRIPT_DIR/compare-vrt.sh" "$platform"; }
run_update() { "$SCRIPT_DIR/compare-vrt.sh" "$platform" update; }

cd "$PROJECT_ROOT"
case "$stage" in
  all)
    run_setup
    run_build
    run_install
    run_e2e
    run_capture
    run_compare
    ;;
  setup) run_setup ;;
  build) run_build ;;
  install) run_install ;;
  verify) run_verify ;;
  e2e) run_e2e ;;
  capture) run_capture ;;
  compare) run_compare ;;
  update) run_update ;;
esac
