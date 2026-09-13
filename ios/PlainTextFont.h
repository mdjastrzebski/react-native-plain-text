/*
 * Font resolution for <RNPlainText>, shared by the mounted view and the shadow
 * node so both resolve the same UIFont from the same props, otherwise the
 * measured box and the drawn text could disagree.
 *
 * Resolution is expensive, so results are cached in three caches (family face
 * names, winning face per family/weight/style, and UIFont per face+size+variants)
 * since only the last depends on fontSize. All three clear on
 * `kCTFontManagerRegisteredFontsChangedNotification`.
 */

#pragma once

#import <UIKit/UIKit.h>
#import <react/renderer/components/RNPlainTextSpec/Props.h>

namespace facebook::react::plaintext {

/*
 * The UIFont for these props, at `props.fontSize` scaled by
 * `fontSizeMultiplier`. Cached, keyed on the six inputs that reach UIFont:
 * fontFamily, fontSize, fontWeight, italic, fontVariant and
 * fontVariationSettings.
 *
 * Takes the multiplier rather than an already-scaled size so RCTFont.mm's
 * rounding lives in one place instead of in both callers.
 *
 * Never nil: an unresolvable fontFamily falls back to the system font, so
 * both callers stay in sync. Callable from any thread: UIFont and NSCache are
 * both thread-safe.
 */
UIFont *resolveFont(const RNPlainTextProps &props, CGFloat fontSizeMultiplier);

/*
 * Effective accessibility font-size multiplier: `baseMultiplier` when
 * allowFontScaling is on, clamped by maxFontSizeMultiplier when that is >= 1,
 * and 1 otherwise. Shared so the view and shadow node apply identical
 * clamping despite reading their base multiplier from different places.
 */
CGFloat resolveFontSizeMultiplier(const RNPlainTextProps &props, CGFloat baseMultiplier);

} // namespace facebook::react::plaintext
