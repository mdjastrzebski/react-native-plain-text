#include "NitroPlainTextComponentDescriptor.hpp"

namespace margelo::nitro::plaintext::views {

using namespace facebook;

NitroPlainTextComponentDescriptor::NitroPlainTextComponentDescriptor(
    const react::ComponentDescriptorParameters& parameters)
    : ConcreteComponentDescriptor(parameters, nitro::RawPropsCompat::makePropsParser())
#ifndef __APPLE__
      ,
      measurementsManager_(std::make_shared<const NitroPlainTextMeasurementsManager>(contextContainer_))
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

#ifndef __APPLE__
  // Before the early return below: a clone needs it whether or not props changed.
  concreteShadowNode.setMeasurementsManager(measurementsManager_);
#endif

#ifdef ANDROID
  // Same as nitro::ViewComponentDescriptor::adopt (final, so not reusable): Nitro
  // routes props to the Android view through state, and keeps the State identity
  // when no Nitro prop changed, so a base View prop change skips the State update.
  auto constProps = std::static_pointer_cast<const HybridNitroPlainTextProps>(concreteShadowNode.getProps());
  const std::shared_ptr<const HybridNitroPlainTextProps>& previousProps = concreteShadowNode.getStateData().getProps();
  if (previousProps != nullptr && constProps->hasSameProps(*previousProps)) {
    return;
  }
  HybridNitroPlainTextState state{std::move(constProps)};
  concreteShadowNode.setStateData(std::move(state));
#endif
}

} // namespace margelo::nitro::plaintext::views
