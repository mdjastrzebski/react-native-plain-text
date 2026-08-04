#import "RNPlainText.h"

#import <React/RCTConversions.h>
#import <React/RCTUtils.h>
#import <react/renderer/components/RNPlainTextSpec/Props.h>
#import <react/renderer/components/RNPlainTextSpec/RCTComponentViewHelpers.h>

#import "PlainTextComponentDescriptor.h"
#import "PlainTextFont.h"
#import "RCTFabricComponentsPlugins.h"

using namespace facebook::react;

// The accessibility font-size multiplier to apply, mirroring RN's
// RCTEffectiveFontSizeMultiplierFromTextAttributes. This runs on the main
// thread from updateProps, so the base scale is read straight from
// RCTFontSizeMultiplier(); the shadow node passes the layout context's
// fontSizeMultiplier, which the Fabric surface seeds from the same value.
static CGFloat RNPlainTextFontSizeMultiplier(const RNPlainTextProps &props)
{
    return plainTextFontSizeMultiplier(props, RCTFontSizeMultiplier());
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
// When lineHeight is larger than the font's natural line height, the extra
// space UILabel/TextKit adds per line falls entirely below the glyphs, so the
// text sits high in its line box. verticalTextShift (set in
// applyContentFromProps) moves the whole drawn block — glyphs, underline and
// strikethrough together — up by half that extra, centering each line without
// touching NSBaselineOffsetAttributeName (which only shifts glyphs, leaving
// decorations drawn at the untouched line-fragment baseline).
@property (nonatomic) CGFloat verticalTextShift;
@end

@implementation RNPlainTextLabel
- (CGRect)textRectForBounds:(CGRect)bounds limitedToNumberOfLines:(NSInteger)numberOfLines
{
    CGRect rect = [super textRectForBounds:bounds limitedToNumberOfLines:numberOfLines];
    rect.origin.y = bounds.origin.y - self.verticalTextShift;
    return rect;
}

- (void)drawTextInRect:(CGRect)rect
{
    [super drawTextInRect:[self textRectForBounds:rect limitedToNumberOfLines:self.numberOfLines]];
}
@end

@implementation RNPlainText {
    RNPlainTextLabel * _label;
    // Forces the first -updateProps after construction to apply _label's
    // content/numberOfLines/lineBreakMode unconditionally, bypassing the props
    // diff. Needed once: _props starts out holding defaultProps (so the diff
    // has something to compare against — see -initWithFrame:), but _label
    // itself starts out with UILabel's own factory defaults, which don't match
    // what defaultProps renders as (e.g. UILabel's built-in 17pt font vs
    // defaultProps.fontSize). A view whose real props equal the defaults would
    // otherwise see "no change" and never apply, keeping the mismatched look.
    //
    // Recycling doesn't need this: nothing between one instance's last
    // -updateProps and the next touches _label, so _label already matches
    // _props exactly, and the plain diff below is sufficient on its own.
    BOOL _forceApplyProps;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<PlainTextComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _label = [[RNPlainTextLabel alloc] init];
    // UILabel defaults to NSLineBreakStrategyStandard (the "avoid orphans"
    // look-ahead added in iOS 14), which can wrap a word to the next line
    // earlier than plain greedy wrapping would. measureContent's
    // boundingRectWithSize: call has no such behavior — NSParagraphStyle's own
    // default is .none — so it predicts a plain wrap; matching the label to
    // that keeps the mounted view's wrap points in sync with what was
    // measured (and with RN <Text>, which wraps the same way).
    _label.lineBreakStrategy = NSLineBreakStrategyNone;

    // _props must hold RNPlainTextProps from the start: -updateProps and
    // -traitCollectionDidChange both static_pointer_cast it, and the base class
    // seeds it with a plain ViewProps.
    static const auto defaultProps = std::make_shared<const RNPlainTextProps>();
    _props = defaultProps;

    // Nothing else about _label is seeded here — _forceApplyProps (see its
    // declaration above) makes the first -updateProps apply the whole content
    // unconditionally, so there is nothing for a diff against defaultProps to
    // get wrong in the meantime.
    _forceApplyProps = YES;

    self.contentView = _label;
  }

  return self;
}

