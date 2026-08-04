#include "PlainTextStringUtils.h"

#include <algorithm>
#include <cctype>

namespace facebook::react {

namespace {
constexpr char kWhitespace[] = " \t\n\r\f\v";
} // namespace

std::string trim(const std::string &value)
{
  size_t start = value.find_first_not_of(kWhitespace);
  if (start == std::string::npos) {
    return "";
  }
  size_t end = value.find_last_not_of(kWhitespace);
  return value.substr(start, end - start + 1);
}

bool caseInsensitiveEquals(const std::string &a, const std::string &b)
{
  // The size check is what lets this use the plain three-iterator std::equal
  // below rather than the four-iterator, differing-length-ranges overload,
  // and rejects a length mismatch before comparing a single character.
  return a.size() == b.size() &&
      std::equal(a.begin(), a.end(), b.begin(), [](unsigned char x, unsigned char y) {
        return std::tolower(x) == std::tolower(y);
      });
}

} // namespace facebook::react
