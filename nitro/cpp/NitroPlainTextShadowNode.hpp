// Hand-written replacement for nitrogen's generated HybridNitroPlainTextShadowNode,
// which is a plain view node with no intrinsic size. Same name, props and state as
// the generated one, plus measureContent, so Yoga can size the view from its text.
// Swapped in at registration time (ios/NitroPlainTextShadowOverride.mm,
// android/src/main/cpp/cpp-adapter.cpp), an approach borrowed from
// react-native-nitro-text.
//
// Measuring, per platform:
// - iOS (ios/NitroPlainTextShadowNode+iOS.mm): PlainText's own algorithm, ported
//   from ios/PlainTextShadowNode.mm, with fonts from the same resolver the mounted
//   view uses (ios/NitroPlainTextFontResolution.h).
// - Android (NitroPlainTextShadowNode.cpp): RN's TextLayoutManager, the one <Text>
//   uses.

#pragma once

#include "HybridNitroPlainTextComponent.hpp"

#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/LayoutConstraints.h>
#include <react/renderer/core/LayoutContext.h>
#include <react/renderer/core/ShadowNodeFragment.h>

#ifndef __APPLE__
#include <react/renderer/textlayoutmanager/TextLayoutManager.h>
#endif

namespace margelo::nitro::plaintext::views {

// Whether two revisions of the props would measure to the same size. Port of
// PlainText's measurementInputsEqual (cpp/PlainTextMeasurementHelpers.cpp).
// SYNC: every prop either platform's measureContent reads.
bool measurementInputsEqual(const HybridNitroPlainTextProps& a, const HybridNitroPlainTextProps& b);

class NitroPlainTextShadowNode final
    : public react::ConcreteViewShadowNode<HybridNitroPlainTextComponentName,
                                           HybridNitroPlainTextProps,
                                           react::ViewEventEmitter,
                                           HybridNitroPlainTextState> {
public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;

  // Computes the measurement dirty flag while the old props are still reachable,
  // like PlainTextShadowNode (see shouldRevisionDirtyMeasurement there).
  NitroPlainTextShadowNode(const react::ShadowNode& sourceShadowNode, const react::ShadowNodeFragment& fragment)
      : ConcreteViewShadowNode(sourceShadowNode, fragment),
        measurementDirty_(fragment.props != nullptr &&
                          !measurementInputsEqual(
                              static_cast<const HybridNitroPlainTextProps&>(*sourceShadowNode.getProps()),
                              getConcreteProps())) {}

  static react::ShadowNodeTraits BaseTraits();

  react::Size measureContent(const react::LayoutContext& layoutContext,
                             const react::LayoutConstraints& layoutConstraints) const override;

#ifdef __APPLE__
  react::Float baseline(const react::LayoutContext& layoutContext, react::Size size) const override;
#else
  void setTextLayoutManager(std::shared_ptr<const react::TextLayoutManager> textLayoutManager);
#endif

protected:
  bool shouldNewRevisionDirtyMeasurement(const react::ShadowNode&, const react::ShadowNodeFragment&) const override {
    return measurementDirty_;
  }

private:
#ifndef __APPLE__
  std::shared_ptr<const react::TextLayoutManager> textLayoutManager_;
#endif
  bool measurementDirty_{true};
};

} // namespace margelo::nitro::plaintext::views
