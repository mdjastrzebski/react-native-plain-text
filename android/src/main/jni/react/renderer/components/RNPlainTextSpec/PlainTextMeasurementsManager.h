/*
 * Measures <RNPlainText> off the main thread by calling back into
 * `FabricUIManager.measure(...)` over JNI, which routes to
 * `RNPlainTextManager.measure(...)` on the JS/UI side. Mirrors RN's own
 * AndroidProgressBar/AndroidSwitch: Fabric layout runs in C++ on the shadow
 * thread, so intrinsic sizing has to hop into Java to reuse platform TextView
 * measurement.
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
      // Hoisted out of measure(), which runs once per node per layout pass (RN's
      // own managers re-resolve this key every call). Safe this early:
      // FabricUIManagerBinding inserts the key before building the Scheduler that
      // creates the registry owning this manager.
      : fabricUIManager_(
            contextContainer->at<jni::global_ref<jobject>>("FabricUIManager")) {}

  Size measure(
      SurfaceId surfaceId,
      const RNPlainTextProps &props,
      LayoutConstraints layoutConstraints) const;

  /*
   * Distance from the top of `size` to the first line's baseline, for
   * `alignItems: "baseline"`. Reuses the same `FabricUIManager.measure` JNI
   * hop as `measure()` above (Android has no thread-safe pure-C++ text
   * measurement, so this can't be computed here either): `size` is passed as
   * both the min and max constraint so `RNPlainTextManager.measure` lays out
   * the off-screen TextView at exactly that size, and a `__baseline` marker
   * prop (SYNC: matches `BASELINE_QUERY_PROP` in `PlainTextViewManager.kt`,
   * see docs/contributing/sync-points.md#set-15--the-__baseline-marker-string-android)
   * tells it to pack `TextView.getBaseline()` into the returned value instead
   * of the measured size.
   */
  Float baseline(SurfaceId surfaceId, const RNPlainTextProps &props, Size size)
      const;

 private:
  const jni::global_ref<jobject> fabricUIManager_;
};

} // namespace facebook::react
