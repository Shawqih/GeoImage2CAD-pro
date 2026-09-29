package com.geoimage2cad.pro

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import java.nio.ByteBuffer

/**
 * Native-first image ingestion for the next Android pipeline.
 * The decoder reads ContentResolver data directly into an RGBA DirectByteBuffer;
 * it is intentionally separate from the WebView bridge until the CAD screen
 * consumes NativeImageFrame end-to-end.
 */
object NativeImagePipeline {
    data class Frame(
        val width: Int,
        val height: Int,
        val rgba: ByteBuffer,
    )

    fun decodeRgba(context: Context, uri: Uri): Frame {
        val bitmap = context.contentResolver.openInputStream(uri).use { input ->
            requireNotNull(input) { "Unable to open image URI" }
            BitmapFactory.decodeStream(input)
        } ?: error("Unable to decode image URI")

        val rgbaBitmap = if (bitmap.config == Bitmap.Config.ARGB_8888) {
            bitmap
        } else {
            bitmap.copy(Bitmap.Config.ARGB_8888, false)
        }
        val buffer = ByteBuffer.allocateDirect(rgbaBitmap.byteCount)
        rgbaBitmap.copyPixelsToBuffer(buffer)
        buffer.rewind()
        if (rgbaBitmap !== bitmap) bitmap.recycle()
        return Frame(rgbaBitmap.width, rgbaBitmap.height, buffer)
    }

    fun bilateral(
        frame: Frame,
        diameter: Int = 5,
        sigmaColor: Double = 25.0,
        sigmaSpace: Double = 2.0,
    ): Frame {
        val output = ByteBuffer.allocateDirect(frame.rgba.capacity())
        require(NativeEngine.bilateralFilterRgba(
            frame.rgba, output, frame.width, frame.height, diameter, sigmaColor, sigmaSpace
        )) { "Native Bilateral filter failed" }
        return frame.copy(rgba = output)
    }
}
