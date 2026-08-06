/*
 * Tables of inputs against expected results for the font-size/multiplier
 * math shared by PlainTextFont.mm's resolution and its callers' lineHeight
 * scaling.
 *
 * Run with `yarn test:cpp`. No framework and no include paths, because the
 * unit under test pulls in nothing but the standard library. Keep it that
 * way.
 */

#include "../../ios/PlainTextFontSizing.h"

#include <cstdio>
#include <string>

using facebook::react::clampFontSizeMultiplier;
using facebook::react::scaledFontSize;

namespace {

int failures = 0;

void expectEqual(const std::string &what, double expected, double actual)
{
  if (expected == actual) {
    return;
  }
  ++failures;
  std::printf("FAIL %s\n  expected: %g\n  actual:   %g\n", what.c_str(), expected, actual);
}

void testScaledFontSize()
{
  expectEqual("multiplier of 1 leaves fontSize untouched, fraction included", 17.5, scaledFontSize(17.5, 1.0));
  expectEqual("multiplier of 0 leaves fontSize untouched", 17.5, scaledFontSize(17.5, 0.0));
  expectEqual("a negative multiplier leaves fontSize untouched", 17.5, scaledFontSize(17.5, -1.0));
  expectEqual("a real multiplier rounds to a whole point", 26.0, scaledFontSize(17.0, 1.5));
  expectEqual("rounds down below the midpoint", 17.0, scaledFontSize(17.0, 1.02));
  expectEqual("rounds up above the midpoint", 18.0, scaledFontSize(17.0, 1.04));
}

void testClampFontSizeMultiplier()
{
  expectEqual("allowFontScaling off ignores the base multiplier", 1.0, clampFontSizeMultiplier(false, 0, 2.0));
  expectEqual("allowFontScaling off ignores maxFontSizeMultiplier too", 1.0, clampFontSizeMultiplier(false, 3.0, 2.0));
  expectEqual("no max (< 1) passes the base multiplier through", 2.0, clampFontSizeMultiplier(true, 0, 2.0));
  expectEqual("a max below the base multiplier clamps to it", 1.5, clampFontSizeMultiplier(true, 1.5, 2.0));
  expectEqual("a max above the base multiplier doesn't raise it", 2.0, clampFontSizeMultiplier(true, 3.0, 2.0));
  expectEqual("a max exactly at 1 is a real clamp, not \"no max\"", 1.0, clampFontSizeMultiplier(true, 1.0, 2.0));
}

} // namespace

int main()
{
  testScaledFontSize();
  testClampFontSizeMultiplier();

  if (failures > 0) {
    std::printf("\nPlainTextFontSizing: %d failure(s)\n", failures);
    return 1;
  }
  std::printf("PlainTextFontSizing: all cases passed\n");
  return 0;
}
