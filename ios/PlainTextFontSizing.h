/*
 * Plain C++ font-size math shared by PlainTextFont.mm's font resolution and,
 * for the multiplier, by its callers' own lineHeight scaling (see
 * PlainTextShadowNode.mm and RNPlainText.mm). Split out the same way
 * PlainTextFontVariations.cpp was, so this logic runs under tests/cpp/
 * instead of only inside a UIFont round-trip.
 */

#pragma once

namespace facebook::react {

/*
 * Rounded to whole points when a multiplier applies and left alone when none
 * does, both as in RCTFont.mm — so a Dynamic Type setting lands on the same
 * size RN's <Text> uses, and a fractional fontSize prop keeps its fraction.
 */
double scaledFontSize(double fontSize, double fontSizeMultiplier);

/*
 * The effective accessibility font-size multiplier: `baseMultiplier` when
 * allowFontScaling is on, clamped by maxFontSizeMultiplier when that is >= 1,
 * and 1 otherwise.
 *
 * Takes the three primitives PlainTextFont.h's plainTextFontSizeMultiplier
 * reads off RNPlainTextProps, rather than the props struct itself, so this
 * builds and runs without the codegen headers that struct needs.
 */
double clampFontSizeMultiplier(bool allowFontScaling, double maxFontSizeMultiplier, double baseMultiplier);

} // namespace facebook::react
