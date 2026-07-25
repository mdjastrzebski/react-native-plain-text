#include "PlainTextShadowNode.h"

#include <react/renderer/core/LayoutContext.h>
#include <react/renderer/core/ShadowNodeFragment.h>

namespace facebook::react {

namespace {

/*
 * The props `measureContent` actually depends on — which is exactly the set
 * `PlainTextMeasurementsManager` serializes across JNI. Everything else the
 * component accepts (color, textAlign, textAlignVertical, textDecorationLine,
 * ellipsizeMode) changes how the text is painted, not how much space it needs.
 * Layout-affecting *style* props are not listed because Yoga handles them
 * separately: `updateYogaProps` dirties the node when the resolved yoga style
 * changes, independently of this check.
 *
 * Keep this in sync with `measureContent` and with the manager's serialization:
 * a prop that measurement reads but this ignores would keep a stale size.
 */
bool measurementInputsEqual(
    const RNPlainTextProps &a,
    const RNPlainTextProps &b) {
  return a.text == b.text && a.fontSize == b.fontSize &&
      a.fontFamily == b.fontFamily && a.fontWeight == b.fontWeight &&
      a.fontStyle == b.fontStyle && a.lineHeight == b.lineHeight &&
      a.letterSpacing == b.letterSpacing &&
      a.numberOfLines == b.numberOfLines &&
      a.allowFontScaling == b.allowFontScaling &&
      a.maxFontSizeMultiplier == b.maxFontSizeMultiplier;
}

} // namespace

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
  // No new props means Fabric is re-owning this node's Yoga node after an
  // ancestor re-render, not changing anything about it. RN's own
  // `ParagraphShadowNode` stops here and re-measures on any props change.
  if (fragment.props == nullptr) {
    return false;
  }

  // Going further: a props revision only invalidates the measurement if it
  // touched a prop the measurement reads. Re-rendering a screen re-creates
  // elements with equal values far more often than it changes them.
  const auto &oldProps =
      static_cast<const RNPlainTextProps &>(*sourceShadowNode.getProps());
  return !measurementInputsEqual(oldProps, getConcreteProps());
}

Size PlainTextShadowNode::measureContent(
    const LayoutContext & /*layoutContext*/,
    const LayoutConstraints &layoutConstraints) const {
  return measurementsManager_->measure(
      getSurfaceId(), getConcreteProps(), layoutConstraints);
}

} // namespace facebook::react
