#include "PlainTextMeasurementHelpers.h"

namespace facebook::react {

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

bool shouldRevisionDirtyMeasurement(
    const ShadowNode &sourceShadowNode,
    const ShadowNodeFragment &fragment,
    const RNPlainTextProps &newProps) {
  // No new props means Fabric is re-owning this node's Yoga node after an
  // ancestor re-render (`YogaLayoutableShadowNode::adoptYogaChild` clones every
  // child of a changed parent, because a Yoga node can only have one owner),
  // not changing anything about it. RN's own `ParagraphShadowNode` stops here
  // and re-measures on any props change.
  if (fragment.props == nullptr) {
    return false;
  }

  // Going further than RN: a props revision only invalidates the measurement if
  // it touched a prop the measurement reads. Re-rendering a screen re-creates
  // elements with equal values far more often than it changes them.
  const auto &oldProps =
      static_cast<const RNPlainTextProps &>(*sourceShadowNode.getProps());
  return !measurementInputsEqual(oldProps, newProps);
}

} // namespace facebook::react
