# خطة نقل Production إلى `event-platform-prod`

> أُعدّت في 2026-11-03. **لم يُنفَّذ منها شيء على Production** — كل خطوة تغيّر Production تنتظر موافقتك وتُنفَّذ يدويًا
> من لوحتك. لا يحتوي هذا الملف أي أسرار.

## 1) نتائج الفحص (قراءة فقط)

| البند                    | النتيجة                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| استقلال المشروع          | `event-platform-prod` = `dnmruaqryzqvfhhiltvq` (خادم `db.dnmruaqryzqvfhhiltvq.supabase.co`) ≠ dev `cfzupsclmcpwgvumyvaq`  |
| الـ Migrations           | 12/12 مسجّلة بنفس الأسماء والترتيب كما في `supabase/migrations`                                                           |
| RLS                      | مفعّل على كل الجداول الـ20 (0 بدون RLS)، 46 سياسة على `public` و6 على `storage`                                           |
| الحاويات                 | `event-media` (عامة) و`org-docs` (خاصة)                                                                                   |
| المهام المجدولة          | `release-expired-holds` كل دقيقة، `cleanup-rate-limits` يوميًا — فعّالتان                                                 |
| الإعدادات                | عمولة 500 bps (5%)، رسوم المشتري 0، الحجز 15 دقيقة، KWD                                                                   |
| بيانات الاختبار في prod  | **صفر**: 0 مستخدمين، 0 منظّمين (و0 `is_test`)، 0 فعاليات/طلبات/تذاكر/مدفوعات، 0 ملفات في Storage                          |
| بيانات حقيقية في dev     | **لا شيء يحتاج نقلًا**: 4 مستخدمين كلهم حسابات اختبار، 0 منظّمين/فعاليات/طلبات حقيقية، 0 مدفوعات عبر مزوّد حقيقي          |
| Security Advisor (prod)  | مطابق لـ dev: تحذيرات دوال SECURITY DEFINER مقصودة (كل دالة تتحقق من الصلاحية داخليًا) + `rate_limits` بلا سياسات (مقصود) |
| Leaked Password Protect. | **متاحة فقط في خطة Pro** (توثيق Supabase). المشروعان على الخطة المجانية فلا يمكن تفعيلها الآن                             |

### متغيرات Vercel الحالية (أسماء فقط — لم تُقرأ أي قيمة)

- **Production**: كلها مُدارة بتكامل Supabase في Vercel (`configurationId: icfg_iYRj…`) ومربوطة بـ **dev**:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_JWT_SECRET`, `POSTGRES_*` (7 متغيرات).
- **Preview**: `NEXT_PUBLIC_SUPABASE_URL` و`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` فقط (يدويان، dev). لا يوجد
  `SUPABASE_SECRET_KEY` في Preview.
- غير موجود في Production: `NEXT_PUBLIC_SITE_URL` (الكود يستخدم `VERCEL_PROJECT_PRODUCTION_URL` تلقائيًا = النطاق
  الحالي)، `MYFATOORAH_*`، `PAYMENT_PROVIDER` — وهذا صحيح الآن.
- **ما يقرأه الكود فعلًا من Supabase**: `NEXT_PUBLIC_SUPABASE_URL`، `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`،
  `SUPABASE_SECRET_KEY` فقط. البقية (`POSTGRES_*`, `SERVICE_ROLE`, `JWT_SECRET`…) غير مستخدمة.

> ⚠️ لأن متغيرات Production يديرها التكامل، تعديلها يدويًا قد يُعاد كتابته عند مزامنة التكامل. لذلك الخطة تفصل التكامل
> عن Production أولًا ثم تضيف المتغيرات الثلاثة يدويًا.

### Production الحالي (هدف التراجع)

- النطاق: `event-platform-one-fawn.vercel.app` (لا يوجد نطاق مخصّص).
- آخر نشر ناجح: `dpl_oqua2h3KYFCMR3WaRE1p2g1pjFqz` (`event-platform-80yk2wpuj…`، commit `0d89848` = دمج PR #1).

## 2) قبل البدء (يدويًا في لوحة `event-platform-prod`)

### حالة بوابة المصادقة (فحص 2026-11-03 عبر `GET /auth/v1/settings` العام — بلا مفاتيح سرية)

| الإعداد                          | prod                                      | dev       | ملاحظة                                                                |
| -------------------------------- | ----------------------------------------- | --------- | --------------------------------------------------------------------- |
| Email provider                   | مفعّل                                     | مفعّل     |                                                                       |
| تأكيد البريد مطلوب (autoconfirm) | نعم                                       | نعم       | التسجيل يعتمد على وصول رسالة التأكيد ← يحتاج SMTP                     |
| Google provider                  | **معطّل**                                 | **معطّل** | لم يُفعَّل في dev أيضًا: زر Google في Production الحالي لا يعمل أصلًا |
| SMTP / Site URL / Redirect URLs  | لا يظهر في الـ API العام — يُؤكَّد يدويًا |           |                                                                       |

**الشرط المتفق عليه:** لا تبدأ المرحلة A قبل إكمال البنود 1 و4 أدناه على الأقل (URL Configuration + SMTP).
Google (البندان 2–3) مطلوب إن أردت تسجيل الدخول به عند الإطلاق، وليس تراجعًا عن الوضع الحالي.

1. **Authentication → URL Configuration**
   - Site URL: `https://event-platform-one-fawn.vercel.app`
   - Redirect URLs:
     - `https://event-platform-one-fawn.vercel.app/auth/callback`
     - `https://event-platform-one-fawn.vercel.app/auth/confirm`
   - لا تضف روابط Preview أو localhost هنا (تبقى في dev).
