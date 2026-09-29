cmake_minimum_required(VERSION 3.22.1)
project(geoimage2cad)

if(NOT DEFINED ENV{OPENCV_ANDROID_SDK})
    message(FATAL_ERROR "OPENCV_ANDROID_SDK must point to the extracted OpenCV Android SDK")
endif()

set(OPENCV_ANDROID_SDK "$ENV{OPENCV_ANDROID_SDK}")
set(OPENCV_NATIVE_DIR "${OPENCV_ANDROID_SDK}/sdk/native")
set(OPENCV_INCLUDE_DIR "${OPENCV_NATIVE_DIR}/jni/include")
set(OPENCV_LIB "${OPENCV_NATIVE_DIR}/libs/${ANDROID_ABI}/libopencv_java4.so")

if(NOT EXISTS "${OPENCV_INCLUDE_DIR}/opencv2/core.hpp")
    message(FATAL_ERROR "OpenCV headers not found at ${OPENCV_INCLUDE_DIR}")
endif()
if(NOT EXISTS "${OPENCV_LIB}")
    message(FATAL_ERROR "OpenCV library not found at ${OPENCV_LIB}")
endif()

add_library(opencv_java4 SHARED IMPORTED)
set_target_properties(opencv_java4 PROPERTIES
    IMPORTED_LOCATION "${OPENCV_LIB}"
    INTERFACE_INCLUDE_DIRECTORIES "${OPENCV_INCLUDE_DIR}"
)

add_library(geoimage2cad SHARED
    native_engine.cpp
    opencv_filters.cpp
    native_segmentation.cpp
)

target_compile_features(geoimage2cad PRIVATE cxx_std_17)
target_compile_options(geoimage2cad PRIVATE -Wall -Wextra -Werror=return-type -ffunction-sections -fdata-sections)
target_link_options(geoimage2cad PRIVATE -Wl,--gc-sections)

target_include_directories(geoimage2cad PRIVATE "${OPENCV_INCLUDE_DIR}")
find_library(log-lib log)
target_link_libraries(geoimage2cad PRIVATE opencv_java4 ${log-lib})
