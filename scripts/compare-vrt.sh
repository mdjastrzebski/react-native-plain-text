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

platform="${1:-}"
mode="${2:-compare}"
manifest=".agent-device/vrt-captures.txt"
actual_dir="build/vrt/actual/$platform"
baseline_dir="baselines/$platform"
current_environment="build/vrt/environment/$platform.txt"
baseline_environment="$baseline_dir/environment.txt"
report_dir="build/vrt/report/$platform"
expected_list="$report_dir/expected-images.txt"
manifest_list="$report_dir/manifest-images.txt"
partial_marker="$actual_dir/.partial"
partial_note="$report_dir/partial-selection.txt"

case "$platform" in
  android) matching_threshold="$ANDROID_VRT_MATCHING_THRESHOLD" ;;
  ios) matching_threshold="$IOS_VRT_MATCHING_THRESHOLD" ;;
  *) fail "Platform must be 'android' or 'ios'." ;;
esac
case "$mode" in
  compare | update | partial) ;;
  *) fail "Mode must be 'compare', 'partial' or 'update'." ;;
esac

cd "$PROJECT_ROOT"

[[ -f "$manifest" ]] || fail "Capture manifest not found at $manifest."
[[ -d "$actual_dir" ]] || fail "Actual images not found. Run 'yarn vrt $platform capture' first."
[[ -f "$current_environment" ]] || fail \
  "Environment metadata not found. Run 'yarn vrt $platform verify' first."

# Both marker checks run before this stage replaces anything. A mis-typed partial
# comparison keeps the report of the complete run it should have been, and a
# partial capture never reaches the point where it could overwrite a baseline.
if [[ "$mode" == "partial" && ! -f "$partial_marker" ]]; then
  fail "'$actual_dir' is not marked partial. Run 'yarn vrt $platform compare' for a complete capture set."
fi
if [[ "$mode" == "update" && -f "$partial_marker" ]]; then
  fail "Refusing to turn a partial capture into reviewed baselines. Run a complete 'yarn vrt $platform capture' first."
fi

# Baselines live in the `baselines` submodule, at the commit this repository
# pins. This script only reads that working tree: it never runs `git submodule
# update` or touches any other Git state, so a comparison always reflects the
# reviewed commit instead of whatever the baseline branch tip happens to be.
[[ -e baselines/.git ]] || fail \
  "The baselines submodule is not checked out. Run 'git submodule update --init baselines' to materialize the pinned commit."

yarn del-cli "$report_dir"
mkdir -p "$report_dir"

