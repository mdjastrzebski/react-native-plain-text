#include "NitroPlainTextShadowNode.hpp"

namespace margelo::nitro::plaintext::views {

using namespace facebook;

bool measurementInputsEqual(const HybridNitroPlainTextProps& a, const HybridNitroPlainTextProps& b) {
  // hasSameValue compares Nitro's immutable prop entries by identity: an unchanged
  // JS value keeps its entry across snapshots, so this never misses a change.
  return a.text.hasSameValue(b.text) && a.fontSize.hasSameValue(b.fontSize) &&
      a.fontFamily.hasSameValue(b.fontFamily) && a.fontWeight.hasSameValue(b.fontWeight) &&
      a.fontStyle.hasSameValue(b.fontStyle) && a.lineHeight.hasSameValue(b.lineHeight) &&
      a.letterSpacing.hasSameValue(b.letterSpacing) && a.textTransform.hasSameValue(b.textTransform) &&
      a.hyphens.hasSameValue(b.hyphens) && a.lang.hasSameValue(b.lang) &&
      a.numberOfLines.hasSameValue(b.numberOfLines) && a.ellipsizeMode.hasSameValue(b.ellipsizeMode) &&
      a.allowFontScaling.hasSameValue(b.allowFontScaling) &&
      a.maxFontSizeMultiplier.hasSameValue(b.maxFontSizeMultiplier);
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
