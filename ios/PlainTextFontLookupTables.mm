#import "PlainTextFontLookupTables.h"

#import <CoreText/CoreText.h>

namespace facebook::react {

UIFontWeight fontWeightFromProp(const std::string &fontWeight)
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

NSDictionary<NSString *, NSDictionary *> *fontVariantDescriptors(void)
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

} // namespace facebook::react
