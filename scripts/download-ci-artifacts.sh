#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  printf 'Usage: %s <GitHub Actions run or job URL>\n' "$(basename "$0")"
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  usage >&2
  exit 1
}

[[ $# -eq 1 ]] || fail "Expected one GitHub Actions URL."

actions_url="$1"
url_pattern='^https://github\.com/([^/]+/[^/]+)/actions/runs/([0-9]+)(/job/[0-9]+)?/?$'

if [[ ! "$actions_url" =~ $url_pattern ]]; then
  fail "URL must look like https://github.com/OWNER/REPO/actions/runs/RUN_ID or its /job/JOB_ID URL."
fi

repository="${BASH_REMATCH[1]}"
run_id="${BASH_REMATCH[2]}"
commit_hash="$(gh run view "$run_id" --repo "$repository" --json headSha --jq '.headSha')"

[[ "$commit_hash" =~ ^[0-9a-f]{40}$ ]] || fail "Could not resolve the run's commit hash."

destination="$PROJECT_ROOT/build-ci-$commit_hash"
[[ ! -e "$destination" ]] || fail "Destination already exists: $destination"

download_dir="$(mktemp -d "$PROJECT_ROOT/.build-ci-download.XXXXXX")"
cleanup() {
  rm -rf "$download_dir"
}
trap cleanup EXIT

printf 'Downloading artifacts from %s/actions/runs/%s\n' "$repository" "$run_id"
gh run download "$run_id" --repo "$repository" --dir "$download_dir"
mv "$download_dir" "$destination"
trap - EXIT

printf 'Downloaded artifacts to %s\n' "$destination"
