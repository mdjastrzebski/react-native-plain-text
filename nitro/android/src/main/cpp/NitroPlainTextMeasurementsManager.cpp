#include "NitroPlainTextMeasurementsManager.h"

#include <folly/dynamic.h>
#include <react/jni/ReadableNativeMap.h>
#include <react/renderer/core/conversions.h>

using namespace facebook;
using namespace facebook::jni;

namespace margelo::nitro::plaintext::views {

namespace {

const char* toString(NitroTextTransform value) {
  switch (value) {
    case NitroTextTransform::UPPERCASE: return "uppercase";
    case NitroTextTransform::LOWERCASE: return "lowercase";
    case NitroTextTransform::CAPITALIZE: return "capitalize";
    case NitroTextTransform::NONE:
    default: return "none";
  }
}

const char* toString(NitroHyphens value) {
  return value == NitroHyphens::AUTO ? "auto" : "none";
}

const char* toString(NitroEllipsizeMode value) {
  switch (value) {
    case NitroEllipsizeMode::HEAD: return "head";
    case NitroEllipsizeMode::MIDDLE: return "middle";
    case NitroEllipsizeMode::CLIP: return "clip";
    case NitroEllipsizeMode::TAIL:
    default: return "tail";
  }
}

// Port of PlainTextMeasurementsManager.cpp's serializeProps. Nitro props are
// optional, so "unset" is simply omitted and NitroPlainTextMeasureManager.kt falls
// back to the same defaults the mounted view uses.
//
// SYNC: every prop measureContent depends on, which is also every prop in
// measurementInputsEqual (cpp/NitroPlainTextShadowNode.cpp).
folly::dynamic serializeProps(const HybridNitroPlainTextProps& props) {
  folly::dynamic serialized = folly::dynamic::object;
  if (props.text.value.has_value()) {
    serialized["text"] = props.text.value.value();
  }
  if (props.fontSize.value.has_value()) {
    serialized["fontSize"] = props.fontSize.value.value();
  }
  if (props.fontFamily.value.has_value()) {
    serialized["fontFamily"] = props.fontFamily.value.value();
  }
  if (props.fontWeight.value.has_value()) {
    serialized["fontWeight"] = props.fontWeight.value.value();
  }
  if (props.fontStyle.value.has_value()) {
    serialized["fontStyle"] = props.fontStyle.value.value();
  }
  if (props.lineHeight.value.has_value()) {
    serialized["lineHeight"] = props.lineHeight.value.value();
  }
  if (props.letterSpacing.value.has_value()) {
    serialized["letterSpacing"] = props.letterSpacing.value.value();
  }
  if (props.textTransform.value.has_value()) {
    serialized["textTransform"] = toString(props.textTransform.value.value());
  }
  if (props.hyphens.value.has_value()) {
    serialized["hyphens"] = toString(props.hyphens.value.value());
  }
  if (props.lang.value.has_value()) {
    serialized["lang"] = props.lang.value.value();
  }
  if (props.numberOfLines.value.has_value()) {
    serialized["numberOfLines"] = static_cast<int>(props.numberOfLines.value.value());
  }
  if (props.ellipsizeMode.value.has_value()) {
    serialized["ellipsizeMode"] = toString(props.ellipsizeMode.value.value());
  }
  if (props.allowFontScaling.value.has_value()) {
    serialized["allowFontScaling"] = props.allowFontScaling.value.value();
  }
  if (props.maxFontSizeMultiplier.value.has_value()) {
    serialized["maxFontSizeMultiplier"] = props.maxFontSizeMultiplier.value.value();
  }
  return serialized;
}

local_ref<react::ReadableMap::javaobject> toReadableMap(const folly::dynamic& serialized) {
  local_ref<react::ReadableNativeMap::javaobject> map = react::ReadableNativeMap::newObjectCxxArgs(serialized);
  return make_local(reinterpret_cast<react::ReadableMap::javaobject>(map.get()));
}

using MeasureMethod = jlong(jint,
                            jstring,
                            react::ReadableMap::javaobject,
                            react::ReadableMap::javaobject,
                            react::ReadableMap::javaobject,
                            jfloat,
                            jfloat,
                            jfloat,
                            jfloat);

const auto& measureMethod() {
  static auto method =
      findClassStatic("com/facebook/react/fabric/FabricUIManager")->getMethod<MeasureMethod>("measure");
  return method;
}

// SYNC: NitroPlainTextMeasureManager.NAME.
const global_ref<jstring>& componentName() {
  static const auto name = make_global(make_jstring("NitroPlainTextMeasure"));
  return name;
}

} // namespace

react::Size NitroPlainTextMeasurementsManager::measure(react::SurfaceId surfaceId,
                                                       const HybridNitroPlainTextProps& props,
                                                       react::LayoutConstraints layoutConstraints) const {
  auto minimumSize = layoutConstraints.minimumSize;
  auto maximumSize = layoutConstraints.maximumSize;

  local_ref<react::ReadableMap::javaobject> propsMap = toReadableMap(serializeProps(props));

  return react::yogaMeassureToSize(measureMethod()(fabricUIManager_,
                                                   surfaceId,
                                                   componentName().get(),
                                                   nullptr,
                                                   propsMap.get(),
                                                   nullptr,
                                                   minimumSize.width,
                                                   maximumSize.width,
                                                   minimumSize.height,
                                                   maximumSize.height));
}

react::Float NitroPlainTextMeasurementsManager::baseline(react::SurfaceId surfaceId,
                                                         const HybridNitroPlainTextProps& props,
                                                         react::Size size) const {
  folly::dynamic serialized = serializeProps(props);
  // SYNC: BASELINE_QUERY_PROP in NitroPlainTextMeasureManager.kt.
  serialized["__baseline"] = true;

  local_ref<react::ReadableMap::javaobject> propsMap = toReadableMap(serialized);

  react::Size decoded = react::yogaMeassureToSize(measureMethod()(fabricUIManager_,
                                                                  surfaceId,
                                                                  componentName().get(),
                                                                  nullptr,
                                                                  propsMap.get(),
                                                                  nullptr,
                                                                  size.width,
                                                                  size.width,
                                                                  size.height,
                                                                  size.height));
  return decoded.height;
}

} // namespace margelo::nitro::plaintext::views
