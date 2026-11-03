# العوائق والقرارات التي تحتاج تدخّلك

> يُحدَّث مع كل مرحلة. كل بند هنا لم يُنفَّذ لأنه يحتاج صلاحية أو مفتاحًا أو موافقة منك.
> لا يحتوي هذا الملف أي أسرار.

## 🔴 حرج قبل الإطلاق

### 1. Production وبيئة التطوير يستخدمان قاعدة البيانات نفسها

- اكتُشف في Phase 5: نشر Production الحالي (`event-platform-80yk2wpuj…`) يستخدم مشروع Supabase
  **`event-platform-dev`** (`cfzupsclmcpwgvumyvaq`) — نفس قاعدة بيانات التطوير (تم التحقق من رابط Supabase
  العام داخل ملفات JavaScript المنشورة).
- **ما فعلته لحماية الإنتاج:**
  - كل الـ Migrations الجديدة **إضافية فقط** (دوال وأعمدة جديدة) ولا تكسر الكود المنشور حاليًا.
  - بيانات الاختبار مُعلَّمة `organizers.is_test = true` و**لا تظهر في الموقع العام أبدًا** في Production
    (تُعرض فقط عند `SHOW_TEST_DATA=1` وخارج `VERCEL_ENV=production` — حماية مزدوجة).
  - الإحصائيات العامة (`get_platform_stats`) تستبعد بيانات الاختبار.
  - **لم يُنشأ أي حساب مدير** في هذه القاعدة؛ مسارات الإدارة والدفع تُختبر بـ SQL داخل معاملات تُلغى.
- **تقدّم (2026-11-03):** أُنشئ مشروع إنتاج مستقل **`event-platform-prod`** (`dnmruaqryzqvfhhiltvq`،
  eu-central-1، الخطة المجانية $0) وطُبّقت عليه كل ملفات `supabase/migrations` الـ12 بالترتيب. القاعدة فارغة
  (لا مستخدمين ولا فعاليات ولا بيانات اختبار) — فقط التصنيفات الـ12 وإعدادات المنصة الافتراضية. RLS مفعّل على كل
  الجداول، وتنبيهات Security Advisor مطابقة لقاعدة التطوير (دوال SECURITY DEFINER تتحقق من الصلاحية داخليًا).
- **المتبقي — يحتاج موافقتك لأنه يغيّر إعدادات Production:**
  1. في Vercel → Environment Variables (**Production فقط**): `NEXT_PUBLIC_SUPABASE_URL=https://dnmruaqryzqvfhhiltvq.supabase.co`
     و`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` و`SUPABASE_SECRET_KEY` من لوحة المشروع الجديد. أبقِ Preview/Development
     على `event-platform-dev`.
  2. في المشروع الجديد: Authentication → URL Configuration (Site URL + Redirect URLs للنطاق الرسمي)، وتفعيل
     Google Provider بنفس بيانات OAuth، وتفعيل Leaked Password Protection.
  3. إعادة نشر Production. ⚠️ الموقع سيظهر فارغًا (لا فعاليات) والمستخدمون الحاليون في قاعدة التطوير لن ينتقلوا —
     إن كان هناك مستخدمون حقيقيون فعلًا فالنقل يحتاج قرارًا منفصلًا.
  4. تعيين أول مدير في المشروع الجديد يدويًا (انظر `docs/DATABASE.md`).
- بعد التبديل يمكن إعادة السماح بالـ Migrations على قاعدة التطوير (البند 2b).
- لحذف بيانات الاختبار في أي وقت: `node --env-file=.env.local scripts/seed-test-data.mjs --remove` ثم نفّذ الناتج
  في SQL Editor (يحذف فقط `is_test` ومستخدمي `e2e00000-*`).

### 2. `SUPABASE_SECRET_KEY` غير موجود محليًا ولا في Vercel Preview

- مطلوب لـ: تأكيد الدفع عبر Webhook (`confirm_order_payment` متاحة لـ service_role فقط)، Rate limiting
  في الإنتاج، واختبارات E2E التي تنشئ مستخدمين.
- **بدونه:** الدفع المدفوع لا يكتمل (الطلب يبقى بانتظار الدفع ثم ينتهي بعد 15 دقيقة ويُحرَّر المخزون تلقائيًا)،
  والتذاكر المجانية تعمل بالكامل لأنها لا تحتاجه.
