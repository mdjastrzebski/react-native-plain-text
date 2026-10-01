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
  if (props.text.get().has_value()) {
    serialized["text"] = props.text.get().value();
  }
  if (props.fontSize.get().has_value()) {
    serialized["fontSize"] = props.fontSize.get().value();
  }
  if (props.fontFamily.get().has_value()) {
    serialized["fontFamily"] = props.fontFamily.get().value();
  }
  if (props.fontWeight.get().has_value()) {
    serialized["fontWeight"] = props.fontWeight.get().value();
  }
  if (props.fontStyle.get().has_value()) {
    serialized["fontStyle"] = props.fontStyle.get().value();
  }
  if (props.lineHeight.get().has_value()) {
    serialized["lineHeight"] = props.lineHeight.get().value();
  }
  if (props.letterSpacing.get().has_value()) {
    serialized["letterSpacing"] = props.letterSpacing.get().value();
  }
  if (props.textTransform.get().has_value()) {
    serialized["textTransform"] = toString(props.textTransform.get().value());
  }
  if (props.hyphens.get().has_value()) {
    serialized["hyphens"] = toString(props.hyphens.get().value());
  }
  if (props.lang.get().has_value()) {
    serialized["lang"] = props.lang.get().value();
  }
  if (props.numberOfLines.get().has_value()) {
    serialized["numberOfLines"] = static_cast<int>(props.numberOfLines.get().value());
  }
  if (props.ellipsizeMode.get().has_value()) {
    serialized["ellipsizeMode"] = toString(props.ellipsizeMode.get().value());
  }
  if (props.allowFontScaling.get().has_value()) {
    serialized["allowFontScaling"] = props.allowFontScaling.get().value();
  }
  if (props.maxFontSizeMultiplier.get().has_value()) {
    serialized["maxFontSizeMultiplier"] = props.maxFontSizeMultiplier.get().value();
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
