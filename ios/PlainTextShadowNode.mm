#import "PlainTextShadowNode.h"

#import <react/renderer/core/LayoutConstraints.h>
#import <react/renderer/core/LayoutContext.h>

#import <UIKit/UIKit.h>
#import <cmath>

#import "PlainTextFont.h"

namespace facebook::react {

// SYNC: must mirror what the mounted UILabel renders (RNPlainText.mm's
// applyContentFromProps), and every prop read here must appear in
// `measurementInputsEqual` — otherwise the measured size drifts from the drawn
// text, or goes stale after an update. The font is the one attribute that isn't
// mirrored: both sides go through plainTextFont (PlainTextFont.h).
Size PlainTextShadowNode::measureContent(
    const LayoutContext &layoutContext,
    const LayoutConstraints &layoutConstraints) const {
  const auto &props = getConcreteProps();

  NSString *text = [NSString stringWithUTF8String:props.text.c_str()];
  if (text == nil) {
    text = @"";
  }

  // Accessibility font scaling. The base scale comes from the layout context
  // (the Fabric surface seeds it from RCTFontSizeMultiplier, which is what the
  // mounted view reads directly); the clamping on top of it is shared with that
  // view, so the measured size matches.
  CGFloat fontSizeMultiplier = plainTextFontSizeMultiplier(props, layoutContext.fontSizeMultiplier);
  UIFont *font = plainTextFont(props, fontSizeMultiplier);

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

  // Measured with the same text engine that renders the UILabel (CoreText, via
  // NSString drawing). Runs on the Fabric shadow thread; NSAttributedString
  // measurement is thread-safe.
  //
  // RN reports the full constraint width, not the narrower widest-rendered-line
  // width, whenever the text word-wrapped — only unwrapped text (a single line,
  // or one broken up by explicit "\n"s) gets the tight width. So the two cases
  // need different things measured, and taking them in this order means only
  // the wrapping one needs two layouts.
  //
  // Unconstrained first: with no width limit the engine breaks only at hard
  // breaks, so this width is precisely the width the text needs in order not to
  // wrap. Deliberately asked of the same API that will do the wrapping — every
  // cheaper stand-in has to predict CoreText's rules (trailing whitespace
  // hanging, U+2028, font fallback) instead of inheriting them, and the ones
  // tried measured slower anyway. See docs/agent/performance.md.
  CGRect unconstrained = [text boundingRectWithSize:CGSizeMake(CGFLOAT_MAX, CGFLOAT_MAX)
                                            options:NSStringDrawingUsesLineFragmentOrigin
                                         attributes:attributes
                                            context:nil];

  CGSize measured;
  if (unconstrained.size.width <= layoutConstraints.maximumSize.width) {
    // Already fits, so constraining to a width it never reaches cannot change
    // where the lines break. The constrained layout would be identical — same
    // lines, same height — so there is nothing left to measure.
    measured = unconstrained.size;
  } else {
    // It wraps, which fixes the width at the constraint by the rule above and
    // leaves only the height unknown. Height is unbounded here so multiline
    // text grows vertically rather than being clipped.
    CGRect constrained =
        [text boundingRectWithSize:CGSizeMake(layoutConstraints.maximumSize.width, CGFLOAT_MAX)
                           options:NSStringDrawingUsesLineFragmentOrigin
                        attributes:attributes
                           context:nil];
    measured = CGSizeMake(layoutConstraints.maximumSize.width, constrained.size.height);
  }

  Size size{
      .width = static_cast<Float>(std::ceil(measured.width)),
      .height = static_cast<Float>(std::ceil(measured.height)),
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
