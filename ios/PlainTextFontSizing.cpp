#include "PlainTextFontSizing.h"

#include <cmath>

namespace facebook::react {

double scaledFontSize(double fontSize, double fontSizeMultiplier)
{
  if (fontSizeMultiplier <= 0.0 || fontSizeMultiplier == 1.0) {
    return fontSize;
  }
  return std::round(fontSize * fontSizeMultiplier);
}

double clampFontSizeMultiplier(bool allowFontScaling, double maxFontSizeMultiplier, double baseMultiplier)
{
  if (!allowFontScaling) {
    return 1.0;
  }
  if (maxFontSizeMultiplier >= 1.0) {
    return std::fmin(maxFontSizeMultiplier, baseMultiplier);
  }
  return baseMultiplier;
}

} // namespace facebook::react
