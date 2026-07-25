#include "PlainTextMeasurementsManager.h"

#include <fbjni/fbjni.h>
#include <folly/dynamic.h>
#include <react/jni/ReadableNativeMap.h>
#include <react/renderer/core/conversions.h>

using namespace facebook::jni;

namespace facebook::react {

Size PlainTextMeasurementsManager::measure(
    SurfaceId surfaceId,
    const RNPlainTextProps &props,
    LayoutConstraints layoutConstraints) const {
  static auto measure =
      jni::findClassStatic("com/facebook/react/fabric/FabricUIManager")
          ->getMethod<jlong(
              jint,
              jstring,
              ReadableMap::javaobject,
              ReadableMap::javaobject,
              ReadableMap::javaobject,
              jfloat,
              jfloat,
              jfloat,
              jfloat)>("measure");

  // Held as a global ref rather than built per call: make_jstring allocates a
  // Java String, and this one is the same for every node.
  static const auto componentName = make_global(make_jstring("RNPlainText"));

  auto minimumSize = layoutConstraints.minimumSize;
  auto maximumSize = layoutConstraints.maximumSize;

  // The generic FabricUIManager.measure path takes props as a ReadableMap; the
  // Kotlin ViewManager.measure reads "text"/"fontSize"/... back out to size an
  // off-screen TextView. (AndroidSwitch passes null here because its size is
  // prop-independent — ours is not.)
  //
  // Only props that differ from their default are serialized: every entry costs
  // a folly::dynamic insert plus a JNI-visible map slot on the per-node measure
  // path, and typical usage sets two or three of these. This makes the C++ and
  // Kotlin defaults a contract — RNPlainTextManager.measure() must fall back to
  // exactly the default in Props.h for every key it reads, since an omitted key
  // now means "default" rather than "not set by JS". It still has to set every
  // size-affecting prop unconditionally, because the measuring view is reused.
  folly::dynamic serializedProps = folly::dynamic::object;
  if (!props.text.empty()) {
    serializedProps["text"] = props.text;
  }
  if (props.fontSize != 14.0) {
    serializedProps["fontSize"] = props.fontSize;
  }
  if (!props.fontFamily.empty()) {
    serializedProps["fontFamily"] = props.fontFamily;
  }
  if (!props.fontWeight.empty()) {
    serializedProps["fontWeight"] = props.fontWeight;
  }
  if (props.fontStyle != RNPlainTextFontStyle::Normal) {
    serializedProps["fontStyle"] = toString(props.fontStyle);
  }
  if (props.lineHeight != 0.0) {
    serializedProps["lineHeight"] = props.lineHeight;
  }
  if (props.letterSpacing != 0.0) {
    serializedProps["letterSpacing"] = props.letterSpacing;
  }
  if (props.numberOfLines != 0) {
    serializedProps["numberOfLines"] = props.numberOfLines;
  }
  if (!props.allowFontScaling) {
    serializedProps["allowFontScaling"] = props.allowFontScaling;
  }
  if (props.maxFontSizeMultiplier != 0.0) {
    serializedProps["maxFontSizeMultiplier"] = props.maxFontSizeMultiplier;
  }

  local_ref<ReadableNativeMap::javaobject> propsRNM =
      ReadableNativeMap::newObjectCxxArgs(serializedProps);
  local_ref<ReadableMap::javaobject> propsRM = make_local(
      reinterpret_cast<ReadableMap::javaobject>(propsRNM.get()));

  return yogaMeassureToSize(measure(
      fabricUIManager_,
      surfaceId,
      componentName.get(),
      nullptr,
      propsRM.get(),
      nullptr,
      minimumSize.width,
      maximumSize.width,
      minimumSize.height,
      maximumSize.height));
}

} // namespace facebook::react
