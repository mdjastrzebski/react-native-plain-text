#import "PlainTextHyphenation.h"

namespace facebook::react {

NSString *plainTextApplyHyphens(NSString *text, RNPlainTextHyphens hyphens)
{
    if (hyphens != RNPlainTextHyphens::None) {
        return text;
    }
    // Built from the code point rather than a literal, invisible in source.
    static const unichar softHyphenChar = 0x00AD;
    NSString *softHyphen = [NSString stringWithCharacters:&softHyphenChar length:1];
    if ([text rangeOfString:softHyphen].location == NSNotFound) {
        return text;
    }
    // EXPENSIVE: allocates a stripped copy per call (docs/agent/performance.md).
    return [text stringByReplacingOccurrencesOfString:softHyphen withString:@""];
}

} // namespace facebook::react
