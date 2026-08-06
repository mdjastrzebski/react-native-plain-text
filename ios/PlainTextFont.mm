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

// Caching wrapper around +[UIFont fontNamesForFamilyName:], which enumerates the
// font database — RCTFont.mm calls it expensive and wraps it the same way. The
// empty answer is cached too: a fontFamily naming a face rather than a family
// ("OpenRunde-Bold") never produces a list, and would ask on every lookup.
static NSArray<NSString *> *cachedFontNamesForFamilyName(NSString *familyName)
{
  static PlainTextFontCache<NSString *, NSArray<NSString *> *> *familyNamesCache =
      [[PlainTextFontCache alloc] initWithCountLimit:0];

  return [familyNamesCache objectForKey:familyName
                                   orSet:^NSArray<NSString *> * {
                                     return [UIFont fontNamesForFamilyName:familyName] ?: @[];
                                   }];
}

/*
 * Face selection within a font family, taken from React Native's own
 * RCTFont.mm, so that a custom fontFamily resolves to exactly the face RN's
 * <Text> would pick rather than merely a similar one.
 *
 * Based on: https://github.com/facebook/react-native/blob/main/packages/react-native/React/Views/RCTFont.mm
 *
 * The weight lookup is not copied: RCTGetFontWeight is RCT_EXTERN in
 * <React/RCTFont.h>, so it is called directly and cannot drift. isItalicFont
 * and isCondensedFont below are static in RCTFont.mm, and the face loop is
 * inline in +updateFont:withFamily:size:weight:style:variant:scaleMultiplier:,
 * so there is nothing to link against for either.
 */

static BOOL isItalicFont(UIFont *font)
{
  return (CTFontGetSymbolicTraits((CTFontRef)font) & kCTFontTraitItalic) != 0;
}

static BOOL isCondensedFont(UIFont *font)
{
  return (CTFontGetSymbolicTraits((CTFontRef)font) & kCTFontTraitCondensed) != 0;
}

// Everything the comparison below reads — the PostScript name, the symbolic
// traits, the weight trait — belongs to the face rather than to the size it was
// asked for, so the faces can be compared at any size and the winner cached
// without one.
static constexpr CGFloat kFaceProbeFontSize = 12;

/*
 * The PostScript name of the face in this family closest to the requested weight
 * and slant, or nil if the family has no faces at all.
 *
 * Based on: https://github.com/facebook/react-native/blob/main/packages/react-native/React/Views/RCTFont.mm
 *
 *   - RN's `didFindFont` guard is dropped. It exists so RN can skip the loop
 *     after its system-font special case, which this function is never reached
 *     for — an empty fontFamily takes the systemFontOfSize: path in
 *     plainTextFont instead.
 *   - `isCondensed` is a parameter rather than derived from a "SystemCondensed"
 *     family name, which this library has no equivalent of. The top-level
 *     family lookup in resolvedFaceName passes NO, matching RN's own default
 *     for a fresh (font == nil) update; the face-name fallback below passes
 *     the matched face's actual trait, as RN derives it from that same face.
 *   - RN keeps the winning UIFont; this keeps its name, and the caller
 *     instantiates it at the size actually wanted.
 *
 * Deliberately not UIFontDescriptorFamilyAttribute + UIFontWeightTrait, which
 * is what this replaced: descriptor matching leans on the very weight trait
 * that RCTGetFontWeight goes out of its way to consult last, and an unmatched
 * descriptor resolves to the system font instead of failing — the silent
 * fallback this whole path exists to avoid.
 */
