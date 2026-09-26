#include "NitroPlainTextComponentDescriptor.hpp"

#include <react/utils/ContextContainer.h>

namespace margelo::nitro::plaintext::views {

using namespace facebook;

#ifndef __APPLE__
// Same key RN's BaseParagraphComponentDescriptor uses, so the instance is shared.
static constexpr const char* const kTextLayoutManagerKey = "TextLayoutManager";
#endif

NitroPlainTextComponentDescriptor::NitroPlainTextComponentDescriptor(
    const react::ComponentDescriptorParameters& parameters)
    : ConcreteComponentDescriptor(parameters, react::RawPropsParser(/* enableJsiParser */ true))
#ifndef __APPLE__
      ,
      textLayoutManager_(react::getManagerByName<react::TextLayoutManager>(contextContainer_, kTextLayoutManagerKey))
#endif
{
}

std::shared_ptr<const react::Props> NitroPlainTextComponentDescriptor::cloneProps(
    const react::PropsParserContext& context,
    const std::shared_ptr<const react::Props>& props,
    react::RawProps rawProps) const {
  rawProps.parse(rawPropsParser_);
  return NitroPlainTextShadowNode::Props(context, /* & */ rawProps, props);
}

void NitroPlainTextComponentDescriptor::adopt(react::ShadowNode& shadowNode) const {
  ConcreteComponentDescriptor::adopt(shadowNode);

  [[maybe_unused]] auto& concreteShadowNode = static_cast<NitroPlainTextShadowNode&>(shadowNode);

#ifdef ANDROID
  // Same as the generated descriptor: on Android, Nitro routes props to the view
  // through state.
  const std::shared_ptr<const HybridNitroPlainTextProps>& constProps = concreteShadowNode.getConcreteSharedProps();
  const std::shared_ptr<HybridNitroPlainTextProps>& props = std::const_pointer_cast<HybridNitroPlainTextProps>(constProps);
  HybridNitroPlainTextState state{props};
  concreteShadowNode.setStateData(std::move(state));
#endif

#ifndef __APPLE__
  concreteShadowNode.setTextLayoutManager(textLayoutManager_);
#endif
}

} // namespace margelo::nitro::plaintext::views
