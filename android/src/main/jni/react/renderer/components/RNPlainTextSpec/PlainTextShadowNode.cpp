#include "PlainTextShadowNode.h"

#include <react/renderer/core/LayoutContext.h>

namespace facebook::react {

// Note: `RNPlainTextComponentName` is defined by the generated ShadowNodes.cpp
// (as "RNPlainText"); we reuse that symbol rather than redefining it so our
// component handle matches the generated one.

void PlainTextShadowNode::setPlainTextMeasurementsManager(
    const std::shared_ptr<PlainTextMeasurementsManager> &measurementsManager) {
  ensureUnsealed();
  measurementsManager_ = measurementsManager;
}

Size PlainTextShadowNode::measureContent(
    const LayoutContext & /*layoutContext*/,
    const LayoutConstraints &layoutConstraints) const {
  return measurementsManager_->measure(
      getSurfaceId(), getConcreteProps(), layoutConstraints);
}

} // namespace facebook::react
