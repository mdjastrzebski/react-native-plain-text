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
 * Whether a new revision of the node invalidates its cached measurement, for
 * both platforms. A free function rather than a shared base class, so each
 * shadow node stays a plain `ConcreteViewShadowNode` subclass.
 *
 * Call this from the shadow node's **clone constructor**, not from
 * `shouldNewRevisionDirtyMeasurement`. That override cannot answer the
 * question: `YogaLayoutableShadowNode::completeClone` discards its own
 * `sourceShadowNode` parameter and invokes the override with `*this`, whose
 * `props_` the base `ShadowNode` clone constructor has already replaced with
 * `fragment.props`. Passing that in would compare the new props against
 * themselves — always equal, never dirty, and the stale size survives every
 * update. The clone constructor is the last point where the two revisions are
 * distinguishable, so the verdict is computed there and cached on the node.
 *
 * `newProps` is the *new* revision's `getConcreteProps()`; the old one is read
 * off `sourceShadowNode`.
 */
bool shouldRevisionDirtyMeasurement(
    const ShadowNode &sourceShadowNode,
    const ShadowNodeFragment &fragment,
    const RNPlainTextProps &newProps);

} // namespace facebook::react