- **المطلوب:** أضفه بنفسك إلى `.env.local` وإلى Vercel (Preview أولًا) من
  Supabase Dashboard → Project Settings → API Keys → Secret keys. لا تلصقه في المحادثة.

### 2b. تطبيق Migrations جديدة متوقف الآن (حماية Production)

- بعد اكتشاف أن قاعدة التطوير هي نفسها قاعدة Production، **رفض نظام الصلاحيات تطبيق أي Migration إضافي**
  (وهذا صحيح: موافقتك كانت على قاعدة تطوير فقط). المطبَّق فعليًا قبل ذلك: Migrations المراحل 5–8 الأربعة
  (`event_discovery`, `organizer_tools`, `checkin_by_code`, `payments_sandbox`) — كلها إضافية ومتوافقة.
- لم يُطبَّق: عمود `events.max_attendees` (الحد الأقصى للحضور كحقل مستقل). البديل المنفَّذ: السعة = مجموع كميات
  أنواع التذاكر، تُعرض وتُتحقق في نموذج الإنشاء. يمكن إضافته لاحقًا بعد فصل قاعدة الإنتاج.
- **القرار لك:** إما فصل قاعدة الإنتاج (البند 1) ثم السماح بالـ Migrations على قاعدة التطوير، أو اعتماد تطبيقها هنا صراحةً.

### 2c. اختبارات SQL للمراحل 6–8 مكتوبة لكنها لم تُنفَّذ

- [`supabase/tests/phases-6-8.test.sql`](supabase/tests/phases-6-8.test.sql): صلاحيات المنظّم والمدير، الإشعارات، سجل التدقيق،
  عزل بيانات الاختبار، الحجز، التحقق بالرمز، وجلسات الدفع. تعمل داخل معاملة تُلغى بالكامل (لا تترك أثرًا).
- **لم تُشغَّل**: نظام الصلاحيات رفض تنفيذ SQL مباشرة على قاعدة البيانات لأنها قاعدة Production أيضًا.
- نفس المسارات مُغطّاة جزئيًا عبر اختبارات E2E من خلال التطبيق (بحسابات وبيانات `is_test` فقط).
- **المطلوب:** تشغيل الملف في SQL Editor على قاعدة تطوير منفصلة (أو بموافقتك هنا). النتيجة المتوقعة: `TEST_SUMMARY ... failed=0`.

### 2d. مسار المدير في الواجهة لم يُختبر E2E

- صفحات `/admin/events` و`/admin/organizers` مبنية ومحمية (404 لغير المدير — مُختبر)، لكن لا يوجد حساب مدير
  في بيانات الاختبار عمدًا (لم أمنح صلاحية مدير على قاعدة يستخدمها Production). منطق الاعتماد/الرفض نفسه مُغطّى في اختبارات SQL أعلاه.

## 🟠 مفاتيح وإعدادات خارجية

### 3. مفاتيح MyFatoorah Sandbox (Phase 8)

- التكامل مكتوب حسب التوثيق الرسمي، **لكنه لم يُختبر مع خادم MyFatoorah الحقيقي** لعدم توفر مفتاح.
- المطلوب: `MYFATOORAH_API_KEY` (مفتاح الـ Sandbox من بوابة MyFatoorah التجريبية) و`MYFATOORAH_BASE_URL`
  (`https://apitest.myfatoorah.com`)، ثم ضبط Webhook V2 في البوابة إلى `/api/payments/webhook/myfatoorah`.
- الاختبارات الآلية تستخدم مزوّدًا وهميًا (`mock`) منفصلًا ومعطّلًا في Production.

### 4. رابط Google OAuth للمعاينة

- أضف `https://<preview-domain>/auth/callback` إلى Supabase → Authentication → URL Configuration.

## 🟡 ملاحظات

- المستودع على GitHub **عام**. يُنصح بجعله خاصًا (الإعدادات → Danger Zone).
- `NEXT_PUBLIC_SITE_URL` غير مضبوط في Production؛ الكود يستخدم عنوان Vercel تلقائيًا، لكن يُفضّل ضبطه على النطاق الرسمي.
