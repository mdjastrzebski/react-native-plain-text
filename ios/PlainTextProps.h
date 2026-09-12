/*
 * Prop-to-platform-value conversions. Most are for <RNPlainText>'s mounted
 * view only; plainTextApplyTextTransform is the exception, shared with the
 * shadow node so both transform the same text the same way, otherwise the
 * measured box and the drawn text could disagree.
 */

#pragma once

#import <Foundation/Foundation.h>
#import <react/renderer/components/RNPlainTextSpec/Props.h>

namespace facebook::react {

/*
 * Applies `textTransform` to `text`. Uppercase/lowercase mirror RN's own
 * RCTNSStringFromStringApplyingTextTransform (RCTAttributedTextUtils.mm),
 * reimplemented here since it lives in a private RN target. Capitalize does
 * not: RN's iOS capitalize also lowercases the rest of each word, diverging
 * from CSS and from Android (react/react-native#34117). This matches CSS
 * and Android instead, uppercasing only each word's first character.
 */
NSString *plainTextApplyTextTransform(NSString *text, RNPlainTextTextTransform textTransform);

NSTextAlignment plainTextAlignmentFromProp(RNPlainTextTextAlign textAlign);

/*
 * textDecorationLine is a space-joined set of "underline"/"line-through";
 * substring presence toggles each independently, mirroring RN <Text>.
 */
BOOL plainTextHasUnderline(const std::string &textDecorationLine);
BOOL plainTextHasLineThrough(const std::string &textDecorationLine);

/*
 * verticalAlign (the cross-platform CSS style) wins over textAlignVertical when
 * set (matches RN <Text>'s Text.js), and its 'middle' maps to textAlignVertical's
 * 'center'. This merge used to run in JS (PlainText.tsx's resolveTextAlignVertical);
 * moved here per docs/contributing/performance.md#prop-cost-policy.
 * SYNC: PlainTextView.kt's applyVerticalAlignGravity must resolve identically.
 */
RNPlainTextTextAlignVertical plainTextResolveVerticalAlign(RNPlainTextTextAlignVertical textAlignVertical, const std::optional<std::string> &verticalAlign);

NSLineBreakMode plainTextLineBreakModeFromProp(RNPlainTextEllipsizeMode ellipsizeMode);

} // namespace facebook::react
