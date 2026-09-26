// Swaps nitrogen's generated component descriptor for the measuring one
// (cpp/NitroPlainTextComponentDescriptor.hpp), keeping the generated view class.
// Approach borrowed from react-native-nitro-text.
//
// The runtime attaches categories before any +load runs, so the generated
// class's own +load registration already sees this componentDescriptorProvider.
// The provider registry keeps the first provider per component, so it must.

#import <React/RCTComponentViewFactory.h>
#import <React/RCTViewComponentView.h>
#import <react/renderer/componentregistry/ComponentDescriptorProvider.h>

#import "NitroPlainTextComponentDescriptor.hpp"

// Declared in the generated HybridNitroPlainTextComponent.mm.
@interface HybridNitroPlainTextComponent : RCTViewComponentView
@end

@interface HybridNitroPlainTextComponent (NitroPlainTextShadowOverride)
@end

@implementation HybridNitroPlainTextComponent (NitroPlainTextShadowOverride)

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wobjc-protocol-method-implementation"
+ (facebook::react::ComponentDescriptorProvider)componentDescriptorProvider
{
  return facebook::react::concreteComponentDescriptorProvider<
      margelo::nitro::plaintext::views::NitroPlainTextComponentDescriptor>();
}
#pragma clang diagnostic pop

@end
