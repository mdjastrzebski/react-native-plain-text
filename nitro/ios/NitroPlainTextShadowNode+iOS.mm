// iOS measuring for NitroPlainTextShadowNode: a port of PlainText's own
// PlainTextShadowNode.mm (measureContent and baseline), reading Nitro props.
//
// SYNC: must mirror what HybridNitroPlainText.swift renders, as PlainTextShadowNode.mm
// mirrors RNPlainText.mm, and every prop read here must appear in
// measurementInputsEqual (cpp/NitroPlainTextShadowNode.cpp). Font is the exception,
// since both sides go through NitroPlainTextFontResolution.h.

#import "NitroPlainTextShadowNode.hpp"
#import "NitroPlainTextFontResolution.h"

#import <CoreText/CoreText.h>
#import <UIKit/UIKit.h>

#import <algorithm>
#import <cmath>
#import <string>

namespace margelo::nitro::plaintext::views {

using namespace facebook;

namespace {

const std::string kEmptyString;

const std::string &stringOrEmpty(const std::optional<std::string> &value)
{
  return value.has_value() ? value.value() : kEmptyString;
}

// Defaults match the mounted view (and PlainText's codegen defaults).
constexpr double kDefaultFontSize = 14;

// Rounds up to the nearest device pixel, not the nearest whole point, same as
// RN's own <Text>.
react::Float ceilToPixel(react::Float value, react::Float pointScaleFactor)
{
  return static_cast<react::Float>(std::ceil(value * pointScaleFactor) / pointScaleFactor);
}

CGFloat resolveFontSizeMultiplier(const HybridNitroPlainTextProps &props, CGFloat baseMultiplier)
{
  return clampFontSizeMultiplier(props.allowFontScaling.value.value_or(true),
                                 props.maxFontSizeMultiplier.value.value_or(0),
                                 baseMultiplier);
}

UIFont *resolveFont(const HybridNitroPlainTextProps &props, CGFloat fontSizeMultiplier)
{
  return margelo::nitro::plaintext::resolveFont(stringOrEmpty(props.fontFamily.value),
                                stringOrEmpty(props.fontWeight.value),
                                stringOrEmpty(props.fontStyle.value),
                                props.fontSize.value.value_or(kDefaultFontSize),
                                fontSizeMultiplier);
}

double lineHeightOf(const HybridNitroPlainTextProps &props)
{
  return props.lineHeight.value.value_or(0);
}

} // namespace

react::Size NitroPlainTextShadowNode::measureContent(const react::LayoutContext &layoutContext,
                                                     const react::LayoutConstraints &layoutConstraints) const
{
  const auto &props = getConcreteProps();

  NSString *text = @"";
  if (props.text.value.has_value()) {
    text = [NSString stringWithUTF8String:props.text.value->c_str()] ?: @"";
  }
  switch (props.textTransform.value.value_or(NitroTextTransform::NONE)) {
    case NitroTextTransform::UPPERCASE:
      text = text.uppercaseString;
      break;
    case NitroTextTransform::LOWERCASE:
      text = text.lowercaseString;
      break;
    case NitroTextTransform::CAPITALIZE:
      text = capitalizedString(text);
      break;
    case NitroTextTransform::NONE:
      break;
  }

  CGFloat fontSizeMultiplier = resolveFontSizeMultiplier(props, layoutContext.fontSizeMultiplier);
  UIFont *font = resolveFont(props, fontSizeMultiplier);

  NSMutableDictionary<NSAttributedStringKey, id> *attributes = [NSMutableDictionary dictionary];
  attributes[NSFontAttributeName] = font;

  if (props.letterSpacing.value.has_value()) {
    attributes[NSKernAttributeName] = @(props.letterSpacing.value.value());
  }

  // Same key the Swift view sets (kCTLanguageAttributeName).
  if (props.lang.value.has_value() && !props.lang.value->empty()) {
    NSString *lang = [NSString stringWithUTF8String:props.lang.value->c_str()];
    if (lang != nil) {
      attributes[(__bridge NSAttributedStringKey)kCTLanguageAttributeName] = lang;
    }
  }

  react::Float perLineHeight = static_cast<react::Float>(font.lineHeight);
  NSMutableParagraphStyle *paragraphStyle = nil;
  if (lineHeightOf(props) > 0) {
    paragraphStyle = [NSMutableParagraphStyle new];
    CGFloat lineHeight = lineHeightOf(props) * fontSizeMultiplier;
    paragraphStyle.minimumLineHeight = lineHeight;
    paragraphStyle.maximumLineHeight = lineHeight;
    perLineHeight = static_cast<react::Float>(lineHeight);
  }

  if (props.hyphens.value == NitroHyphens::AUTO) {
    if (paragraphStyle == nil) {
      paragraphStyle = [NSMutableParagraphStyle new];
    }
    paragraphStyle.usesDefaultHyphenation = YES;
  }

  if (paragraphStyle != nil) {
    attributes[NSParagraphStyleAttributeName] = paragraphStyle;
  }

  // See PlainTextShadowNode.mm: unconstrained first, since text that fits
  // reports its tight width and wrapped text the full constraint width.
  CGRect unconstrained = [text boundingRectWithSize:CGSizeMake(CGFLOAT_MAX, CGFLOAT_MAX)
                                            options:NSStringDrawingUsesLineFragmentOrigin
                                         attributes:attributes
                                            context:nil];

  CGSize measured;
  if (unconstrained.size.width <= layoutConstraints.maximumSize.width) {
    measured = unconstrained.size;
  } else {
    CGRect constrained = [text boundingRectWithSize:CGSizeMake(layoutConstraints.maximumSize.width, CGFLOAT_MAX)
                                            options:NSStringDrawingUsesLineFragmentOrigin
                                         attributes:attributes
                                            context:nil];
    measured = CGSizeMake(layoutConstraints.maximumSize.width, constrained.size.height);
  }

  react::Float pointScaleFactor = layoutContext.pointScaleFactor;
  react::Size size{
      .width = ceilToPixel(static_cast<react::Float>(measured.width), pointScaleFactor),
      .height = ceilToPixel(static_cast<react::Float>(measured.height), pointScaleFactor),
  };

  // Cap height to numberOfLines (0 = unlimited), matching UILabel's own line clamp.
  auto numberOfLines = static_cast<int>(std::round(props.numberOfLines.value.value_or(0)));
  if (numberOfLines > 0) {
    react::Float maxHeight = ceilToPixel(numberOfLines * perLineHeight, pointScaleFactor);
    size.height = std::min(size.height, maxHeight);
  }

  return layoutConstraints.clamp(size);
}

// See PlainTextShadowNode.mm's baseline: first-line baseline from font and
// lineHeight only.
react::Float NitroPlainTextShadowNode::baseline(const react::LayoutContext &layoutContext, react::Size /*size*/) const
{
  const auto &props = getConcreteProps();

  CGFloat fontSizeMultiplier = resolveFontSizeMultiplier(props, layoutContext.fontSizeMultiplier);
  UIFont *font = resolveFont(props, fontSizeMultiplier);

  CGFloat ascender = font.ascender;
  if (lineHeightOf(props) > 0) {
    CGFloat lineHeight = lineHeightOf(props) * fontSizeMultiplier;
    CGFloat leading = lineHeight - font.lineHeight;
    ascender += std::ceil(leading / 2.0);
  }

  return static_cast<react::Float>(ascender);
}

} // namespace margelo::nitro::plaintext::views
