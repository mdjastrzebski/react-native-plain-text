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
 * Covers only what `measureContent` reads. The rest of the component's props
 * (color, textAlign, textAlignVertical, textDecorationLine, ellipsizeMode)
 * change how the text is painted, not how much space it needs. Yoga *style*
 * props are deliberately excluded too: `YogaLayoutableShadowNode::updateYogaProps`
 * dirties the node when the resolved style changes, independently of this.
 *
 * The implementation must stay in sync with both platforms' `measureContent`,
 * and on Android with the props `PlainTextMeasurementsManager` serializes across
 * JNI. A prop that measurement reads but this ignores would keep a stale size.
 */
bool measurementInputsEqual(
    const RNPlainTextProps &a,
    const RNPlainTextProps &b);

/*
 * The body of `PlainTextShadowNode::shouldNewRevisionDirtyMeasurement` on both
 * platforms — a free function rather than a shared base class, so each
 * platform's shadow node stays a plain `ConcreteViewShadowNode` subclass.
 *
 * Pass the caller's `getConcreteProps()` as `newProps`: by the time the override
 * runs the clone already carries the new props, so those are read from the node
 * itself and only the *old* ones come from `sourceShadowNode`.
 */
bool shouldRevisionDirtyMeasurement(
    const ShadowNode &sourceShadowNode,
    const ShadowNodeFragment &fragment,
    const RNPlainTextProps &newProps);

} // namespace facebook::react
