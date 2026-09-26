project(NitroPlainText)
cmake_minimum_required(VERSION 3.9.0)

set(PACKAGE_NAME NitroPlainText)
set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 20)

add_library(${PACKAGE_NAME} SHARED
  src/main/cpp/cpp-adapter.cpp
  ../cpp/NitroPlainTextShadowNode.cpp
  ../cpp/NitroPlainTextComponentDescriptor.cpp
)

# Nitrogen-generated specs, views and autolinking.
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/NitroPlainText+autolinking.cmake)

# The measuring shadow node (../cpp) includes the generated view header by bare name,
# as the iOS pod's header map allows.
include_directories(
  "../cpp"
  "../nitrogen/generated/shared/c++/views"
)

find_library(LOG_LIB log)

target_link_libraries(
  ${PACKAGE_NAME}
  ${LOG_LIB}
  android
)
