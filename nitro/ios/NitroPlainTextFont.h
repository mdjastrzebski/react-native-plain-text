// Swift-facing wrapper around NitroPlainTextFontResolution.h, so the mounted view
// (HybridNitroPlainText.swift) resolves fonts exactly as the shadow node measures
// them. Public header: pure Objective-C, no C++, since it lands in the module's
// umbrella header that Swift imports.

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface NitroPlainTextFont : NSObject

/// PlainText's resolveFont (ios/PlainTextFont.mm): `fontSize` scaled by `multiplier`.
+ (UIFont *)fontWithFamily:(nullable NSString *)fontFamily
                    weight:(nullable NSString *)fontWeight
                     style:(nullable NSString *)fontStyle
                      size:(CGFloat)fontSize
                multiplier:(CGFloat)multiplier;

/// RCTFontSizeMultiplier(), clamped as PlainText's resolveFontSizeMultiplier does.
/// `maxFontSizeMultiplier` below 1 means no cap.
+ (CGFloat)fontSizeMultiplierWithAllowFontScaling:(BOOL)allowFontScaling
                            maxFontSizeMultiplier:(CGFloat)maxFontSizeMultiplier;

/// PlainText's textTransform: 'capitalize' (first character of each word only).
+ (NSString *)capitalizedString:(NSString *)text;

@end

NS_ASSUME_NONNULL_END
