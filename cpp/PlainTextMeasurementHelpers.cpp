#include "PlainTextMeasurementHelpers.h"

namespace facebook::react {

// SYNC: every prop either platform's `measureContent` reads. Missing one here
// keeps a stale size after an update: correct on first render, wrong later.
bool measurementInputsEqual(
    const RNPlainTextProps &a,
    const RNPlainTextProps &b) {
  return a.text == b.text && a.fontSize == b.fontSize &&
      a.fontFamily == b.fontFamily && a.fontWeight == b.fontWeight &&
      a.fontStyle == b.fontStyle && a.fontVariant == b.fontVariant &&
      a.fontVariationSettings == b.fontVariationSettings &&
      a.lineHeight == b.lineHeight &&
      a.letterSpacing == b.letterSpacing &&
      a.hasLetterSpacing == b.hasLetterSpacing &&
      a.textTransform == b.textTransform &&
      a.numberOfLines == b.numberOfLines &&
      a.allowFontScaling == b.allowFontScaling &&
      a.maxFontSizeMultiplier == b.maxFontSizeMultiplier;
}

bool shouldRevisionDirtyMeasurement(
    const ShadowNode &sourceShadowNode,
    const ShadowNodeFragment &fragment,
    const RNPlainTextProps &newProps) {
  // No new props means Fabric is only re-owning this node's Yoga node after an
  // ancestor re-render (`adoptYogaChild` clones every child of a changed
  // parent, since a Yoga node can have one owner), never dirty.
  if (fragment.props == nullptr) {
    return false;
  }

  const auto &oldProps =
      static_cast<const RNPlainTextProps &>(*sourceShadowNode.getProps());
  return !measurementInputsEqual(oldProps, newProps);
}

} // namespace facebook::react
