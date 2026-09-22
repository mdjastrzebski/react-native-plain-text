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

#TODO problably we should consider using expo-fingerprint or https://github.com/mdjastrzebski/fs-fingerprint
calculate_fingerprint() {
  (
    cd "$PROJECT_ROOT"
    for input in \
      package.json \
      yarn.lock \
      react-native.config.js \
      src \
      android \
      ios \
      cpp \
      patches \
      example/package.json \
      example/app.json \
      example/index.js \
      example/babel.config.js \
      example/metro.config.js \
      example/src \
      example/assets \
      example/plugins; do
      if [[ -f "$input" ]]; then
        printf '%s\n' "$input"
      elif [[ -d "$input" ]]; then
        find "$input" -type f \
          ! -path '*/build/*' \
          ! -path '*/.gradle/*' \
          ! -path '*/Pods/*' \
          -print
      fi
    done | LC_ALL=C sort | while IFS= read -r file; do
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
  current="$(calculate_fingerprint)"
  [[ "$expected" == "$current" ]] || fail \
    "The $platform VRT Release artifact is stale. Run 'yarn vrt $platform build', then reinstall it."
}

case "${1:-}" in
  write-artifact)
    mkdir -p "$(dirname "$artifact_fingerprint")"
    calculate_fingerprint > "$artifact_fingerprint"
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
  *) fail "Usage: $0 <write-artifact|verify-artifact|mark-installed|verify-installed> <android|ios>" ;;
esac