2. **Authentication → Sign In / Providers → Google**: فعّله بنفس Client ID/Secret، أو (أفضل) أنشئ OAuth Client
   منفصلًا للإنتاج.
3. **Google Cloud Console** (نفس الـ Client أو الجديد):
   - Authorized redirect URIs: أضف `https://dnmruaqryzqvfhhiltvq.supabase.co/auth/v1/callback`
   - Authorized JavaScript origins: `https://event-platform-one-fawn.vercel.app`
   - إن كانت شاشة الموافقة في وضع Testing فلن يدخل إلا المستخدمون المضافون كـ Test users.
4. **Authentication → Emails → SMTP Settings**: ⚠️ **ضروري لمستخدمين حقيقيين.** بدون SMTP مخصّص، Supabase لا يرسل
   رسائل التأكيد واستعادة كلمة المرور إلا لأعضاء فريق المشروع، وبحد رسالتين في الساعة. اربط مزوّد بريد
   (Resend / Postmark / SES…).
5. **Authentication → Email Templates** (إن عدّلتها في dev): انقل نفس القوالب، خصوصًا قالب `/auth/confirm`
   (انظر `docs/AUTH.md`).
6. **Leaked Password Protection**: يحتاج ترقية المشروع إلى Pro. إن بقيت على المجاني فاضبط على الأقل
   Authentication → Providers → Email: حد أدنى 8 أحرف + أحرف وأرقام.
7. اكتب جانبًا (خارج Git والمحادثة): Publishable key وSecret key من Project Settings → API Keys.

## 3) خطة النقل — مرحلتان منفصلتان

نقسمها حتى يكون لكل خطوة تراجع بسيط وسبب فشل واضح.

### المرحلة A — تبديل قاعدة البيانات مع الكود الحالي في `main`

كود `main` (Phase 4) يعمل على المخطط الجديد لأنه مخطط أشمل (نفس الجداول + إضافات).

1. افصل ربط تكامل Supabase بين مشروع **dev** ومشروع Vercel `event-platform`
   (لوحة Supabase لمشروع `event-platform-dev` → Project Settings → Integrations → Vercel → إزالة الربط، أو Vercel →
   Integrations → Supabase → Manage). **لا تُزِل تثبيت التكامل نفسه من الفريق.**
   - أثر الفصل (مُتحقَّق منه): التكامل `icfg_iYRj…` (Supabase، `projectSelection: all`) أنشأ 16 متغيرًا **كلها لبيئة
     Production فقط** في `event-platform`. Preview يستخدم متغيرين يدويين (غير مُدارين) يشيران إلى dev، وDevelopment
     بلا متغيرات (التطوير المحلي يقرأ `.env.local` = dev)، ومشروع Vercel الآخر `codedclub` بلا أي متغيرات.
     ⇐ الفصل لا يغيّر Preview ولا Development ولا `codedclub`.
   - تحقّق بعده أن متغيرات Production المُدارة اختفت (وإن بقيت، احذف `NEXT_PUBLIC_SUPABASE_URL`
     و`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` و`SUPABASE_SECRET_KEY` من Production فقط).
   - ⚠️ من هنا حتى الخطوة 3 لا تُنشر أي نسخة Production (لا Push إلى `main`). الموقع الحالي يبقى يعمل لأن النشر
     القائم يحتفظ بمتغيراته وقت بنائه.
2. Vercel → Settings → Environment Variables → أضف لـ **Production فقط**:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://dnmruaqryzqvfhhiltvq.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = المفتاح العام للمشروع الجديد
   - `SUPABASE_SECRET_KEY` = المفتاح السري للمشروع الجديد (Sensitive)
   - لا تضف `PAYMENT_PROVIDER` ولا `MOCK_PAYMENT_SECRET` ولا `SHOW_TEST_DATA` ولا أي `MYFATOORAH_*` Live.
3. Deployments → آخر نشر Production → **Redeploy** مع إلغاء "Use existing Build Cache"
   (متغيرات `NEXT_PUBLIC_*` تُدمج وقت البناء — لا يكفي تغيير المتغير بدون بناء جديد).
4. نفّذ اختبارات ما بعد النشر (القسم 4). إن نجحت انتقل للمرحلة B.

### المرحلة B — دمج PR #2

1. ادمج PR #2 في `main` → Vercel ينشر Production تلقائيًا (بالمتغيرات الجديدة).
2. اختبارات ما بعد النشر مرة أخرى + فحوص Phases 5–8 في القسم 4.
3. عيّن أول مدير (بعد أن تسجّل دخولك في الموقع مرة واحدة) من SQL Editor في **prod**:
   `update public.profiles set platform_role = 'admin' where email = '<بريدك>';`

