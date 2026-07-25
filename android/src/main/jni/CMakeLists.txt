# Custom autolinking entry point for react-native-plain-text, referenced from the
# library's react-native.config.js via `cmakeListsPath`. It replaces the default
# generated CMakeLists (android/build/generated/source/codegen/jni/CMakeLists.txt).
#
# Purpose: build a `react_codegen_RNPlainTextSpec` target that compiles the
# generated codegen sources *plus* our hand-written measuring ShadowNode /
# ComponentDescriptor / MeasurementsManager, and arranges the include path so
# that `<react/renderer/components/RNPlainTextSpec/ComponentDescriptors.h>`
# resolves to our override (which registers the measuring descriptor) rather
# than the generated non-measuring one. This is how Android intrinsic sizing is
# wired in without requiring any C++/CMake changes in the consuming app.

cmake_minimum_required(VERSION 3.13)
set(CMAKE_VERBOSE_MAKEFILE on)

# The codegen output still lives in its usual location; only the CMakeLists that
# builds it has been redirected here.
get_filename_component(
  GENERATED_DIR
  "${CMAKE_CURRENT_SOURCE_DIR}/../../../build/generated/source/codegen/jni"
  ABSOLUTE)

file(GLOB generated_SRCS CONFIGURE_DEPENDS
  "${GENERATED_DIR}/*.cpp"
  "${GENERATED_DIR}/react/renderer/components/RNPlainTextSpec/*.cpp")

file(GLOB custom_SRCS CONFIGURE_DEPENDS
  "${CMAKE_CURRENT_SOURCE_DIR}/react/renderer/components/RNPlainTextSpec/*.cpp")

# Platform-independent C++ shared with iOS (which picks it up through the
# podspec). Header-only so far, hence include path only — no sources to compile.
get_filename_component(
  SHARED_CPP_DIR
  "${CMAKE_CURRENT_SOURCE_DIR}/../../../../cpp"
  ABSOLUTE)

add_library(
  react_codegen_RNPlainTextSpec
  OBJECT
  ${generated_SRCS}
  ${custom_SRCS}
)

# Our override directory is listed BEFORE the generated one so that our
# ComponentDescriptors.h shadows the generated header of the same path. The
# generated dir still provides Props.h/ShadowNodes.h/EventEmitters.h/etc.
target_include_directories(
  react_codegen_RNPlainTextSpec
  PUBLIC
  ${CMAKE_CURRENT_SOURCE_DIR}
  ${SHARED_CPP_DIR}
  ${GENERATED_DIR}
  ${GENERATED_DIR}/react/renderer/components/RNPlainTextSpec
)

target_link_libraries(
  react_codegen_RNPlainTextSpec
  fbjni
  jsi
  reactnative
)

target_compile_reactnative_options(react_codegen_RNPlainTextSpec PRIVATE)
