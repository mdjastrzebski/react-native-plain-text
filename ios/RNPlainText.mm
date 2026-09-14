#import "RNPlainText.h"

#import <React/RCTConversions.h>
#import <React/RCTUtils.h>
#import <react/renderer/components/RNPlainTextSpec/Props.h>
#import <react/renderer/components/RNPlainTextSpec/RCTComponentViewHelpers.h>

#import "PlainTextComponentDescriptor.h"
#import "PlainTextFont.h"
#import "PlainTextProps.h"
#import "RCTFabricComponentsPlugins.h"

using namespace facebook::react;
using namespace plaintext;

// textAlignVertical is Android-only in RN core, so RN's <Text> on iOS always
// top-aligns. That is a gap in RN rather than a difference to preserve (see
// docs/contributing/workflow.md#when-rn-itself-has-the-platform-gap), and the override
// UILabel already needs (it would otherwise center an overtall frame) resolves
// all three values at no extra cost.
@interface RNPlainTextLabel : UILabel
// 'auto' maps to Top, matching RN <Text> on iOS.
@property (nonatomic) RNPlainTextTextAlignVertical verticalAlignment;
// TextKit puts all the slack/deficit between a pinned lineHeight and the
// font's natural line height on one side of the glyphs (extra space below,
// or ascent clipped first). verticalTextShift (set in applyContentFromProps)
// shifts the whole drawn block — glyphs plus decorations — by half that
// amount to center it; NSBaselineOffsetAttributeName can't do this since it
// only moves glyphs.
@property (nonatomic) CGFloat verticalTextShift;
@end

@implementation RNPlainTextLabel
// UILabel only redraws when a property it recognizes as content (attributedText,
// text, font, ...) actually changes; toggling lineHeightClippingIos with every
// other prop unchanged reapplies an attributedText that is `isEqual:` to the one
// already set (verticalTextShift isn't part of it), so UILabel skips the redraw
// and drawTextInRect: never reruns. Setting this property directly must ask for
// one itself.
- (void)setVerticalTextShift:(CGFloat)verticalTextShift
{
    if (_verticalTextShift == verticalTextShift) {
        return;
    }
    _verticalTextShift = verticalTextShift;
    [self setNeedsDisplay];
}

- (CGRect)textRectForBounds:(CGRect)bounds limitedToNumberOfLines:(NSInteger)numberOfLines
{
    // super's rect is top-anchored at bounds.origin.y and never centered, so the
    // spare room has to come from the height delta.
    CGRect rect = [super textRectForBounds:bounds limitedToNumberOfLines:numberOfLines];
    CGFloat centerOffset = (bounds.size.height - rect.size.height) / 2.0;
    switch (self.verticalAlignment) {
        case RNPlainTextTextAlignVertical::Auto:
        case RNPlainTextTextAlignVertical::Top:
            rect.origin.y = bounds.origin.y;
            break;
        case RNPlainTextTextAlignVertical::Center:
            rect.origin.y = bounds.origin.y + centerOffset;
            break;
        case RNPlainTextTextAlignVertical::Bottom:
            rect.origin.y = bounds.origin.y + 2 * centerOffset;
            break;
    }
    rect.origin.y -= self.verticalTextShift;
    return rect;
}

- (void)drawTextInRect:(CGRect)rect
{
    [super drawTextInRect:[self textRectForBounds:rect limitedToNumberOfLines:self.numberOfLines]];
}
@end

@implementation RNPlainText {
    RNPlainTextLabel * _label;
    // Forces the first -updateProps to apply unconditionally, since _label starts with UILabel's factory defaults (e.g. 17pt font) rather than _props' defaults, so a no-op diff would otherwise skip applying them.
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
    // UILabel's default NSLineBreakStrategyStandard wraps earlier than measureContent's boundingRectWithSize:, so disable it to match measurement and RN <Text>.
    _label.lineBreakStrategy = NSLineBreakStrategyNone;

    // _props must hold RNPlainTextProps from the start since -updateProps and -traitCollectionDidChange both static_pointer_cast it.
    static const auto defaultProps = std::make_shared<const RNPlainTextProps>();
    _props = defaultProps;

    _forceApplyProps = YES;

    self.contentView = _label;
  }

  return self;
}

