// Replaces nitrogen's generated HybridNitroPlainTextComponentDescriptor so shadow
// nodes are NitroPlainTextShadowNode (measurable). See NitroPlainTextShadowNode.hpp.

#pragma once

#include "NitroPlainTextShadowNode.hpp"

#include <react/renderer/core/ConcreteComponentDescriptor.h>
#include <react/renderer/textlayoutmanager/TextLayoutManager.h>

namespace margelo::nitro::plaintext::views {

class NitroPlainTextComponentDescriptor final
    : public react::ConcreteComponentDescriptor<NitroPlainTextShadowNode> {
public:
  explicit NitroPlainTextComponentDescriptor(const react::ComponentDescriptorParameters& parameters);

  // Nitro's cached props parsing, same as the generated descriptor.
  std::shared_ptr<const react::Props> cloneProps(const react::PropsParserContext& context,
                                                 const std::shared_ptr<const react::Props>& props,
                                                 react::RawProps rawProps) const override;

  void adopt(react::ShadowNode& shadowNode) const override;

private:
  // Shared with <Text> (and its measure cache) through the ContextContainer,
  // like RN's BaseParagraphComponentDescriptor.
  const std::shared_ptr<const react::TextLayoutManager> textLayoutManager_;
};

} // namespace margelo::nitro::plaintext::views
