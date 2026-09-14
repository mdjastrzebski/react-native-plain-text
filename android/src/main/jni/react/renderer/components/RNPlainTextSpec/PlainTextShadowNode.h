#pragma once

#include "PlainTextMeasurementsManager.h"

#include <react/renderer/components/RNPlainTextSpec/EventEmitters.h>
#include <react/renderer/components/RNPlainTextSpec/Props.h>
#include <react/renderer/components/RNPlainTextSpec/ShadowNodes.h>
#include <react/renderer/components/RNPlainTextSpec/States.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>

// SYNC: mirrors ios/PlainTextShadowNode.h. Same traits and overrides, so a change
// here usually belongs there too. Only the invalidation logic is actually shared, via
// the include below. See docs/contributing/sync-points.md#set-9--both-platforms-shadow-node-headers.
#include "PlainTextMeasurementHelpers.h"

namespace facebook::react {

class PlainTextShadowNode final : public ConcreteViewShadowNode<
                                     RNPlainTextComponentName,
                                     RNPlainTextProps,
                                     RNPlainTextEventEmitter,
                                     RNPlainTextState> {
 public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;

  // Calculate measurement dirty flag when we still can access the old props
  PlainTextShadowNode(const ShadowNode &sourceShadowNode, const ShadowNodeFragment &fragment)
      : ConcreteViewShadowNode(sourceShadowNode, fragment),
        measurementDirty_(shouldRevisionDirtyMeasurement(sourceShadowNode, fragment, getConcreteProps()))
  {
  }

  static ShadowNodeTraits BaseTraits() {
    auto traits = ConcreteViewShadowNode::BaseTraits();
    traits.set(ShadowNodeTraits::Trait::LeafYogaNode);
    traits.set(ShadowNodeTraits::Trait::MeasurableYogaNode);
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
  bool shouldNewRevisionDirtyMeasurement(const ShadowNode &, const ShadowNodeFragment &) const override
  {
    return measurementDirty_;
  }

 private:
  std::shared_ptr<PlainTextMeasurementsManager> measurementsManager_;

  bool measurementDirty_{true};
};

} // namespace facebook::react