// Once lineHeight or letterSpacing is set, text/font/color/alignment must go through an NSAttributedString since UILabel has no plain properties for them.
// SYNC: PlainTextShadowNode::measureContent must mirror every attribute set here (font excepted, both go through resolveFont) or measured size won't match drawn text.
// See docs/contributing/sync-points.md#set-2--a-prop-that-affects-measured-size
// and docs/contributing/sync-points.md#set-10--recycled-view-state-ios.
- (void)applyContentFromProps:(const RNPlainTextProps &)props
{
    // Mirrors RN's RCTEffectiveFontSizeMultiplierFromTextAttributes, reading RCTFontSizeMultiplier() directly since this runs on the main thread.
    CGFloat fontSizeMultiplier = resolveFontSizeMultiplier(props, RCTFontSizeMultiplier());
    UIFont *font = resolveFont(props, fontSizeMultiplier);
    UIColor *color = props.color.has_value() ? RCTUIColorFromSharedColor(props.color.value()) : [UIColor blackColor];
    NSTextAlignment alignment = textAlignmentFromProp(props.textAlign);
    NSString *text = props.text.has_value() ? ([NSString stringWithUTF8String:props.text.value().c_str()] ?: @"") : @"";
    text = applyTextTransform(text, props.textTransform);

    BOOL hasLineHeight = props.lineHeight > 0;
    BOOL hasLetterSpacing = props.letterSpacing.has_value();
    BOOL hasUnderline = NO;
    BOOL hasLineThrough = NO;
    if (props.textDecorationLine.has_value()) {
        const std::string &textDecorationLine = props.textDecorationLine.value();
        hasUnderline = textDecorationHasUnderline(textDecorationLine);
        hasLineThrough = textDecorationHasLineThrough(textDecorationLine);
    }
    BOOL hasTextDecoration = hasUnderline || hasLineThrough;
    BOOL hasTextShadow = props.textShadowOffsetWidth.has_value() || props.textShadowOffsetHeight.has_value();

    if (!hasLineHeight && !hasLetterSpacing && !hasTextDecoration && !hasTextShadow) {
        // Explicitly nil attributedText: a view recycled from an attributed instance kept the old kerning/spacing even after .text and every prop were correct, so setting .text alone isn't enough.
        _label.attributedText = nil;
        _label.font = font;
        _label.textColor = color;
        _label.textAlignment = alignment;
        _label.text = text;
        _label.verticalTextShift = 0;
        _label.verticalAlignment = resolveVerticalAlign(props.textAlignVertical, props.verticalAlign);
        return;
    }

    NSMutableDictionary<NSAttributedStringKey, id> *attributes = [NSMutableDictionary dictionary];
    attributes[NSFontAttributeName] = font;
    attributes[NSForegroundColorAttributeName] = color;

    // letterSpacing is in points, applied directly as kerning (mirrors RN <Text>).
    if (hasLetterSpacing) {
        attributes[NSKernAttributeName] = @(props.letterSpacing.value());
    }

    // UILabel has no plain property for these either; line color defaults to text color, matching RN <Text>.
    if (hasUnderline) {
        attributes[NSUnderlineStyleAttributeName] = @(NSUnderlineStyleSingle);
    }
    if (hasLineThrough) {
        attributes[NSStrikethroughStyleAttributeName] = @(NSUnderlineStyleSingle);
    }

    // Mirrors RN <Text> (RCTAttributedTextUtils.mm): a shadow is drawn whenever
    // textShadowOffset was provided, regardless of textShadowRadius/textShadowColor.
    // Unset radius/color fall back to NSShadow's own defaults.
    if (hasTextShadow) {
        NSShadow *shadow = [NSShadow new];
        shadow.shadowOffset = CGSizeMake(props.textShadowOffsetWidth.value_or(0), props.textShadowOffsetHeight.value_or(0));
        shadow.shadowBlurRadius = props.textShadowRadius;
        if (props.textShadowColor.has_value()) {
            shadow.shadowColor = RCTUIColorFromSharedColor(props.textShadowColor.value());
        }
        attributes[NSShadowAttributeName] = shadow;
    }

    NSMutableParagraphStyle *paragraphStyle = [NSMutableParagraphStyle new];
    paragraphStyle.alignment = alignment;
    // A paragraph style overrides the label's own lineBreakMode, so carry ellipsizeMode into it too.
    paragraphStyle.lineBreakMode = lineBreakModeFromProp(props.ellipsizeMode);

    CGFloat verticalTextShift = 0;
    if (hasLineHeight) {
        CGFloat lineHeight = props.lineHeight * fontSizeMultiplier;
        paragraphStyle.minimumLineHeight = lineHeight;
        paragraphStyle.maximumLineHeight = lineHeight;
        // Below font.lineHeight, TextKit clips ascent only (RN#29507); shift by
        // half the deficit against the glyphs' real extent to clip evenly
        // instead (RN#46884's algorithm). lineHeightClippingIos reverts to
        // RN's current (unfixed) behavior: no shift, so TextKit's own
        // ascent-only clip stands, for apps migrating from <Text> that rely
        // on that exact rendering (see unstable_configureTextCompat).
        if (lineHeight >= font.lineHeight) {
            verticalTextShift = (lineHeight - font.lineHeight) / 2.0;
        } else if (!props.lineHeightClippingIos) {
            CGFloat textHeight = font.ascender + fabs(font.descender);
            verticalTextShift = (lineHeight - textHeight) / 2.0;
        }
    }
    _label.verticalTextShift = verticalTextShift;
    _label.verticalAlignment = resolveVerticalAlign(props.textAlignVertical, props.verticalAlign);

    attributes[NSParagraphStyleAttributeName] = paragraphStyle;
    _label.attributedText = [[NSAttributedString alloc] initWithString:text attributes:attributes];
}

