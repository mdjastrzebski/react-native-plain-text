#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=./vrt-config.sh
source "$SCRIPT_DIR/vrt-config.sh"

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

# Writes the platform's scenario IDs in VRT_SUITE, derived from
# example/src/vrt/groups.tsx, and prints the file's path. The list is regenerated
# on every call, so it can never lag behind the groups.
platform="${1:-}"
case "$platform" in android | ios) ;; *) fail "Platform must be 'android' or 'ios'." ;; esac

out="$PROJECT_ROOT/.vrt/scenarios/$(vrt_target "$platform").txt"
mkdir -p "$(dirname "$out")"
rm -f "$out"
if ! (
  cd "$PROJECT_ROOT"
  VRT_PLATFORM="$platform" VRT_SUITE="$VRT_SUITE" VRT_SCENARIOS_OUT="$out" \
    yarn jest --silent --testMatch '<rootDir>/scripts/vrt-scenarios/list.jest.ts' \
    </dev/null >"$out.log" 2>&1
); then
  cat "$out.log" >&2
  fail "Could not derive the $platform $VRT_SUITE scenario list from the VRT groups."
fi
[[ -s "$out" ]] || fail "The $platform $VRT_SUITE scenario list at $out is empty."
printf '%s\n' "$out"
