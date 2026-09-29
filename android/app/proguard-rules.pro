# GeoImage2CAD Pro uses a local WebView bundle; keep Android bridge methods.
-keepclassmembers class com.geoimage2cad.pro.MainActivity {
    @android.webkit.JavascriptInterface <methods>;
}

# JNI resolves these symbols by the exact fully-qualified class and method names.
-keep class com.geoimage2cad.pro.NativeEngine { *; }
