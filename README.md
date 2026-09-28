# GeoImage2CAD Pro 🛰️📐

[![Android CI/CD](https://github.com/developer/geoimage2cad-pro/actions/workflows/android.yml/badge.svg)](https://github.com/developer/geoimage2cad-pro/actions/workflows/android.yml)
[![Kotlin Version](https://img.shields.io/badge/Kotlin-1.9.22-purple.svg)](https://kotlinlang.org)
[![Target SDK](https://img.shields.io/badge/Target%20SDK-34-green.svg)](https://developer.android.com)
[![AutoCAD DXF](https://img.shields.io/badge/DXF-R2013%20Compatible-blue.svg)](https://autodesk.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**GeoImage2CAD Pro** هو محرك هندسي متكامل ومحلي (On-Device Computer Vision, AI & CAD Engine) مخصص لتحويل الصور الجوية (Drone)، صور الأقمار الصناعية، الخرائط المساحية (Cadastral Maps)، ومسح المخططات الهندسية (Blueprints & Scans) إلى مخططات هندسية Vector حقيقية متعددة الطبقات قابلة للتحرير والتصدير إلى AutoCAD وCivil 3D وQGIS وArcGIS.

---

## 🌟 الميزات الهندسية الأساسية (Key Features)

- **100% On-Device & Offline**: معالجة محلية بالكامل على جهاز المستخدم دون إرسال الصور لأي خادم سحابي، مما يضمن أقصى درجات السرية والخصوصية.
- **Image Type Auto-Classification**: كاشف تلقائي يتعرف على نوع الصورة (Drone Aerial, Satellite Ortho, Scanned Blueprint, Architectural Plan) ويحدد الـ Pipeline المناسب فوراً.
- **Building Orthogonalization**: خوارزمية ذكية لاكتشاف زوايا المباني وتقويمها هندسياً لزوايا 90° قائمة حقيقية مطابقة لمواصفات الـ CAD بدلاً من الخطوط المتعرجة الناتجة عن البكسل.
- **Road Skeletonization & Centerlines**: استخراج مساحات الطرق، حدودها الجانبية، ومحاور المسارات الوسطية (Medial Axis Thinning).
- **Tree & Water Segmentation**: تمييز تيجان الأشجار عبر مؤشرات اللون الأخضر الفائض (Excess Green) وتحويلها إلى دوائر/نقاط، واكتشاف المسطحات المائية.
- **Real AutoCAD DXF Engine (R2013 / AC1027)**: تصدير ملفات DXF قياسية حقيقية تحتوي على كيانات `LWPOLYLINE` و`LINE` و`CIRCLE` و`ARC` مع طبقات ACI رسمية وأوزان خطوط.
- **GIS Multi-File Shapefile Package (.zip)**: تصدير حزمة Shapefile متكاملة تحتوي على ملفات `.shp` و`.shx` و`.dbf` و`.prj` متوافقة مباشرة مع QGIS وArcGIS.
- **Metric Scale Calibration**: أداة تفاعلية لتحديد المسافة بين نقطتين ومعايرة دقة الأرض الحقيقية (متر/بكسل) وحساب المساحات بـ $m^2$.
- **Full CAD Editor**: أدوات تحديد، نقل، تعديل الرؤوس، إغلاق البولي لاين، قياس المسافات، والتراجع/الإعادة (Undo/Redo).
- **Dual Support**: تطبيق Web تفاعلي فوري + بنية Android Kotlin MVVM كاملة جاهزة للبناء في Android Studio.

---

## 🏗️ هيكلية المشروع (Android Clean Architecture + MVVM)

```
app/
├── data/
│   ├── local/          # Room DB, EncryptedSharedPreferences
│   └── repository/     # CAD Project Repository
├── domain/
│   ├── model/          # CADFeature, CADLayer, Point2D
│   ├── engine/         # GeometryRegularizer, RasterToVectorEngine
│   └── exporters/      # DxfR2013Writer, ShapefileWriter, GeoJsonWriter
├── presentation/
│   ├── ui/             # Jetpack Compose Screens, Interactive Canvas
│   └── viewmodel/      # CadViewModel, StateFlows
└── di/                 # Dagger Hilt Modules
```

---

## 🚀 تعليمات التشغيل في Android Studio

1. **المتطلبات**:
   - Android Studio Hedgehog (2023.1.1) أو أحدث
   - JDK 17
   - Android SDK 34 (الحد الأدنى Android 8.0 / API 26)
2. **بناء المشروع عبر Gradle**:
   ```bash
   ./gradlew assembleDebug
   ./gradlew test
   ./gradlew assembleRelease
   ```

---

## 🛠️ أوامر Git للنشر على GitHub

```bash
git init
git add .
git commit -m "Initial commit: GeoImage2CAD Pro - Production Android & CAD Engine"
git branch -M main
git remote add origin https://github.com/[USERNAME]/[REPO-NAME].git
git push -u origin main
```

---

## 📄 الترخيص (License)
مرخص بموجب رخصة [MIT License](LICENSE).
