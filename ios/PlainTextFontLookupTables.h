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
 * Mirrors RCTFont.mm's RCTFontVariantDescriptor map: each fontVariant name
 * names one OpenType feature, expressed as the type/selector identifier pair
 * UIFontDescriptor takes. Unrecognized names have no entry, as RN drops them.
 */
NSDictionary<NSString *, NSDictionary *> *fontVariantDescriptors(void);

} // namespace facebook::react
