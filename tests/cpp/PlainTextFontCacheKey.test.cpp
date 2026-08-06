/*
 * Tables of inputs against expected results for the font-cache-key builders.
 *
 * Run with `yarn test:cpp`. No framework and no include paths, because the
 * unit under test pulls in nothing but the standard library. Keep it that
 * way.
 */

#include "../../ios/PlainTextFontCacheKey.h"

#include <cstdio>
#include <string>
#include <vector>

using facebook::react::faceCacheKey;
using facebook::react::fontCacheKey;

namespace {

int failures = 0;

void expectEqual(const std::string &what, const std::string &expected, const std::string &actual)
{
  if (expected == actual) {
    return;
  }
  ++failures;
  std::printf("FAIL %s\n  expected: \"%s\"\n  actual:   \"%s\"\n", what.c_str(), expected.c_str(), actual.c_str());
}

void expectEqual(const std::string &what, bool expected, bool actual)
{
  if (expected == actual) {
    return;
  }
  ++failures;
  std::printf("FAIL %s\n  expected: %d\n  actual:   %d\n", what.c_str(), expected, actual);
}

void testFaceCacheKey()
{
  expectEqual("distinct families don't collide", true, faceCacheKey("Foo", "bold", false) != faceCacheKey("Bar", "bold", false));
  expectEqual("distinct weights don't collide", true, faceCacheKey("Foo", "bold", false) != faceCacheKey("Foo", "400", false));
  expectEqual("italic changes the key", true, faceCacheKey("Foo", "bold", false) != faceCacheKey("Foo", "bold", true));
  expectEqual(
      "same inputs produce the same key",
      faceCacheKey("Foo", "bold", true),
      faceCacheKey("Foo", "bold", true));
  // A separator inside a free-form field shifts the family/weight boundary,
  // so this pair is documented to collide rather than crash or misparse.
  expectEqual(
      "a separator inside fontFamily shifts into fontWeight",
      faceCacheKey("Foo|", "bold", false),
      faceCacheKey("Foo", "|bold", false));
}

void testFontCacheKey()
{
  expectEqual(
      "distinct sizes don't collide",
      true,
      fontCacheKey("face", 12, {}, "") != fontCacheKey("face", 13, {}, ""));
  expectEqual(
      "sizes closer than a hundredth of a point collapse onto one key",
      fontCacheKey("face", 12.001, {}, ""),
      fontCacheKey("face", 12.002, {}, ""));
  expectEqual(
      "distinct fontVariant lists don't collide",
      true,
      fontCacheKey("face", 12, {"small-caps"}, "") != fontCacheKey("face", 12, {}, ""));
  expectEqual(
      "variant order matters",
      true,
      fontCacheKey("face", 12, {"small-caps", "tabular-nums"}, "") !=
          fontCacheKey("face", 12, {"tabular-nums", "small-caps"}, ""));
  expectEqual(
      "distinct fontVariationSettings don't collide",
      true,
      fontCacheKey("face", 12, {}, "'wght' 700") != fontCacheKey("face", 12, {}, "'wght' 400"));
  expectEqual(
      "same inputs produce the same key",
      fontCacheKey("face", 12.5, {"small-caps"}, "'wght' 700"),
      fontCacheKey("face", 12.5, {"small-caps"}, "'wght' 700"));
}

} // namespace

int main()
{
  testFaceCacheKey();
  testFontCacheKey();

  if (failures > 0) {
    std::printf("\nPlainTextFontCacheKey: %d failure(s)\n", failures);
    return 1;
  }
  std::printf("PlainTextFontCacheKey: all cases passed\n");
  return 0;
}
