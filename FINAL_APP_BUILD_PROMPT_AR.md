# Prompt احترافي لبناء النسخة النهائية من GeoImage2CAD Pro

## دورك
أنت مهندس برمجيات Senior متخصص في Android Native وC++/OpenCV وComputer Vision وCAD/GIS وReact/TypeScript. تولَّ مسؤولية تحليل مستودع `Shawqih/GeoImage2CAD-pro` ثم تحويله إلى تطبيق Android احترافي قابل للتثبيت والتجربة، مع الحفاظ على الوظائف الحالية وتحسينها بدلاً من إنشاء نموذج تجريبي شكلي.

لا تفترض أن أي وظيفة تعمل لمجرد وجود كود لها. يجب فحص المسارات الفعلية من واجهة React إلى Kotlin/JNI وC++ ثم إلى ملف الناتج، وتشغيل اختبارات قابلة لإعادة الإنتاج قبل إعلان النجاح.

---

## الهدف النهائي
إنشاء إصدار Android نهائي تجريبي موثوق من GeoImage2CAD Pro، يعمل على Android 10 فأحدث، ويستطيع:

1. استيراد الصور من الهاتف بأمان.
2. تحليل نوع الصورة واختيار pipeline مناسب.
3. تنفيذ معالجة الرؤية الحاسوبية محلياً.
4. استخراج مبانٍ وطرق وحدود ومسطحات مائية وعناصر المخططات.
5. تمرير البيانات الكبيرة بكفاءة عبر DirectByteBuffer أو مسار Native مناسب، دون Base64 في المسارات الكبيرة.
6. إنتاج هندسة CAD قابلة للتحرير.
7. تصدير DXF قياسي حقيقي يمكن فتحه والتحقق منه في AutoCAD وLibreCAD وQGIS.
8. حفظ الملفات في Downloads عبر Android MediaStore.
9. العمل دون اتصال بالإنترنت بعد تثبيت التطبيق، باستثناء أي خدمة اختيارية ومعلنة صراحة.
10. عدم الإغلاق عند فشل Native أو OpenCV؛ يجب استخدام fallback واضح وتسجيل الخطأ.

---

## المرحلة 1: تحليل المستودع قبل التعديل

افحص الملفات التالية فعلياً:

- `src/engine/dxfWriter.ts`
- `src/engine/cvSegmentation.ts`
- `src/engine/advancedCVFilters.ts`
- `src/engine/watershedSegmentation.ts`
- `src/engine/geometryRegularizer.ts`
- `src/engine/topologyValidator.ts`
- `src/engine/projectStorage.ts`
- `src/components/ExportModal.tsx`
- `src/types/cad.ts`
- `android/app/src/main/java/.../MainActivity.kt`
- `android/app/src/main/java/.../NativeEngine.kt`
- `android/app/src/main/cpp/*`
- `.github/workflows/android.yml`

أنشئ تقريراً يوضح:

- مسار استيراد الصورة.
- مسار المعالجة.
- مسار إنشاء الميزات الهندسية.
- مسار تصدير DXF.
- مسار الحفظ في Android.
- نقاط الفشل المحتملة.
- أي ادعاء غير مثبت في التوثيق.
- الفرق بين الوظيفة المكتوبة والوظيفة التي تم اختبارها فعلياً.

---

## المرحلة 2: إصلاح DXF كأولوية

### مواصفات DXF المطلوبة

استخدم DXF ASCII قياسياً، ويفضّل AutoCAD R2013 `AC1027` أو إصداراً أقدم معروف التوافق. يجب أن يحتوي الملف على:

- `HEADER`
- `CLASSES` عند الحاجة
- `TABLES`
- `BLOCKS`
- `ENTITIES`
- `OBJECTS`
- `EOF`

يجب أن تكون كل Entity صحيحة من ناحية ترتيب Group Codes وSubclass Markers.

### الكيانات المطلوبة

