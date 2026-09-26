// Hand-written replacement for nitrogen's generated HybridNitroPlainTextShadowNode,
// which is a plain view node with no intrinsic size. Same name, props and state as
// the generated one, plus measureContent, so Yoga can size the view from its text.
//
// Approach borrowed from react-native-nitro-text: measure with RN's own
// TextLayoutManager (the one <Text> uses), and swap the component descriptor in
// at registration time (ios/NitroPlainTextShadowOverride.mm,
// android/src/main/cpp/cpp-adapter.cpp).

#pragma once

#include "HybridNitroPlainTextComponent.hpp"

#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/LayoutConstraints.h>
#include <react/renderer/core/LayoutContext.h>
#include <react/renderer/textlayoutmanager/TextLayoutManager.h>

namespace margelo::nitro::plaintext::views {

class NitroPlainTextShadowNode final
    : public react::ConcreteViewShadowNode<HybridNitroPlainTextComponentName,
                                           HybridNitroPlainTextProps,
                                           react::ViewEventEmitter,
                                           HybridNitroPlainTextState> {
public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;

  static react::ShadowNodeTraits BaseTraits();

  void setTextLayoutManager(std::shared_ptr<const react::TextLayoutManager> textLayoutManager);

protected:
  react::Size measureContent(const react::LayoutContext& layoutContext,
                             const react::LayoutConstraints& layoutConstraints) const override;

private:
  std::shared_ptr<const react::TextLayoutManager> textLayoutManager_;
};

} // namespace margelo::nitro::plaintext::views
