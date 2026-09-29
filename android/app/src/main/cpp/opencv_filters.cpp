#include <jni.h>
#include <opencv2/core.hpp>
#include <opencv2/imgproc.hpp>
#include <algorithm>
#include <cstdint>
#include <cstring>
#include <limits>

namespace {

std::uint8_t* directBytes(JNIEnv* env, jobject buffer, jlong required) {
    if (buffer == nullptr || required <= 0) return nullptr;
    auto* address = static_cast<std::uint8_t*>(env->GetDirectBufferAddress(buffer));
    const jlong capacity = env->GetDirectBufferCapacity(buffer);
    if (address == nullptr || capacity < required) return nullptr;
    return address;
}

bool validDimensions(jint width, jint height) {
    return width > 0 && height > 0 &&
        static_cast<jlong>(width) * static_cast<jlong>(height) <=
            static_cast<jlong>(std::numeric_limits<int>::max());
}

}  // namespace

extern "C" JNIEXPORT jboolean JNICALL
Java_com_geoimage2cad_pro_NativeEngine_bilateralFilterRgba(
    JNIEnv* env,
    jobject,
    jobject inputBuffer,
    jobject outputBuffer,
    jint width,
    jint height,
    jint diameter,
    jdouble sigmaColor,
    jdouble sigmaSpace
) {
    if (!validDimensions(width, height) || diameter <= 0 || sigmaColor <= 0.0 || sigmaSpace <= 0.0) {
        return JNI_FALSE;
    }
    const jlong bytes = static_cast<jlong>(width) * height * 4;
    auto* input = directBytes(env, inputBuffer, bytes);
    auto* output = directBytes(env, outputBuffer, bytes);
    if (input == nullptr || output == nullptr) return JNI_FALSE;

    try {
        const cv::Mat source(height, width, CV_8UC4, input);
        cv::Mat filtered;
        cv::bilateralFilter(source, filtered, diameter, sigmaColor, sigmaSpace, cv::BORDER_REPLICATE);
        if (!filtered.isContinuous()) filtered = filtered.clone();
        std::memcpy(output, filtered.data, static_cast<std::size_t>(bytes));
        return JNI_TRUE;
    } catch (const cv::Exception&) {
        return JNI_FALSE;
    }
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_geoimage2cad_pro_NativeEngine_sauvolaThreshold(
    JNIEnv* env,
    jobject,
    jobject grayBuffer,
    jobject outputBuffer,
    jint width,
    jint height,
    jint windowRadius,
    jdouble k,
    jdouble dynamicRange
) {
    if (!validDimensions(width, height) || windowRadius < 1 || dynamicRange <= 0.0) {
        return JNI_FALSE;
    }
    const jlong pixels = static_cast<jlong>(width) * height;
    auto* gray = directBytes(env, grayBuffer, pixels);
    auto* output = directBytes(env, outputBuffer, pixels);
    if (gray == nullptr || output == nullptr) return JNI_FALSE;

    try {
        const cv::Mat source(height, width, CV_8UC1, gray);
        cv::Mat integralSum;
        cv::Mat integralSq;
        cv::integral(source, integralSum, integralSq, CV_64F, CV_64F);

        for (int y = 0; y < height; ++y) {
            const int y1 = std::max(0, y - windowRadius);
            const int y2 = std::min(height - 1, y + windowRadius);
            for (int x = 0; x < width; ++x) {
                const int x1 = std::max(0, x - windowRadius);
                const int x2 = std::min(width - 1, x + windowRadius);
                const double area = static_cast<double>((x2 - x1 + 1) * (y2 - y1 + 1));

                const double total = integralSum.at<double>(y2 + 1, x2 + 1)
                    - integralSum.at<double>(y2 + 1, x1)
                    - integralSum.at<double>(y1, x2 + 1)
                    + integralSum.at<double>(y1, x1);
                const double totalSq = integralSq.at<double>(y2 + 1, x2 + 1)
                    - integralSq.at<double>(y2 + 1, x1)
                    - integralSq.at<double>(y1, x2 + 1)
                    + integralSq.at<double>(y1, x1);
                const double mean = total / area;
                const double variance = std::max(0.0, totalSq / area - mean * mean);
                const double threshold = mean * (1.0 + k * (std::sqrt(variance) / dynamicRange - 1.0));
                output[static_cast<std::size_t>(y) * width + x] =
                    source.at<std::uint8_t>(y, x) < threshold ? 1 : 0;
            }
        }
        return JNI_TRUE;
    } catch (const cv::Exception&) {
        return JNI_FALSE;
    }
}
