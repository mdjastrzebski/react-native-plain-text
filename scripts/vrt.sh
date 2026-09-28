#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  printf 'Usage: yarn vrt <android|ios> [all|setup|build|install|verify|e2e|capture|compare|update] [options]\n'
  printf '       yarn vrt <android|ios> capture [--filter <substring>[,...]] [--limit <n>]\n'
  printf '       yarn vrt <android|ios> compare partial\n'
  printf 'capture, compare and update run every suite in turn; VRT_SUITE=<suite> runs one.\n'
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
# A capture leaves the device at its suite's text size; verify checks this suite's.
run_verify() {
  "$SCRIPT_DIR/apply-vrt-text-size.sh" "$platform"
  "$SCRIPT_DIR/verify-vrt-environment.sh" "$platform"
}
run_e2e() { "$SCRIPT_DIR/run-vrt-e2e.sh" "$platform"; }
run_capture() { "$SCRIPT_DIR/capture-vrt.sh" "$platform" "$@"; }
run_compare() { "$SCRIPT_DIR/compare-vrt.sh" "$platform" "${1:-compare}"; }
run_update() { "$SCRIPT_DIR/compare-vrt.sh" "$platform" update; }

# Every suite, in order (VRT_SUITES in example/src/vrt/utils.ts), unless VRT_SUITE
# names one. Each capture switches the device to its suite's text size itself.
if [[ -n "${VRT_SUITE:-}" ]]; then
  suites=("$VRT_SUITE")
else
  suites=(default font-scale)
fi

suite_target() {
  if [[ "$1" == "default" ]]; then
    printf '%s' "$platform"
  else
    printf '%s-%s' "$platform" "$1"
  fi
}

announce_suite() {
  [[ "${#suites[@]}" -gt 1 ]] && printf '\n== %s %s suite ==\n' "$platform" "$1"
  return 0
}

capture_filter() {
  local filter=""
  while [[ $# -gt 0 ]]; do
    if [[ "$1" == "--filter" && $# -ge 2 ]]; then
      filter="$2"
      shift
    fi
    shift
  done
  printf '%s' "$filter"
}

# Whether a filter selects any scenario of the suite. Mirrors capture_selected in
# capture-vrt.sh.
suite_matches_filter() {
  local suite="$1" filter="$2" list id pattern
  [[ -z "$filter" ]] && return 0
  list="$(VRT_SUITE="$suite" "$SCRIPT_DIR/list-vrt-scenarios.sh" "$platform")"
  local IFS=','
  while read -r id; do
    for pattern in $filter; do
      [[ -n "$pattern" && "$id" == *"$pattern"* ]] && return 0
    done
  done < "$list"
  return 1
}

# A filtered capture skips the suites it selects nothing in, and drops their older
# partial captures so `compare partial` only sees this run's.
capture_suites() {
  local filter suite partial_dir
  filter="$(capture_filter "$@")"
  for suite in "${suites[@]}"; do
    if [[ "${#suites[@]}" -gt 1 ]] && ! suite_matches_filter "$suite" "$filter"; then
      partial_dir=".vrt/actual/$(suite_target "$suite")"
      [[ -f "$partial_dir/.partial" ]] && yarn del-cli "$partial_dir"
      printf 'Skipping the %s suite: --filter %s selects none of it.\n' "$suite" "$filter"
      continue
    fi
    announce_suite "$suite"
    (export VRT_SUITE="$suite"; run_capture "$@")
  done
}

# Compares every suite even after one fails, so a run reports all of them.
compare_suites() {
  local mode="${1:-compare}" suite compared=0 failed=()
  for suite in "${suites[@]}"; do
    if [[ "$mode" == "partial" && "${#suites[@]}" -gt 1 &&
      ! -f ".vrt/actual/$(suite_target "$suite")/.partial" ]]; then
      continue
    fi
    compared=$((compared + 1))
    announce_suite "$suite"
    (export VRT_SUITE="$suite"; run_compare "$mode") || failed+=("$suite")
  done
  if [[ "$compared" -eq 0 ]]; then
    printf 'Error: no %s suite has a partial capture to compare. Run a filtered capture first.\n' \
      "$platform" >&2
    return 1
  fi
  if [[ "${#failed[@]}" -gt 0 ]]; then
    printf 'Error: %s VRT failed in: %s.\n' "$platform" "${failed[*]}" >&2
    return 1
  fi
}

update_suites() {
  local suite
  for suite in "${suites[@]}"; do
    announce_suite "$suite"
    (export VRT_SUITE="$suite"; run_update)
  done
}

cd "$PROJECT_ROOT"

case "$stage" in
  all)
    run_setup
    run_build
    run_install
    run_e2e
    capture_suites
    compare_suites
    ;;
  setup) run_setup ;;
  build) run_build ;;
  install) run_install ;;
  verify) run_verify ;;
  e2e) run_e2e ;;
  capture) capture_suites ${stage_args[@]+"${stage_args[@]}"} ;;
  compare) compare_suites ${stage_args[@]+"${stage_args[@]}"} ;;
  update) update_suites ;;
esac