## 4) اختبارات ما بعد النشر (بدون أي دفع حقيقي)

| الفحص                                                                   | المتوقع                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------- |
| فتح `/ar` و`/en`                                                        | الصفحة تعمل، الإحصائيات أصفار، لا فعاليات         |
| DevTools → Network: الطلبات تذهب إلى `dnmruaqryzqvfhhiltvq.supabase.co` | لا يظهر `cfzupsclmcpwgvumyvaq` إطلاقًا            |
| `/robots.txt`                                                           | يسمح بالفهرسة (Production)                        |
| تسجيل حساب بالبريد                                                      | تصل رسالة التأكيد (يتطلب SMTP) ورابطها على النطاق |
| الدخول بـ Google                                                        | يعود إلى `/auth/callback` ثم الحساب               |
| في SQL Editor (prod): `select count(*) from auth.users`                 | زاد بعدد حساباتك التجريبية فقط                    |
| `POST /api/payments/webhook/mock` (بعد المرحلة B)                       | 404 — المزوّد الوهمي مقفول في Production          |
| صفحة فعالية غير موجودة `/ar/events/x`                                   | 404                                               |
| Vercel → Logs                                                           | لا أخطاء 500                                      |

## 5) خطة التراجع (Rollback)

| المشكلة                            | الإجراء                                                                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| فشل البناء في المرحلة A أو B       | لا شيء ينكسر: Vercel يبقي النشر الحالي يعمل. صحّح وأعد المحاولة.                                                             |
| مشكلة في تسجيل الدخول فقط          | غالبًا URL Configuration أو Google redirect URI — صحّحها في اللوحة، لا حاجة لإعادة نشر.                                      |
| مشكلة بعد المرحلة B فقط (DB سليمة) | Instant Rollback إلى نشر المرحلة A (نفس قاعدة prod، كود `main` السابق)، ثم Revert لدمج PR #2 في GitHub. المتغيرات لا تتغيّر. |
| الموقع لا يعمل بعد المرحلة A       | التراجع الكامل أدناه (نشر + متغيرات + ربط Supabase).                                                                         |

### التراجع الكامل للمرحلة A — بالترتيب

1. **النشر (فوري):** Deployments → `dpl_oqua2h3KYFCMR3WaRE1p2g1pjFqz` → Instant Rollback. هذا النشر مبني على dev
   ومتغيراته محفوظة معه، فيعود الموقع كما كان خلال ثوانٍ.
   - بعد Instant Rollback يوقف Vercel الترقية التلقائية للنشرات الجديدة إلى Production حتى تُرقّي نشرًا يدويًا —
     وهذا مفيد هنا: لا يُنشر شيء بالخطأ قبل إصلاح المتغيرات.
2. **حالة البيانات قبل أي تغيير:** في prod: `select count(*) from auth.users;` و`select count(*) from public.orders;`.
   إن وُجد مستخدمون أنشأوا حسابات خلال النافذة فهم لن يظهروا في dev — سجّل العدد، **لا تحذف** قاعدة prod.
3. **المتغيرات:** احذف من Production فقط المتغيرات الثلاثة اليدوية (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`).
4. **ربط Supabase:** أعد ربط تكامل Supabase بين `event-platform-dev` ومشروع Vercel `event-platform`
   (نفس مكان الخطوة A-1). تأكد أن المتغيرات المُدارة عادت لـ Production وأن Preview لم يتغيّر.
5. **التحقق:** صفحة الموقع تعمل، وطلبات المتصفح تذهب إلى `cfzupsclmcpwgvumyvaq.supabase.co`.
6. بعد ذلك فقط اسمح بنشرات Production جديدة (Promote/Undo Rollback).

ملاحظات التراجع:

- قاعدة prod جديدة وفارغة: التراجع لا يفقد بيانات قديمة. لكن **أي حساب يُنشأ على prod بعد التبديل لن يظهر إذا
  تراجعت إلى dev** — كلما طالت فترة التشغيل قبل التراجع زاد الأثر.
- لا تحذف `event-platform-dev` ولا بياناته؛ هو هدف التراجع وبيئة Preview.
- المشروع المجاني يتوقف (Pause) بعد أسبوع بلا نشاط، ولا يتضمن نسخًا احتياطية قابلة للاسترجاع لنقطة زمنية.
  قبل إطلاق حقيقي بمستخدمين ومدفوعات: يُنصح بخطة Pro (نسخ احتياطية يومية + Leaked Password Protection).

## 6) خارج نطاق هذا النقل

- لا مفاتيح MyFatoorah Live ولا أي دفع حقيقي. الدفع في Production يبقى معطّلًا (لا مزوّد مضبوط → صفحة الدفع تعرض
  "غير متاح") حتى ينجح اختبار Sandbox كامل بموافقتك.
- لا Payouts.
- `npm audit` (21 تنبيهًا متوسطًا/منخفضًا) — يُراجع في مهمة منفصلة.
