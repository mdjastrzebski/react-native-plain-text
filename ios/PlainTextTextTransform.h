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
 * Applies `textTransform` to `text`. Uppercase/lowercase mirror RN <Text>'s own
 * RCTNSStringFromStringApplyingTextTransform (RCTAttributedTextUtils.mm),
 * reimplemented here since that function lives in a private RN target.
 * Capitalize deliberately does not: RN's iOS capitalize force-lowercases the
 * rest of each word (e.g. "PSYCHED" -> "Psyched"), which is RN's own known
 * divergence from CSS `text-transform: capitalize` (facebook/react-native#34117)
 * and from Android's Fabric implementation, which never touches anything past
 * a word's first character. This uppercases only the first character of each
 * Unicode word, matching CSS and Android instead of RN's iOS quirk.
 */
NSString *plainTextApplyTextTransform(NSString *text, RNPlainTextTextTransform textTransform);

} // namespace facebook::react
