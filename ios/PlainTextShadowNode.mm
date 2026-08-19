#import "PlainTextShadowNode.h"

#import <react/renderer/core/LayoutConstraints.h>
#import <react/renderer/core/LayoutContext.h>

#import <UIKit/UIKit.h>
#import <cmath>

#import "PlainTextFont.h"
#import "PlainTextTextTransform.h"

namespace facebook::react {

// SYNC: must mirror what the mounted UILabel renders (RNPlainText.mm's
// applyContentFromProps), and every prop read here must appear in
// `measurementInputsEqual`, or measured size drifts from drawn text. Font is
// the exception, since both sides go through plainTextFont (PlainTextFont.h).
Size PlainTextShadowNode::measureContent(
    const LayoutContext &layoutContext,
    const LayoutConstraints &layoutConstraints) const {
  const auto &props = getConcreteProps();

  NSString *text = [NSString stringWithUTF8String:props.text.c_str()];
  if (text == nil) {
    text = @"";
  }
  text = plainTextApplyTextTransform(text, props.textTransform);

  // Base scale comes from the layout context (Fabric seeds it from
  // RCTFontSizeMultiplier, same as the mounted view). Clamping matches the
  // mounted view so measured and drawn sizes agree.
  CGFloat fontSizeMultiplier = plainTextFontSizeMultiplier(props, layoutContext.fontSizeMultiplier);
  UIFont *font = plainTextFont(props, fontSizeMultiplier);

  NSMutableDictionary<NSAttributedStringKey, id> *attributes = [NSMutableDictionary dictionary];
  attributes[NSFontAttributeName] = font;

  if (props.hasLetterSpacing) {
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

  // Measured with the same engine that renders the UILabel (CoreText via
  // NSString drawing), on the Fabric shadow thread. NSAttributedString
  // measurement is thread-safe.
  //
  // RN reports the full constraint width unless the text is unwrapped (fits
  // on one line, or only broken by explicit "\n"s), in which case it reports
  // the tight width instead. Measuring unconstrained first tells us which
  // case applies: with no width limit, CoreText only breaks at hard breaks,
  // so that width is exactly what's needed to avoid wrapping. Deliberately
  // uses the same API that does the wrapping, since cheaper stand-ins have to
  // predict CoreText's rules and measured slower in practice (see
  // docs/agent/performance.md).
  CGRect unconstrained = [text boundingRectWithSize:CGSizeMake(CGFLOAT_MAX, CGFLOAT_MAX)
                                            options:NSStringDrawingUsesLineFragmentOrigin
                                         attributes:attributes
                                            context:nil];

  CGSize measured;
  if (unconstrained.size.width <= layoutConstraints.maximumSize.width) {
    // Already fits, so a constraint it never reaches can't change where lines
    // break: the constrained layout would be identical.
    measured = unconstrained.size;
  } else {
    // It wraps, which fixes width at the constraint (per the rule above).
    // Height is left unbounded so multiline text grows instead of clipping.
    CGRect constrained =
        [text boundingRectWithSize:CGSizeMake(layoutConstraints.maximumSize.width, CGFLOAT_MAX)
                           options:NSStringDrawingUsesLineFragmentOrigin
                        attributes:attributes
                           context:nil];
    measured = CGSizeMake(layoutConstraints.maximumSize.width, constrained.size.height);
  }

  // Rounds up to the nearest device pixel, not the nearest whole point, same
  // as RN's own <Text> (RCTTextLayoutManager.mm's identical formula) — whole
  // points threw away real sub-point precision (thirds at 3x), which is what
  // put PlainText's box a full point taller than RN's for some lineHeights.
  CGFloat pointScaleFactor = layoutContext.pointScaleFactor;
  Size size{
      .width = static_cast<Float>(std::ceil(measured.width * pointScaleFactor) / pointScaleFactor),
      .height = static_cast<Float>(std::ceil(measured.height * pointScaleFactor) / pointScaleFactor),
  };

  // Cap height to numberOfLines (0 = unlimited), matching UILabel's own line
  // clamp. min() avoids inflating text that already fits in fewer lines.
  if (props.numberOfLines > 0) {
    Float maxHeight =
        static_cast<Float>(std::ceil(props.numberOfLines * perLineHeight * pointScaleFactor) / pointScaleFactor);
    size.height = std::min(size.height, maxHeight);
  }

  return layoutConstraints.clamp(size);
}

// Distance from the top of the box to the first line's baseline, for
// `alignItems: "baseline"`. Only depends on the font and lineHeight, not on
// `text` or the final `size`: wrapping changes how many lines there are, but
// never where the first one sits.
//
// Matches Android's CustomLineHeightSpan (PlainTextView.kt): extra leading
// from a pinned lineHeight is split evenly above and below the natural
// ascent/descent, rounding the top half up, so the two platforms agree on
// where the baseline lands for the same props.
Float PlainTextShadowNode::baseline(
    const LayoutContext &layoutContext,
    Size /*size*/) const {
  const auto &props = getConcreteProps();

  CGFloat fontSizeMultiplier = plainTextFontSizeMultiplier(props, layoutContext.fontSizeMultiplier);
  UIFont *font = plainTextFont(props, fontSizeMultiplier);

  CGFloat ascender = font.ascender;

  if (props.lineHeight > 0) {
    CGFloat lineHeight = props.lineHeight * fontSizeMultiplier;
    CGFloat leading = lineHeight - font.lineHeight;
    ascender += std::ceil(leading / 2.0);
  }

  return static_cast<Float>(ascender);
}

} // namespace facebook::react
