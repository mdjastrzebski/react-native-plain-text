#import "PlainTextFont.h"

#import "PlainTextFontVariations.h"

#import <CoreText/CoreText.h>
#import <React/RCTLog.h>

#import <cmath>
#import <optional>
#import <string>
#import <vector>

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

// Mirrors RCTFont.mm's RCTFontVariantDescriptor map: each fontVariant name
// names one OpenType feature, expressed as the type/selector identifier pair
// UIFontDescriptor takes. Unrecognized names are dropped, as RN drops them.
static NSDictionary<NSString *, NSDictionary *> *fontVariantDescriptors()
{
  static NSDictionary<NSString *, NSDictionary *> *descriptors;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
#define RNPlainTextFeature(type, selector) \
  @{UIFontFeatureTypeIdentifierKey : @(type), UIFontFeatureSelectorIdentifierKey : @(selector)}
    descriptors = @{
      @"small-caps" : RNPlainTextFeature(kLowerCaseType, kLowerCaseSmallCapsSelector),
      @"oldstyle-nums" : RNPlainTextFeature(kNumberCaseType, kLowerCaseNumbersSelector),
      @"lining-nums" : RNPlainTextFeature(kNumberCaseType, kUpperCaseNumbersSelector),
      @"tabular-nums" : RNPlainTextFeature(kNumberSpacingType, kMonospacedNumbersSelector),
      @"proportional-nums" : RNPlainTextFeature(kNumberSpacingType, kProportionalNumbersSelector),
      @"common-ligatures" : RNPlainTextFeature(kLigaturesType, kCommonLigaturesOnSelector),
      @"no-common-ligatures" : RNPlainTextFeature(kLigaturesType, kCommonLigaturesOffSelector),
      @"discretionary-ligatures" : RNPlainTextFeature(kLigaturesType, kRareLigaturesOnSelector),
      @"no-discretionary-ligatures" : RNPlainTextFeature(kLigaturesType, kRareLigaturesOffSelector),
      @"historical-ligatures" : RNPlainTextFeature(kLigaturesType, kHistoricalLigaturesOnSelector),
      @"no-historical-ligatures" : RNPlainTextFeature(kLigaturesType, kHistoricalLigaturesOffSelector),
      @"contextual" : RNPlainTextFeature(kContextualAlternatesType, kContextualAlternatesOnSelector),
      @"no-contextual" : RNPlainTextFeature(kContextualAlternatesType, kContextualAlternatesOffSelector),
      @"stylistic-one" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltOneOnSelector),
      @"stylistic-two" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltTwoOnSelector),
      @"stylistic-three" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltThreeOnSelector),
      @"stylistic-four" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltFourOnSelector),
      @"stylistic-five" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltFiveOnSelector),
      @"stylistic-six" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltSixOnSelector),
      @"stylistic-seven" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltSevenOnSelector),
      @"stylistic-eight" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltEightOnSelector),
      @"stylistic-nine" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltNineOnSelector),
      @"stylistic-ten" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltTenOnSelector),
      @"stylistic-eleven" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltElevenOnSelector),
      @"stylistic-twelve" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltTwelveOnSelector),
      @"stylistic-thirteen" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltThirteenOnSelector),
      @"stylistic-fourteen" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltFourteenOnSelector),
      @"stylistic-fifteen" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltFifteenOnSelector),
      @"stylistic-sixteen" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltSixteenOnSelector),
      @"stylistic-seventeen" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltSeventeenOnSelector),
      @"stylistic-eighteen" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltEighteenOnSelector),
      @"stylistic-nineteen" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltNineteenOnSelector),
      @"stylistic-twenty" : RNPlainTextFeature(kStylisticAlternativesType, kStylisticAltTwentyOnSelector),
    };
#undef RNPlainTextFeature
  });
  return descriptors;
}

// The feature settings for these variant names, or nil when none of them
// resolve — the caller skips the descriptor round-trip in that case.
static NSArray<NSDictionary *> *fontFeatureSettings(const std::vector<std::string> &fontVariant)
{
  if (fontVariant.empty()) {
    return nil;
  }

  NSDictionary<NSString *, NSDictionary *> *descriptors = fontVariantDescriptors();
  NSMutableArray<NSDictionary *> *features = [NSMutableArray arrayWithCapacity:fontVariant.size()];
  for (const std::string &variant : fontVariant) {
    NSString *name = [NSString stringWithUTF8String:variant.c_str()];
    NSDictionary *feature = name != nil ? descriptors[name] : nil;
    if (feature != nil) {
      [features addObject:feature];
    }
  }
  return features.count > 0 ? features : nil;
}

