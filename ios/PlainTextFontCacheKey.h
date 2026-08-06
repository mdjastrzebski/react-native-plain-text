/*
 * Plain C++ helpers behind PlainTextFont.mm's font cache: how its key is
 * built from the inputs that decide face and font selection. Split out the
 * same way PlainTextFontVariations.cpp was, so this logic runs under
 * tests/cpp/ instead of only inside a UIFont round-trip.
 */

#pragma once

#include <string>
#include <vector>

namespace facebook::react {

/*
 * The three inputs that decide which face of a family to use: fontFamily,
 * fontWeight and italic. Also the leading fields of fontCacheKey below, so one
 * string serves both and the shared part is built once.
 *
 * fontFamily and fontWeight are adjacent free-form strings, so a separator
 * inside either shifts the boundary between them — family "Foo|" at weight
 * "bold" keys the same as family "Foo" at weight "|bold". Left unguarded: it
 * takes a fontWeight no real style produces, and the worst case is one wrong
 * font, consistently, since both callers share the key.
 */
std::string faceCacheKey(const std::string &fontFamily, const std::string &fontWeight, bool italic);

/*
 * The face key plus the three inputs that don't affect face selection:
 * fontSize, fontVariant and fontVariationSettings.
 *
 * The variant names and the variation settings go last, where the separator
 * ambiguity above is unreachable: every name the mapping recognizes is
 * separator-free, and a separator inside the settings string makes it
 * unparseable, so any pair of keys that could be misread for one another
 * resolves to the same font, with no features and no axes.
 */
std::string fontCacheKey(
    const std::string &faceKey,
    double fontSize,
    const std::vector<std::string> &fontVariant,
    const std::string &fontVariationSettings);

} // namespace facebook::react
