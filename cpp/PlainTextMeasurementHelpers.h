/*
 * When a new revision of a <RNPlainText> node invalidates its cached
 * measurement — shared by both platforms' `PlainTextShadowNode`.
 *
 * The two measure through different engines (CoreText on iOS, a JNI hop to a
 * TextView on Android) but over the same content, so this decision is identical
 * for both. One copy means a new size-affecting prop can't be added to one
 * platform's comparison and forgotten in the other — a drift that would surface
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
 * Must stay in sync with both platforms' `measureContent`, and on Android with
 * the props `PlainTextMeasurementsManager` serializes: a prop that measurement
 * reads but this ignores would keep a stale size. Yoga *style* props are
 * excluded on purpose — `YogaLayoutableShadowNode::updateYogaProps` dirties the
 * node on style changes independently of this.
 */
bool measurementInputsEqual(
    const RNPlainTextProps &a,
    const RNPlainTextProps &b);

/*
 * Body of `PlainTextShadowNode::shouldNewRevisionDirtyMeasurement` for both
 * platforms. A free function rather than a shared base class, so each shadow
 * node stays a plain `ConcreteViewShadowNode` subclass.
 *
 * `newProps` is the caller's `getConcreteProps()`: the clone already carries the
 * new props by the time the override runs, so only the old ones come from
 * `sourceShadowNode`.
 */
bool shouldRevisionDirtyMeasurement(
    const ShadowNode &sourceShadowNode,
    const ShadowNodeFragment &fragment,
    const RNPlainTextProps &newProps);

} // namespace facebook::react
