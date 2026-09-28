#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Runs inside ReactiveCircus/android-emulator-runner, which boots the AVD and runs
# the workflow's `script:` line by line under `sh`, so bash has to live here.

run_stage() {
  printf '\n::group::yarn vrt android %s (started %s)\n' "$1" "$(date -u +%H:%M:%SZ)"
  ANDROID_HEADLESS=1 yarn vrt android "$1"
  printf 'yarn vrt android %s finished %s\n' "$1" "$(date -u +%H:%M:%SZ)"
  printf '::endgroup::\n'
}

cd "$PROJECT_ROOT"

run_stage setup

if [[ "${ANDROID_BUILD_CACHE_HIT:-}" != "true" ]]; then
  run_stage build
fi

run_stage install
run_stage e2e
run_stage capture
run_stage compare
