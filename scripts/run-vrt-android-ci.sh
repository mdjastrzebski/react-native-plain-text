#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Runs inside ReactiveCircus/android-emulator-runner, which boots the pinned AVD and
# hands it over through ANDROID_SERIAL/EMULATOR_PORT. That action executes the workflow's
# `script:` one line at a time under `sh`, so every bash idiom (a function, `set -o
# pipefail`) has to live in a real bash file like this one rather than inline in YAML.

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

# Capture drives specimens through Appduct, so the artifact must carry it. Assert against
# the built APK rather than trusting APPDUCT_ENABLED.
./node_modules/.bin/appduct doctor build/vrt/apps/android/app-release.apk --assert-present

run_stage install
run_stage e2e
run_stage capture
run_stage compare
