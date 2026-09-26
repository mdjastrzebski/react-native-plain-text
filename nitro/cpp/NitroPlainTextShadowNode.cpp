#include "NitroPlainTextShadowNode.hpp"

#include <cmath>
#include <string>

#include <react/renderer/attributedstring/AttributedString.h>
#include <react/renderer/attributedstring/AttributedStringBox.h>
#include <react/renderer/attributedstring/ParagraphAttributes.h>
#include <react/renderer/attributedstring/TextAttributes.h>
#include <react/renderer/textlayoutmanager/TextLayoutContext.h>

namespace margelo::nitro::plaintext::views {

using namespace facebook;

react::ShadowNodeTraits NitroPlainTextShadowNode::BaseTraits() {
  auto traits = ConcreteViewShadowNode::BaseTraits();
  traits.set(react::ShadowNodeTraits::Trait::LeafYogaNode);
  traits.set(react::ShadowNodeTraits::Trait::MeasurableYogaNode);
  return traits;
}

void NitroPlainTextShadowNode::setTextLayoutManager(
    std::shared_ptr<const react::TextLayoutManager> textLayoutManager) {
  textLayoutManager_ = std::move(textLayoutManager);
}

namespace {

// Same parsing as RN's fromRawValue(FontWeight): numeric strings plus the
// normal/bold keywords. Anything else leaves the weight unset.
std::optional<react::FontWeight> parseFontWeight(const std::string& value) {
  if (value == "normal") return react::FontWeight::Regular;
  if (value == "bold") return react::FontWeight::Bold;
  if (value.size() == 3 && value[1] == '0' && value[2] == '0' && value[0] >= '1' && value[0] <= '9') {
    return static_cast<react::FontWeight>((value[0] - '0') * 100);
  }
  return std::nullopt;
}

std::optional<react::FontStyle> parseFontStyle(const std::string& value) {
  if (value == "normal") return react::FontStyle::Normal;
  if (value == "italic") return react::FontStyle::Italic;
  if (value == "oblique") return react::FontStyle::Oblique;
  return std::nullopt;
}

react::TextAlignment toTextAlignment(NitroTextAlign align) {
  switch (align) {
    case NitroTextAlign::LEFT: return react::TextAlignment::Left;
    case NitroTextAlign::RIGHT: return react::TextAlignment::Right;
    case NitroTextAlign::CENTER: return react::TextAlignment::Center;
    case NitroTextAlign::JUSTIFY: return react::TextAlignment::Justified;
    case NitroTextAlign::AUTO:
    default: return react::TextAlignment::Natural;
  }
}

react::TextTransform toTextTransform(NitroTextTransform transform) {
  switch (transform) {
    case NitroTextTransform::UPPERCASE: return react::TextTransform::Uppercase;
    case NitroTextTransform::LOWERCASE: return react::TextTransform::Lowercase;
    case NitroTextTransform::CAPITALIZE: return react::TextTransform::Capitalize;
    case NitroTextTransform::NONE:
    default: return react::TextTransform::None;
  }
}

react::EllipsizeMode toEllipsizeMode(NitroEllipsizeMode mode) {
  switch (mode) {
    case NitroEllipsizeMode::HEAD: return react::EllipsizeMode::Head;
    case NitroEllipsizeMode::MIDDLE: return react::EllipsizeMode::Middle;
    case NitroEllipsizeMode::CLIP: return react::EllipsizeMode::Clip;
    case NitroEllipsizeMode::TAIL:
    default: return react::EllipsizeMode::Tail;
  }
}

} // namespace

// SYNC: every size-affecting prop the native views apply (ios/HybridNitroPlainText.swift,
// android/.../HybridNitroPlainText.kt) must be mirrored here, or the measured box
// won't match the drawn text.
react::Size NitroPlainTextShadowNode::measureContent(const react::LayoutContext& layoutContext,
                                                     const react::LayoutConstraints& layoutConstraints) const {
  if (textLayoutManager_ == nullptr) [[unlikely]] {
    return layoutConstraints.clamp({0, 0});
  }

  const auto& props = getConcreteProps();

  auto attributes = react::TextAttributes::defaultTextAttributes();
  // Matches the native views' 14pt default rather than RN <Text>'s.
  attributes.fontSize = static_cast<react::Float>(props.fontSize.value.value_or(14.0));

  bool allowFontScaling = props.allowFontScaling.value.value_or(true);
  attributes.allowFontScaling = allowFontScaling;
  attributes.fontSizeMultiplier = allowFontScaling ? layoutContext.fontSizeMultiplier : 1.0f;
  if (props.maxFontSizeMultiplier.value.has_value()) {
    attributes.maxFontSizeMultiplier = static_cast<react::Float>(props.maxFontSizeMultiplier.value.value());
  }

  if (props.fontFamily.value.has_value()) {
    attributes.fontFamily = props.fontFamily.value.value();
  }
  if (props.fontWeight.value.has_value()) {
    attributes.fontWeight = parseFontWeight(props.fontWeight.value.value());
  }
  if (props.fontStyle.value.has_value()) {
    attributes.fontStyle = parseFontStyle(props.fontStyle.value.value());
  }
  if (props.lineHeight.value.has_value() && props.lineHeight.value.value() > 0) {
    attributes.lineHeight = static_cast<react::Float>(props.lineHeight.value.value());
  }
  if (props.letterSpacing.value.has_value()) {
    attributes.letterSpacing = static_cast<react::Float>(props.letterSpacing.value.value());
  }
  if (props.textAlign.value.has_value()) {
    attributes.alignment = toTextAlignment(props.textAlign.value.value());
  }
  if (props.textTransform.value.has_value()) {
    attributes.textTransform = toTextTransform(props.textTransform.value.value());
  }
  attributes.layoutDirection = layoutConstraints.layoutDirection;

  react::AttributedString attributedString;
  attributedString.appendFragment(react::AttributedString::Fragment{
      .string = props.text.value.value_or(std::string{}),
      .textAttributes = attributes,
      .parentShadowView = react::ShadowView(*this),
  });

  react::ParagraphAttributes paragraphAttributes;
  if (props.numberOfLines.value.has_value()) {
    auto lines = static_cast<int>(std::round(props.numberOfLines.value.value()));
    if (lines > 0) {
      paragraphAttributes.maximumNumberOfLines = lines;
    }
  }
  paragraphAttributes.ellipsizeMode = toEllipsizeMode(props.ellipsizeMode.value.value_or(NitroEllipsizeMode::TAIL));
  if (props.hyphens.value == NitroHyphens::AUTO) {
    paragraphAttributes.android_hyphenationFrequency = react::HyphenationFrequency::Full;
  }

  react::TextLayoutContext textLayoutContext{
      .pointScaleFactor = layoutContext.pointScaleFactor,
      .surfaceId = getSurfaceId(),
  };

  auto measurement = textLayoutManager_->measure(react::AttributedStringBox{attributedString},
                                                 paragraphAttributes, textLayoutContext, layoutConstraints);
  return layoutConstraints.clamp(measurement.size);
}

} // namespace margelo::nitro::plaintext::views
