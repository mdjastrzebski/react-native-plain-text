#import "PlainTextProps.h"

#import <CoreText/CoreText.h>

namespace facebook::react::plaintext {

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

NSString *applyTextTransform(NSString *text, RNPlainTextTextTransform textTransform)
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

NSTextAlignment textAlignmentFromProp(RNPlainTextTextAlign textAlign)
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

BOOL textDecorationHasUnderline(const std::string &textDecorationLine)
{
    return textDecorationLine.find("underline") != std::string::npos;
}

BOOL textDecorationHasLineThrough(const std::string &textDecorationLine)
{
    return textDecorationLine.find("line-through") != std::string::npos;
}

RNPlainTextTextAlignVertical resolveVerticalAlign(RNPlainTextTextAlignVertical textAlignVertical, const std::optional<std::string> &verticalAlign)
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

NSLineBreakMode lineBreakModeFromProp(RNPlainTextEllipsizeMode ellipsizeMode)
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

#define FontFeature(type, selector) \
    @{UIFontFeatureTypeIdentifierKey : @(type), UIFontFeatureSelectorIdentifierKey : @(selector)}

NSDictionary<NSString *, NSDictionary *> *fontVariantDescriptors(void)
{
    static NSDictionary<NSString *, NSDictionary *> *descriptors = @{
        @"small-caps" : FontFeature(kLowerCaseType, kLowerCaseSmallCapsSelector),
        @"oldstyle-nums" : FontFeature(kNumberCaseType, kLowerCaseNumbersSelector),
        @"lining-nums" : FontFeature(kNumberCaseType, kUpperCaseNumbersSelector),
        @"tabular-nums" : FontFeature(kNumberSpacingType, kMonospacedNumbersSelector),
        @"proportional-nums" : FontFeature(kNumberSpacingType, kProportionalNumbersSelector),
        @"common-ligatures" : FontFeature(kLigaturesType, kCommonLigaturesOnSelector),
        @"no-common-ligatures" : FontFeature(kLigaturesType, kCommonLigaturesOffSelector),
        @"discretionary-ligatures" : FontFeature(kLigaturesType, kRareLigaturesOnSelector),
        @"no-discretionary-ligatures" : FontFeature(kLigaturesType, kRareLigaturesOffSelector),
        @"historical-ligatures" : FontFeature(kLigaturesType, kHistoricalLigaturesOnSelector),
        @"no-historical-ligatures" : FontFeature(kLigaturesType, kHistoricalLigaturesOffSelector),
        @"contextual" : FontFeature(kContextualAlternatesType, kContextualAlternatesOnSelector),
        @"no-contextual" : FontFeature(kContextualAlternatesType, kContextualAlternatesOffSelector),
        @"stylistic-one" : FontFeature(kStylisticAlternativesType, kStylisticAltOneOnSelector),
        @"stylistic-two" : FontFeature(kStylisticAlternativesType, kStylisticAltTwoOnSelector),
        @"stylistic-three" : FontFeature(kStylisticAlternativesType, kStylisticAltThreeOnSelector),
        @"stylistic-four" : FontFeature(kStylisticAlternativesType, kStylisticAltFourOnSelector),
        @"stylistic-five" : FontFeature(kStylisticAlternativesType, kStylisticAltFiveOnSelector),
        @"stylistic-six" : FontFeature(kStylisticAlternativesType, kStylisticAltSixOnSelector),
        @"stylistic-seven" : FontFeature(kStylisticAlternativesType, kStylisticAltSevenOnSelector),
        @"stylistic-eight" : FontFeature(kStylisticAlternativesType, kStylisticAltEightOnSelector),
        @"stylistic-nine" : FontFeature(kStylisticAlternativesType, kStylisticAltNineOnSelector),
        @"stylistic-ten" : FontFeature(kStylisticAlternativesType, kStylisticAltTenOnSelector),
        @"stylistic-eleven" : FontFeature(kStylisticAlternativesType, kStylisticAltElevenOnSelector),
        @"stylistic-twelve" : FontFeature(kStylisticAlternativesType, kStylisticAltTwelveOnSelector),
        @"stylistic-thirteen" : FontFeature(kStylisticAlternativesType, kStylisticAltThirteenOnSelector),
        @"stylistic-fourteen" : FontFeature(kStylisticAlternativesType, kStylisticAltFourteenOnSelector),
        @"stylistic-fifteen" : FontFeature(kStylisticAlternativesType, kStylisticAltFifteenOnSelector),
        @"stylistic-sixteen" : FontFeature(kStylisticAlternativesType, kStylisticAltSixteenOnSelector),
        @"stylistic-seventeen" : FontFeature(kStylisticAlternativesType, kStylisticAltSeventeenOnSelector),
        @"stylistic-eighteen" : FontFeature(kStylisticAlternativesType, kStylisticAltEighteenOnSelector),
        @"stylistic-nineteen" : FontFeature(kStylisticAlternativesType, kStylisticAltNineteenOnSelector),
        @"stylistic-twenty" : FontFeature(kStylisticAlternativesType, kStylisticAltTwentyOnSelector),
    };
    return descriptors;
}

} // namespace facebook::react::plaintext