static NSString *closestFaceNameInFamily(
    NSArray<NSString *> *names,
    RCTFontWeight fontWeight,
    BOOL isItalic,
    BOOL isCondensed)
{
  if (names.count == 0) {
    return nil;
  }

  // One face is the answer either way: the loop picks it if it matches, and the
  // fallback below picks it if it doesn't. Skipping the loop skips the whole cost
  // of the scan, and one face is the usual shape of a custom or expo font.
  if (names.count == 1) {
    return names[0];
  }

  NSString *name = nil;

  // Get the closest font that matches the given weight for the fontFamily
  CGFloat closestWeight = INFINITY;
  for (NSString *candidate in names) {
    UIFont *match = [UIFont fontWithName:candidate size:kFaceProbeFontSize];
    // Guarded, unlike RN, only because the trait calls take a CTFontRef, where
    // nil crashes rather than returning nil.
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

  // If we still don't have a match at least return the first font in the fontFamily
  // This is to support built-in font Zapfino and other custom single font families like Impact
  return name ?: names[0];
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
// kCTFontVariationAttribute takes, or nil when it sets none. Parsing (including
// the "normal" special case) lives in PlainTextFontVariations.cpp; this only
// bridges the result.
static NSDictionary<NSNumber *, NSNumber *> *fontVariations(const std::string &settings)
{
  std::optional<std::vector<PlainTextFontVariationAxis>> axes = parseFontVariations(settings);
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

// The key carries two continuous inputs — fontSize, and any axis in
// fontVariationSettings — so an app animating or otherwise sweeping either would
// grow this cache without limit; NSCache's own eviction only arrives with memory
// pressure, and then drops everything. Well above any real type scale, times
// weights, styles and variants.
static constexpr NSUInteger kFontCacheCountLimit = 256;

static PlainTextFontCache<NSString *, UIFont *> *fontCache()
{
  static PlainTextFontCache<NSString *, UIFont *> *resolvedFontsCache =
      [[PlainTextFontCache alloc] initWithCountLimit:kFontCacheCountLimit];
  return resolvedFontsCache;
}

/*
 * The face name to instantiate for this fontFamily, or nil if it resolves to
 * nothing and the caller should fall back to the system font.
 *
 * `fontWeightProp` is the raw prop string, not just the weight it maps to: an
 * empty string is RN's own signal that fontWeight wasn't set (RCTFont.mm reads
 * it from a possibly-nil JSON value), and the face-name fallback below needs
 * that signal to know whether to keep the caller's weight or take the matched
 * face's own.
 */
static NSString *computeFaceName(
    const std::string &fontFamily,
    const std::string &fontWeightProp,
    RCTFontWeight fontWeight,
    BOOL isItalic)
{
  NSString *familyName = [NSString stringWithUTF8String:fontFamily.c_str()];
  if (familyName == nil) {
    return nil;
  }

  NSString *faceName = closestFaceNameInFamily(cachedFontNamesForFamilyName(familyName), fontWeight, isItalic, NO);
  if (faceName != nil) {
    return faceName;
  }

  // Not a registered family, so take it for the face / PostScript name it
  // probably is ("OpenRunde-Bold" rather than "Open Runde"). An expo-font
  // alias lands in the branch above instead: the swizzled
  // +fontNamesForFamilyName: answers it with a one-element array.
  UIFont *namedFont = [UIFont fontWithName:familyName size:kFaceProbeFontSize];
  if (namedFont == nil) {
    // Same message and same level as RCTFont.mm, from the same branch, so a
    // typo reads identically whether it hit <PlainText> or <Text>. Info
    // rather than warn keeps it out of LogBox, which is RN's call, not ours.
    RCTLogInfo(@"Unrecognized font family '%@'", familyName);
    return nil;
  }

  // RN doesn't stop here either ("we'll do what was meant, not what was
  // said"): it re-derives the real family from this face and searches that
  // family for the closest match to what the props actually ask for, so
  // "Georgia-Bold" + fontStyle: "italic" lands on the family's real
  // BoldItalic face instead of a synthesized slant on Georgia-Bold.
  //
  // A prop that wasn't set inherits the matched face's own trait rather than
  // a hardcoded default, exactly as RCTFont.mm's `style ? isItalic :
  // isItalicFont(font)` / `weight ? fontWeight : RCTGetFontWeight(font)` do —
  // isItalic has no "unset" of its own to check (fontStyle's codegen default
  // collapses "not passed" and "normal" into the same enum value, see
  // PlainTextViewNativeComponent.ts), so a caller-true isItalic wins and a
  // caller-false one falls through to the face.
  NSString *realFamilyName = namedFont.familyName;
  BOOL faceIsItalic = isItalicFont(namedFont);
  BOOL faceIsCondensed = isCondensedFont(namedFont);
  RCTFontWeight faceWeight = RCTGetFontWeight(namedFont);
  BOOL effectiveIsItalic = isItalic || faceIsItalic;
  RCTFontWeight effectiveWeight = fontWeightProp.empty() ? faceWeight : fontWeight;
  return closestFaceNameInFamily(
             cachedFontNamesForFamilyName(realFamilyName), effectiveWeight, effectiveIsItalic, faceIsCondensed)
      ?: familyName;
}

// Cached apart from the font itself because the answer doesn't depend on
// fontSize (see kFaceProbeFontSize), so a new size costs one font
// instantiation instead of another scan of the family.
static NSString *resolvedFaceName(
    const std::string &fontFamily,
    const std::string &faceKey,
    const std::string &fontWeightProp,
    RCTFontWeight fontWeight,
    BOOL isItalic)
{
  static PlainTextFontCache<NSString *, NSString *> *faceNamesCache =
      [[PlainTextFontCache alloc] initWithCountLimit:0];

  NSString *key = [NSString stringWithUTF8String:faceKey.c_str()];
  if (key == nil) {
    return computeFaceName(fontFamily, fontWeightProp, fontWeight, isItalic);
  }
  return [faceNamesCache objectForKey:key
                                 orSet:^NSString * {
                                   return computeFaceName(fontFamily, fontWeightProp, fontWeight, isItalic);
                                 }];
}

CGFloat plainTextFontSizeMultiplier(const RNPlainTextProps &props, CGFloat baseMultiplier)
{
  return clampFontSizeMultiplier(props.allowFontScaling, props.maxFontSizeMultiplier, baseMultiplier);
}

// The UIFont for these props at this already-scaled fontSize and faceKey —
// the resolution plainTextFont's cache wraps. Never nil: an unresolvable
// fontFamily falls back to the system font, since both of plainTextFont's
// callers would otherwise silently measure and draw with different defaults.
static UIFont *resolvedFont(const RNPlainTextProps &props, const std::string &faceKey, CGFloat fontSize, bool italic)
{
  UIFontWeight weight = fontWeightFromProp(props.fontWeight);
  UIFont *font = nil;
  // "System" is RCTFont.mm's own special case for the system font by name
  // (RN's <Text> accepts it the same way), so it's excluded here rather than
  // sent through the family lookup below, where no family is actually
  // registered as "System" and it would only fail and log.
  if (!props.fontFamily.empty() && props.fontFamily != "System") {
    NSString *faceName = resolvedFaceName(props.fontFamily, faceKey, props.fontWeight, weight, italic);
    if (faceName != nil) {
      font = [UIFont fontWithName:faceName size:fontSize];
    }
  }

  // No fontFamily (or "System"), or one naming neither a known family nor a
  // known face — the latter is RCTFont.mm's fallback too. Everything
  // downstream needs a real font: the italic round-trip below, and both of
  // plainTextFont's callers, which read font.lineHeight to cap numberOfLines.
  if (font == nil) {
    font = [UIFont systemFontOfSize:fontSize weight:weight];
  }

  // Only when the resolved face isn't already italic — closestFaceNameInFamily
  // prefers the family's real italic cut, which beats a synthesized slant.
  if (italic && !isItalicFont(font)) {
    UIFontDescriptor *italicDescriptor = [font.fontDescriptor
        fontDescriptorWithSymbolicTraits:font.fontDescriptor.symbolicTraits | UIFontDescriptorTraitItalic];
    font = [UIFont fontWithDescriptor:italicDescriptor size:fontSize] ?: font;
  }

  // Last, as in RCTFont.mm: the features are added to whatever descriptor the
  // family/weight/italic resolution ended up with.
  NSArray<NSDictionary *> *features = fontFeatureSettings(props.fontVariant);
  if (features != nil) {
    UIFontDescriptor *featureDescriptor = [font.fontDescriptor
        fontDescriptorByAddingAttributes:@{UIFontDescriptorFeatureSettingsAttribute : features}];
    font = [UIFont fontWithDescriptor:featureDescriptor size:fontSize] ?: font;
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
  if (variations != nil) {
    CTFontDescriptorRef variationDescriptor = CTFontDescriptorCreateWithAttributes(
        (__bridge CFDictionaryRef) @{(__bridge id)kCTFontVariationAttribute : variations});
    UIFont *variedFont = (__bridge_transfer UIFont *)CTFontCreateCopyWithAttributes(
        (__bridge CTFontRef)font, font.pointSize, NULL, variationDescriptor);
    CFRelease(variationDescriptor);
    if (variedFont != nil) {
      font = variedFont;
    }
  }

  return font;
}

UIFont *plainTextFont(const RNPlainTextProps &props, CGFloat fontSizeMultiplier)
{
  CGFloat fontSize = scaledFontSize(props.fontSize, fontSizeMultiplier);
  bool italic = props.fontStyle == RNPlainTextFontStyle::Italic;
  std::string faceKey = faceCacheKey(props.fontFamily, props.fontWeight, italic);
  std::string cacheKey = fontCacheKey(faceKey, fontSize, props.fontVariant, props.fontVariationSettings);
  NSString *key = [NSString stringWithUTF8String:cacheKey.c_str()];

  return [fontCache() objectForKey:key
                              orSet:^UIFont * {
                                return resolvedFont(props, faceKey, fontSize, italic);
                              }];
}

} // namespace facebook::react
