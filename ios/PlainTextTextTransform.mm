#import "PlainTextTextTransform.h"

namespace facebook::react {

// CSS `text-transform: capitalize` (and PlainTextView.kt's applyTextTransform on
// Android): uppercase only each Unicode word's first character, leave the rest of
// the word untouched. Deliberately not RN's iOS capitalizedString-based behavior
// (see PlainTextTextTransform.h) since that force-lowercases the rest of every word.
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
    // EXPENSIVE: allocates a transformed copy of the string per call (docs/agent/performance.md);
    // Capitalize additionally enumerates Unicode word boundaries via capitalizedString above.
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

} // namespace facebook::react
