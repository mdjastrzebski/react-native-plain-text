/*
 * Static NSDictionary lookup tables mirroring RCTFont.mm's own prop-name
 * maps, split out of PlainTextFont.mm so its resolution logic isn't
 * interleaved with these tables' raw data.
 */

#import <UIKit/UIKit.h>
#import <React/RCTFont.h>

#import <string>

namespace facebook::react {

/*
 * Mirrors RCTFont.mm's core weight map (RCTConvert RCTFontWeight): the named
 * aliases beyond "normal"/"bold" (e.g. "ultralight", "condensed") are dropped
 * since codegen can't type fontWeight as an enum (see
 * PlainTextViewNativeComponent.ts). Unrecognized or empty input maps to
 * UIFontWeightRegular, RCTFont.mm's own default.
 */
RCTFontWeight fontWeightFromProp(const std::string &fontWeight);

/*
 * Mirrors RCTFont.mm's RCTFontStyle map (RCTConvert RCTFontStyle): "italic"
 * and "oblique" are italic, everything else — including an empty string,
 * which is codegen's stand-in for fontStyle not being passed at all — isn't.
 * Callers that need to tell "not passed" apart from an explicit "normal"
 * check the raw string themselves (see computeFaceName in PlainTextFont.mm);
 * this only answers the simpler "should this render slanted" question.
 */
bool isItalicFromProp(const std::string &fontStyle);

/*
 * Mirrors RCTFont.mm's RCTFontVariantDescriptor map: each fontVariant name
 * names one OpenType feature, expressed as the type/selector identifier pair
 * UIFontDescriptor takes. Unrecognized names have no entry, as RN drops them.
 */
NSDictionary<NSString *, NSDictionary *> *fontVariantDescriptors(void);

} // namespace facebook::react
