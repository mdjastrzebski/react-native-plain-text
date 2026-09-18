#include "PlainTextFontSizing.h"

#include <cmath>

namespace facebook::react {

double scaledFontSize(double fontSize, double fontSizeMultiplier)
{
  return fontSize * fontSizeMultiplier;
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

double minimumScaleFactor(double minimumFontScale, double fontPointSize)
{
  if (fontPointSize <= 0.0) {
    return 1.0;
  }
  double floorPointSize = std::fmax(minimumFontScale * fontPointSize, 4.0);
  double scale = floorPointSize / fontPointSize;
  return std::fmin(scale, 1.0);
}

} // namespace facebook::react
