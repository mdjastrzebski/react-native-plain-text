/*
 * Builds PlainTextFont.mm's cache keys from the inputs that decide face and
 * font selection. Split out so this logic runs under tests/cpp/.
 *
 * SYNC: must name every input `computeFaceName`/`resolvedFont` (PlainTextFont.mm)
 * read to pick a face or build the `UIFont`. A new one read there and left out
 * here doesn't fail: it applies once, then the cache silently serves that
 * first result back for every other value of the missing input. See
 * docs/contributing/sync-points.md#set-7--the-ios-font-cache-key.
 */

#pragma once

#include <string>
#include <vector>

namespace facebook::react {

/*
 * The three inputs that decide which face of a family to use (fontFamily,
 * fontWeight, fontStyle) and the leading fields of fontCacheKey below, so
 * the shared prefix is built once.
 *
 * fontStyle is the raw prop string, not a converted bool: empty and "normal"
 * both mean "not italic" but resolve differently once a fontFamily turns out
 * to name a face rather than a family (see computeFaceName's fallback in
 * PlainTextFont.mm), so they need distinct cache entries.
 *
 * The fields are adjacent free-form strings with no separator escaping, so a
 * literal separator inside one can shift the field boundary (family "Foo|"
 * at weight "bold" keys the same as family "Foo" at weight "|bold"). Left
 * unguarded, since the worst case is one wrong font, consistently.
 */
std::string faceCacheKey(const std::string &fontFamily, const std::string &fontWeight, const std::string &fontStyle);

/*
 * The face key plus the inputs that don't affect face selection: fontSize,
 * fontVariant and fontVariationSettings.
 *
 * These go last, where the separator ambiguity above can't bite: every
 * recognized variant name is separator-free, and a separator inside
 * fontVariationSettings just makes it unparseable.
 */
std::string fontCacheKey(
    const std::string &faceKey,
    double fontSize,
    const std::vector<std::string> &fontVariant,
    const std::string &fontVariationSettings);

} // namespace facebook::react
