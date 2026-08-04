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
 * fontFamily is matched face by face against the family's fonts, and italic
 * costs a second descriptor round-trip — so the results are cached, as RN does
 * for its own system fonts (RCTFont.mm, `cachedSystemFont`).
 *
 * Three caches, since only one of the three questions depends on fontSize: the
 * family's face names, the winning face per family/weight/style, and the UIFont
 * per those plus size and variants. So a new size costs one font instantiation
 * rather than another scan of the family. All three clear on
 * `kCTFontManagerRegisteredFontsChangedNotification`.
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
 * The UIFont for these props, at `props.fontSize` scaled by the multiplier from
 * `plainTextFontSizeMultiplier`. Cached, keyed on the only six inputs that reach
 * UIFont: fontFamily, fontSize, fontWeight, italic, fontVariant and
 * fontVariationSettings.
 *
 * Takes the multiplier rather than an already-scaled size so that the rounding
 * RCTFont.mm applies to it lives in one place instead of in both callers. Nothing
 * else needs the scaled size: the font carries it, and lineHeight scales by the
 * multiplier without rounding (RN's behavior too) in each caller.
 *
 * Never nil: an unresolvable fontFamily falls back to the system font, since
 * both callers would otherwise silently measure and draw with different
 * defaults.
 *
 * Callable from any thread: UIFont and NSCache are both thread-safe, so the
 * shadow thread and the main thread share one cache.
 */
UIFont *plainTextFont(const RNPlainTextProps &props, CGFloat fontSizeMultiplier);

} // namespace facebook::react
