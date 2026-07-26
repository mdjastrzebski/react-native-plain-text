#import "RNPlainText.h"

#import <React/RCTConversions.h>
#import <React/RCTUtils.h>
#import <react/renderer/components/RNPlainTextSpec/Props.h>
#import <react/renderer/components/RNPlainTextSpec/RCTComponentViewHelpers.h>

#import "PlainTextComponentDescriptor.h"
#import "RCTFabricComponentsPlugins.h"

using namespace facebook::react;

// Mirrors RCTFont.mm's core weight map (RCTConvert RCTFontWeight): the named
// aliases beyond "normal"/"bold" (e.g. "ultralight", "condensed") are dropped
// since codegen can't type fontWeight as an enum (see PlainTextViewNativeComponent.ts).
static UIFontWeight RNPlainTextFontWeightFromProp(const std::string &fontWeight)
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

// The accessibility font-size multiplier to apply, mirroring RN's
// RCTEffectiveFontSizeMultiplierFromTextAttributes: the system Dynamic Type
// scale (RCTFontSizeMultiplier, same value the Fabric surface feeds into layout)
// when allowFontScaling is on, clamped by maxFontSizeMultiplier when that is
// >= 1. Runs on the main thread from updateProps; the shadow node mirrors this
// with the layout context's fontSizeMultiplier for measurement.
static CGFloat RNPlainTextFontSizeMultiplier(const RNPlainTextProps &props)
{
    if (!props.allowFontScaling) {
        return 1.0;
    }
    CGFloat multiplier = RCTFontSizeMultiplier();
    if (props.maxFontSizeMultiplier >= 1.0) {
        multiplier = fminf((CGFloat)props.maxFontSizeMultiplier, multiplier);
    }
    return multiplier;
}

static UIFont *RNPlainTextFontFromProps(const RNPlainTextProps &props)
{
    UIFontWeight weight = RNPlainTextFontWeightFromProp(props.fontWeight);
    BOOL italic = props.fontStyle == RNPlainTextFontStyle::Italic;
    CGFloat fontSize = props.fontSize * RNPlainTextFontSizeMultiplier(props);

    UIFont *font;
    if (!props.fontFamily.empty()) {
        NSString *fontFamily = [NSString stringWithUTF8String:props.fontFamily.c_str()];
        UIFontDescriptor *descriptor = [UIFontDescriptor fontDescriptorWithFontAttributes:@{
            UIFontDescriptorFamilyAttribute : fontFamily,
            UIFontDescriptorTraitsAttribute : @{UIFontWeightTrait : @(weight)},
        }];
        font = [UIFont fontWithDescriptor:descriptor size:fontSize];
    } else {
        font = [UIFont systemFontOfSize:fontSize weight:weight];
    }

    if (italic) {
        UIFontDescriptor *italicDescriptor = [font.fontDescriptor
            fontDescriptorWithSymbolicTraits:font.fontDescriptor.symbolicTraits | UIFontDescriptorTraitItalic];
        font = [UIFont fontWithDescriptor:italicDescriptor size:fontSize];
    }

    return font;
}

static NSTextAlignment RNPlainTextAlignmentFromProp(RNPlainTextTextAlign textAlign)
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

// textDecorationLine is a space-joined set of "underline"/"line-through" (see
// PlainTextViewNativeComponent.ts on why it isn't a codegen enum). Mirrors RN
// <Text>: substring presence toggles each decoration independently.
static BOOL RNPlainTextHasUnderline(const std::string &textDecorationLine)
{
    return textDecorationLine.find("underline") != std::string::npos;
}

static BOOL RNPlainTextHasLineThrough(const std::string &textDecorationLine)
{
    return textDecorationLine.find("line-through") != std::string::npos;
}

static NSLineBreakMode RNPlainTextLineBreakModeFromProp(RNPlainTextEllipsizeMode ellipsizeMode)
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

// UILabel vertically centers its text when its frame is taller than the text
// (e.g. an explicit height). RN's <Text> on iOS top-aligns instead, and treats
// vertical alignment as Android-only, so top-align here to match <Text>. This
// is why textAlignVertical is not applied on iOS: RN's iOS text has no vertical
// alignment knob — it is always pinned to the top.
@interface RNPlainTextLabel : UILabel
@end

@implementation RNPlainTextLabel
- (CGRect)textRectForBounds:(CGRect)bounds limitedToNumberOfLines:(NSInteger)numberOfLines
{
    CGRect rect = [super textRectForBounds:bounds limitedToNumberOfLines:numberOfLines];
    rect.origin.y = bounds.origin.y;
    return rect;
}

- (void)drawTextInRect:(CGRect)rect
{
    [super drawTextInRect:[self textRectForBounds:rect limitedToNumberOfLines:self.numberOfLines]];
}
@end

@implementation RNPlainText {
    UILabel * _label;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<PlainTextComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const RNPlainTextProps>();
    _props = defaultProps;

    _label = [[RNPlainTextLabel alloc] init];
    _label.numberOfLines = 0;
    _label.textColor = [UIColor blackColor];
    // Seed the label's font from the prop defaults so the diff in updateProps
    // (which compares against defaultProps on first mount) is valid. Without
    // this, a view whose fontSize equals the default is never applied and the
    // label keeps UILabel's built-in 17pt — larger than the measured size, so
    // the text truncates.
    _label.font = [UIFont systemFontOfSize:defaultProps->fontSize];

    self.contentView = _label;
  }

  return self;
}

