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
 * fontWeight and fontStyle. Also the leading fields of fontCacheKey below, so
 * one string serves both and the shared part is built once.
 *
 * fontStyle is the raw prop string (possibly empty, meaning "not passed"),
 * not a converted bool: an empty string and "normal" both mean "not italic"
 * but resolve differently once a fontFamily turns out to name a face rather
 * than a family (see computeFaceName's fallback in PlainTextFont.mm), so they
 * need distinct cache entries.
 *
 * fontFamily, fontWeight and fontStyle are adjacent free-form strings, so a
 * separator inside any of them shifts the boundary between fields — family
 * "Foo|" at weight "bold" keys the same as family "Foo" at weight "|bold".
 * Left unguarded: it takes a fontWeight no real style produces, and the worst
 * case is one wrong font, consistently, since both callers share the key.
 */
std::string faceCacheKey(const std::string &fontFamily, const std::string &fontWeight, const std::string &fontStyle);

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
