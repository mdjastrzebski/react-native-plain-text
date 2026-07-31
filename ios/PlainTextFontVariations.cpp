#include "PlainTextFontVariations.h"

#include <cctype>
#include <cmath>
#include <cstdlib>

namespace facebook::react {

namespace {

constexpr char kWhitespace[] = " \t\n\r\f\v";

// One `"wght" 700` pair out of a fontVariationSettings string.
//
// The grammar is Android's, from FontVariationAxis.fromFontVariationSettings:
// four characters in U+0020..U+007E, wrapped in single or double quotes, then a
// number. Deliberately no laxer than that: a string this rejects is a string
// Android rejects, so the prop can't mean two different things across platforms.
bool parseEntry(const std::string &entry, PlainTextFontVariationAxis &axis)
{
  size_t start = entry.find_first_not_of(kWhitespace);
  if (start == std::string::npos) {
    return false;
  }

  char quote = entry[start];
  if (quote != '\'' && quote != '"') {
    return false;
  }
  // The tag occupies [start + 1, start + 4]; the closing quote must be at
  // start + 5, which also proves those four characters exist.
  if (start + 5 >= entry.size() || entry[start + 5] != quote) {
    return false;
  }

  uint32_t tag = 0;
  for (size_t offset = 1; offset <= 4; ++offset) {
    unsigned char character = static_cast<unsigned char>(entry[start + offset]);
    if (character < 0x20 || character > 0x7E) {
      return false;
    }
    tag = (tag << 8) | character;
  }

  const char *number = entry.c_str() + start + 6;
  char *numberEnd = nullptr;
  double parsed = std::strtod(number, &numberEnd);
  // Android runs the value through Float.parseFloat, which is close to strtod
  // but not identical, so the edges are a judgement call rather than a match.
  // Rejecting non-finite values is the one place worth diverging: no font has
  // an axis at infinity, and Java would take "Infinity" and "NaN" here. See the
  // divergence list in tests/cpp/PlainTextFontVariations.test.cpp.
  if (numberEnd == number || !std::isfinite(parsed)) {
    return false;
  }
  for (const char *rest = numberEnd; *rest != '\0'; ++rest) {
    if (std::isspace(static_cast<unsigned char>(*rest)) == 0) {
      return false;
    }
  }

  axis.tag = tag;
  axis.value = parsed;
  return true;
}

} // namespace

std::optional<std::vector<PlainTextFontVariationAxis>> parsePlainTextFontVariations(const std::string &settings)
{
  std::vector<PlainTextFontVariationAxis> axes;
  if (settings.empty()) {
    return axes;
  }

  // Android's parser reads the comma as the value terminator and then runs off the
  // end of the string, so `"wght" 700,` is one axis there. Splitting on commas
  // would instead produce an empty final entry and drop every axis in the string,
  // leaving the same prop value varied on one platform and not the other, with
  // nothing in the UI to say why. So a trailing comma ends the list here too.
  //
  // Only a trailing one. A leading or interior empty entry leaves Android's scanner
  // on a comma that is neither whitespace nor a quote, which throws, so both
  // platforms reject those.
  size_t lastCharacter = settings.find_last_not_of(kWhitespace);
  bool endsWithComma = lastCharacter != std::string::npos && settings[lastCharacter] == ',';

  size_t position = 0;
  while (true) {
    size_t separator = settings.find(',', position);
    size_t end = separator == std::string::npos ? settings.size() : separator;

    // The segment after the last comma, which `endsWithComma` says is blank.
    if (separator == std::string::npos && endsWithComma) {
      break;
    }

    PlainTextFontVariationAxis axis{};
    if (!parseEntry(settings.substr(position, end - position), axis)) {
      return std::nullopt;
    }
    axes.push_back(axis);

    if (separator == std::string::npos) {
      break;
    }
    position = separator + 1;
  }
  return axes;
}

} // namespace facebook::react