- `POINT`
- `LINE`
- `LWPOLYLINE`
- `CIRCLE`
- `ARC`
- `TEXT`

لا تُصدر هندسة غير مدعومة على أنها كيان صحيح. إذا كانت الميزة غير قابلة للتحويل، سجّلها في تقرير التصدير وأظهر رسالة واضحة للمستخدم.

### الطبقات

- أنشئ Layer Table لكل الطبقات المستخدمة فعلياً.
- أضف أي طبقة موجودة في `features` وغير موجودة في `layers` تلقائياً.
- نظّف أسماء الطبقات من الرموز غير المسموحة في DXF.
- لا تستخدم Layer Name في Entity إذا لم تكن موجودة في Layer Table.
- احترم `visible` و`locked` و`dxfColorIndex` و`linetype` و`lineweight`.
- عرّف كل Linetype مستخدم في Layer Table، بما في ذلك `CONTINUOUS` و`DASHED` و`CENTER` و`PHANTOM` و`DOT`.

### الوحدات والتحويل

- دعم `unitless` و`m` و`ft` و`cm`.
- استخدم `$INSUNITS` الصحيح.
- لا تضع `$INSUNITS = meters` إذا كانت الإحداثيات ما زالت بالبكسل.
- عند وجود Calibration طبّق التحويل قبل كتابة الإحداثيات.
- عند عكس محور Y، طبّق التحويل بشكل متسق على النقاط ومراكز الدوائر والأقواس.
- تحقق من `$EXTMIN` و`$EXTMAX` بعد التحويل الفعلي.
- تحقق من نصف قطر الدائرة واتجاه زوايا ARC بعد عكس Y.

### جودة هندسية

- أزل النقاط المتكررة.
- أزل القطع ذات الطول الصفري.
- لا تكرر أول نقطة في Polyline مغلقة إذا كان Group Code 70 يحتوي على Closed Flag.
- استخدم دقة عددية ثابتة لا تقل عن 4 منازل عشرية.
- لا تُصدر Polygon بعدد نقاط أقل من 3 كـClosed Polyline.
- لا تُصدر Line بنقطتين متماثلتين.
- لا تسمح بقيم `NaN` أو `Infinity`.

### مسار الحفظ

- تحقق أن `generateDXF` يعيد نصاً غير فارغ.
- استخدم UTF-8 أو ASCII متوافقاً مع النص المصدر.
- لا تعتمد على `Blob` وحده في Android WebView إذا كان جسر Android هو المسار الرسمي.
- تحقق من انتقال المحتوى كاملاً من React إلى Kotlin.
- تحقق من Base64 أو ArrayBuffer دون قص أو padding غير صحيح.
- تحقق من اسم الملف وامتداده وMIME type.
- إذا فشل MediaStore، اعرض رسالة الخطأ الحقيقية وسجّل السبب.

---

## المرحلة 3: تحسين الرؤية الحاسوبية

### Pipeline عام

نفّذ pipeline واضحاً وقابلاً للتتبع:

1. قراءة الصورة والتحقق من الأبعاد.
2. تحديد نوع الصورة.
3. تصغير الصورة إلى حد معالجة آمن مع حفظ `invScale`.
4. تحويل الألوان أو grayscale عند الحاجة.
5. Bilateral Filter لحفظ الحواف.
6. Sauvola أو threshold مناسب حسب نوع الصورة.
7. Morphological opening لإزالة النقاط الصغيرة.
8. Morphological closing لردم الفجوات الصغيرة.
9. Connected Components مع 8-connectivity.
10. Watershed للمناطق المتلامسة عند الحاجة.
11. استخراج الحدود.
12. إزالة القطع الضعيفة والمتكررة.
13. Simplification باستخدام RDP.
14. Orthogonalization للمباني والمخططات عند تفعيلها.
15. Topology validation.
16. إنتاج CAD features مع confidence وmetadata.

