#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

hash_command() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum
  else
    fail "Neither shasum nor sha256sum is available."
  fi
}

# Files whose bytes reach the compiled app, per platform. Everything here is a
# tracked source file: generated trees (`example/android`, `example/ios`,
# Podfile.lock) are derived from these plus the toolchain, and CI records the
# toolchain in the cache key instead of hashing generated files whose contents
# nobody reviewed. Test sources are excluded because nothing imports them into
# the bundle.
#
# This walks and hashes about 90 files in ~1.1s, all of it in `find` and `shasum`
# process spawns. https://github.com/mdjastrzebski/fs-fingerprint does the same
# job (content plus path, metadata ignored, sorted) in about 30ms and could take
# `VRT_ENABLED` as a content input, at the cost of a Node step and a dependency
# whose version then silently defines the CI cache key. Measured both: the swap
# buys about a second per stage, so this stays a shell function until the input
# set is big enough to care. expo-fingerprint is the wrong tool here: it walks the
# generated native projects, which is the input removed from this hash because it
# moves without anything reviewed moving.
app_build_inputs() {
  local platform="$1"
  local input
  local inputs=(
    package.json
    yarn.lock
    react-native.config.js
    src
    cpp
    example/package.json
    example/app.json
    example/index.js
    example/babel.config.js
    example/metro.config.js
    example/src
    example/assets
  )
  local optional=(patches example/plugins)
  case "$platform" in
    android) inputs+=(android) ;;
    ios) inputs+=(ios RNPlainText.podspec) ;;
  esac

  for input in "${inputs[@]}" "${optional[@]}"; do
    if [[ -f "$input" ]]; then
      printf '%s\n' "$input"
    elif [[ -d "$input" ]]; then
      find "$input" -type f \
        ! -path '*/build/*' \
        ! -path '*/.gradle/*' \
        ! -path '*/Pods/*' \
        ! -name '*.test.ts' \
        ! -name '*.test.tsx' \
        -print
    elif [[ " ${optional[*]} " != *" $input "* ]]; then
      fail "The $platform build input '$input' is missing."
    fi
  done
}

calculate_fingerprint() {
  local files
  files="$(cd "$PROJECT_ROOT" && app_build_inputs "$1")"
  (
    # Paths are hashed relative to the project root, so the result does not
    # depend on the caller's working directory or the checkout location.
    cd "$PROJECT_ROOT"
    printf '%s\n' "$files" | LC_ALL=C sort | while IFS= read -r file; do
      printf '%s\n' "$file"
      hash_command < "$file"
    done
  ) | hash_command | awk '{ print $1 }'
}

platform="${2:-}"
case "$platform" in android | ios) ;; *) fail "Platform must be 'android' or 'ios'." ;; esac

artifact_fingerprint="$PROJECT_ROOT/build/vrt/apps/$platform/build-input.sha256"
installed_fingerprint="$PROJECT_ROOT/build/vrt/devices/$platform-installed-build.sha256"

verify_artifact() {
  [[ -f "$artifact_fingerprint" ]] || fail \
    "The $platform VRT Release artifact has no build fingerprint. Run 'yarn vrt $platform build'."
  expected="$(<"$artifact_fingerprint")"
  current="$(calculate_fingerprint "$platform")"
  [[ "$expected" == "$current" ]] || fail \
    "The $platform VRT Release artifact is stale. Run 'yarn vrt $platform build', then reinstall it."
}

# `fingerprint` is also the CI cache key for the built app (see
# .github/workflows/visual-test.yml). Cache hit and this staleness check are then
# the same function, so a cached artifact can never be restored for one commit and
# called stale by the next.
case "${1:-}" in
  fingerprint) calculate_fingerprint "$platform" ;;
  write-artifact)
    mkdir -p "$(dirname "$artifact_fingerprint")"
    calculate_fingerprint "$platform" > "$artifact_fingerprint"
    rm -f "$installed_fingerprint"
    ;;
  verify-artifact) verify_artifact ;;
  mark-installed)
    verify_artifact
    mkdir -p "$(dirname "$installed_fingerprint")"
    cp "$artifact_fingerprint" "$installed_fingerprint"
    ;;
  verify-installed)
    verify_artifact
    [[ -f "$installed_fingerprint" ]] || fail \
      "The $platform VRT Release artifact has not been installed. Run 'yarn vrt $platform install'."
    cmp -s "$artifact_fingerprint" "$installed_fingerprint" || fail \
      "The installed $platform VRT app is stale. Run 'yarn vrt $platform install'."
    ;;
  *) fail "Usage: $0 <fingerprint|write-artifact|verify-artifact|mark-installed|verify-installed> <android|ios>" ;;
esac
