#pragma once

#include <react/renderer/components/RNPlainTextSpec/EventEmitters.h>
#include <react/renderer/components/RNPlainTextSpec/Props.h>
#include <react/renderer/components/RNPlainTextSpec/ShadowNodes.h>
#include <react/renderer/components/RNPlainTextSpec/States.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>

// Shared with the Android shadow node; the podspec puts cpp/ on the header
// search path.
#include "PlainTextMeasurementHelpers.h"

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

  /*
   * Clone constructor, declared only to decide `measurementInputsChanged_`.
   *
   * This is the one point where the source node and the new props are both
   * reachable, so the verdict has to be computed here rather than in
   * `shouldNewRevisionDirtyMeasurement` — see the comment on that override.
   * Declaring it excludes the inherited constructor of the same signature.
   *
   * The base subobject is fully initialized before this member, so
   * `getConcreteProps()` already returns the *new* props while
   * `sourceShadowNode` still carries the old ones.
   */
  PlainTextShadowNode(const ShadowNode &sourceShadowNode, const ShadowNodeFragment &fragment)
      : ConcreteViewShadowNode(sourceShadowNode, fragment),
        measurementInputsChanged_(shouldRevisionDirtyMeasurement(sourceShadowNode, fragment, getConcreteProps()))
  {
  }

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
   * The base implementation always invalidates, which would re-run a full
   * CoreText layout per node on any ancestor re-render. Logic is shared with
   * Android in cpp/PlainTextMeasurementHelpers.h.
   *
   * Both parameters are useless here: `YogaLayoutableShadowNode::completeClone`
   * discards its own `sourceShadowNode` and calls this with `*this`, which by
   * then already holds `fragment.props`. Comparing those would compare the new
   * props against themselves and never invalidate. The verdict is computed in
   * the clone constructor instead, where the real source is still in scope.
   */
  bool shouldNewRevisionDirtyMeasurement(const ShadowNode &, const ShadowNodeFragment &) const override
  {
    return measurementInputsChanged_;
  }

 private:
  /*
   * Whether this revision's props measure differently from the previous one.
   * True on the create path, which never clones and never consults it.
   */
  bool measurementInputsChanged_{true};
};

} // namespace facebook::react
