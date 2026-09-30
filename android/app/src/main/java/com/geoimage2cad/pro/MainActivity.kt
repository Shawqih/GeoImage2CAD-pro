package com.geoimage2cad.pro

import android.content.ContentValues
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import android.util.Log
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import java.io.File
import java.util.Base64

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private lateinit var assetLoader: WebViewAssetLoader

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Native/OpenCV is optional at startup. Never run image processing or
        // Watershed on the UI thread before the WebView is created.
        runCatching { NativeEngine.version() }
            .onSuccess { Log.i("GeoImage2CAD", "Loaded $it") }
            .onFailure { Log.e("GeoImage2CAD", "Native Core unavailable; using WebView fallback", it) }
        window.statusBarColor = android.graphics.Color.rgb(11, 17, 32)
        window.navigationBarColor = android.graphics.Color.rgb(11, 17, 32)

        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            setBackgroundColor(android.graphics.Color.rgb(11, 17, 32))
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = false
                allowContentAccess = true
                builtInZoomControls = false
                displayZoomControls = false
                cacheMode = WebSettings.LOAD_DEFAULT
                userAgentString = "$userAgentString GeoImage2CAD-Android/1.0 NativeCore"
            }
            addJavascriptInterface(AndroidBridge(), "AndroidBridge")
            webViewClient = object : WebViewClientCompat() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest
                ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)
            }
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    fileChooserCallback?.onReceiveValue(null)
                    fileChooserCallback = filePathCallback
                    return try {
                        val chooserIntent = fileChooserParams?.createIntent()
                            ?: return false
                        chooserIntent.addCategory(android.content.Intent.CATEGORY_OPENABLE)
                        chooserIntent.type = "image/*"
                        startActivityForResult(chooserIntent, FILE_CHOOSER_REQUEST)
                        true
                    } catch (_: Exception) {
                        fileChooserCallback?.onReceiveValue(null)
                        fileChooserCallback = null
                        false
                    }
                }
            }
        }

        setContentView(webView)
        webView.loadUrl(APP_URL)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_REQUEST) {
            val result = if (resultCode == RESULT_OK && data?.data != null) {
                arrayOf(data.data!!)
            } else null
            fileChooserCallback?.onReceiveValue(result)
            fileChooserCallback = null
        }
    }

    override fun onDestroy() {
        webView.removeJavascriptInterface("AndroidBridge")
        webView.destroy()
        super.onDestroy()
    }

    inner class AndroidBridge {
        @JavascriptInterface
        fun nativeEngineInfo(): String = runCatching { NativeEngine.version() }
            .getOrDefault("Native Core unavailable")

        @JavascriptInterface
        fun nativeBilateralRgba(
            inputBase64: String,
            width: Int,
            height: Int,
            diameter: Int,
            sigmaColor: Double,
            sigmaSpace: Double,
        ): String = runNativeFilter(inputBase64, width, height) { input, output ->
            NativeEngine.bilateralFilterRgba(input, output, width, height, diameter, sigmaColor, sigmaSpace)
        }

        @JavascriptInterface
        fun nativeSauvola(
            grayBase64: String,
            width: Int,
            height: Int,
            windowRadius: Int,
            k: Double,
            dynamicRange: Double,
        ): String = runNativeFilter(grayBase64, width, height, channels = 1) { input, output ->
            NativeEngine.sauvolaThreshold(input, output, width, height, windowRadius, k, dynamicRange)
        }

        private fun runNativeFilter(
            inputBase64: String,
            width: Int,
            height: Int,
            channels: Int = 4,
            operation: (java.nio.ByteBuffer, java.nio.ByteBuffer) -> Boolean,
        ): String {
            if (width <= 0 || height <= 0 || width.toLong() * height * channels > MAX_BRIDGE_PIXELS) return ""
            return try {
                val inputBytes = Base64.getDecoder().decode(inputBase64)
                val expected = width.toLong() * height * channels
                if (inputBytes.size.toLong() != expected) return ""
                val input = java.nio.ByteBuffer.allocateDirect(inputBytes.size)
                input.put(inputBytes).rewind()
                val output = java.nio.ByteBuffer.allocateDirect(inputBytes.size)
                if (!operation(input, output)) return ""
                val outputBytes = ByteArray(inputBytes.size)
                output.get(0, outputBytes)
                Base64.getEncoder().withoutPadding().encodeToString(outputBytes)
            } catch (_: Throwable) {
                ""
            }
        }

        @JavascriptInterface
        fun saveFile(base64Data: String, filename: String, mimeType: String) {
            try {
                val bytes = Base64.getDecoder().decode(base64Data)
                val safeName = File(filename).name.ifBlank { "geoimage2cad-export.bin" }
                val values = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, safeName)
                    put(MediaStore.Downloads.MIME_TYPE, mimeType.ifBlank { "application/octet-stream" })
                    put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/GeoImage2CAD")
                    put(MediaStore.Downloads.IS_PENDING, 1)
                }
                val resolver = contentResolver
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    ?: throw IllegalStateException("Unable to create download")
                resolver.openOutputStream(uri)?.use { it.write(bytes) }
                values.clear()
                values.put(MediaStore.Downloads.IS_PENDING, 0)
                resolver.update(uri, values, null, null)
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "تم حفظ الملف في Downloads/GeoImage2CAD", Toast.LENGTH_LONG).show()
                }
            } catch (error: Exception) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "تعذر حفظ الملف: ${error.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    companion object {
        private const val FILE_CHOOSER_REQUEST = 4101
        private const val MAX_BRIDGE_PIXELS = 12_000_000L
        private const val APP_URL = "https://appassets.androidplatform.net/assets/web/index.html"
    }
}
