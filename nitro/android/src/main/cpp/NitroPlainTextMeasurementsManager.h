// Port of PlainText's android/.../PlainTextMeasurementsManager.h for the Nitro
// port: measures off the main thread by calling FabricUIManager.measure(...) over
// JNI, which routes by component name to NitroPlainTextMeasureManager.measure()
// (Kotlin), where an off-screen NitroPlainTextView does the measuring.

#pragma once

#include "HybridNitroPlainTextComponent.hpp"

#include <fbjni/fbjni.h>
#include <react/renderer/core/LayoutConstraints.h>
#include <react/utils/ContextContainer.h>

namespace margelo::nitro::plaintext::views {

class NitroPlainTextMeasurementsManager {
public:
  explicit NitroPlainTextMeasurementsManager(
      const std::shared_ptr<const facebook::react::ContextContainer>& contextContainer)
      : fabricUIManager_(
            contextContainer->at<facebook::jni::global_ref<jobject>>("FabricUIManager")) {}

  facebook::react::Size measure(facebook::react::SurfaceId surfaceId,
                                const HybridNitroPlainTextProps& props,
                                facebook::react::LayoutConstraints layoutConstraints) const;

  // Same JNI hop, with `size` as both constraints and a "__baseline" marker, so the
  // Kotlin side returns TextView.getBaseline() in the height slot.
  facebook::react::Float baseline(facebook::react::SurfaceId surfaceId,
                                  const HybridNitroPlainTextProps& props,
                                  facebook::react::Size size) const;

private:
  const facebook::jni::global_ref<jobject> fabricUIManager_;
};

} // namespace margelo::nitro::plaintext::views
