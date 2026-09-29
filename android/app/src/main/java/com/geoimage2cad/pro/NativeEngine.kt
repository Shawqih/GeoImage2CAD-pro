package com.geoimage2cad.pro

import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Stable Kotlin boundary for the C++17 Native Core.
 * Heavy image/CAD operations should be called from Dispatchers.Default or a worker.
 */
object NativeEngine {
    init {
        System.loadLibrary("geoimage2cad")
    }

    external fun version(): String

    /** Returns [area, closedPerimeter] for an x/y coordinate array. */
    external fun polygonMetrics(coordinates: DoubleArray): DoubleArray

    /** Returns [meanLuminance, normalizedEdgeDensity, width, megapixels]. */
    external fun analyzeRgba(buffer: ByteBuffer, width: Int, height: Int): FloatArray

    /** OpenCV bilateral filter on an RGBA DirectByteBuffer. */
    external fun bilateralFilterRgba(
        input: ByteBuffer,
        output: ByteBuffer,
        width: Int,
        height: Int,
        diameter: Int = 5,
        sigmaColor: Double = 22.0,
        sigmaSpace: Double = 2.0,
    ): Boolean

    /** Integral-image Sauvola threshold; output values are 0 or 1. */
    external fun sauvolaThreshold(
        gray: ByteBuffer,
        output: ByteBuffer,
        width: Int,
        height: Int,
        windowRadius: Int = 12,
        k: Double = 0.2,
        dynamicRange: Double = 128.0,
    ): Boolean

    /** Labels a binary mask with OpenCV connectedComponents (8-connectivity). */
    external fun connectedComponents(
        mask: ByteBuffer,
        labels: ByteBuffer,
        width: Int,
        height: Int,
    ): Int

    /** Applies OpenCV watershed in-place to an int32 marker buffer. */
    external fun watershed(
        rgba: ByteBuffer,
        markers: ByteBuffer,
        width: Int,
        height: Int,
    ): Boolean

    /** Small runtime smoke test used during app startup and instrumentation. */
    fun runFilterSmokeTest(): Boolean {
        val width = 4
        val height = 4
        val rgba = ByteBuffer.allocateDirect(width * height * 4)
        repeat(width * height) { index ->
            val value = if (index == 5 || index == 6 || index == 9 || index == 10) 240 else 20
            rgba.put(value.toByte()).put(value.toByte()).put(value.toByte()).put(255.toByte())
        }
        rgba.rewind()
        val filtered = ByteBuffer.allocateDirect(width * height * 4)
        val gray = ByteBuffer.allocateDirect(width * height)
        val threshold = ByteBuffer.allocateDirect(width * height)
        repeat(width * height) { gray.put(if (it % width == 1) 240.toByte() else 20.toByte()) }
        gray.rewind()
        val bilateralOk = bilateralFilterRgba(rgba, filtered, width, height)
        val sauvolaOk = sauvolaThreshold(gray, threshold, width, height)
        val thresholdBytes = ByteArray(width * height)
        threshold.get(thresholdBytes)
        val hasForeground = thresholdBytes.any { it.toInt() == 1 }
        val hasBackground = thresholdBytes.any { it.toInt() == 0 }
        val labels = ByteBuffer.allocateDirect(width * height * Int.SIZE_BYTES)
        val markerBytes = ByteBuffer.allocateDirect(width * height * Int.SIZE_BYTES)
        markerBytes.order(ByteOrder.nativeOrder()).asIntBuffer()
            .put(0, 1)
            .put(width * height - 1, 2)
        val components = connectedComponents(threshold, labels, width, height)
        val watershedOk = watershed(rgba, markerBytes, width, height)
        return bilateralOk && sauvolaOk && filtered.get(0).toInt() != 0 &&
            hasForeground && hasBackground && components >= 2 && watershedOk
    }
}
