#pragma once

#include <react/renderer/components/RNPlainTextSpec/EventEmitters.h>
#include <react/renderer/components/RNPlainTextSpec/Props.h>
#include <react/renderer/components/RNPlainTextSpec/ShadowNodes.h>
#include <react/renderer/components/RNPlainTextSpec/States.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>

// SYNC: mirrors android/.../RNPlainTextSpec/PlainTextShadowNode.h, same traits and
// overrides, so a change here usually belongs there too. Only the invalidation logic
// is actually shared, via the include below. See
// docs/contributing/sync-points.md#both-platforms-shadow-nodes.
#include "PlainTextMeasurementHelpers.h"

namespace facebook::react {

/*
 * Custom `ShadowNode` for <RNPlainText> that measures its own intrinsic size.
 * The codegen-generated `RNPlainTextShadowNode` has no measure function, so
 * Yoga would otherwise clip text to the style's width/height. Named
 * differently to avoid a redefinition clash with the generated alias, but
 * reuses its `RNPlainTextComponentName` so this ComponentDescriptor can
 * override the generated one in the provider registry.
 */
class PlainTextShadowNode final : public ConcreteViewShadowNode<
                                     RNPlainTextComponentName,
                                     RNPlainTextProps,
                                     RNPlainTextEventEmitter,
                                     RNPlainTextState> {
 public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;

  /*
   * Declared just to compute `measurementInputsChanged_` here, the only point
   * where the source node's old props and the new props are both reachable:
   * the base subobject is initialized first, so `getConcreteProps()` already
   * returns the new props while `sourceShadowNode` still holds the old ones.
   */
  PlainTextShadowNode(const ShadowNode &sourceShadowNode, const ShadowNodeFragment &fragment)
      : ConcreteViewShadowNode(sourceShadowNode, fragment),
        measurementInputsChanged_(shouldRevisionDirtyMeasurement(sourceShadowNode, fragment, getConcreteProps()))
  {
  }

  static ShadowNodeTraits BaseTraits() {
    auto traits = ConcreteViewShadowNode::BaseTraits();
    traits.set(ShadowNodeTraits::Trait::LeafYogaNode);
    traits.set(ShadowNodeTraits::Trait::MeasurableYogaNode);
    traits.set(ShadowNodeTraits::Trait::BaselineYogaNode);
    return traits;
  }

  Size measureContent(
      const LayoutContext &layoutContext,
      const LayoutConstraints &layoutConstraints) const override;

  Float baseline(const LayoutContext &layoutContext, Size size) const override;

 protected:
  /*
   * Both parameters are useless here: `completeClone` discards its own
   * `sourceShadowNode` and calls this with `*this`, which already holds the
   * new props, so comparing would compare new against itself and never
   * invalidate. The real verdict is computed in the clone constructor, where
   * the old props are still reachable.
   */
  bool shouldNewRevisionDirtyMeasurement(const ShadowNode &, const ShadowNodeFragment &) const override
  {
    return measurementInputsChanged_;
  }

 private:
  // Whether this revision's props measure differently from the previous one.
  // True on the create path, which never clones and never consults it.
  bool measurementInputsChanged_{true};
};

} // namespace facebook::react
