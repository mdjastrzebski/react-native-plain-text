/*
 * textTransform, shared by the mounted view and the shadow node so both
 * transform the same text the same way, otherwise the measured box and the
 * drawn text could disagree.
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
 * from CSS and from Android (facebook/react-native#34117). This matches CSS
 * and Android instead, uppercasing only each word's first character.
 */
NSString *plainTextApplyTextTransform(NSString *text, RNPlainTextTextTransform textTransform);

} // namespace facebook::react
