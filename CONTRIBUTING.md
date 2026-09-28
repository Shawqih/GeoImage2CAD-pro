# إرشادات المساهمة في مشروع GeoImage2CAD Pro

نشكر اهتمامك بالمساهمة في تطوير تطبيق GeoImage2CAD Pro!

## قواعد المساهمة
1. قم بإنشاء فرع جديد للميزة أو الإصلاح:
   `git checkout -b feature/ortho-regularization`
2. التزم بنمط التصميم Clean Architecture + MVVM.
3. تأكد من سلامة اختبارات Unit Tests وUI Tests:
   `./gradlew test`
4. استخدم رسائل Commit دقيقة ومنظمة:
   `git commit -m "feat(cv): enhance building orthogonalization algorithm"`
5. افتح Pull Request موثق بالتفاصيل والنتائج قبل الدمج في `main`.
