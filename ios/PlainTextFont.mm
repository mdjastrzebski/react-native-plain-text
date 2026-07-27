#import "PlainTextFont.h"

#import <CoreText/CoreText.h>

#import <cmath>
#import <string>

namespace facebook::react {

// Mirrors RCTFont.mm's core weight map (RCTConvert RCTFontWeight): the named
// aliases beyond "normal"/"bold" (e.g. "ultralight", "condensed") are dropped
// since codegen can't type fontWeight as an enum (see PlainTextViewNativeComponent.ts).
static UIFontWeight fontWeightFromProp(const std::string &fontWeight)
{
  static NSDictionary<NSString *, NSNumber *> *weights = @{
    @"normal" : @(UIFontWeightRegular),
    @"bold" : @(UIFontWeightBold),
    @"100" : @(UIFontWeightUltraLight),
    @"200" : @(UIFontWeightThin),
    @"300" : @(UIFontWeightLight),
    @"400" : @(UIFontWeightRegular),
    @"500" : @(UIFontWeightMedium),
    @"600" : @(UIFontWeightSemibold),
    @"700" : @(UIFontWeightBold),
    @"800" : @(UIFontWeightHeavy),
    @"900" : @(UIFontWeightBlack),
  };
  NSString *key = [NSString stringWithUTF8String:fontWeight.c_str()];
  NSNumber *weight = weights[key];
  return weight != nil ? (UIFontWeight)weight.doubleValue : UIFontWeightRegular;
}

static constexpr char kFieldSeparator = '|';

// The four cache inputs joined into one key. Assembled as a std::string and
// bridged once, so a hit costs a single NSString allocation instead of a trip
// through the font database.
//
// fontFamily and fontWeight are adjacent free-form strings, so a separator
// inside either shifts the boundary between them — family "Foo|" at weight
// "bold" keys the same as family "Foo" at weight "|bold". Left unguarded: it
// takes a fontWeight no real style produces, and the worst case is one wrong
// font, consistently, since both callers share the key.
static NSString *fontCacheKey(
    const std::string &fontFamily,
    CGFloat fontSize,
    const std::string &fontWeight,
    bool italic)
{
  std::string key = fontFamily;
  key += kFieldSeparator;
  key += fontWeight;
  key += kFieldSeparator;
  key += italic ? 'i' : 'n';
  key += kFieldSeparator;
  // Hundredths of a point, as an integer — sidestepping the padded
  // "17.000000" that std::to_string gives a double, and the cost of formatting
  // one. Sizes closer together than that render identically at any screen
  // scale, so collapsing them onto one entry is correct rather than lossy.
  key += std::to_string(std::lround(fontSize * 100));
  return [NSString stringWithUTF8String:key.c_str()];
}

static NSCache<NSString *, UIFont *> *fontCache()
{
  static NSCache<NSString *, UIFont *> *cache;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    cache = [NSCache new];
    // Registering a font at runtime (expo-font, CTFontManagerRegisterFontsForURL)
    // changes what a fontFamily resolves to, so every entry cached before it
    // landed is suspect — in particular the system fallback returned while the
    // family was still unknown, which would otherwise outlive the registration.
    // RCTFont.mm's family-name cache clears on the same notification.
    [NSNotificationCenter.defaultCenter
        addObserverForName:(NSNotificationName)kCTFontManagerRegisteredFontsChangedNotification
                    object:nil
                     queue:nil
                usingBlock:^(NSNotification *) {
                  [cache removeAllObjects];
                }];
  });
  return cache;
}

CGFloat plainTextFontSizeMultiplier(const RNPlainTextProps &props, CGFloat baseMultiplier)
{
  if (!props.allowFontScaling) {
    return 1.0;
  }
  if (props.maxFontSizeMultiplier >= 1.0) {
    return fminf((CGFloat)props.maxFontSizeMultiplier, baseMultiplier);
  }
  return baseMultiplier;
}

UIFont *plainTextFont(const RNPlainTextProps &props, CGFloat fontSize)
{
  bool italic = props.fontStyle == RNPlainTextFontStyle::Italic;
  NSString *key = fontCacheKey(props.fontFamily, fontSize, props.fontWeight, italic);

  NSCache<NSString *, UIFont *> *cache = fontCache();
  UIFont *font = [cache objectForKey:key];
  if (font != nil) {
    return font;
  }

  UIFontWeight weight = fontWeightFromProp(props.fontWeight);
  if (!props.fontFamily.empty()) {
    NSString *fontFamily = [NSString stringWithUTF8String:props.fontFamily.c_str()];
    UIFontDescriptor *descriptor = [UIFontDescriptor fontDescriptorWithFontAttributes:@{
      UIFontDescriptorFamilyAttribute : fontFamily,
      UIFontDescriptorTraitsAttribute : @{UIFontWeightTrait : @(weight)},
    }];
    font = [UIFont fontWithDescriptor:descriptor size:fontSize];
  } else {
    font = [UIFont systemFontOfSize:fontSize weight:weight];
  }

  if (italic) {
    UIFontDescriptor *italicDescriptor = [font.fontDescriptor
        fontDescriptorWithSymbolicTraits:font.fontDescriptor.symbolicTraits | UIFontDescriptorTraitItalic];
    font = [UIFont fontWithDescriptor:italicDescriptor size:fontSize];
  }

  if (font != nil) {
    [cache setObject:font forKey:key];
  }
  return font;
}

} // namespace facebook::react
