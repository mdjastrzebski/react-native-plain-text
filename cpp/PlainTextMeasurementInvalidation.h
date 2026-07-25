/*
 * When a new revision of a <RNPlainText> node invalidates its cached
 * measurement — shared by both platforms' `PlainTextShadowNode`.
 *
 * The two shadow nodes measure through completely different engines (CoreText
 * on iOS, a JNI hop to a TextView on Android), but they measure the *same*
 * content, so the decision about what invalidates a measurement is identical.
 * Keeping one copy means a new size-affecting prop cannot be added to one
 * platform's comparison and forgotten on the other — a drift that would show up
 * only as a stale size after an update, never on first render.
 */

#pragma once

#include <react/renderer/components/RNPlainTextSpec/Props.h>
#include <react/renderer/core/ShadowNode.h>
#include <react/renderer/core/ShadowNodeFragment.h>

namespace facebook::react {

/*
 * Whether two revisions of the props would measure to the same size.
 *
 * Lists only what `measureContent` reads. The rest of the component's props
 * (color, textAlign, textAlignVertical, textDecorationLine, ellipsizeMode)
 * change how the text is painted, not how much space it needs. Yoga *style*
 * props are deliberately absent too: `YogaLayoutableShadowNode::updateYogaProps`
 * dirties the node when the resolved style changes, independently of this.
 *
 * Keep in sync with both platforms' `measureContent`, and on Android with the
 * props `PlainTextMeasurementsManager` serializes across JNI. A prop that
 * measurement reads but this ignores would keep a stale size.
 */
inline bool measurementInputsEqual(
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

/*
 * The body of `PlainTextShadowNode::shouldNewRevisionDirtyMeasurement` on both
 * platforms — a free function rather than a shared base class, so each
 * platform's shadow node stays a plain `ConcreteViewShadowNode` subclass.
 *
 * `newProps` is the caller's `getConcreteProps()`: by the time the override
 * runs the clone already carries the new props, so those are read from the node
 * itself and only the *old* ones come from `sourceShadowNode`.
 */
inline bool shouldRevisionDirtyMeasurement(
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