// UILabel has no plain properties for lineHeight or letterSpacing, so once
// either is set the text/font/color/alignment all have to be expressed through
// an NSAttributedString. This applies whichever form is needed from the current
// props; call it whenever any text-content prop changes.
// SYNC: PlainTextShadowNode::measureContent must mirror every attribute set
// here, or the measured size won't match the drawn text.
- (void)applyContentFromProps:(const RNPlainTextProps &)props
{
    UIFont *font = RNPlainTextFontFromProps(props);
    UIColor *color = props.color ? RCTUIColorFromSharedColor(props.color) : [UIColor blackColor];
    NSTextAlignment alignment = RNPlainTextAlignmentFromProp(props.textAlign);
    NSString *text = [NSString stringWithUTF8String:props.text.c_str()] ?: @"";

    BOOL hasLineHeight = props.lineHeight > 0;
    BOOL hasLetterSpacing = props.letterSpacing != 0;
    BOOL hasUnderline = RNPlainTextHasUnderline(props.textDecorationLine);
    BOOL hasLineThrough = RNPlainTextHasLineThrough(props.textDecorationLine);
    BOOL hasTextDecoration = hasUnderline || hasLineThrough;

    if (!hasLineHeight && !hasLetterSpacing && !hasTextDecoration) {
        // Plain path: let the label carry font/color/alignment directly.
        _label.font = font;
        _label.textColor = color;
        _label.textAlignment = alignment;
        _label.text = text;
        return;
    }

    NSMutableDictionary<NSAttributedStringKey, id> *attributes = [NSMutableDictionary dictionary];
    attributes[NSFontAttributeName] = font;
    attributes[NSForegroundColorAttributeName] = color;

    // letterSpacing is in points, applied directly as kerning (mirrors RN <Text>).
    if (hasLetterSpacing) {
        attributes[NSKernAttributeName] = @(props.letterSpacing);
    }

    // Underline / strikethrough. UILabel has no plain property for either, so
    // like lineHeight/letterSpacing they force the attributed path. The line
    // color defaults to the text color, matching RN <Text>.
    if (hasUnderline) {
        attributes[NSUnderlineStyleAttributeName] = @(NSUnderlineStyleSingle);
    }
    if (hasLineThrough) {
        attributes[NSStrikethroughStyleAttributeName] = @(NSUnderlineStyleSingle);
    }

    NSMutableParagraphStyle *paragraphStyle = [NSMutableParagraphStyle new];
    paragraphStyle.alignment = alignment;
    // A paragraph style overrides the label's own lineBreakMode, so carry the
    // ellipsize mode into it to keep truncation working with attributed text.
    paragraphStyle.lineBreakMode = RNPlainTextLineBreakModeFromProp(props.ellipsizeMode);

    if (hasLineHeight) {
        // lineHeight is in points, scaled by the same accessibility multiplier
        // as the font (mirrors RN <Text>, which multiplies lineHeight by the
        // effective font-size multiplier); pin the line box to it.
        CGFloat lineHeight = props.lineHeight * RNPlainTextFontSizeMultiplier(props);
        paragraphStyle.minimumLineHeight = lineHeight;
        paragraphStyle.maximumLineHeight = lineHeight;
        // Vertically center the glyphs within the enlarged line box, matching
        // RN <Text>'s RCTApplyBaselineOffset: shift the baseline by half the
        // difference between the requested and the font's natural line height.
        if (lineHeight >= font.lineHeight) {
            attributes[NSBaselineOffsetAttributeName] = @((lineHeight - font.lineHeight) / 2.0);
        }
    }

    attributes[NSParagraphStyleAttributeName] = paragraphStyle;
    _label.attributedText = [[NSAttributedString alloc] initWithString:text attributes:attributes];
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
    const auto &oldViewProps = *std::static_pointer_cast<RNPlainTextProps const>(_props);
    const auto &newViewProps = *std::static_pointer_cast<RNPlainTextProps const>(props);

    // text/font/color/textAlign/lineHeight/letterSpacing all feed a single
    // content build (see applyContentFromProps) since they may share an
    // attributed string; ellipsizeMode does too because it lands in that
    // string's paragraph style when one is used.
    if (oldViewProps.text != newViewProps.text ||
        oldViewProps.fontSize != newViewProps.fontSize ||
        oldViewProps.fontFamily != newViewProps.fontFamily ||
        oldViewProps.fontWeight != newViewProps.fontWeight ||
        oldViewProps.fontStyle != newViewProps.fontStyle ||
        oldViewProps.textAlign != newViewProps.textAlign ||
        oldViewProps.color != newViewProps.color ||
        oldViewProps.lineHeight != newViewProps.lineHeight ||
        oldViewProps.letterSpacing != newViewProps.letterSpacing ||
        oldViewProps.textDecorationLine != newViewProps.textDecorationLine ||
        oldViewProps.ellipsizeMode != newViewProps.ellipsizeMode ||
        oldViewProps.allowFontScaling != newViewProps.allowFontScaling ||
        oldViewProps.maxFontSizeMultiplier != newViewProps.maxFontSizeMultiplier) {
        [self applyContentFromProps:newViewProps];
    }

    if (oldViewProps.numberOfLines != newViewProps.numberOfLines) {
        _label.numberOfLines = newViewProps.numberOfLines;
    }

    if (oldViewProps.ellipsizeMode != newViewProps.ellipsizeMode) {
        _label.lineBreakMode = RNPlainTextLineBreakModeFromProp(newViewProps.ellipsizeMode);
    }

    [super updateProps:props oldProps:oldProps];
}

@end
