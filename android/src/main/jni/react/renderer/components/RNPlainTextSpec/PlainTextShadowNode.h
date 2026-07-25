/*
 * Custom `ShadowNode` for <RNPlainText> that measures its own intrinsic size.
 *
 * Mirrors the iOS `PlainTextShadowNode`: the codegen-generated
 * `RNPlainTextShadowNode` (in ShadowNodes.h) is a plain `ConcreteViewShadowNode`
 * with no measure function, so Yoga clips text to the styled width/height. This
 * subclass opts into measurement by setting the `MeasurableYogaNode` trait and
 * overriding `measureContent`.
 *
 * Unlike iOS (which measures inline with CoreText), Android has no thread-safe
 * pure-C++ text measurement, so the work is delegated to a
 * `PlainTextMeasurementsManager` that hops over JNI into the platform TextView.
 *
 * The class is named differently from the generated `RNPlainTextShadowNode`
 * alias to avoid a redefinition clash, but reuses the generated
 * `RNPlainTextComponentName` so its component handle matches the default —
 * letting our `RNPlainTextComponentDescriptor` override the generated one in
 * the provider registry.
 */

#pragma once

#include "PlainTextMeasurementsManager.h"

#include <react/renderer/components/RNPlainTextSpec/EventEmitters.h>
#include <react/renderer/components/RNPlainTextSpec/Props.h>
#include <react/renderer/components/RNPlainTextSpec/ShadowNodes.h>
#include <react/renderer/components/RNPlainTextSpec/States.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>

namespace facebook::react {

class PlainTextShadowNode final : public ConcreteViewShadowNode<
                                     RNPlainTextComponentName,
                                     RNPlainTextProps,
                                     RNPlainTextEventEmitter,
                                     RNPlainTextState> {
 public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;

  static ShadowNodeTraits BaseTraits() {
    auto traits = ConcreteViewShadowNode::BaseTraits();
    // LeafYogaNode: the text has no Yoga children participating in layout.
    traits.set(ShadowNodeTraits::Trait::LeafYogaNode);
    // MeasurableYogaNode: registers `measureContent` as the Yoga measure fn.
    traits.set(ShadowNodeTraits::Trait::MeasurableYogaNode);
    return traits;
  }

  // Associates a shared `PlainTextMeasurementsManager` with the node.
  void setPlainTextMeasurementsManager(
      const std::shared_ptr<PlainTextMeasurementsManager> &measurementsManager);

  Size measureContent(
      const LayoutContext &layoutContext,
      const LayoutConstraints &layoutConstraints) const override;

 protected:
  /*
   * Decides whether a new revision of this node invalidates its cached
   * measurement. The base implementation always says yes, which is expensive
   * here: whenever an ancestor re-renders, Fabric clones every child of the
   * changed parent just to re-own its Yoga node
   * (`YogaLayoutableShadowNode::adoptYogaChild`), and each of those clones would
   * re-measure — a JNI hop and a TextView measure per node, for a revision in
   * which nothing about the text changed.
   */
  bool shouldNewRevisionDirtyMeasurement(
      const ShadowNode &sourceShadowNode,
      const ShadowNodeFragment &fragment) const override;

 private:
  std::shared_ptr<PlainTextMeasurementsManager> measurementsManager_;
};

} // namespace facebook::react
