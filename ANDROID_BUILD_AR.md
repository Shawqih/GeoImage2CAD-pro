# بناء وتسليم GeoImage2CAD Pro Android

تم تحويل المشروع إلى تطبيق Android فعلي برقم حزمة:

```text
com.geoimage2cad.pro
```

## ما تم إنشاؤه

- مشروع Gradle Android حقيقي داخل `android/`.
- Gradle Wrapper قابل للتشغيل عبر `android/gradlew`.
- تطبيق Kotlin يعمل كغلاف Android احترافي للواجهة المحلية.
- Native Core حقيقي بـ C++17 عبر Android NDK وJNI، مدمج داخل APK.
- OpenCV Android 4.10.0 مدمج داخل CMake وAPK.
- مرشح OpenCV Bilateral على RGBA عبر DirectByteBuffer.
- Sauvola Threshold باستخدام OpenCV Integral Images.
- OpenCV Connected Components وWatershed عبر JNI وDirectByteBuffer.
- WebViewAssetLoader لتحميل HTML/CSS/JavaScript من داخل APK دون خادم.
- اختيار الصور عبر Android File Picker.
- حفظ ملفات DXF/GIS/SVG/CSV/ZIP في `Downloads/GeoImage2CAD` عبر MediaStore.
- دعم زر الرجوع Android والتنقل داخل WebView.
- سير عمل GitHub Actions يبني الويب وdebug APK وrelease APK.

## البناء المحلي

من جذر المشروع:

```bash
chmod +x scripts/build-android.sh
./scripts/build-android.sh
```

يتم تنزيل OpenCV Android SDK تلقائياً إلى cache خارج المستودع عند الحاجة. أو يدوياً:

```bash
npm ci
npm run lint
npm run build
rm -rf android/app/src/main/assets/web
mkdir -p android/app/src/main/assets/web
cp -R dist/. android/app/src/main/assets/web/
cd android
export OPENCV_ANDROID_SDK="$HOME/.cache/opencv-android/OpenCV-android-sdk"
./gradlew assembleDebug
./gradlew assembleRelease
```

## الملفات الناتجة

```text
android/app/build/outputs/apk/debug/app-debug.apk
android/app/build/outputs/apk/release/app-release-unsigned.apk
```

## APK المسلم في هذه النسخة

- `GeoImage2CAD-Pro-v1.0.0-debug.apk`: نسخة debug موقعة بمفتاح Android debug.
- `GeoImage2CAD-Pro-v1.0.0-release.apk`: نسخة release موقعة محلياً بمفتاح إصدار مؤقت وتم التحقق منها بواسطة `apksigner`.

> مهم للنشر الرسمي على Google Play: يجب استبدال مفتاح الإصدار المؤقت بمفتاح المؤسسة الخاص، وتخزينه في GitHub Secrets أو Google Play App Signing. لا تضع مفتاح الإنتاج داخل المستودع.

## التحقق

تم التحقق من:

- `npm ci`.
- `npm run lint`.
- `npm run build`.
- `./gradlew assembleDebug`.
- `./gradlew assembleRelease`.
- توقيع release باستخدام APK Signature Scheme v2/v3.
- وجود `assets/web/index.html` وملفات JavaScript/CSS داخل APK.
- وجود `libgeoimage2cad.so` لمعمارية `arm64-v8a` و`armeabi-v7a` و`x86_64`.
- وجود `libopencv_java4.so` لكل معماريات APK.
- اختبار تشغيل Bilateral وSauvola عند بدء `MainActivity`.
- اختبار تشغيل Connected Components وWatershed ضمن Native smoke test.

## ملاحظة المعمارية

هذه النسخة تجمع بين **Android WebView Shell** و**Native Core حقيقي**. تم نقل Bilateral وSauvola وConnected Components وWatershed إلى C++/OpenCV، مع اختبار Native عند بدء التطبيق. ما زالت واجهة React تستخدم المسار TypeScript الرئيسي؛ لأن WebView لا يمرر `SharedArrayBuffer` مباشرة إلى JNI. التفعيل الآمن يتطلب إما طبقة base64/serialized مؤقتة، أو نقل فك الصورة وإدارة الـbuffer إلى Kotlin/Compose للحصول على zero-copy حقيقي. لذلك لم تُحذف نسخة TypeScript قبل اعتماد golden fixtures على جهاز Android فعلي.
