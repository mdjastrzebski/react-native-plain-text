// Port of PlainText's iOS font resolution (ios/PlainTextFont.mm) for the Nitro
// port, shared by the shadow node's measureContent and the mounted view (through
// NitroPlainTextFont.h), so the measured box and drawn text agree. fontVariant and
// fontVariationSettings are left out: the Nitro spec has neither.
//
// Private header (C++).

#pragma once

#import <UIKit/UIKit.h>

#import <string>

namespace margelo::nitro::plaintext {

// PlainText's resolveFont: cached per family/weight/style/scaled size, never nil.
// Callable from any thread.
UIFont *resolveFont(const std::string &fontFamily,
                    const std::string &fontWeight,
                    const std::string &fontStyle,
                    CGFloat fontSize,
                    CGFloat fontSizeMultiplier);

// PlainText's clampFontSizeMultiplier (ios/PlainTextFontSizing.cpp).
CGFloat clampFontSizeMultiplier(bool allowFontScaling, double maxFontSizeMultiplier, CGFloat baseMultiplier);

// PlainText's capitalize textTransform (ios/PlainTextProps.mm).
NSString *capitalizedString(NSString *text);

} // namespace margelo::nitro::plaintext