// UILabel has no plain properties for lineHeight or letterSpacing, so once
// either is set the text/font/color/alignment all have to be expressed through
// an NSAttributedString. This applies whichever form is needed from the current
// props; call it whenever any text-content prop changes.
// SYNC: PlainTextShadowNode::measureContent must mirror every attribute set
// here, or the measured size won't match the drawn text. The font is the one
// exception — both sides go through plainTextFont (ios/PlainTextFont.h).
- (void)applyContentFromProps:(const RNPlainTextProps &)props
{
    CGFloat fontSizeMultiplier = RNPlainTextFontSizeMultiplier(props);
    UIFont *font = plainTextFont(props, plainTextScaledFontSize(props.fontSize, fontSizeMultiplier));
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
        //
        // Explicitly nil attributedText instead of relying on UIKit to clear
        // it as a side effect of setting .text below — confirmed by repro
        // that it doesn't reliably: a view recycled from an instance that had
        // letterSpacing set (attributed path, NSKernAttributeName) into one
        // that doesn't kept the old kerning, spacing and truncating text that
        // should have been plain, even though every prop and _label.text were
        // by then correct. This line is the fix.
        _label.attributedText = nil;
        _label.font = font;
        _label.textColor = color;
        _label.textAlignment = alignment;
        _label.text = text;
        _label.verticalTextShift = 0;
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

    CGFloat verticalTextShift = 0;
    if (hasLineHeight) {
        // lineHeight is in points, scaled by the same accessibility multiplier
        // as the font (mirrors RN <Text>, which multiplies lineHeight by the
        // effective font-size multiplier); pin the line box to it.
        CGFloat lineHeight = props.lineHeight * fontSizeMultiplier;
        paragraphStyle.minimumLineHeight = lineHeight;
        paragraphStyle.maximumLineHeight = lineHeight;
        // Center the text within the enlarged line box by shifting the whole
        // drawn block up by half the extra space (see verticalTextShift).
        // NSBaselineOffsetAttributeName was tried here first — it shifts
        // glyphs only, so UILabel drew underline/strikethrough at the
        // untouched line-fragment baseline, near the bottom of the box, far
        // below the (shifted-up) glyphs.
        if (lineHeight >= font.lineHeight) {
            verticalTextShift = (lineHeight - font.lineHeight) / 2.0;
        }
    }
    _label.verticalTextShift = verticalTextShift;

    attributes[NSParagraphStyleAttributeName] = paragraphStyle;
    _label.attributedText = [[NSAttributedString alloc] initWithString:text attributes:attributes];
}

// A Dynamic Type change alone doesn't touch any prop — RCTFontSizeMultiplier()
// is read ambiently inside applyContentFromProps — so Fabric's props diff in
// updateProps below never fires and _label.font is left stale until something
// else causes a remount. UIKit calls this on every view when the OS text size
// changes, independent of Fabric, so re-derive the content from the current
// props here to pick it up immediately.
//
// SYNC: PlainTextView.onConfigurationChanged is the Android counterpart, and the
// two have to cover the same set of scaled values. See
// docs/agent/sync-points.md.
- (void)traitCollectionDidChange:(UITraitCollection *)previousTraitCollection
{
    [super traitCollectionDidChange:previousTraitCollection];

    if ([self.traitCollection.preferredContentSizeCategory
            isEqualToString:previousTraitCollection.preferredContentSizeCategory]) {
        return;
    }

    const auto &props = *std::static_pointer_cast<RNPlainTextProps const>(_props);
    if (props.allowFontScaling) {
        [self applyContentFromProps:props];
    }
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
    const auto &oldViewProps = *std::static_pointer_cast<RNPlainTextProps const>(_props);
    const auto &newViewProps = *std::static_pointer_cast<RNPlainTextProps const>(props);

    // text/font/color/textAlign/lineHeight/letterSpacing all feed a single
    // content build (see applyContentFromProps) since they may share an
    // attributed string; ellipsizeMode does too because it lands in that
    // string's paragraph style when one is used.
    if (_forceApplyProps ||
        oldViewProps.text != newViewProps.text ||
        oldViewProps.fontSize != newViewProps.fontSize ||
        oldViewProps.fontFamily != newViewProps.fontFamily ||
        oldViewProps.fontWeight != newViewProps.fontWeight ||
        oldViewProps.fontStyle != newViewProps.fontStyle ||
        oldViewProps.fontVariant != newViewProps.fontVariant ||
        oldViewProps.fontVariationSettings != newViewProps.fontVariationSettings ||
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

    if (_forceApplyProps || oldViewProps.numberOfLines != newViewProps.numberOfLines) {
        _label.numberOfLines = newViewProps.numberOfLines;
    }

    if (_forceApplyProps || oldViewProps.ellipsizeMode != newViewProps.ellipsizeMode) {
        _label.lineBreakMode = RNPlainTextLineBreakModeFromProp(newViewProps.ellipsizeMode);
    }

    _forceApplyProps = NO;

    [super updateProps:props oldProps:oldProps];
}

@end
