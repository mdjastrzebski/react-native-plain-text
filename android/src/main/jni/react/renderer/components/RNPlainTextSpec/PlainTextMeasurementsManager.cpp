#include "PlainTextMeasurementsManager.h"

#include <fbjni/fbjni.h>
#include <folly/dynamic.h>
#include <react/jni/ReadableNativeMap.h>
#include <react/renderer/core/conversions.h>

using namespace facebook::jni;

namespace facebook::react {

namespace {

// SYNC: every prop either platform's `measureContent` reads. Missing one here
// keeps a stale size after an update: correct on first render, wrong later.
// Shared by `measure()` and `baseline()` below: both size the same off-screen
// TextView through the same props, so serializing them once keeps the two in
// step by construction instead of by two copies staying manually in sync.
//
// Only non-default props are serialized, since each entry costs a
// folly::dynamic insert and a JNI-visible map slot per node.
//
// SYNC: that makes the defaults a three-way contract: the value in each
// condition below, the default in the generated Props.h, and the fallback in
// RNPlainTextManager.measure() for the same key. A mismatch silently measures
// at the wrong size, since an omitted key means "default", not "not set".
folly::dynamic serializeProps(const RNPlainTextProps &props) {
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
  if (!props.fontStyle.empty()) {
    serializedProps["fontStyle"] = props.fontStyle;
  }
  if (!props.fontVariant.empty()) {
    // Arrives as a ReadableArray, what ReactTypefaceUtils.parseFontVariant takes.
    folly::dynamic fontVariant = folly::dynamic::array;
    for (const auto &variant : props.fontVariant) {
      fontVariant.push_back(variant);
    }
    serializedProps["fontVariant"] = std::move(fontVariant);
  }
  if (!props.fontVariationSettings.empty()) {
    serializedProps["fontVariationSettings"] = props.fontVariationSettings;
  }
  if (props.lineHeight != 0.0) {
    serializedProps["lineHeight"] = props.lineHeight;
  }
  if (props.letterSpacing != 0.0) {
    serializedProps["letterSpacing"] = props.letterSpacing;
  }
  if (props.textTransform != RNPlainTextTextTransform::None) {
    serializedProps["textTransform"] = toString(props.textTransform);
  }
  if (props.numberOfLines != 0) {
    serializedProps["numberOfLines"] = props.numberOfLines;
  }
  if (!props.allowFontScaling) {
    serializedProps["allowFontScaling"] = false;
  }
  if (props.maxFontSizeMultiplier != 0.0) {
    serializedProps["maxFontSizeMultiplier"] = props.maxFontSizeMultiplier;
  }
  if (props.experiment) {
    serializedProps["experiment"] = true;
  }
  return serializedProps;
}

local_ref<ReadableMap::javaobject> toReadableMap(
    const folly::dynamic &serializedProps) {
  local_ref<ReadableNativeMap::javaobject> propsRNM =
      ReadableNativeMap::newObjectCxxArgs(serializedProps);
  return make_local(
      reinterpret_cast<ReadableMap::javaobject>(propsRNM.get()));
}

} // namespace

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

  // Held as a global ref rather than built per call: make_jstring allocates a Java
  // String, and this one is the same for every node.
  static const auto componentName = make_global(make_jstring("RNPlainText"));

  auto minimumSize = layoutConstraints.minimumSize;
  auto maximumSize = layoutConstraints.maximumSize;

  // The generic FabricUIManager.measure path takes props as a ReadableMap, which
  // RNPlainTextManager.measure reads back to size an off-screen TextView.
  // (AndroidSwitch passes null here because its size is prop-independent. Ours isn't.)
  local_ref<ReadableMap::javaobject> propsRM =
      toReadableMap(serializeProps(props));

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

Float PlainTextMeasurementsManager::baseline(
    SurfaceId surfaceId,
    const RNPlainTextProps &props,
    Size size) const {
  // Same JNI method as `measure()` above: FabricUIManager.measure is the only
  // bridge C++ has into a Java ViewManager's sizing logic (see the class doc
  // comment). Passing `size` as both the min and max constraint makes
  // RNPlainTextManager.measure lay the off-screen TextView out at exactly
  // that size (both dimensions resolve to Yoga's EXACTLY mode), rather than
  // re-deriving a size.
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

  static const auto componentName = make_global(make_jstring("RNPlainText"));

  folly::dynamic serializedProps = serializeProps(props);
  // SYNC: matches BASELINE_QUERY_PROP in PlainTextViewManager.kt. Never a
  // real prop, just a marker telling `measure()` on the Java side to pack
  // `TextView.getBaseline()` into the return value instead of the measured
  // size.
  serializedProps["__baseline"] = true;

  local_ref<ReadableMap::javaobject> propsRM =
      toReadableMap(serializedProps);

  // The `.height` slot carries the baseline (see PlainTextViewManager.kt);
  // `.width` is unused for this call.
  Size decoded = yogaMeassureToSize(measure(
      fabricUIManager_,
      surfaceId,
      componentName.get(),
      nullptr,
      propsRM.get(),
      nullptr,
      size.width,
      size.width,
      size.height,
      size.height));
  return decoded.height;
}

} // namespace facebook::react
