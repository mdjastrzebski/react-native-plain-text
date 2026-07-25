/*
 * Measures <RNPlainText> off the main thread by calling back into
 * `FabricUIManager.measure(...)` over JNI, which routes to
 * `RNPlainTextManager.measure(...)` on the JS/UI side. Mirrors the pattern
 * used by RN's own AndroidProgressBar/AndroidSwitch: Fabric layout runs in C++
 * on the shadow thread, so intrinsic sizing has to hop into Java to reuse the
 * platform TextView measurement.
 */

#pragma once

#include <fbjni/fbjni.h>
#include <react/renderer/components/RNPlainTextSpec/Props.h>
#include <react/renderer/core/LayoutConstraints.h>
#include <react/utils/ContextContainer.h>

namespace facebook::react {

class PlainTextMeasurementsManager {
 public:
  explicit PlainTextMeasurementsManager(
      const std::shared_ptr<const ContextContainer> &contextContainer)
      // RN's own measurement managers re-resolve this string key on every
      // measure; it is hoisted here because measure() runs once per node per
      // layout pass. FabricUIManagerBinding inserts the key before it builds
      // the Scheduler, and the Scheduler is what creates the component
      // descriptor registry owning this manager — so it is always present by
      // the time this runs.
      : fabricUIManager_(
            contextContainer->at<jni::global_ref<jobject>>("FabricUIManager")) {}

  Size measure(
      SurfaceId surfaceId,
      const RNPlainTextProps &props,
      LayoutConstraints layoutConstraints) const;

 private:
  const jni::global_ref<jobject> fabricUIManager_;
};

} // namespace facebook::react
