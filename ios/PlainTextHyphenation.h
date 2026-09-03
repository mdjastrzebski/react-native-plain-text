// `hyphens` text handling, shared by the mounted view and the shadow node so
// measurement and drawing agree.

#pragma once

#import <Foundation/Foundation.h>
#import <react/renderer/components/RNPlainTextSpec/Props.h>

namespace facebook::react {

// Strips soft hyphens (U+00AD) when hyphens == None (matching Android/web);
// returns `text` unchanged otherwise.
NSString *plainTextApplyHyphens(NSString *text, RNPlainTextHyphens hyphens);

} // namespace facebook::react
