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

// Shared with the iOS shadow node; on the include path via the cpp/ directory
// added in android/src/main/jni/CMakeLists.txt.
#include "PlainTextMeasurementHelpers.h"

namespace facebook::react {

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
   *
   * `measurementsManager_` is left null here, as it would be by the inherited
   * constructor; `RNPlainTextComponentDescriptor::adopt` re-wires it right
   * after the clone completes.
   */
  PlainTextShadowNode(
      const ShadowNode &sourceShadowNode,
      const ShadowNodeFragment &fragment)
      : ConcreteViewShadowNode(sourceShadowNode, fragment),
        measurementInputsChanged_(shouldRevisionDirtyMeasurement(
            sourceShadowNode,
            fragment,
            getConcreteProps())) {}

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
   * The base implementation always invalidates, which would cost a JNI hop and
   * a TextView measure per node on any ancestor re-render. Logic is shared with
   * iOS in cpp/PlainTextMeasurementHelpers.h.
   *
   * Both parameters are useless here: `YogaLayoutableShadowNode::completeClone`
   * discards its own `sourceShadowNode` and calls this with `*this`, which by
   * then already holds `fragment.props`. Comparing those would compare the new
   * props against themselves and never invalidate. The verdict is computed in
   * the clone constructor instead, where the real source is still in scope.
   */
  bool shouldNewRevisionDirtyMeasurement(
      const ShadowNode &,
      const ShadowNodeFragment &) const override {
    return measurementInputsChanged_;
  }

 private:
  std::shared_ptr<PlainTextMeasurementsManager> measurementsManager_;

  /*
   * Whether this revision's props measure differently from the previous one.
   * True on the create path, which never clones and never consults it.
   */
  bool measurementInputsChanged_{true};
};

} // namespace facebook::react