### الصور الجوية

- حسّن تصنيف المباني بحيث لا يعتمد على Thresholds ثابتة وحدها.
- استخدم تطبيعاً للإضاءة أو contrast normalization عند اختلاف ظروف التصوير.
- ميّز بين الظلال والأسطح الداكنة بحذر.
- لا تصنف كل منطقة منخفضة التشبع على أنها طريق.
- استخدم Connected Components بعد التنظيف وليس قبلَه.
- أزل البقع الصغيرة قبل Watershed.
- احتفظ بحد أدنى للمساحة قابلاً للضبط من إعدادات المستخدم.

### المخططات والرسومات

- استخدم Sauvola بحدود آمنة للنافذة و`k` وDynamic Range.
- تعامل مع الخلفيات الزرقاء أو المصفرّة قبل threshold.
- احذف speckles الصغيرة.
- افصل الخطوط المتجاورة عند الإمكان.
- حافظ على الجدران المغلقة كـClosed Polylines.
- لا تحول أي noise إلى جدار.

### Native OpenCV

- اجعل تحميل المكتبة اختيارياً وآمناً.
- لا تشغّل smoke tests الثقيلة في `onCreate`.
- لا تُنفّذ معالجة الصور الثقيلة على UI thread.
- استخدم DirectByteBuffer مع فحص:
  - null buffer.
  - capacity.
  - width وheight.
  - channels.
  - overflow في `width * height`.
- ضع حدوداً قصوى للذاكرة.
- تعامل مع `cv::Exception` و`std::exception` وكل فشل متوقع.
- لا تسمح بانهيار العملية بسبب إدخال صورة غير صالح.
- وفّر fallback TypeScript إذا تعذر Native.

---

## المرحلة 4: الاختبارات الإلزامية

### اختبارات TypeScript

- `npm run lint`
- `npm run build`
- اختبارات geometry.
- اختبارات topology.
- اختبار DXF sample.
- اختبار الوحدات.
- اختبار الطبقات غير المعرفة مسبقاً.
- اختبار النقاط المتكررة.
- اختبار ARC وCIRCLE وTEXT.

### اختبار DXF بنيوي

أنشئ fixture يحتوي على:

- Layer BUILDINGS.
- Layer باسم غير صالح يحتاج إلى تنظيف.
- Closed LWPOLYLINE.
- Open LWPOLYLINE.
- LINE.
- CIRCLE.
- ARC.
- TEXT.

تحقق آلياً من:

- وجود الأقسام المطلوبة.
- وجود `AC1027`.
- وجود `$INSUNITS` الصحيح.
- وجود كل الطبقات المستخدمة.
- عدم وجود Entity على Layer غير معرفة.
- عدم وجود `NaN` أو `Infinity`.
- وجود `EOF` في النهاية.
- تطابق عدد الكيانات المتوقع.

### Golden Dataset

استخدم صوراً مرجعية اصطناعية وحقيقية مصغرة تتضمن:

- مبنى مستطيل.
- مبنيين متلامسين.
- طريقاً مستقيماً ومنحنياً.
- ضوضاء نقطية.
- مخططاً بخلفية غير متجانسة.
- صورة زرقاء Blueprint.

احفظ checksums والنتائج المرجعية، ولا تغيّرها إلا مع توثيق السبب.

### اختبار Android

تحقق من:

- Android 10.
- Android 14.
- arm64-v8a.
- armeabi-v7a إن كان مدعوماً.
- x86_64 عند الحاجة.
- فتح التطبيق دون Native Core.
- فتح التطبيق مع OpenCV.
- استيراد صورة.
- تشغيل المعالجة.
- تصدير DXF.
- حفظ DXF في Downloads.
- عدم الإغلاق عند صورة كبيرة أو تالفة.

---

## المرحلة 5: تجربة المستخدم والرسائل

عند نجاح التصدير اعرض:

