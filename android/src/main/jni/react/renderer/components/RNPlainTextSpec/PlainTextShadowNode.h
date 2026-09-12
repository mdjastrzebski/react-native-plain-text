// Custom `ShadowNode` for <RNPlainText> that measures its own intrinsic size via
// `MeasurableYogaNode`/`measureContent`, delegating to `PlainTextMeasurementsManager`
// since Android has no thread-safe pure-C++ text measurement (unlike iOS's CoreText).
// Named differently from the generated `RNPlainTextShadowNode` to avoid a redefinition
// clash, but reuses `RNPlainTextComponentName` so its descriptor overrides the generated one.

#pragma once

#include "PlainTextMeasurementsManager.h"

#include <react/renderer/components/RNPlainTextSpec/EventEmitters.h>
#include <react/renderer/components/RNPlainTextSpec/Props.h>
#include <react/renderer/components/RNPlainTextSpec/ShadowNodes.h>
#include <react/renderer/components/RNPlainTextSpec/States.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>

// SYNC: mirrors ios/PlainTextShadowNode.h. Same traits and overrides, so a change
// here usually belongs there too. Only the invalidation logic is actually shared, via
// the include below. See docs/contributing/sync-points.md#both-platforms-shadow-nodes.
#include "PlainTextMeasurementHelpers.h"

namespace facebook::react {

class PlainTextShadowNode final : public ConcreteViewShadowNode<
                                     RNPlainTextComponentName,
                                     RNPlainTextProps,
                                     RNPlainTextEventEmitter,
                                     RNPlainTextState> {
 public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;

  // Clone constructor: computes `measurementDirty_` here because this is the one
  // point where the source node's old props and `getConcreteProps()`'s new props are both
  // reachable (see `shouldNewRevisionDirtyMeasurement` below for why it can't do this itself).
  // `measurementsManager_` is re-wired by `RNPlainTextComponentDescriptor::adopt` after cloning.
  PlainTextShadowNode(
      const ShadowNode &sourceShadowNode,
      const ShadowNodeFragment &fragment)
      : ConcreteViewShadowNode(sourceShadowNode, fragment),
        measurementDirty_(shouldRevisionDirtyMeasurement(
            sourceShadowNode,
            fragment,
            getConcreteProps())) {}

  static ShadowNodeTraits BaseTraits() {
    auto traits = ConcreteViewShadowNode::BaseTraits();
    traits.set(ShadowNodeTraits::Trait::LeafYogaNode);
    traits.set(ShadowNodeTraits::Trait::MeasurableYogaNode);
    // BaselineYogaNode: registers `baseline` as the Yoga baseline fn, so a
    // `alignItems: "baseline"` row aligns this node on its text baseline
    // instead of defaulting to its bottom edge.
    traits.set(ShadowNodeTraits::Trait::BaselineYogaNode);
    return traits;
  }

  void setPlainTextMeasurementsManager(
      const std::shared_ptr<PlainTextMeasurementsManager> &measurementsManager);

  Size measureContent(
      const LayoutContext &layoutContext,
      const LayoutConstraints &layoutConstraints) const override;

  Float baseline(const LayoutContext &layoutContext, Size size) const override;

 protected:
  // The base implementation always invalidates (costing a JNI hop and TextView measure per
  // node on any ancestor re-render). Logic is shared with iOS in PlainTextMeasurementHelpers.h.
  // Both parameters are unusable here: `YogaLayoutableShadowNode::completeClone` calls this
  // with `*this` already holding the new props, so the real verdict is computed in the clone
  // constructor instead, where the old source node is still in scope.
  bool shouldNewRevisionDirtyMeasurement(
      const ShadowNode &,
      const ShadowNodeFragment &) const override {
    return measurementDirty_;
  }

 private:
  std::shared_ptr<PlainTextMeasurementsManager> measurementsManager_;

  // Whether this revision's props measure differently from the previous one.
  // True on the create path, which never clones and never consults it.
  bool measurementDirty_{true};
};

} // namespace facebook::react
