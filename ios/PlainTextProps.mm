#import "PlainTextProps.h"

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

} // namespace facebook::react
