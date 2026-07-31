/*
 * Font resolution for <RNPlainText>, shared by the mounted view and the shadow
 * node.
 *
 * Both need the same UIFont from the same props — the view to draw with, the
 * shadow node to measure with — so any disagreement shows up as a measured box
 * that doesn't fit the drawn text. One copy makes that structural rather than a
 * sync point.
 *
 * It is also a hot path: every commit resolves a font per node on the shadow
 * thread and again on the main thread. Resolution is not free — a custom
 * fontFamily matches against the system font database, and italic costs a
 * second descriptor round-trip — so the results are cached, as RN does for its
 * own system fonts (RCTFont.mm, `cachedSystemFont`).
 */

#pragma once

#import <UIKit/UIKit.h>
#import <react/renderer/components/RNPlainTextSpec/Props.h>

namespace facebook::react {

/*
 * The effective accessibility font-size multiplier: `baseMultiplier` when
 * allowFontScaling is on, clamped by maxFontSizeMultiplier when that is >= 1,
 * and 1 otherwise.
 *
 * The base differs by caller — the mounted view reads `RCTFontSizeMultiplier()`
 * on the main thread, the shadow node takes `LayoutContext::fontSizeMultiplier`
 * (which the Fabric surface seeds from the same value) — but the clamping on
 * top of it must not, hence the shared function.
 */
CGFloat plainTextFontSizeMultiplier(const RNPlainTextProps &props, CGFloat baseMultiplier);

/*
 * The UIFont for these props at `fontSize`, which the caller has already scaled
 * by `plainTextFontSizeMultiplier`. Cached, keyed on the only six inputs that
 * reach UIFont: fontFamily, fontSize, fontWeight, italic, fontVariant and
 * fontVariationSettings.
 *
 * Callable from any thread: UIFont and NSCache are both thread-safe, so the
 * shadow thread and the main thread share one cache.
 */
UIFont *plainTextFont(const RNPlainTextProps &props, CGFloat fontSize);

} // namespace facebook::react
