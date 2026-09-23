#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  printf 'Usage: yarn vrt <android|ios> [all|setup|build|install|verify|e2e|capture|compare|update] [options]\n'
  printf '       yarn vrt <android|ios> capture [--filter <substring>[,...]] [--limit <n>] [--out <dir>]\n'
  printf '       yarn vrt <android|ios> compare partial\n'
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  usage >&2
  exit 1
}

platform="${1:-}"
stage="${2:-all}"
if [[ "$platform" == "-h" || "$platform" == "--help" ]]; then
  usage
  exit 0
fi
if [[ "$stage" == "-h" || "$stage" == "--help" ]]; then
  usage
  exit 0
fi
if [[ $# -gt 2 ]]; then
  shift 2
elif [[ $# -gt 0 ]]; then
  shift $#
fi
stage_args=("$@")

case "$platform" in android | ios) ;; *) fail "Platform must be 'android' or 'ios'." ;; esac
case "$stage" in
  all | setup | build | install | verify | e2e | capture | compare | update) ;;
  *) fail "Unknown stage '$stage'." ;;
esac
if [[ "${#stage_args[@]}" -gt 0 && "$stage" != "capture" && "$stage" != "compare" ]]; then
  fail "Stage '$stage' takes no options."
fi
if [[ "$stage" == "compare" && "${#stage_args[@]}" -gt 1 ]]; then
  fail "compare takes at most one mode: 'partial'."
fi

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
run_capture() { "$SCRIPT_DIR/capture-vrt.sh" "$platform" "$@"; }
run_compare() { "$SCRIPT_DIR/compare-vrt.sh" "$platform" "${1:-compare}"; }
run_update() { "$SCRIPT_DIR/compare-vrt.sh" "$platform" update; }

cd "$PROJECT_ROOT"

# Fail before the expensive stages instead of at the comparison they lead to.
# Nothing here checks the submodule out: the pinned commit has to be chosen by a
# person, not by a script.
if [[ "$stage" == all || "$stage" == compare || "$stage" == update ]]; then
  [[ -e baselines/.git ]] || fail \
    "The baselines submodule is not checked out. Run 'git submodule update --init baselines'."
fi

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
  capture) run_capture ${stage_args[@]+"${stage_args[@]}"} ;;
  compare) run_compare ${stage_args[@]+"${stage_args[@]}"} ;;
  update) run_update ;;
esac
