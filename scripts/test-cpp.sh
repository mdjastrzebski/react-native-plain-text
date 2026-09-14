#!/usr/bin/env bash
#
# The C++ unit tests. Run with `yarn test:cpp`.
#
# There is no framework and no build system here on purpose: every unit under
# test is dependency-free C++ (see docs/contributing/workflow.md), so the compiler on
# PATH builds it with no include paths, no pod install and no NDK. A test file
# is a `main` that prints its failures and exits nonzero.
#
# Extra arguments are passed to the compiler, so `yarn test:cpp -g -O0` or
# `yarn test:cpp -fsanitize=address,undefined` work for a one-off run.

set -euo pipefail

cd "$(dirname "$0")/.."

BUILD_DIR="tests/cpp/build"
CXX="${CXX:-c++}"
CXXFLAGS=(-std=c++20 -Wall -Wextra -Werror "$@")

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# run_suite <name> <test file> <source under test>...
run_suite() {
  local name="$1"
  shift
  echo "▸ $name"
  "$CXX" "${CXXFLAGS[@]}" -o "$BUILD_DIR/$name" "$@"
  "$BUILD_DIR/$name"
}

run_suite font-variations \
  tests/cpp/PlainTextFontVariations.test.cpp \
  ios/PlainTextFontVariations.cpp \
  ios/PlainTextStringUtils.cpp

run_suite font-cache-key \
  tests/cpp/PlainTextFontCacheKey.test.cpp \
  ios/PlainTextFontCacheKey.cpp

run_suite font-sizing \
  tests/cpp/PlainTextFontSizing.test.cpp \
  ios/PlainTextFontSizing.cpp
