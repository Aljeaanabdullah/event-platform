# النشر — Event Platform

## البيئات الحالية

| البيئة                   | المصدر                      | قاعدة البيانات                                    |
| ------------------------ | --------------------------- | ------------------------------------------------- |
| محلي                     | `npm run dev` / `npm start` | `event-platform-dev`                              |
| Vercel Preview (لكل فرع) | أي فرع غير `main`           | `event-platform-dev`                              |
| Vercel Production        | `main`                      | ⚠️ **`event-platform-dev` نفسها** (انظر BLOCKERS) |

## متغيرات البيئة

| المتغير                                         | Production         | Preview | محلي    | سري؟     |
| ----------------------------------------------- | ------------------ | ------- | ------- | -------- |
| `NEXT_PUBLIC_SUPABASE_URL`                      | ✅                 | ✅      | ✅      | لا       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`          | ✅                 | ✅      | ✅      | لا       |
| `NEXT_PUBLIC_SITE_URL`                          | يُفضّل             | اختياري | ✅      | لا       |
| `SUPABASE_SECRET_KEY`                           | **مطلوب**          | مطلوب   | مطلوب   | نعم      |
| `MYFATOORAH_API_KEY` / `_BASE_URL`              | عند الإطلاق        | Sandbox | Sandbox | نعم      |
| `PAYMENT_PROVIDER=mock` + `MOCK_PAYMENT_SECRET` | ❌ ممنوع           | اختياري | ✅      | السر نعم |
| `SHOW_TEST_DATA=1`                              | ❌ ممنوع (يُتجاهل) | اختياري | ✅      | لا       |

> الكود يتجاهل `PAYMENT_PROVIDER=mock` و`SHOW_TEST_DATA` في `VERCEL_ENV=production` حتى لو ضُبطا بالخطأ.

## خطوات الانتقال إلى Production بأمان

1. **قاعدة بيانات مستقلة للإنتاج**: مشروع Supabase جديد، تطبيق كل ملفات `supabase/migrations` بالترتيب، ثم ربطه
   بـ Vercel Production فقط. أبقِ `event-platform-dev` للتطوير والمعاينة وبيانات الاختبار.
2. شغّل `supabase/tests/database.test.sql` و`supabase/tests/phases-6-8.test.sql` على قاعدة التطوير (يجب `failed=0`).
3. اضبط `SUPABASE_SECRET_KEY` في Production و Preview (من لوحة Supabase، لا تلصقه في أي محادثة).
4. عيّن أول مدير يدويًا عبر SQL Editor (انظر `docs/DATABASE.md`).
5. Google OAuth: أضف روابط `…/auth/callback` للنطاق الرسمي والمعاينة في Supabase.
6. الدفع: اختبر MyFatoorah Sandbox كاملًا (نجاح/فشل/إلغاء/Webhook) قبل أي مفتاح Live. لا تفعّل Live قبل موافقة صريحة.
7. اضبط `NEXT_PUBLIC_SITE_URL` على النطاق الرسمي.
8. اجعل المستودع خاصًا على GitHub.
9. راجع `BLOCKERS.md` — يجب أن تكون البنود الحرجة مغلقة.

## مراقبة النشر

- كل Push لفرع ينشئ Preview تلقائيًا؛ عند الفشل راجع Build Logs في Vercel.
- البناء لا يحتاج أي متغيرات بيئة (الصفحات تتعامل مع غيابها)، لكن الوظائف تحتاجها وقت التشغيل.
