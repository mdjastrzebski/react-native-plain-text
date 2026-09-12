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
    const std::string &align = verticalAlign.value();
    if (align == "middle") {
        return RNPlainTextTextAlignVertical::Center;
    }
    if (align == "top") {
        return RNPlainTextTextAlignVertical::Top;
    }
    if (align == "bottom") {
        return RNPlainTextTextAlignVertical::Bottom;
    }
    if (align == "auto") {
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

RCTFontWeight plainTextFontWeightFromProp(const std::string &fontWeight)
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

bool plainTextIsItalicFromProp(const std::string &fontStyle)
{
    return fontStyle == "italic" || fontStyle == "oblique";
}

NSDictionary<NSString *, NSDictionary *> *plainTextFontVariantDescriptors(void)
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
