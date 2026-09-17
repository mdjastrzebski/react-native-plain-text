#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# shellcheck source=./load-android-vrt-config.sh
source "$SCRIPT_DIR/load-android-vrt-config.sh"

actual_dir="$PROJECT_ROOT/build/vrt/actual/android/$ANDROID_VRT_PROFILE"
candidate_dir="$PROJECT_ROOT/build/vrt/baseline-candidate/android/$ANDROID_VRT_PROFILE"
if [[ -d "$actual_dir" ]]; then
  yarn del-cli "$candidate_dir"
  mkdir -p "$candidate_dir"
  cp -a "$actual_dir/." "$candidate_dir/"
  printf 'Candidate Android baseline staged in %s.\n' "$candidate_dir"
fi

environment_dir="$PROJECT_ROOT/build/vrt/environment"
checksum_file="$environment_dir/checksums.sha256"
mkdir -p "$environment_dir"

if command -v sha256sum >/dev/null 2>&1; then
  checksum_command=(sha256sum)
else
  checksum_command=(shasum -a 256)
fi

while IFS= read -r -d '' artifact_file; do
  "${checksum_command[@]}" "$artifact_file"
done < <(
  find "$PROJECT_ROOT/build/vrt" -type f ! -path "$checksum_file" -print0 \
    | sort -z
) | sed "s|$PROJECT_ROOT/||" > "$checksum_file"

printf 'Artifact checksums written to %s.\n' "$checksum_file"
