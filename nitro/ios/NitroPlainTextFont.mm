#import "NitroPlainTextFont.h"
#import "NitroPlainTextFontResolution.h"

#import <CoreText/CoreText.h>
#import <React/RCTFont.h>
#import <React/RCTLog.h>
#import <React/RCTUtils.h>

#import <cmath>
#import <string>

// Straight port of ios/PlainTextFont.mm, ios/PlainTextFontCache.mm and the helpers
// they use, minus fontVariant/fontVariationSettings. Keep in step with those.

@interface NitroPlainTextFontCache : NSObject
- (instancetype)initWithCountLimit:(NSUInteger)countLimit;
- (id)objectForKey:(NSString *)key orSet:(id (^)(void))compute;
@end

@implementation NitroPlainTextFontCache {
  NSCache<NSString *, id> *_cache;
}

- (instancetype)initWithCountLimit:(NSUInteger)countLimit
{
  if (self = [super init]) {
    _cache = [NSCache new];
    _cache.countLimit = countLimit;
    NSCache<NSString *, id> *cache = _cache;
    [NSNotificationCenter.defaultCenter
        addObserverForName:(NSNotificationName)kCTFontManagerRegisteredFontsChangedNotification
                    object:nil
                     queue:nil
                usingBlock:^(NSNotification *) {
                  [cache removeAllObjects];
                }];
  }
  return self;
}

- (id)objectForKey:(NSString *)key orSet:(id (^)(void))compute
{
  id cached = [_cache objectForKey:key];
  if (cached != nil) {
    return cached == NSNull.null ? nil : cached;
  }
  id value = compute();
  [_cache setObject:(value ?: NSNull.null) forKey:key];
  return value;
}

@end

