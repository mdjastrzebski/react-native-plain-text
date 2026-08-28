#import "PlainTextFont.h"

#import "PlainTextFontCache.h"
#import "PlainTextFontCacheKey.h"
#import "PlainTextFontLookupTables.h"
#import "PlainTextFontSizing.h"
#import "PlainTextFontVariations.h"

#import <CoreText/CoreText.h>
#import <React/RCTFont.h>
#import <React/RCTLog.h>

#import <optional>
#import <string>
#import <vector>

namespace facebook::react {

// Map an unset optional prop to a shared empty value, by reference (no per-call copy).
static const std::string &stringPropOrEmpty(const std::optional<std::string> &value)
{
  static const std::string empty;
  if (value.has_value()) {
    return value.value();
  }
  return empty;
}

static const std::vector<std::string> &arrayPropOrEmpty(
    const std::optional<std::vector<std::string>> &value)
{
  static const std::vector<std::string> empty;
  if (value.has_value()) {
    return value.value();
  }
  return empty;
}

// Caches +[UIFont fontNamesForFamilyName:], including the empty answer, so a face-only fontFamily isn't re-queried on every lookup.
static NSArray<NSString *> *cachedFontNamesForFamilyName(NSString *familyName)
{
  static PlainTextFontCache<NSString *, NSArray<NSString *> *> *familyNamesCache =
      [[PlainTextFontCache alloc] initWithCountLimit:0];

  return [familyNamesCache objectForKey:familyName
                                   orSet:^NSArray<NSString *> * {
                                     // EXPENSIVE: enumerates the font database. Only runs on a cache miss, since the block above caches per family.
                                     return [UIFont fontNamesForFamilyName:familyName] ?: @[];
                                   }];
}

// Face selection within a font family, ported from RCTFont.mm so a custom fontFamily resolves to the same face <Text> would pick.

static BOOL isItalicFont(UIFont *font)
{
  return (CTFontGetSymbolicTraits((CTFontRef)font) & kCTFontTraitItalic) != 0;
}

static BOOL isCondensedFont(UIFont *font)
{
  return (CTFontGetSymbolicTraits((CTFontRef)font) & kCTFontTraitCondensed) != 0;
}

// Face properties are size-independent, so faces can be compared at any size and cached without one.
static constexpr CGFloat kFaceProbeFontSize = 12;

// The PostScript name of the closest face to the requested weight/slant, or nil if the family has no faces. Mirrors RCTFont.mm's selection but returns the name so the caller can instantiate it at the actual size wanted.
static NSString *closestFaceNameInFamily(
    NSArray<NSString *> *names,
    RCTFontWeight fontWeight,
    BOOL isItalic,
    BOOL isCondensed)
{
  if (names.count == 0) {
    return nil;
  }

  // Only face in the family, also the common shape of a custom or expo font.
  if (names.count == 1) {
    return names[0];
  }

  NSString *name = nil;

  // EXPENSIVE: instantiates a UIFont and computes traits/weight per candidate face, scaling with family size. Only runs on a cache miss, since resolvedFaceName caches per family/weight/style.
  CGFloat closestWeight = INFINITY;
  for (NSString *candidate in names) {
    UIFont *match = [UIFont fontWithName:candidate size:kFaceProbeFontSize];
    // Guarded (unlike RN): the trait calls take a CTFontRef, which crashes on nil.
    if (match == nil) {
      continue;
    }
    if (isItalic == isItalicFont(match) && isCondensed == isCondensedFont(match)) {
      CGFloat testWeight = RCTGetFontWeight(match);
      if (ABS(testWeight - fontWeight) < ABS(closestWeight - fontWeight)) {
        name = candidate;
        closestWeight = testWeight;
      }
    }
  }

  // Falls back to the first face, for single-face families like Zapfino.
  return name ?: names[0];
}

// Feature settings for these variant names, or nil if none resolve, so the caller can skip the descriptor round-trip.
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

// Parses a fontVariationSettings string into the axes kCTFontVariationAttribute takes, or nil when it sets none. Parsing itself lives in PlainTextFontVariations.cpp.
static NSDictionary<NSNumber *, NSNumber *> *fontVariations(const std::string &settings)
{
  std::optional<std::vector<PlainTextFontVariationAxis>> axes = parseFontVariations(settings);
  if (!axes.has_value()) {
    // Warns because nil is indistinguishable from "sets no axes" and a bad string would otherwise silently render at the font's default instance. Mirrors Android's FLog.w.
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

// fontSize and fontVariationSettings axes are continuous, so an animating app would grow this cache unboundedly without a limit. 256 comfortably covers any real type scale × weight × style × variant combo.
static constexpr NSUInteger kFontCacheCountLimit = 256;

/*
 * The face name to instantiate for this fontFamily, or nil to fall back to the system font.
 * `fontWeightProp` is the raw prop string (empty means RN's fontWeight was unset), needed below to decide whether to keep the caller's weight or the matched face's.
 */
static NSString *computeFaceName(
    const std::string &fontFamily,
    const std::string &fontWeightProp,
    RCTFontWeight fontWeight,
    const std::string &fontStyleProp)
{
  NSString *familyName = [NSString stringWithUTF8String:fontFamily.c_str()];
  if (familyName == nil) {
    return nil;
  }

  BOOL isItalic = isItalicFromProp(fontStyleProp);
  NSString *faceName = closestFaceNameInFamily(cachedFontNamesForFamilyName(familyName), fontWeight, isItalic, NO);
  if (faceName != nil) {
    return faceName;
  }

  // Not a registered family, try it as a face/PostScript name instead.
  UIFont *namedFont = [UIFont fontWithName:familyName size:kFaceProbeFontSize];
  if (namedFont == nil) {
    // Same message and level as RCTFont.mm so a typo reads identically for <PlainText> and <Text>. Info, not Warn, deliberately, to keep it out of LogBox.
    RCTLogInfo(@"Unrecognized font family '%@'", familyName);
    return nil;
  }

  // RN re-derives the real family from the matched face and re-searches for the closest match, so "Georgia-Bold" + italic lands on the real BoldItalic face rather than a synthesized slant.
  // An unset prop inherits the matched face's own trait instead of a hardcoded default, matching RCTFont.mm's `style ? isItalic : isItalicFont(font)` / `weight ? fontWeight : RCTGetFontWeight(font)`.
  NSString *realFamilyName = namedFont.familyName;
  BOOL faceIsItalic = isItalicFont(namedFont);
  BOOL faceIsCondensed = isCondensedFont(namedFont);
  RCTFontWeight faceWeight = RCTGetFontWeight(namedFont);
  BOOL effectiveIsItalic = fontStyleProp.empty() ? faceIsItalic : isItalic;
  RCTFontWeight effectiveWeight = fontWeightProp.empty() ? faceWeight : fontWeight;
  return closestFaceNameInFamily(
             cachedFontNamesForFamilyName(realFamilyName), effectiveWeight, effectiveIsItalic, faceIsCondensed)
      ?: familyName;
}

// Cached separately from the font since face resolution doesn't depend on fontSize, so a new size costs one instantiation, not another family scan.
// SYNC: `faceKey` (PlainTextFontCacheKey.h) must cover every input this and computeFaceName read.
static NSString *resolvedFaceName(
    const std::string &fontFamily,
    const std::string &faceKey,
    const std::string &fontWeightProp,
    RCTFontWeight fontWeight,
    const std::string &fontStyleProp)
{
  static PlainTextFontCache<NSString *, NSString *> *faceNamesCache =
      [[PlainTextFontCache alloc] initWithCountLimit:0];

  NSString *key = [NSString stringWithUTF8String:faceKey.c_str()];
  if (key == nil) {
    return computeFaceName(fontFamily, fontWeightProp, fontWeight, fontStyleProp);
  }
  return [faceNamesCache objectForKey:key
                                 orSet:^NSString * {
                                   return computeFaceName(fontFamily, fontWeightProp, fontWeight, fontStyleProp);
                                 }];
}

CGFloat plainTextFontSizeMultiplier(const RNPlainTextProps &props, CGFloat baseMultiplier)
{
  return clampFontSizeMultiplier(props.allowFontScaling, props.maxFontSizeMultiplier, baseMultiplier);
}

// The resolution plainTextFont's cache wraps, for an already-scaled fontSize and faceKey.
static UIFont *resolvedFont(const RNPlainTextProps &props, const std::string &faceKey, CGFloat fontSize, bool italic)
{
  const std::string &fontFamily = stringPropOrEmpty(props.fontFamily);
  const std::string &fontWeight = stringPropOrEmpty(props.fontWeight);
  const std::string &fontStyle = stringPropOrEmpty(props.fontStyle);
  const std::vector<std::string> &fontVariant = arrayPropOrEmpty(props.fontVariant);
  const std::string &fontVariationSettings = stringPropOrEmpty(props.fontVariationSettings);

  RCTFontWeight weight = fontWeightFromProp(fontWeight);
  UIFont *font = nil;
  // "System" is RCTFont.mm's special-case name for the system font (no family is actually registered as "System"), so it's excluded here rather than failing the family lookup and logging.
  if (!fontFamily.empty() && fontFamily != "System") {
    NSString *faceName = resolvedFaceName(fontFamily, faceKey, fontWeight, weight, fontStyle);
    if (faceName != nil) {
      font = [UIFont fontWithName:faceName size:fontSize];
    }
  }

  // Falls back to the system font when there's no fontFamily (or "System", or an unrecognized name), matching RCTFont.mm, since a real font is required downstream (the italic round-trip below, and callers reading font.lineHeight).
  if (font == nil) {
    font = [UIFont systemFontOfSize:fontSize weight:weight];
  }

  // Only when the resolved face isn't already italic: a real italic cut
  // beats a synthesized slant.
  if (italic && !isItalicFont(font)) {
    UIFontDescriptor *italicDescriptor = [font.fontDescriptor
        fontDescriptorWithSymbolicTraits:font.fontDescriptor.symbolicTraits | UIFontDescriptorTraitItalic];
    font = [UIFont fontWithDescriptor:italicDescriptor size:fontSize] ?: font;
  }

  // Added last, as in RCTFont.mm, on top of whatever family/weight/italic resolution produced.
  NSArray<NSDictionary *> *features = fontFeatureSettings(fontVariant);
  if (features != nil) {
    // EXPENSIVE: a descriptor round trip (fontVariant's cache-miss cost, docs/contributing/performance.md).
    UIFontDescriptor *featureDescriptor = [font.fontDescriptor
        fontDescriptorByAddingAttributes:@{UIFontDescriptorFeatureSettingsAttribute : features}];
    font = [UIFont fontWithDescriptor:featureDescriptor size:fontSize] ?: font;
  }

  // Variable-font axes, applied last so they win over family/weight resolution, matching CSS's font-variation-settings precedence over font-weight.
  // Set via CTFontCreateCopyWithAttributes, not -[UIFont fontWithDescriptor:size:], which has been reported to drop kCTFontVariationAttribute since iOS 14 (developer.apple.com/forums/thread/669246). CTFont/UIFont are toll-free bridged, so the result is a UIFont either way.
  // Only a font whose file carries an fvar table can move. The system font's axes are private, so this silently no-ops without a registered variable family.
  NSDictionary<NSNumber *, NSNumber *> *variations = fontVariations(fontVariationSettings);
  if (variations != nil) {
    CTFontDescriptorRef variationDescriptor = CTFontDescriptorCreateWithAttributes(
        (__bridge CFDictionaryRef) @{(__bridge id)kCTFontVariationAttribute : variations});
    // EXPENSIVE: a CTFont copy (fontVariationSettings' cache-miss cost, docs/contributing/performance.md).
    UIFont *variedFont = (__bridge_transfer UIFont *)CTFontCreateCopyWithAttributes(
        (__bridge CTFontRef)font, font.pointSize, NULL, variationDescriptor);
    CFRelease(variationDescriptor);
    if (variedFont != nil) {
      font = variedFont;
    }
  }

  return font;
}

// SYNC: `fontCacheKey` (PlainTextFontCacheKey.h) must cover every input this and resolvedFont read.
UIFont *plainTextFont(const RNPlainTextProps &props, CGFloat fontSizeMultiplier)
{
  static PlainTextFontCache<NSString *, UIFont *> *resolvedFontsCache =
      [[PlainTextFontCache alloc] initWithCountLimit:kFontCacheCountLimit];

  const std::string &fontFamily = stringPropOrEmpty(props.fontFamily);
  const std::string &fontWeight = stringPropOrEmpty(props.fontWeight);
  const std::string &fontStyle = stringPropOrEmpty(props.fontStyle);
  const std::vector<std::string> &fontVariant = arrayPropOrEmpty(props.fontVariant);
  const std::string &fontVariationSettings = stringPropOrEmpty(props.fontVariationSettings);

  CGFloat fontSize = scaledFontSize(props.fontSize, fontSizeMultiplier);
  bool italic = isItalicFromProp(fontStyle);
  std::string faceKey = faceCacheKey(fontFamily, fontWeight, fontStyle);
  std::string cacheKey = fontCacheKey(faceKey, fontSize, fontVariant, fontVariationSettings);
  NSString *key = [NSString stringWithUTF8String:cacheKey.c_str()];

  return [resolvedFontsCache objectForKey:key
                                     orSet:^UIFont * {
                                       return resolvedFont(props, faceKey, fontSize, italic);
                                     }];
}

} // namespace facebook::react
