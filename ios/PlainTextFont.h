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
 * Three caches, because the three questions expire at different rates: the
 * family's face names per family, the winning face per family/weight/style, and
 * the UIFont per those plus size and variants. Only the last depends on
 * fontSize, so a new size costs one font instantiation rather than another scan
 * of the family. All three clear on `kCTFontManagerRegisteredFontsChangedNotification`.
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
 * `fontSize` scaled by `fontSizeMultiplier` — the value to pass to
 * `plainTextFont`, and the one to derive anything else that must line up with
 * the font's own size from.
 *
 * Rounded to whole points when a multiplier actually applies, exactly as
 * RCTFont.mm rounds it, so a Dynamic Type setting lands on the same size RN's
 * <Text> uses. An unscaled fontSize is left alone, also as in RCTFont.mm, so a
 * fractional fontSize prop keeps its fraction.
 *
 * SYNC: both callers must scale through this, or one measures at a size the
 * other doesn't draw at. lineHeight is not rounded (RN doesn't round it either)
 * and is scaled by the multiplier directly.
 */
CGFloat plainTextScaledFontSize(CGFloat fontSize, CGFloat fontSizeMultiplier);

/*
 * The UIFont for these props at `fontSize`, which the caller has already scaled
 * through `plainTextScaledFontSize`. Cached, keyed on the only six inputs that
 * reach UIFont: fontFamily, fontSize, fontWeight, italic, fontVariant and
 * fontVariationSettings.
 *
 * Never nil: an unresolvable fontFamily falls back to the system font, since
 * both callers would otherwise silently measure and draw with different
 * defaults.
 *
 * Callable from any thread: UIFont and NSCache are both thread-safe, so the
 * shadow thread and the main thread share one cache.
 */
UIFont *plainTextFont(const RNPlainTextProps &props, CGFloat fontSize);

} // namespace facebook::react
