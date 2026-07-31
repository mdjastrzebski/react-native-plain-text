/*
 * The fontVariationSettings parser, split out from PlainTextFont.mm because it
 * is plain C++ that touches nothing Apple: a string in, variable-font axes out.
 *
 * The grammar it accepts is Android's, from
 * FontVariationAxis.fromFontVariationSettings, so the same prop value means the
 * same thing on both platforms. See the .cpp for where that pins the details.
 */

#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

namespace facebook::react {

/*
 * One `"wght" 700` pair. The tag is the four-character code CoreText keys
 * variations by ('wght' -> 0x77676874).
 */
struct PlainTextFontVariationAxis {
  uint32_t tag;
  double value;
};

/*
 * The axes `settings` sets, in the order it lists them, or nullopt when it is
 * malformed.
 *
 * All-or-nothing on a malformed string, matching Android, where
 * fromFontVariationSettings throws on the first bad entry and TextView applies
 * nothing rather than the entries that did parse. An empty string is not
 * malformed: it parses to no axes, hence the distinction between an empty
 * vector and nullopt. Callers are expected to surface nullopt, since applying
 * no axes otherwise looks exactly like a font with none.
 */
std::optional<std::vector<PlainTextFontVariationAxis>> parsePlainTextFontVariations(const std::string &settings);

} // namespace facebook::react
