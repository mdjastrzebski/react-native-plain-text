/*
 * Prop-to-platform-value conversions. Most are for <RNPlainText>'s mounted
 * view only; applyTextTransform is the exception, shared with the
 * shadow node so both transform the same text the same way, otherwise the
 * measured box and the drawn text could disagree.
 *
 * fontWeightFromProp, isItalicFromProp and fontVariantDescriptors mirror
 * RCTFont.mm's own prop-name lookup tables, feeding PlainTextFont.mm's font
 * resolution.
 */

#pragma once

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <React/RCTFont.h>
#import <react/renderer/components/RNPlainTextSpec/Props.h>

#import <string>

namespace facebook::react::plaintext {

/*
 * Applies `textTransform` to `text`. Uppercase/lowercase mirror RN's own
 * RCTNSStringFromStringApplyingTextTransform (RCTAttributedTextUtils.mm),
 * reimplemented here since it lives in a private RN target. Capitalize does
 * not: RN's iOS capitalize also lowercases the rest of each word, diverging
 * from CSS and from Android (react/react-native#34117). This matches CSS
 * and Android instead, uppercasing only each word's first character.
 */
NSString *applyTextTransform(NSString *text, RNPlainTextTextTransform textTransform);

NSTextAlignment textAlignmentFromProp(RNPlainTextTextAlign textAlign);

/*
 * textDecorationLine is a space-joined set of "underline"/"line-through";
 * substring presence toggles each independently, mirroring RN <Text>.
 */
BOOL textDecorationHasUnderline(const std::string &textDecorationLine);
BOOL textDecorationHasLineThrough(const std::string &textDecorationLine);

/*
 * verticalAlign (the cross-platform CSS style) wins over textAlignVertical when
 * set (matches RN <Text>'s Text.js), and its 'middle' maps to textAlignVertical's
 * 'center'. This merge used to run in JS (PlainText.tsx's resolveTextAlignVertical);
 * moved here per docs/contributing/performance.md#prop-cost-policy.
 * SYNC: PlainTextView.kt's applyVerticalAlignGravity must resolve identically. See
 * docs/contributing/sync-points.md#set-12--the-verticalalign-and-textalignvertical-merge.
 */
RNPlainTextTextAlignVertical resolveVerticalAlign(RNPlainTextTextAlignVertical textAlignVertical, const std::optional<std::string> &verticalAlign);

NSLineBreakMode lineBreakModeFromProp(RNPlainTextEllipsizeMode ellipsizeMode);

NSLineBreakStrategy lineBreakStrategyFromProp(RNPlainTextLineBreakStrategyIOS lineBreakStrategyIOS);

/*
 * Mirrors RCTFont.mm's core weight map (RCTConvert RCTFontWeight): the named
 * aliases beyond "normal"/"bold" (e.g. "ultralight", "condensed") are dropped
 * since codegen can't type fontWeight as an enum. Unrecognized or empty input
 * maps to UIFontWeightRegular, RCTFont.mm's own default.
 */
RCTFontWeight fontWeightFromProp(const std::string &fontWeight);

/*
 * Mirrors RCTFont.mm's RCTFontStyle map: "italic" and "oblique" are italic,
 * everything else (including an empty string, codegen's stand-in for
 * fontStyle not being passed) isn't. Callers that need to tell "not passed"
 * apart from an explicit "normal" check the raw string themselves (see
 * computeFaceName in PlainTextFont.mm).
 */
bool isItalicFromProp(const std::string &fontStyle);

/*
 * Mirrors RCTFont.mm's RCTFontVariantDescriptor map: each fontVariant name
 * maps to the type/selector identifier pair UIFontDescriptor takes.
 * Unrecognized names have no entry, as RN drops them.
 */
NSDictionary<NSString *, NSDictionary *> *fontVariantDescriptors(void);

} // namespace facebook::react::plaintext
