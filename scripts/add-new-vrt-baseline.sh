#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=./vrt-config.sh
source "$SCRIPT_DIR/vrt-config.sh"

#Example 
# scripts/add-vrt-baseline.sh android testIDRegex
# Android: scripts/add-vrt-baseline.sh android features-direction-
# iOS: scripts/add-vrt-baseline.sh ios features-direction-
usage() {
  printf 'Usage: %s <android|ios> <testIDRegex>\n' "${0##*/}"
  printf 'Captures the scenarios whose image name (test ID without "vrt-") matches\n'
  printf 'the extended regex and copies them into the reviewed baselines, leaving\n'
  printf 'every other baseline untouched. VRT_SUITE=<suite> picks the suite.\n'
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

case "${1:-}" in
  -h | --help)
    usage
    exit 0
    ;;
esac
if [[ $# -ne 2 ]]; then
  usage >&2
  fail "Expected a platform and a testIDRegex."
fi

platform="$1"
regex="$2"
case "$platform" in android | ios) ;; *) fail "Platform must be 'android' or 'ios'." ;; esac
[[ -n "$regex" ]] || fail "testIDRegex must not be empty."

target="$(vrt_target "$platform")"
actual_dir="$PROJECT_ROOT/.vrt/actual/$target"
baseline_dir="$PROJECT_ROOT/tests/vrt/$target"
[[ -d "$baseline_dir" ]] || fail "Reviewed baselines not found in '$baseline_dir'. Run 'yarn vrt $platform update' to create them."

cd "$PROJECT_ROOT"

# Exact image names, so the copy below takes only what the regex selects.
scenario_list="$("$SCRIPT_DIR/list-vrt-scenarios.sh" "$platform")"
grep_status=0
names="$(sed 's/^vrt-//' "$scenario_list" | grep -E -- "$regex")" || grep_status=$?
[[ "$grep_status" -le 1 ]] || fail "Invalid testIDRegex '$regex'."
[[ -n "$names" ]] || fail "No $platform $VRT_SUITE scenario matches '$regex'."
printf 'Selected %s scenario(s):\n' "$(wc -l <<<"$names" | tr -d ' ')"
sed 's/^/  /' <<<"$names"

"$SCRIPT_DIR/vrt.sh" "$platform" setup
"$SCRIPT_DIR/vrt.sh" "$platform" build
"$SCRIPT_DIR/vrt.sh" "$platform" install
# capture matches substrings, so it may also capture a scenario whose ID contains
# a selected one; only the selected images are copied.
VRT_SUITE="$VRT_SUITE" "$SCRIPT_DIR/vrt.sh" "$platform" capture \
  --filter "$(sed 's/^/vrt-/' <<<"$names" | paste -sd, -)"

added=0
replaced=0
while read -r name; do
  image="$actual_dir/$name.png"
  [[ -f "$image" ]] || fail "Capture did not produce '$image'."
  if [[ -f "$baseline_dir/$name.png" ]]; then
    replaced=$((replaced + 1))
  else
    added=$((added + 1))
  fi
  cp "$image" "$baseline_dir/"
done <<<"$names"
printf 'Baselines in %s: %d added, %d replaced.\n' "tests/vrt/$target" "$added" "$replaced"

VRT_SUITE="$VRT_SUITE" "$SCRIPT_DIR/vrt.sh" "$platform" compare partial

printf 'Review the images, then commit them:\n'
sed "s|^|  tests/vrt/$target/|; s|\$|.png|" <<<"$names"
