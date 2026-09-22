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

case "$platform" in
  android) matching_threshold="$ANDROID_VRT_MATCHING_THRESHOLD" ;;
  ios) matching_threshold="$IOS_VRT_MATCHING_THRESHOLD" ;;
  *) fail "Platform must be 'android' or 'ios'." ;;
esac
case "$mode" in
  compare | update) ;;
  *) fail "Mode must be 'compare' or 'update'." ;;
esac

cd "$PROJECT_ROOT"

[[ -f "$manifest" ]] || fail "Capture manifest not found at $manifest."
[[ -d "$actual_dir" ]] || fail "Actual images not found. Run 'yarn vrt $platform capture' first."
[[ -f "$current_environment" ]] || fail \
  "Environment metadata not found. Run 'yarn vrt $platform verify' first."

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
' "$manifest" | LC_ALL=C sort > "$expected_list"; then
  fail "Capture manifest validation failed."
fi

validate_image_set() {
  local directory="$1"
  local label="$2"
  local image_list="$report_dir/$label-images.txt"
  local missing_list="$report_dir/$label-missing.txt"
  local unexpected_list="$report_dir/$label-unexpected.txt"

  [[ -d "$directory" ]] || fail "$label image directory not found at $directory."
  find "$directory" -type f -name '*.png' -exec basename {} \; | LC_ALL=C sort > "$image_list"
  comm -23 "$expected_list" "$image_list" > "$missing_list"
  comm -13 "$expected_list" "$image_list" > "$unexpected_list"

  if [[ -s "$missing_list" || -s "$unexpected_list" ]]; then
    if [[ -s "$missing_list" ]]; then
      printf '%s images missing from %s:\n' "$label" "$directory" >&2
      sed 's/^/  /' "$missing_list" >&2
    fi
    if [[ -s "$unexpected_list" ]]; then
      printf 'Unexpected %s images in %s:\n' "$label" "$directory" >&2
      sed 's/^/  /' "$unexpected_list" >&2
    fi
    return 1
  fi
}

validate_image_set "$actual_dir" actual || fail \
  "Actual capture set does not match $manifest."

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
validate_image_set "$baseline_dir" baseline || fail \
  "Reviewed baseline set does not match $manifest."

normalized_baseline_environment="$report_dir/normalized-baseline-environment.txt"
normalized_current_environment="$report_dir/normalized-current-environment.txt"

normalize_environment() {
  local input="$1"
  local output="$2"

  if [[ "$platform" == "android" ]]; then
    # CI renders the same AVD on x86_64 while Apple Silicon development hosts
    # use arm64. The rendering policy deliberately shares one baseline and
    # handles the small rasterization delta with Android's matching threshold.
    sed -E '/^android_(architecture|system_image)=/d' "$input" > "$output"
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
exit "$comparison_status"
