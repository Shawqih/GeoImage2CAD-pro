#include <jni.h>
#include <android/log.h>
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <limits>
#include <string>

namespace {
constexpr char kTag[] = "GeoImage2CADNative";

struct Point {
    double x;
    double y;
};

double polygonArea(const Point* points, std::size_t count) {
    if (points == nullptr || count < 3) return 0.0;
    long double sum = 0.0;
    for (std::size_t i = 0; i < count; ++i) {
        const std::size_t next = (i + 1) % count;
        sum += static_cast<long double>(points[i].x) * points[next].y;
        sum -= static_cast<long double>(points[next].x) * points[i].y;
    }
    return std::abs(static_cast<double>(sum / 2.0L));
}

double polygonPerimeter(const Point* points, std::size_t count) {
    if (points == nullptr || count < 2) return 0.0;
    double total = 0.0;
    for (std::size_t i = 0; i < count; ++i) {
        const std::size_t next = (i + 1) % count;
        total += std::hypot(points[next].x - points[i].x, points[next].y - points[i].y);
    }
    return total;
}

void setFloat(JNIEnv* env, jfloatArray result, jsize index, float value) {
    env->SetFloatArrayRegion(result, index, 1, &value);
}
}  // namespace

extern "C" JNIEXPORT jstring JNICALL
Java_com_geoimage2cad_pro_NativeEngine_version(JNIEnv* env, jobject) {
    return env->NewStringUTF("GeoImage2CAD Native Core 1.1 / C++17 + OpenCV");
}

extern "C" JNIEXPORT jdoubleArray JNICALL
Java_com_geoimage2cad_pro_NativeEngine_polygonMetrics(JNIEnv* env, jobject, jdoubleArray coordinates) {
    if (coordinates == nullptr) return env->NewDoubleArray(0);
    const jsize length = env->GetArrayLength(coordinates);
    if (length < 6 || length % 2 != 0) return env->NewDoubleArray(0);

    const jsize pointCount = length / 2;
    jdouble* raw = env->GetDoubleArrayElements(coordinates, nullptr);
    if (raw == nullptr) return env->NewDoubleArray(0);

    auto* points = new Point[static_cast<std::size_t>(pointCount)];
    for (jsize i = 0; i < pointCount; ++i) {
        points[i] = {raw[i * 2], raw[i * 2 + 1]};
    }
    const double area = polygonArea(points, static_cast<std::size_t>(pointCount));
    const double perimeter = polygonPerimeter(points, static_cast<std::size_t>(pointCount));
    delete[] points;
    env->ReleaseDoubleArrayElements(coordinates, raw, JNI_ABORT);

    jdoubleArray result = env->NewDoubleArray(2);
    if (result == nullptr) return nullptr;
    const jdouble values[2] = {area, perimeter};
    env->SetDoubleArrayRegion(result, 0, 2, values);
    return result;
}

extern "C" JNIEXPORT jfloatArray JNICALL
Java_com_geoimage2cad_pro_NativeEngine_analyzeRgba(
    JNIEnv* env,
    jobject,
    jobject rgbaBuffer,
    jint width,
    jint height
) {
    jfloatArray result = env->NewFloatArray(4);
    if (result == nullptr) return nullptr;
    if (rgbaBuffer == nullptr || width <= 0 || height <= 0) return result;

    auto* pixels = static_cast<std::uint8_t*>(env->GetDirectBufferAddress(rgbaBuffer));
    const jlong capacity = env->GetDirectBufferCapacity(rgbaBuffer);
    const jlong expected = static_cast<jlong>(width) * height * 4;
    if (pixels == nullptr || capacity < expected) return result;

    const jlong pixelCount = static_cast<jlong>(width) * height;
    long double luminanceSum = 0.0;
    long double edgeSum = 0.0;
    std::uint8_t previousLuma = 0;

    for (jlong i = 0; i < pixelCount; ++i) {
        const std::uint8_t r = pixels[i * 4];
        const std::uint8_t g = pixels[i * 4 + 1];
        const std::uint8_t b = pixels[i * 4 + 2];
        const auto luma = static_cast<std::uint8_t>(std::clamp(
            static_cast<int>(std::lround(0.299 * r + 0.587 * g + 0.114 * b)), 0, 255));
        luminanceSum += luma;
        if (i > 0) edgeSum += std::abs(static_cast<int>(luma) - static_cast<int>(previousLuma));
        previousLuma = luma;
    }

    const float meanLuminance = static_cast<float>(luminanceSum / pixelCount);
    const float normalizedEdge = static_cast<float>(std::min(1.0L, edgeSum / (pixelCount * 255.0L)));
    const float megapixels = static_cast<float>(pixelCount) / 1000000.0F;
    setFloat(env, result, 0, meanLuminance);
    setFloat(env, result, 1, normalizedEdge);
    setFloat(env, result, 2, static_cast<float>(width));
    setFloat(env, result, 3, megapixels);
    __android_log_print(ANDROID_LOG_DEBUG, kTag, "Analyzed %dx%d RGBA buffer", width, height);
    return result;
}
