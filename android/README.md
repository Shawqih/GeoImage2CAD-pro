# GeoImage2CAD Pro Android

هذا مجلد مشروع Android حقيقي يضم نسخة الويب الإنتاجية داخل WebView محلي يعمل دون اتصال.

## المتطلبات

- JDK 17
- Android SDK Platform 35
- Android Build Tools 35.0.0
- Gradle Wrapper الموجود في هذا المجلد

## بناء التطبيق

من جذر المستودع:

```bash
npm ci
npm run lint
npm run build
rm -rf android/app/src/main/assets/web
mkdir -p android/app/src/main/assets/web
cp -R dist/. android/app/src/main/assets/web/

cd android
./gradlew assembleDebug
./gradlew assembleRelease
```

الملفات الناتجة:

- `app/build/outputs/apk/debug/app-debug.apk`
- `app/build/outputs/apk/release/app-release.apk`

## ملاحظات تقنية

- كل ملفات HTML/CSS/JavaScript مضمّنة داخل APK في `app/src/main/assets/web`.
- التطبيق لا يحتاج خادماً أو اتصالاً بالشبكة لمعالجة الصور.
- اختيار الصور يتم عبر Android file picker.
- التصدير يحفظ الملفات في `Downloads/GeoImage2CAD` عبر MediaStore.
- النسخة الحالية WebView shell رسمية قابلة للتوسعة إلى محرك Kotlin/C++ أصلي لاحقاً.