if ! awk -v target="$platform" '
  /^[[:space:]]*($|#)/ { next }
  NF != 2 {
    printf "Invalid capture manifest line %d: expected a platform and capture ID.\n", NR > "/dev/stderr"
    invalid = 1
    next
  }
  $1 != "all" && $1 != "android" && $1 != "ios" {
    printf "Invalid capture platform on line %d: %s.\n", NR, $1 > "/dev/stderr"
    invalid = 1
    next
  }
  $2 !~ /^vrt-capture-[a-z0-9-]+$/ {
    printf "Invalid capture ID on line %d: %s.\n", NR, $2 > "/dev/stderr"
    invalid = 1
    next
  }
  $1 == "all" || $1 == target {
    if (seen[$2]++) {
      printf "Duplicate %s capture ID on line %d: %s.\n", target, NR, $2 > "/dev/stderr"
      invalid = 1
    }
    print $2 ".png"
    selected++
  }
  END {
    if (!selected) {
      printf "No captures selected for %s.\n", target > "/dev/stderr"
      invalid = 1
    }
    exit invalid
  }
' "$manifest" | LC_ALL=C sort > "$manifest_list"; then
  fail "Capture manifest validation failed."
fi

# What this run compares: the whole manifest for a complete capture, or exactly
# the images a filtered capture produced for a partial one. A partial run is only
# ever an investigation, and the marker that records its filter is what keeps it
# out of the reviewed baselines.
if [[ "$mode" == "partial" ]]; then
  find "$actual_dir" -type f -name '*.png' -exec basename {} \; | LC_ALL=C sort > "$expected_list"
  [[ -s "$expected_list" ]] || fail "Partial capture set in $actual_dir holds no images."
  comm -13 "$manifest_list" "$expected_list" > "$report_dir/captured-not-in-manifest.txt"
  if [[ -s "$report_dir/captured-not-in-manifest.txt" ]]; then
    printf 'Captured images that %s does not list:\n' "$manifest" >&2
    sed 's/^/  /' "$report_dir/captured-not-in-manifest.txt" >&2
    fail "Partial capture set does not come from $manifest."
  fi
  cp -a "$partial_marker" "$partial_note"
  printf 'Partial comparison of %s captures. This is not a full-suite pass.\n' \
    "$(wc -l < "$expected_list" | tr -d ' ')" >&2
else
  cp -a "$manifest_list" "$expected_list"
fi

validate_image_set() {
  local directory="$1"
  local label="$2"
  local allow_unexpected="${3:-0}"
  local image_list="$report_dir/$label-images.txt"
  local missing_list="$report_dir/$label-missing.txt"
  local unexpected_list="$report_dir/$label-unexpected.txt"

  [[ -d "$directory" ]] || fail "$label image directory not found at $directory."
  find "$directory" -type f -name '*.png' -exec basename {} \; | LC_ALL=C sort > "$image_list"
  comm -23 "$expected_list" "$image_list" > "$missing_list"
  comm -13 "$expected_list" "$image_list" > "$unexpected_list"

  if [[ -s "$missing_list" ]]; then
    printf '%s images missing from %s:\n' "$label" "$directory" >&2
    sed 's/^/  /' "$missing_list" >&2
  fi
  if [[ "$allow_unexpected" != "1" && -s "$unexpected_list" ]]; then
    printf 'Unexpected %s images in %s:\n' "$label" "$directory" >&2
    sed 's/^/  /' "$unexpected_list" >&2
  elif [[ "$allow_unexpected" == "1" ]]; then
    : > "$unexpected_list"
  fi

  if [[ -s "$missing_list" ]]; then
    return 1
  fi
  if [[ "$allow_unexpected" != "1" && -s "$unexpected_list" ]]; then
    return 1
  fi
}

# A partial run only has to find its own images; the reviewed set keeps the rest.
if [[ "$mode" == "partial" ]]; then
  validate_image_set "$actual_dir" actual 1 || fail \
    "Partial capture set does not match the images it claims."
else
  validate_image_set "$actual_dir" actual || fail \
    "Actual capture set does not match $manifest."
fi

if [[ "$mode" == "update" ]]; then
  yarn del-cli "$baseline_dir"
  mkdir -p "$baseline_dir"
  while IFS= read -r image; do
    cp -a "$actual_dir/$image" "$baseline_dir/$image"
  done < "$expected_list"
  cp -a "$current_environment" "$baseline_environment"
  printf 'Updated reviewed %s baselines in %s.\n' "$platform" "$baseline_dir"
  printf 'Commit and merge them in the baselines repository, then record the new submodule commit with "git add baselines".\n'
  exit 0
fi

[[ -d "$baseline_dir" ]] || fail \
  "Reviewed baselines not found. Run 'yarn vrt $platform update' intentionally to create them."
[[ -f "$baseline_environment" ]] || fail \
  "Baseline environment metadata not found at $baseline_environment."
if [[ "$mode" == "partial" ]]; then
  validate_image_set "$baseline_dir" baseline 1 || fail \
    "Reviewed baselines do not contain the partial capture set."
else
  validate_image_set "$baseline_dir" baseline || fail \
    "Reviewed baseline set does not match $manifest."
fi

normalized_baseline_environment="$report_dir/normalized-baseline-environment.txt"
normalized_current_environment="$report_dir/normalized-current-environment.txt"

normalize_environment() {
  local input="$1"
  local output="$2"

  if [[ "$platform" == "android" ]]; then
    # CI renders the same AVD on x86_64 while Apple Silicon development hosts
    # use arm64. The rendering policy deliberately shares one baseline and
    # handles the small rasterization delta with Android's matching threshold.
    # The adb serial is recorded too, but it names an emulator port rather than
    # a rendering input, so it stays out of the equality check.
    sed -E '/^android_(architecture|system_image|serial)=/d' "$input" > "$output"
  else
    cp -a "$input" "$output"
  fi
}

normalize_environment "$baseline_environment" "$normalized_baseline_environment"
normalize_environment "$current_environment" "$normalized_current_environment"

if ! cmp -s "$normalized_baseline_environment" "$normalized_current_environment"; then
  printf 'Baseline environment does not match the current VRT environment:\n' >&2
  diff -u "$normalized_baseline_environment" "$normalized_current_environment" >&2 || true
  fail "Run on the baseline environment or intentionally update the $platform baselines."
fi

reg_cli="node_modules/.bin/reg-cli"
[[ -x "$reg_cli" ]] || fail "reg-cli is not installed. Run 'yarn'."

report_actual_dir="$report_dir/actual"
report_expected_dir="$report_dir/expected"
diff_dir="$report_dir/diff"
json_file="$report_dir/reg.json"
report_file="$report_dir/index.html"
mkdir -p "$report_actual_dir" "$report_expected_dir" "$diff_dir"

while IFS= read -r image; do
  cp -a "$actual_dir/$image" "$report_actual_dir/$image"
  cp -a "$baseline_dir/$image" "$report_expected_dir/$image"
done < "$expected_list"
cp -a "$current_environment" "$report_dir/current-environment.txt"
cp -a "$baseline_environment" "$report_dir/baseline-environment.txt"

if "$reg_cli" \
  "$report_actual_dir" \
  "$report_expected_dir" \
  "$diff_dir" \
  --extendedErrors \
  --enableAntialias \
  --json "$json_file" \
  --matchingThreshold "$matching_threshold" \
  --report "$report_file" \
  --thresholdPixel "$VRT_THRESHOLD_PIXEL"; then
  comparison_status=0
else
  comparison_status=$?
fi

printf 'Visual comparison report: %s\n' "$report_file"
if [[ "$mode" == "partial" ]]; then
  printf 'Partial run (%s): see %s\n' "$(<"$partial_marker")" "$partial_note"
fi
exit "$comparison_status"
