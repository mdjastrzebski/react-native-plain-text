/*
 * Small, plain-C++ string helpers with no home of their own in
 * PlainTextFontVariations.cpp, split out the same way that file was split out
 * of PlainTextFont.mm: touches nothing Apple, so it isn't tied to iOS despite
 * living under ios/.
 */

#pragma once

#include <string>

namespace facebook::react {

/*
 * `value` with any leading and trailing whitespace removed, or "" when it is
 * whitespace-only or empty.
 */
std::string trim(const std::string &value);

/*
 * Case-insensitive string equality: sizes must match, and every
 * corresponding character must fold to the same value under tolower.
 */
bool caseInsensitiveEquals(const std::string &a, const std::string &b);

} // namespace facebook::react
