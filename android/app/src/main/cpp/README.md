# Native Core

هذه النواة هي نقطة البداية الرسمية لنقل الحسابات الثقيلة من TypeScript إلى C++17 عبر Android NDK.

## العمليات الحالية

- `polygonMetrics`: مساحة ومحيط مضلع CAD.
- `analyzeRgba`: متوسط الإضاءة وكثافة الحواف الأساسية من DirectByteBuffer.
- `version`: فحص تحميل المكتبة داخل التطبيق.

## المسار التالي

1. نقل `geometryRegularizer.ts` إلى هذا المجلد.
2. إضافة OpenCV Android إلى `CMakeLists.txt`.
3. نقل segmentation وwatershed إلى `cv::Mat`.
4. إضافة GoogleTest وgolden fixtures.
5. تمرير الصور عبر DirectByteBuffer أو AHardwareBuffer دون نسخ متكرر.