namespace margelo::nitro::plaintext {

namespace {

constexpr char kFieldSeparator = '|';
constexpr CGFloat kFaceProbeFontSize = 12;
constexpr NSUInteger kFontCacheCountLimit = 256;

RCTFontWeight fontWeightFromProp(const std::string &fontWeight)
{
  if (fontWeight == "normal" || fontWeight == "400") {
    return UIFontWeightRegular;
  } else if (fontWeight == "bold" || fontWeight == "700") {
    return UIFontWeightBold;
  } else if (fontWeight == "100") {
    return UIFontWeightUltraLight;
  } else if (fontWeight == "200") {
    return UIFontWeightThin;
  } else if (fontWeight == "300") {
    return UIFontWeightLight;
  } else if (fontWeight == "500") {
    return UIFontWeightMedium;
  } else if (fontWeight == "600") {
    return UIFontWeightSemibold;
  } else if (fontWeight == "800") {
    return UIFontWeightHeavy;
  } else if (fontWeight == "900") {
    return UIFontWeightBlack;
  }
  return UIFontWeightRegular;
}

bool isItalicFromProp(const std::string &fontStyle)
{
  return fontStyle == "italic" || fontStyle == "oblique";
}

BOOL isItalicFont(UIFont *font)
{
  return (CTFontGetSymbolicTraits((CTFontRef)font) & kCTFontTraitItalic) != 0;
}

BOOL isCondensedFont(UIFont *font)
{
  return (CTFontGetSymbolicTraits((CTFontRef)font) & kCTFontTraitCondensed) != 0;
}

NSArray<NSString *> *cachedFontNamesForFamilyName(NSString *familyName)
{
  static NitroPlainTextFontCache *familyNamesCache = [[NitroPlainTextFontCache alloc] initWithCountLimit:0];
  return [familyNamesCache objectForKey:familyName
                                  orSet:^id {
                                    return [UIFont fontNamesForFamilyName:familyName] ?: @[];
                                  }];
}

NSString *closestFaceNameInFamily(NSArray<NSString *> *names, RCTFontWeight fontWeight, BOOL isItalic, BOOL isCondensed)
{
  if (names.count == 0) {
    return nil;
  }
  if (names.count == 1) {
    return names[0];
  }

  NSString *name = nil;
  CGFloat closestWeight = INFINITY;
  for (NSString *candidate in names) {
    UIFont *match = [UIFont fontWithName:candidate size:kFaceProbeFontSize];
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
  return name ?: names[0];
}

NSString *computeFaceName(const std::string &fontFamily,
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

  UIFont *namedFont = [UIFont fontWithName:familyName size:kFaceProbeFontSize];
  if (namedFont == nil) {
    RCTLogInfo(@"Unrecognized font family '%@'", familyName);
    return nil;
  }

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

NSString *resolvedFaceName(const std::string &fontFamily,
                           const std::string &faceKey,
                           const std::string &fontWeightProp,
                           RCTFontWeight fontWeight,
                           const std::string &fontStyleProp)
{
  static NitroPlainTextFontCache *faceNamesCache = [[NitroPlainTextFontCache alloc] initWithCountLimit:0];
  NSString *key = [NSString stringWithUTF8String:faceKey.c_str()];
  if (key == nil) {
    return computeFaceName(fontFamily, fontWeightProp, fontWeight, fontStyleProp);
  }
  return [faceNamesCache objectForKey:key
                                orSet:^id {
                                  return computeFaceName(fontFamily, fontWeightProp, fontWeight, fontStyleProp);
                                }];
}

UIFont *computeFont(const std::string &fontFamily,
                    const std::string &fontWeight,
                    const std::string &fontStyle,
                    const std::string &faceKey,
                    CGFloat fontSize)
{
  RCTFontWeight weight = fontWeightFromProp(fontWeight);
  UIFont *font = nil;
  if (!fontFamily.empty() && fontFamily != "System") {
    NSString *faceName = resolvedFaceName(fontFamily, faceKey, fontWeight, weight, fontStyle);
    if (faceName != nil) {
      font = [UIFont fontWithName:faceName size:fontSize];
    }
  }

  if (font == nil) {
    font = [UIFont systemFontOfSize:fontSize weight:weight];
  }

  if (isItalicFromProp(fontStyle) && !isItalicFont(font)) {
    UIFontDescriptor *italicDescriptor = [font.fontDescriptor
        fontDescriptorWithSymbolicTraits:font.fontDescriptor.symbolicTraits | UIFontDescriptorTraitItalic];
    font = [UIFont fontWithDescriptor:italicDescriptor size:fontSize] ?: font;
  }

  return font;
}

} // namespace

UIFont *resolveFont(const std::string &fontFamily,
                    const std::string &fontWeight,
                    const std::string &fontStyle,
                    CGFloat fontSize,
                    CGFloat fontSizeMultiplier)
{
  static NitroPlainTextFontCache *resolvedFontsCache =
      [[NitroPlainTextFontCache alloc] initWithCountLimit:kFontCacheCountLimit];

  // Unrounded, like PlainText's scaledFontSize.
  CGFloat scaledSize = fontSize * fontSizeMultiplier;

  // PlainText's faceCacheKey/fontCacheKey (ios/PlainTextFontCacheKey.cpp).
  std::string faceKey = fontFamily;
  faceKey += kFieldSeparator;
  faceKey += fontWeight;
  faceKey += kFieldSeparator;
  faceKey += fontStyle;
  std::string cacheKey = faceKey;
  cacheKey += kFieldSeparator;
  cacheKey += std::to_string(std::lround(scaledSize * 100));

  NSString *key = [NSString stringWithUTF8String:cacheKey.c_str()];
  if (key == nil) {
    return computeFont(fontFamily, fontWeight, fontStyle, faceKey, scaledSize);
  }
  return [resolvedFontsCache objectForKey:key
                                    orSet:^id {
                                      return computeFont(fontFamily, fontWeight, fontStyle, faceKey, scaledSize);
                                    }];
}

CGFloat clampFontSizeMultiplier(bool allowFontScaling, double maxFontSizeMultiplier, CGFloat baseMultiplier)
{
  if (!allowFontScaling) {
    return 1.0;
  }
  if (maxFontSizeMultiplier >= 1.0) {
    return std::fmin(maxFontSizeMultiplier, baseMultiplier);
  }
  return baseMultiplier;
}

NSString *capitalizedString(NSString *text)
{
  NSMutableString *result = [text mutableCopy];
  [text enumerateSubstringsInRange:NSMakeRange(0, text.length)
                           options:NSStringEnumerationByWords
                        usingBlock:^(NSString *word, NSRange wordRange, NSRange enclosingRange, BOOL *stop) {
                          if (word.length == 0) {
                            return;
                          }
                          NSRange firstCharRange = [word rangeOfComposedCharacterSequenceAtIndex:0];
                          NSString *upperFirstChar = [word substringWithRange:firstCharRange].uppercaseString;
                          [result replaceCharactersInRange:NSMakeRange(wordRange.location + firstCharRange.location,
                                                                       firstCharRange.length)
                                                withString:upperFirstChar];
                        }];
  return result;
}

} // namespace margelo::nitro::plaintext

using namespace margelo::nitro::plaintext;

static std::string stdString(NSString *value)
{
  return value != nil ? std::string(value.UTF8String ?: "") : std::string();
}

@implementation NitroPlainTextFont

+ (UIFont *)fontWithFamily:(NSString *)fontFamily
                    weight:(NSString *)fontWeight
                     style:(NSString *)fontStyle
                      size:(CGFloat)fontSize
                multiplier:(CGFloat)multiplier
{
  return resolveFont(stdString(fontFamily), stdString(fontWeight), stdString(fontStyle), fontSize, multiplier);
}

+ (CGFloat)fontSizeMultiplierWithAllowFontScaling:(BOOL)allowFontScaling
                            maxFontSizeMultiplier:(CGFloat)maxFontSizeMultiplier
{
  // Main thread only, like RNPlainText.mm's read (the shadow node uses the layout context's).
  return clampFontSizeMultiplier(allowFontScaling, maxFontSizeMultiplier, RCTFontSizeMultiplier());
}

+ (NSString *)capitalizedString:(NSString *)text
{
  return margelo::nitro::plaintext::capitalizedString(text);
}

@end
