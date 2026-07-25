#include "PlainTextShadowNode.h"

#include <react/renderer/core/LayoutContext.h>

// Shared with the iOS shadow node; on the include path via the cpp/ directory
// added in android/src/main/jni/CMakeLists.txt.
#include "PlainTextMeasurementInvalidation.h"

namespace facebook::react {

// Note: `RNPlainTextComponentName` is defined by the generated ShadowNodes.cpp
// (as "RNPlainText"); we reuse that symbol rather than redefining it so our
// component handle matches the generated one.

void PlainTextShadowNode::setPlainTextMeasurementsManager(
    const std::shared_ptr<PlainTextMeasurementsManager> &measurementsManager) {
  ensureUnsealed();
  measurementsManager_ = measurementsManager;
}

bool PlainTextShadowNode::shouldNewRevisionDirtyMeasurement(
    const ShadowNode &sourceShadowNode,
    const ShadowNodeFragment &fragment) const {
  return shouldRevisionDirtyMeasurement(
      sourceShadowNode, fragment, getConcreteProps());
}

Size PlainTextShadowNode::measureContent(
    const LayoutContext & /*layoutContext*/,
    const LayoutConstraints &layoutConstraints) const {
  return measurementsManager_->measure(
      getSurfaceId(), getConcreteProps(), layoutConstraints);
}

} // namespace facebook::react