- اسم الملف.
- مكان الحفظ.
- عدد الكيانات.
- عدد الطبقات.
- الوحدة المستخدمة.
- تحذيرات الجودة إن وجدت.

عند الفشل اعرض رسالة مفهومة بالعربية والإنجليزية، مع رقم خطأ داخلي مثل:

- `DXF_EMPTY_OUTPUT`
- `DXF_INVALID_LAYER`
- `DXF_INVALID_GEOMETRY`
- `DXF_SAVE_FAILED`
- `NATIVE_UNAVAILABLE`
- `IMAGE_TOO_LARGE`

لا تعرض للمستخدم رسالة عامة مثل "حدث خطأ" دون تسجيل السبب التقني.

---

## المرحلة 6: GitHub Actions والتسليم

يجب أن يحتوي Workflow على:

1. Checkout.
2. Node.js.
3. تثبيت الاعتماديات.
4. TypeScript check.
5. Golden benchmark.
6. DXF validation.
7. Web build.
8. نسخ web assets إلى Android.
9. JDK.
10. Android SDK وNDK وCMake.
11. OpenCV ثابت الإصدار.
12. Build Debug APK.
13. Build Release APK.
14. Verify APK.
15. Verify Native libraries.
16. Upload Artifact.

لا تعلن أن APK Production موقّع إلا إذا تم استخدام Keystore Production فعلي من GitHub Secrets. عند غياب Secret يجب تسمية الملف بوضوح `preview` أو `debug-signed`.

---

## قواعد مهمة

- لا تحذف النسخة TypeScript قبل إثبات تطابق Native على Golden Dataset.
- لا تدّعِ أن DXF يعمل في AutoCAD إلا بعد فتحه أو تمريره إلى validator حقيقي.
- لا تعتبر نجاح Gradle دليلاً على نجاح التشغيل على الهاتف.
- لا تنفّذ معالجة ثقيلة على UI thread.
- لا تُخفي الاستثناءات دون Log واضح.
- لا تستخدم بيانات تجريبية ثابتة بدلاً من الصورة الفعلية.
- لا تغيّر تنسيق الإحداثيات دون توثيق محور Y والوحدات.
- حافظ على backward compatibility للمشاريع المحفوظة.
- نفّذ كل مرحلة بتغيير صغير قابل للاختبار.
- بعد كل إصلاح أعد تشغيل lint وbuild والاختبار المناسب.

---

## معايير القبول النهائية

لا يُعتبر التطبيق نهائياً إلا إذا تحققت كل النقاط التالية:

- يفتح التطبيق من دون crash.
- يستورد صورة حقيقية من الهاتف.
- ينتج features مرتبطة فعلياً بالصورة.
- يعرض الميزات على Canvas.
- يمكن تعديل وحذف الميزات.
- يمر DXF عبر الاختبار البنيوي.
- يحتوي DXF على طبقات صحيحة وكيانات صحيحة ووحدات صحيحة.
- يُفتح DXF في برنامج CAD متوافق دون إصلاح يدوي.
- يتم حفظ DXF في الهاتف ويمكن مشاركته.
- Native OpenCV يعمل عند توفره.
- Fallback يعمل عند تعذر Native.
- لا يغلق التطبيق بسبب صورة كبيرة أو مدخل غير صالح.
- ينجح GitHub Actions بالكامل.
- يتم تسليم APK وCommit وRun URL وتقرير الاختبارات.

## صيغة تقرير التسليم

في نهاية التنفيذ أرسل تقريراً يتضمن:

- ما تم تغييره.
- ما تم اختباره.
- نتائج كل اختبار.
- إصدار APK.
- `minSdk` و`targetSdk`.
- هل التوقيع Preview أم Production.
- رابط GitHub Actions.
- رابط Artifact.
- القيود المعروفة.
- الخطوات المطلوبة لتجربة DXF على الهاتف.
