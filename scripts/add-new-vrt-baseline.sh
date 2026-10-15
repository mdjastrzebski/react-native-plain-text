#!/usr/bin/env bash

# Adds baselines for new scenarios without touching existing ones.
# Example: scripts/add-new-vrt-baseline.sh android features-direction-

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=./vrt-config.sh
source "$SCRIPT_DIR/vrt-config.sh"

usage() {
  printf 'Usage: %s <android|ios> <testIDRegex>\n' "${0##*/}"
  printf 'Captures the scenarios whose image name (test ID without "vrt-") matches\n'
  printf 'the extended regex and have no baseline yet, and adds them to the reviewed\n'
  printf 'baselines. Existing baselines are never replaced: use `yarn vrt <platform>\n'
  printf 'update` for that. VRT_SUITE=<suite> picks the suite.\n'
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

# Exact image names, so only what the regex selects is copied later.
scenario_list="$("$SCRIPT_DIR/list-vrt-scenarios.sh" "$platform")"
grep_status=0
matched="$(sed 's/^vrt-//' "$scenario_list" | grep -E -- "$regex")" || grep_status=$?
[[ "$grep_status" -le 1 ]] || fail "Invalid testIDRegex '$regex'."
[[ -n "$matched" ]] || fail "No $platform $VRT_SUITE scenario matches '$regex'."

names=()
while read -r name; do
  if [[ -f "$baseline_dir/$name.png" ]]; then
    printf 'Skipping %s: it already has a baseline.\n' "$name"
  else
    names+=("$name")
  fi
done <<<"$matched"
[[ ${#names[@]} -gt 0 ]] || fail "Every scenario matching '$regex' already has a baseline."

printf 'Adding %s baseline(s):\n' "${#names[@]}"
printf '  %s\n' "${names[@]}"

"$SCRIPT_DIR/vrt.sh" "$platform" setup
"$SCRIPT_DIR/vrt.sh" "$platform" build
"$SCRIPT_DIR/vrt.sh" "$platform" install
# capture matches substrings, so it may also capture a scenario whose ID contains
# a selected one. Only the selected images are copied.
"$SCRIPT_DIR/vrt.sh" "$platform" capture \
  --filter "$(printf 'vrt-%s\n' "${names[@]}" | paste -sd, -)"

# Check every image before copying any, so a failed capture adds nothing.
for name in "${names[@]}"; do
  [[ -f "$actual_dir/$name.png" ]] || fail "Capture did not produce '$actual_dir/$name.png'."
done
for name in "${names[@]}"; do
  cp "$actual_dir/$name.png" "$baseline_dir/"
done

# The new images match themselves, so this checks the capture environment against
# the baselines' environment.txt. On a mismatch the added images are removed.
if ! "$SCRIPT_DIR/vrt.sh" "$platform" compare partial; then
  for name in "${names[@]}"; do
    rm -f "$baseline_dir/$name.png"
  done
  fail "Comparison failed, so no baseline was added. See the report above."
fi

printf 'Added %s baseline(s). Review the images, then commit them:\n' "${#names[@]}"
for name in "${names[@]}"; do
  printf '  tests/vrt/%s/%s.png\n' "$target" "$name"
done
