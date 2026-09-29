# خطة التحويل إلى النسخة النهائية

## المرحلة 1 — Golden Dataset وBenchmark

تم إنشاء fixture حتمي باسم `synthetic-roof-stripe-v1` وتشغيله عبر:

```bash
npm run benchmark:filters
```

النتيجة الأساسية الحالية:

| المؤشر | القيمة |
|---|---:|
| الحجم | 48 × 32 |
| Bilateral checksum | 3884067805 |
| Alpha checksum | 1840294853 |
| Sauvola checksum | 4177005890 |
| Foreground pixels | 617 |
| TypeScript baseline | يقاس عند كل تشغيل |

الـgolden file محفوظ في `fixtures/filters/reference-golden.json`. يجب إضافة صور حقيقية مجهولة المصدر قبل اعتماد نتائج الإنتاج، وعدم حذف fallback قبل تحقق pixel/feature parity.

## المرحلة 2 — Native segmentation

تم نقل primitives التالية إلى C++/OpenCV عبر JNI:

- Bilateral Filter.
- Sauvola Threshold.
- Connected Components.
- Watershed.

Bilateral وSauvola يعملان في مسار Android الفعلي من React عبر `AndroidBridge`. Connected Components وWatershed متاحان Native ويحتاجان الآن إلى إخراج feature blobs مطابق للمسار TypeScript قبل إزالة fallback.

## المرحلة 3 — الذاكرة وفك الصور

المسار الحالي يستخدم Base64 كجسر توافق WebView، ثم DirectByteBuffer داخل Kotlin/C++. هذا ليس zero-copy. المرحلة الإنتاجية التالية هي فك الصورة في Kotlin/Native واستقبال URI/ContentResolver، ثم تمرير buffers مباشرة إلى C++ في worker thread. لا يجوز تنفيذ ذلك على UI thread.

## المرحلة 4 — Compose/CAD Native

تم تجهيز Native Core و`NativeCadActivity` كشاشة Compose انتقالية، لكن نقل كل CAD Canvas إلى Compose هو مشروع واجهة مستقل. يجب تنفيذه على مراحل: شاشة Native shell، ViewModel للمشروع، طبقات وselection، ثم snapping وundo/redo. لا يتم حذف WebView قبل اكتمال parity الوظيفي.

## المرحلة 5 — Production signing

GitHub Actions يبني APKs، لكن توقيع Production يجب أن يتم فقط عند توفير secrets التالية:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

تمت إضافة توقيع اختياري إلى Gradle وworkflow. عند غياب Secrets يستمر CI ببناء unsigned release للتجارب؛ وعند وجودها يتم فك keystore من Secret مؤقتاً والتحقق عبر `apksigner`. يجب تفعيل Google Play App Signing وعدم حفظ keystore في المستودع.
