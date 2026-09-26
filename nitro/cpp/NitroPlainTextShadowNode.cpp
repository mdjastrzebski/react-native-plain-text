#include "NitroPlainTextShadowNode.hpp"

namespace margelo::nitro::plaintext::views {

using namespace facebook;

bool measurementInputsEqual(const HybridNitroPlainTextProps& a, const HybridNitroPlainTextProps& b) {
  return a.text.value == b.text.value && a.fontSize.value == b.fontSize.value &&
      a.fontFamily.value == b.fontFamily.value && a.fontWeight.value == b.fontWeight.value &&
      a.fontStyle.value == b.fontStyle.value && a.lineHeight.value == b.lineHeight.value &&
      a.letterSpacing.value == b.letterSpacing.value &&
      a.textTransform.value == b.textTransform.value && a.hyphens.value == b.hyphens.value &&
      a.lang.value == b.lang.value && a.numberOfLines.value == b.numberOfLines.value &&
      a.ellipsizeMode.value == b.ellipsizeMode.value &&
      a.allowFontScaling.value == b.allowFontScaling.value &&
      a.maxFontSizeMultiplier.value == b.maxFontSizeMultiplier.value;
}

react::ShadowNodeTraits NitroPlainTextShadowNode::BaseTraits() {
  auto traits = ConcreteViewShadowNode::BaseTraits();
  traits.set(react::ShadowNodeTraits::Trait::LeafYogaNode);
  traits.set(react::ShadowNodeTraits::Trait::MeasurableYogaNode);
  traits.set(react::ShadowNodeTraits::Trait::BaselineYogaNode);
  return traits;
}

// iOS measureContent/baseline live in ios/NitroPlainTextShadowNode+iOS.mm.
#ifndef __APPLE__

void NitroPlainTextShadowNode::setMeasurementsManager(
    const std::shared_ptr<const NitroPlainTextMeasurementsManager>& measurementsManager) {
  ensureUnsealed();
  measurementsManager_ = measurementsManager;
}

// Android, as PlainTextShadowNode.cpp: all the work is on the Kotlin side.
react::Size NitroPlainTextShadowNode::measureContent(const react::LayoutContext& /*layoutContext*/,
                                                     const react::LayoutConstraints& layoutConstraints) const {
  return measurementsManager_->measure(getSurfaceId(), getConcreteProps(), layoutConstraints);
}

react::Float NitroPlainTextShadowNode::baseline(const react::LayoutContext& /*layoutContext*/,
                                                react::Size size) const {
  return measurementsManager_->baseline(getSurfaceId(), getConcreteProps(), size);
}

#endif // !__APPLE__

} // namespace margelo::nitro::plaintext::views
