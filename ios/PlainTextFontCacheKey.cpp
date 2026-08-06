#include "PlainTextFontCacheKey.h"

namespace facebook::react {

namespace {
constexpr char kFieldSeparator = '|';
} // namespace

std::string faceCacheKey(const std::string &fontFamily, const std::string &fontWeight, bool italic)
{
  std::string key = fontFamily;
  key += kFieldSeparator;
  key += fontWeight;
  key += kFieldSeparator;
  key += italic ? 'i' : 'n';
  return key;
}

std::string fontCacheKey(
    const std::string &faceKey,
    double fontSize,
    const std::vector<std::string> &fontVariant,
    const std::string &fontVariationSettings)
{
  std::string key = faceKey;
  key += kFieldSeparator;
  // Hundredths of a point, as an integer — sidestepping the padded
  // "17.000000" that std::to_string gives a double, and the cost of formatting
  // one. Sizes closer together than that render identically at any screen
  // scale, so collapsing them onto one entry is correct rather than lossy.
  key += std::to_string(std::lround(fontSize * 100));
  for (const std::string &variant : fontVariant) {
    key += kFieldSeparator;
    key += variant;
  }
  key += kFieldSeparator;
  key += fontVariationSettings;
  return key;
}

} // namespace facebook::react
