#import "PlainTextShadowNode.h"

#import <react/renderer/core/LayoutConstraints.h>
#import <react/renderer/core/LayoutContext.h>
#import <react/renderer/core/ShadowNodeFragment.h>

#import <UIKit/UIKit.h>
#import <cmath>

namespace facebook::react {

namespace {

/*
 * The props `measureContent` actually depends on. Everything else the component
 * accepts (color, textAlign, textAlignVertical, textDecorationLine,
 * ellipsizeMode) changes how the text is painted, not how much space it needs.
 * Layout-affecting *style* props are not listed because Yoga handles them
 * separately: `updateYogaProps` dirties the node when the resolved yoga style
 * changes, independently of this check.
 *
 * Keep this in sync with `measureContent`: a prop that measurement reads but
 * this ignores would keep a stale size.
 */
bool measurementInputsEqual(const RNPlainTextProps &a, const RNPlainTextProps &b)
{
  return a.text == b.text && a.fontSize == b.fontSize && a.fontFamily == b.fontFamily &&
      a.fontWeight == b.fontWeight && a.fontStyle == b.fontStyle && a.lineHeight == b.lineHeight &&
      a.letterSpacing == b.letterSpacing && a.numberOfLines == b.numberOfLines &&
      a.allowFontScaling == b.allowFontScaling && a.maxFontSizeMultiplier == b.maxFontSizeMultiplier;
}

} // namespace

bool PlainTextShadowNode::shouldNewRevisionDirtyMeasurement(
    const ShadowNode &sourceShadowNode,
    const ShadowNodeFragment &fragment) const
{
  // No new props means Fabric is re-owning this node's Yoga node after an
  // ancestor re-render, not changing anything about it. RN's own
  // `ParagraphShadowNode` stops here and re-measures on any props change.
  if (fragment.props == nullptr) {
    return false;
  }

  // Going further: a props revision only invalidates the measurement if it
  // touched a prop the measurement reads. Re-rendering a screen re-creates
  // elements with equal values far more often than it changes them.
  const auto &oldProps = static_cast<const RNPlainTextProps &>(*sourceShadowNode.getProps());
  return !measurementInputsEqual(oldProps, getConcreteProps());
}

Size PlainTextShadowNode::measureContent(
    const LayoutContext &layoutContext,
    const LayoutConstraints &layoutConstraints) const {
  const auto &props = getConcreteProps();

  NSString *text = [NSString stringWithUTF8String:props.text.c_str()];
  if (text == nil) {
    text = @"";
  }

  // Accessibility font scaling, mirroring RNPlainTextFontSizeMultiplier in
  // RNPlainText.mm so the measured size matches the mounted UILabel. The base
  // scale comes from the layout context (the Fabric surface seeds it from
  // RCTFontSizeMultiplier), clamped by maxFontSizeMultiplier when >= 1.
  CGFloat fontSizeMultiplier = 1.0;
  if (props.allowFontScaling) {
    fontSizeMultiplier = layoutContext.fontSizeMultiplier;
    if (props.maxFontSizeMultiplier >= 1.0) {
      fontSizeMultiplier = fminf((CGFloat)props.maxFontSizeMultiplier, fontSizeMultiplier);
    }
  }
  CGFloat fontSize = props.fontSize * fontSizeMultiplier;

  // Mirrors RNPlainTextFontFromProps in RNPlainText.mm, so the measured size
  // matches what the mounted UILabel will render.
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
  NSString *fontWeightKey = [NSString stringWithUTF8String:props.fontWeight.c_str()];
  NSNumber *weightNumber = weights[fontWeightKey];
  UIFontWeight weight = weightNumber != nil ? (UIFontWeight)weightNumber.doubleValue : UIFontWeightRegular;
  BOOL italic = props.fontStyle == RNPlainTextFontStyle::Italic;

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

  // Build the same attributes the mounted UILabel renders with, so the measured
  // size matches. Kerning (letterSpacing) widens the text; a pinned line height
  // (lineHeight) changes each line's height. Both mirror RNPlainText.mm's
  // applyContentFromProps.
  NSMutableDictionary<NSAttributedStringKey, id> *attributes = [NSMutableDictionary dictionary];
  attributes[NSFontAttributeName] = font;

  if (props.letterSpacing != 0) {
    attributes[NSKernAttributeName] = @(props.letterSpacing);
  }

  // The per-line height used to cap numberOfLines: the pinned lineHeight when
  // set, otherwise the font's natural line height.
  Float perLineHeight = static_cast<Float>(font.lineHeight);
  if (props.lineHeight > 0) {
    // Scaled by the same multiplier as the font (mirrors RNPlainText.mm).
    CGFloat lineHeight = props.lineHeight * fontSizeMultiplier;
    NSMutableParagraphStyle *paragraphStyle = [NSMutableParagraphStyle new];
    paragraphStyle.minimumLineHeight = lineHeight;
    paragraphStyle.maximumLineHeight = lineHeight;
    attributes[NSParagraphStyleAttributeName] = paragraphStyle;
    perLineHeight = static_cast<Float>(lineHeight);
  }

  // Measure with the same text engine that renders the UILabel (CoreText, via
  // NSString drawing). This runs on the Fabric shadow thread; NSAttributed
  // string measurement is thread-safe. Height is unbounded so multi-line text
  // grows vertically; width is capped to the constraint so wrapping matches
  // what the mounted UILabel will do.
  CGSize maxSize =
      CGSizeMake(layoutConstraints.maximumSize.width, CGFLOAT_MAX);

  CGRect rect = [text boundingRectWithSize:maxSize
                                   options:NSStringDrawingUsesLineFragmentOrigin
                                attributes:attributes
                                   context:nil];

  // RN's own text measurement (RCTTextLayoutManager) reports the full
  // constraint width, not the narrower widest-rendered-line width, whenever
  // the text actually word-wrapped — only unwrapped text (a single line, or
  // one broken up by explicit "\n"s) gets the tight width. Detect wrapping by
  // comparing against an unconstrained (single-line-per-"\n") measurement: if
  // the constrained layout needed more height, width was the cause.
  CGRect unconstrainedRect = [text boundingRectWithSize:CGSizeMake(CGFLOAT_MAX, CGFLOAT_MAX)
                                                 options:NSStringDrawingUsesLineFragmentOrigin
                                              attributes:attributes
                                                 context:nil];
  BOOL textDidWrap = rect.size.height > unconstrainedRect.size.height + 0.01;

  Size size{
      .width = static_cast<Float>(
          std::ceil(textDidWrap ? layoutConstraints.maximumSize.width : rect.size.width)),
      .height = static_cast<Float>(std::ceil(rect.size.height)),
  };

  // Cap the height to numberOfLines (0 = unlimited), matching the mounted
  // UILabel's own line clamp. UILabel truncates to N lines of perLineHeight,
  // so bound the measured height the same way; min() keeps text that already
  // fits in fewer lines from being inflated.
  if (props.numberOfLines > 0) {
    Float maxHeight = static_cast<Float>(std::ceil(props.numberOfLines * perLineHeight));
    size.height = std::min(size.height, maxHeight);
  }

  return layoutConstraints.clamp(size);
}

} // namespace facebook::react
