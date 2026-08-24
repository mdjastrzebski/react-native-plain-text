/*
 * `hyphens`, shared by the mounted view and the shadow node so both see the
 * same text, otherwise the measured box and the drawn text could disagree.
 */

#pragma once

#import <Foundation/Foundation.h>
#import <react/renderer/components/RNPlainTextSpec/Props.h>

namespace facebook::react {

/*
 * Strips soft hyphens (U+00AD) from `text` when `hyphens == None`, to match
 * Android/web. `manual`/`auto` return `text` unchanged.
 */
NSString *plainTextApplyHyphens(NSString *text, RNPlainTextHyphens hyphens);

} // namespace facebook::react