// The variation axes for a fontVariationSettings string, in the form
// kCTFontVariationAttribute takes, or nil when it sets none. Parsing lives in
// PlainTextFontVariations.cpp; this only bridges the result.
static NSDictionary<NSNumber *, NSNumber *> *fontVariations(const std::string &settings)
{
  std::optional<std::vector<PlainTextFontVariationAxis>> axes = parsePlainTextFontVariations(settings);
  if (!axes.has_value()) {
    // Returning nil is indistinguishable from "this string sets no axes", so
    // without this the font silently renders at its default instance. Mirrors
    // the FLog.w Android emits from the same failure.
    //
    // Not per render: plainTextFont returns from the cache before reaching here,
    // so a given bad string warns once per font configuration it appears with,
    // and again only if the entry is evicted under memory pressure.
    RCTLogWarn(@"PlainText: invalid fontVariationSettings: \"%s\"", settings.c_str());
    return nil;
  }
  if (axes->empty()) {
    return nil;
  }

  NSMutableDictionary<NSNumber *, NSNumber *> *variations =
      [NSMutableDictionary dictionaryWithCapacity:axes->size()];
  for (const PlainTextFontVariationAxis &axis : *axes) {
    variations[@(axis.tag)] = @(axis.value);
  }
  return variations;
}

static constexpr char kFieldSeparator = '|';

// The five cache inputs joined into one key. Assembled as a std::string and
// bridged once, so a hit costs a single NSString allocation instead of a trip
// through the font database.
//
// fontFamily and fontWeight are adjacent free-form strings, so a separator
// inside either shifts the boundary between them — family "Foo|" at weight
// "bold" keys the same as family "Foo" at weight "|bold". Left unguarded: it
// takes a fontWeight no real style produces, and the worst case is one wrong
// font, consistently, since both callers share the key.
//
// The variant names and the variation settings go last, where the same
// ambiguity is unreachable: every name the mapping recognizes is
// separator-free, and a separator inside the settings string makes it
// unparseable, so any pair of keys that could be misread for one another
// resolves to the same font, with no features and no axes.
static NSString *fontCacheKey(
    const std::string &fontFamily,
    CGFloat fontSize,
    const std::string &fontWeight,
    bool italic,
    const std::vector<std::string> &fontVariant,
    const std::string &fontVariationSettings)
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
  for (const std::string &variant : fontVariant) {
    key += kFieldSeparator;
    key += variant;
  }
  key += kFieldSeparator;
  key += fontVariationSettings;
  return [NSString stringWithUTF8String:key.c_str()];
}

static NSCache<NSString *, UIFont *> *fontCache()
{
  static NSCache<NSString *, UIFont *> *cache;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    cache = [NSCache new];
    // Two of the six key inputs are continuous — fontSize, and any axis in
    // fontVariationSettings — so an animated weight or a size slider mints an
    // entry per frame value. NSCache auto-evicts under memory pressure, which
    // makes that growth rather than a leak, and each entry is a UIFont and a short
    // string, so even hundreds of them are small. The limit is hygiene against the
    // pathological case, not a fix for a measured problem.
    //
    // 128 rather than something tighter because eviction here is pure loss: a
    // dropped entry costs a family resolution and a CTFont copy to rebuild, and
    // NSCache's policy is documented as approximate and is not specified to be
    // LRU, so what goes is not predictable. A design system's worth of text styles
    // has to stay clear of the limit even with an animation running through it.
    cache.countLimit = 128;
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
  NSString *key = fontCacheKey(
      props.fontFamily,
      fontSize,
      props.fontWeight,
      italic,
      props.fontVariant,
      props.fontVariationSettings);

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

  // Last, as in RCTFont.mm: the features are added to whatever descriptor the
  // family/weight/italic resolution ended up with.
  NSArray<NSDictionary *> *features = fontFeatureSettings(props.fontVariant);
  if (features != nil && font != nil) {
    UIFontDescriptor *featureDescriptor = [font.fontDescriptor
        fontDescriptorByAddingAttributes:@{UIFontDescriptorFeatureSettingsAttribute : features}];
    font = [UIFont fontWithDescriptor:featureDescriptor size:fontSize];
  }

  // Variable-font axes, three things worth knowing:
  //
  // - Last of all, so an axis wins over whatever the family/weight resolution
  //   picked. CSS gives font-variation-settings the same precedence over
  //   font-weight, and a variable family's 'wght' axis is the more specific
  //   answer to the same question.
  // - UILabel, UIFont and UIFontDescriptor have no variations API between them:
  //   this lives one layer down, in CoreText, as a font descriptor attribute. Set
  //   through CTFontCreateCopyWithAttributes rather than
  //   -[UIFont fontWithDescriptor:size:], which has been reported to drop
  //   kCTFontVariationAttribute since iOS 14
  //   (developer.apple.com/forums/thread/669246). CTFont and UIFont are toll-free
  //   bridged, so the result is a UIFont either way.
  // - Only a font whose file carries an fvar table can move. The system font's
  //   own axes are private, so this needs a registered variable family to do
  //   anything, and silently does nothing without one.
  NSDictionary<NSNumber *, NSNumber *> *variations = fontVariations(props.fontVariationSettings);
  if (variations != nil && font != nil) {
    CTFontDescriptorRef variationDescriptor = CTFontDescriptorCreateWithAttributes(
        (__bridge CFDictionaryRef) @{(__bridge id)kCTFontVariationAttribute : variations});
    UIFont *variedFont = (__bridge_transfer UIFont *)CTFontCreateCopyWithAttributes(
        (__bridge CTFontRef)font, font.pointSize, NULL, variationDescriptor);
    CFRelease(variationDescriptor);
    if (variedFont != nil) {
      font = variedFont;
    }
  }

  if (font != nil) {
    [cache setObject:font forKey:key];
  }
  return font;
}

} // namespace facebook::react
