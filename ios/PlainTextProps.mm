#import "PlainTextProps.h"

#import <CoreText/CoreText.h>

namespace facebook::react {

// See PlainTextProps.h: uppercases only each word's first character.
static NSString *capitalizedString(NSString *text)
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
        [result replaceCharactersInRange:NSMakeRange(wordRange.location + firstCharRange.location, firstCharRange.length)
                               withString:upperFirstChar];
    }];
    return result;
}

NSString *plainTextApplyTextTransform(NSString *text, RNPlainTextTextTransform textTransform)
{
    // EXPENSIVE: allocates a transformed copy per call (docs/contributing/performance.md).
    switch (textTransform) {
        case RNPlainTextTextTransform::Uppercase:
            return text.uppercaseString;
        case RNPlainTextTextTransform::Lowercase:
            return text.lowercaseString;
        case RNPlainTextTextTransform::Capitalize:
            return capitalizedString(text);
        case RNPlainTextTextTransform::None:
            return text;
    }
}

NSTextAlignment plainTextAlignmentFromProp(RNPlainTextTextAlign textAlign)
{
    switch (textAlign) {
        case RNPlainTextTextAlign::Left:
            return NSTextAlignmentLeft;
        case RNPlainTextTextAlign::Right:
            return NSTextAlignmentRight;
        case RNPlainTextTextAlign::Center:
            return NSTextAlignmentCenter;
        case RNPlainTextTextAlign::Justify:
            return NSTextAlignmentJustified;
        case RNPlainTextTextAlign::Auto:
            return NSTextAlignmentNatural;
    }
}

BOOL plainTextHasUnderline(const std::string &textDecorationLine)
{
    return textDecorationLine.find("underline") != std::string::npos;
}

BOOL plainTextHasLineThrough(const std::string &textDecorationLine)
{
    return textDecorationLine.find("line-through") != std::string::npos;
}

RNPlainTextTextAlignVertical plainTextResolveVerticalAlign(RNPlainTextTextAlignVertical textAlignVertical, const std::optional<std::string> &verticalAlign)
{
    if (!verticalAlign.has_value()) {
        return textAlignVertical;
    }
    if (verticalAlign.value() == "middle") {
        return RNPlainTextTextAlignVertical::Center;
    }
    if (verticalAlign.value() == "top") {
        return RNPlainTextTextAlignVertical::Top;
    }
    if (verticalAlign.value() == "bottom") {
        return RNPlainTextTextAlignVertical::Bottom;
    }
    if (verticalAlign.value() == "auto") {
        return RNPlainTextTextAlignVertical::Auto;
    }
    return textAlignVertical;
}

NSLineBreakMode plainTextLineBreakModeFromProp(RNPlainTextEllipsizeMode ellipsizeMode)
{
    switch (ellipsizeMode) {
        case RNPlainTextEllipsizeMode::Head:
            return NSLineBreakByTruncatingHead;
        case RNPlainTextEllipsizeMode::Middle:
            return NSLineBreakByTruncatingMiddle;
        case RNPlainTextEllipsizeMode::Tail:
            return NSLineBreakByTruncatingTail;
        case RNPlainTextEllipsizeMode::Clip:
            return NSLineBreakByClipping;
    }
}

RCTFontWeight fontWeightFromProp(const std::string &fontWeight)
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
    return weight != nil ? (RCTFontWeight)weight.doubleValue : UIFontWeightRegular;
}

bool isItalicFromProp(const std::string &fontStyle)
{
    return fontStyle == "italic" || fontStyle == "oblique";
}

NSDictionary<NSString *, NSDictionary *> *fontVariantDescriptors(void)
{
#define RNPlainTextFeature(type, selector) \
    @{UIFontFeatureTypeIdentifierKey : @(type), UIFontFeatureSelectorIdentifierKey : @(selector)}
    static NSDictionary<NSString *, NSDictionary *> *descriptors = @{
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
    return descriptors;
}

} // namespace facebook::react