// A Dynamic Type change alone touches no prop, so updateProps's diff never fires; re-derive content here since UIKit calls this independent of Fabric.
// SYNC: PlainTextView.onConfigurationChanged is the Android counterpart and must cover the same set of scaled values.
// See docs/contributing/sync-points.md#set-8--anything-derived-from-the-os-text-size-setting.
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

    // These all feed applyContentFromProps since they may share an attributed string (ellipsizeMode via its paragraph style).
    if (_forceApplyProps ||
        oldViewProps.text != newViewProps.text ||
        oldViewProps.fontSize != newViewProps.fontSize ||
        oldViewProps.fontFamily != newViewProps.fontFamily ||
        oldViewProps.fontWeight != newViewProps.fontWeight ||
        oldViewProps.fontStyle != newViewProps.fontStyle ||
        oldViewProps.fontVariant != newViewProps.fontVariant ||
        oldViewProps.fontVariationSettings != newViewProps.fontVariationSettings ||
        oldViewProps.textAlign != newViewProps.textAlign ||
        oldViewProps.textAlignVertical != newViewProps.textAlignVertical ||
        oldViewProps.verticalAlign != newViewProps.verticalAlign ||
        oldViewProps.color != newViewProps.color ||
        oldViewProps.lineHeight != newViewProps.lineHeight ||
        oldViewProps.letterSpacing != newViewProps.letterSpacing ||
        oldViewProps.textDecorationLine != newViewProps.textDecorationLine ||
        oldViewProps.textShadowColor != newViewProps.textShadowColor ||
        oldViewProps.textShadowOffsetWidth != newViewProps.textShadowOffsetWidth ||
        oldViewProps.textShadowOffsetHeight != newViewProps.textShadowOffsetHeight ||
        oldViewProps.textShadowRadius != newViewProps.textShadowRadius ||
        oldViewProps.textTransform != newViewProps.textTransform ||
        oldViewProps.ellipsizeMode != newViewProps.ellipsizeMode ||
        oldViewProps.allowFontScaling != newViewProps.allowFontScaling ||
        oldViewProps.maxFontSizeMultiplier != newViewProps.maxFontSizeMultiplier ||
        oldViewProps.lineHeightClippingIos != newViewProps.lineHeightClippingIos) {
        [self applyContentFromProps:newViewProps];
    }

    if (_forceApplyProps || oldViewProps.numberOfLines != newViewProps.numberOfLines) {
        _label.numberOfLines = newViewProps.numberOfLines;
    }

    if (_forceApplyProps || oldViewProps.ellipsizeMode != newViewProps.ellipsizeMode) {
        _label.lineBreakMode = lineBreakModeFromProp(newViewProps.ellipsizeMode);
    }

    _forceApplyProps = NO;

    [super updateProps:props oldProps:oldProps];
}

@end
