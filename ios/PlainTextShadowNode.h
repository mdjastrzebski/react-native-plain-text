#pragma once

#include <react/renderer/components/RNPlainTextSpec/EventEmitters.h>
#include <react/renderer/components/RNPlainTextSpec/Props.h>
#include <react/renderer/components/RNPlainTextSpec/ShadowNodes.h>
#include <react/renderer/components/RNPlainTextSpec/States.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>

namespace facebook::react {

/*
 * Custom `ShadowNode` for <RNPlainText> that measures its own intrinsic size.
 *
 * The codegen-generated `RNPlainTextShadowNode` (in ShadowNodes.h) is a plain
 * `ConcreteViewShadowNode` alias with no measure function, so Yoga clips the
 * text to whatever width/height the style specifies. This subclass opts into
 * measurement by setting the `MeasurableYogaNode` trait and overriding
 * `measureContent` — Yoga then calls it during layout and uses the returned
 * size as the node's dimensions.
 *
 * The class is named differently from the generated alias to avoid a
 * redefinition clash. It reuses the generated `RNPlainTextComponentName` so
 * its component handle/name match the default, letting our ComponentDescriptor
 * override the generated one in the provider registry.
 */
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

  Size measureContent(
      const LayoutContext &layoutContext,
      const LayoutConstraints &layoutConstraints) const override;

 protected:
  /*
   * Decides whether a new revision of this node invalidates its cached
   * measurement — the base implementation always says yes, which would re-run a
   * full CoreText layout per node whenever any ancestor re-renders. Delegates to
   * `shouldRevisionDirtyMeasurement` in cpp/PlainTextMeasurementInvalidation.h,
   * shared with Android; see there for why.
   */
  bool shouldNewRevisionDirtyMeasurement(
      const ShadowNode &sourceShadowNode,
      const ShadowNodeFragment &fragment) const override;
};

} // namespace facebook::react
