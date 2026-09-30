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

# Source files whose bytes reach the compiled app, as git lists them (tracked
# plus untracked-but-not-ignored, so local debris never counts). Generated trees
# (`example/android`, `example/ios`, Podfile.lock) are left out; CI records the
# toolchain in the cache key instead. Tests are excluded: nothing bundles them.
#
# Takes ~1.1s. https://github.com/mdjastrzebski/fs-fingerprint takes ~30ms but
# adds a Node step and a dependency whose version defines the CI cache key.
# expo-fingerprint is wrong here: it hashes the generated native projects.
app_build_inputs() {
  local platform="$1"
  local input
  local files
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
    # `--cached` still lists tracked files deleted from the working tree, so
    # keep only paths that exist.
    files="$(
      git ls-files --cached --others --exclude-standard -- "$input" |
        while IFS= read -r file; do
          [[ -f "$file" ]] && printf '%s\n' "$file"
        done
    )"
    if [[ -n "$files" ]]; then
      printf '%s\n' "$files" | grep -Ev '\.test\.tsx?$' || true
    elif [[ " ${optional[*]} " != *" $input "* ]]; then
      fail "The $platform build input '$input' is missing."
    fi
  done
}

# Hashes the part of a build input that reaches the app. For a package.json
# that is only the fields below: hashing the whole file rebuilt both apps (~36
# minutes on iOS) for a `release-it` changelog tweak. yarn.lock still pins what
# the dependency ranges resolve to.
hash_build_input() {
  local file="$1"
  local fields
  case "$file" in
    # codegenConfig drives native codegen, and the `exports` source condition is
    # how Metro resolves the library to src/.
    package.json) fields=(dependencies devDependencies peerDependencies codegenConfig exports) ;;
    example/package.json) fields=(dependencies devDependencies peerDependencies scripts) ;;
    *)
      hash_command < "$file"
      return
      ;;
  esac
  # A missing field prints as null, so adding or removing one changes the hash.
  node -e '
    const pkg = JSON.parse(require("fs").readFileSync(0, "utf8"));
    const picked = {};
    for (const field of process.argv.slice(1)) picked[field] = pkg[field] ?? null;
    process.stdout.write(JSON.stringify(picked));
  ' "${fields[@]}" < "$file" | hash_command
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
      hash_build_input "$file"
    done
  ) | hash_command | awk '{ print $1 }'
}

platform="${2:-}"
case "$platform" in android | ios) ;; *) fail "Platform must be 'android' or 'ios'." ;; esac

artifact_fingerprint="$PROJECT_ROOT/node_modules/.cache/vrt/apps/$platform/build-input.sha256"
installed_fingerprint="$PROJECT_ROOT/.vrt/devices/$platform-installed-build.sha256"

verify_artifact() {
  [[ -f "$artifact_fingerprint" ]] || fail \
    "The $platform VRT Release artifact has no build fingerprint. Run 'yarn vrt $platform build'."
  expected="$(<"$artifact_fingerprint")"
  current="$(calculate_fingerprint "$platform")"
  [[ "$expected" == "$current" ]] || fail \
    "The $platform VRT Release artifact is stale. Run 'yarn vrt $platform build', then reinstall it."
}

# `fingerprint` is also the CI cache key (.github/workflows/vrt.yml), so a cache
# hit and this staleness check can never disagree.
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
