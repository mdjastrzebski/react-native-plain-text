/*
 * Plain C++ font-size math shared by PlainTextFont.mm's resolution, its
 * callers' own lineHeight scaling (PlainTextShadowNode.mm, RNPlainText.mm),
 * and RNPlainText.mm's adjustsFontSizeToFit setup. Split out so this logic
 * runs under tests/cpp/.
 */

#pragma once

namespace facebook::react {

/*
 * Unrounded, matching Fabric's <Text>. Legacy (non-Fabric) RN rounds instead;
 * see native-gotchas.md.
 */
double scaledFontSize(double fontSize, double fontSizeMultiplier);

/*
 * Effective accessibility font-size multiplier: `baseMultiplier` when
 * allowFontScaling is on, clamped by maxFontSizeMultiplier when that is >= 1,
 * and 1 otherwise. Takes primitives rather than RNPlainTextProps so this
 * builds without the codegen headers that struct needs.
 */
double clampFontSizeMultiplier(bool allowFontScaling, double maxFontSizeMultiplier, double baseMultiplier);

/*
 * `minimumScaleFactor` for UILabel's `adjustsFontSizeToFitWidth`, given
 * `minimumFontScale` (0 means unset) and the resolved, already-scaled font
 * point size. Mirrors RN's legacy (non-Fabric) formula,
 * `max(minimumFontScale * fontSize, 4pt)` (RCTTextShadowView.mm), expressed as
 * a fraction of `fontPointSize` since that is what `minimumScaleFactor` takes.
 * `minimumFontScale` itself does nothing under Fabric's <Text> (see
 * docs/contributing/adjusts-font-size-to-fit.md), so there is no Fabric
 * behavior to match here, only the legacy formula worth keeping.
 *
 * Android's PlainTextView.kt computes the same floor directly in pixels
 * (`naturalTextSizePx * minimumFontScale` vs. a 4dp floor) since it isn't
 * expressed as a scale factor there. Keep the two formulas in sync.
 */
double minimumScaleFactor(double minimumFontScale, double fontPointSize);

} // namespace facebook::react
