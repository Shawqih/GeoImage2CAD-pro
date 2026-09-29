#include <jni.h>
#include <opencv2/core.hpp>
#include <opencv2/imgproc.hpp>
#include <cstdint>
#include <cstring>
#include <limits>

namespace {
std::uint8_t* directBytes(JNIEnv* env, jobject buffer, jlong required) {
    if (buffer == nullptr || required <= 0) return nullptr;
    auto* address = static_cast<std::uint8_t*>(env->GetDirectBufferAddress(buffer));
    if (address == nullptr || env->GetDirectBufferCapacity(buffer) < required) return nullptr;
    return address;
}

std::int32_t* directInts(JNIEnv* env, jobject buffer, jlong required) {
    if (buffer == nullptr || required <= 0) return nullptr;
    auto* address = static_cast<std::int32_t*>(env->GetDirectBufferAddress(buffer));
    if (address == nullptr || env->GetDirectBufferCapacity(buffer) < required) return nullptr;
    return address;
}
}

extern "C" JNIEXPORT jint JNICALL
Java_com_geoimage2cad_pro_NativeEngine_connectedComponents(
    JNIEnv* env,
    jobject,
    jobject maskBuffer,
    jobject labelsBuffer,
    jint width,
    jint height
) {
    if (width <= 0 || height <= 0) return -1;
    const jlong pixels = static_cast<jlong>(width) * height;
    auto* mask = directBytes(env, maskBuffer, pixels);
    auto* labels = directInts(env, labelsBuffer, pixels * static_cast<jlong>(sizeof(std::int32_t)));
    if (mask == nullptr || labels == nullptr) return -1;
    try {
        const cv::Mat binary(height, width, CV_8UC1, mask);
        cv::Mat labelMat(height, width, CV_32S, labels);
        return cv::connectedComponents(binary, labelMat, 8, CV_32S);
    } catch (const cv::Exception&) {
        return -1;
    }
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_geoimage2cad_pro_NativeEngine_watershed(
    JNIEnv* env,
    jobject,
    jobject rgbaBuffer,
    jobject markersBuffer,
    jint width,
    jint height
) {
    if (width <= 0 || height <= 0) return JNI_FALSE;
    const jlong pixels = static_cast<jlong>(width) * height;
    auto* rgba = directBytes(env, rgbaBuffer, pixels * 4);
    auto* markers = directInts(env, markersBuffer, pixels * static_cast<jlong>(sizeof(std::int32_t)));
    if (rgba == nullptr || markers == nullptr) return JNI_FALSE;
    try {
        const cv::Mat rgbaMat(height, width, CV_8UC4, rgba);
        cv::Mat bgr;
        cv::cvtColor(rgbaMat, bgr, cv::COLOR_RGBA2BGR);
        cv::Mat markerMat(height, width, CV_32S, markers);
        cv::watershed(bgr, markerMat);
        return JNI_TRUE;
    } catch (const cv::Exception&) {
        return JNI_FALSE;
    }
}
