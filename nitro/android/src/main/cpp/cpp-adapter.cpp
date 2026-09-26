#include "NitroPlainTextComponentDescriptor.hpp"
#include "NitroPlainTextOnLoad.hpp"
#include <fbjni/fbjni.h>
#include <jni.h>
#include <react/fabric/CoreComponentsRegistry.h>

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, []() {
    // Registered before registerAllNatives(), whose generated (non-measuring)
    // descriptor then becomes a no-op: the provider registry keeps the first
    // provider per component. See cpp/NitroPlainTextShadowNode.hpp.
    facebook::react::CoreComponentsRegistry::sharedProviderRegistry()->add(
        facebook::react::concreteComponentDescriptorProvider<
            margelo::nitro::plaintext::views::NitroPlainTextComponentDescriptor>());
    margelo::nitro::plaintext::registerAllNatives();
  });
}
