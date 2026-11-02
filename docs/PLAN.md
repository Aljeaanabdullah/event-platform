# Event Platform — التحليل والمعمارية وخطة التنفيذ

> الحالة: **مسودة للمراجعة** — لم يُنفَّذ أي كود بعد. تاريخ: 2026-11-02

---

## 0. نتيجة فحص البيئة الحالية

| العنصر            | الحالة                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| مجلد المشروع      | فارغ تمامًا — لا يوجد مشروع سابق للدمج معه                                                                        |
| Git               | غير مُهيّأ (ليس مستودعًا)                                                                                         |
| GitHub CLI (`gh`) | غير مثبّت (غير ضروري)                                                                                             |
| المستودع البعيد   | `Aljeaanabdullah/event-platform` موجود وفارغ، والوصول عبر SSH يعمل ✅                                             |
| Node.js / npm     | v24.22.1 / 11.19.1 ✅                                                                                             |
| Supabase CLI      | متاح عبر `npx supabase` (v3.0.0) ✅                                                                               |
| Docker            | غير مثبّت ← لا يمكن تشغيل Supabase محليًا                                                                         |
| حساب Supabase     | منظمة واحدة، ومشروع واحد `aljeaanabdullah@gmail.com's Project` (eu-north-1) بحالة **INACTIVE (متوقف)** — لم يُلمس |

---

## 1. تحليل المتطلبات (ملخص)

**المنتج:** Marketplace لحجز تذاكر الفعاليات في الكويت (قابل للتوسع خليجيًا)، ثنائي اللغة (AR/EN) مع RTL كامل، ثلاثة أدوار، دفع حقيقي عبر مزوّد كويتي، وتذاكر QR.

**أهم المخاطر التقنية وكيف نعالجها:**

| الخطر                              | المعالجة                                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| الحجز الزائد مع التزامن            | دالة Postgres واحدة (RPC) تقفل صف نوع التذكرة `FOR UPDATE` + قيد `CHECK (sold + reserved <= total)` + حجز مؤقت بمهلة 15 دقيقة يُحرَّر تلقائيًا عبر `pg_cron` |
| اعتبار الدفع ناجحًا من صفحة النجاح | الحالة لا تتغير إلا من Webhook موقّع **أو** استعلام خادم-لخادم من المزوّد؛ صفحة النجاح تقرأ الحالة فقط                                                       |
| تكرار تنفيذ Webhook                | جدول `payment_events` بمفتاح فريد على معرّف حدث المزوّد + دالة تأكيد Idempotent                                                                              |
| وصول دفعة بعد انتهاء الحجز المؤقت  | محاولة إعادة الحجز؛ إن نفد المخزون يُعلَّم الطلب `needs_refund` ويُسترجع تلقائيًا                                                                            |
| استخدام التذكرة مرتين              | `UPDATE ... SET status='checked_in' WHERE status='valid' RETURNING` ذرّي                                                                                     |
| تزوير QR                           | QR يحمل رمزًا عشوائيًا 256-bit لا يُخمَّن؛ قاعدة البيانات تخزن **hash** الرمز فقط                                                                            |
| ترقية الصلاحيات من الواجهة         | عمود الدور محمي بصلاحيات أعمدة + Trigger؛ لا يغيّره إلا Admin عبر دالة خادم مع Audit Log                                                                     |
| العملة KWD بثلاث خانات عشرية       | كل المبالغ تُخزَّن كأعداد صحيحة بالـ **فلس** (`bigint`، 1 د.ك = 1000 فلس) — لا `float` إطلاقًا                                                               |
| تقسيم المستحقات                    | لا نفترض دعمه؛ نبني **دفتر مستحقات (Ledger)** داخليًا يعمل مع أي مزوّد، ونفعّل التقسيم الآلي لاحقًا فقط إن أكّده حساب التاجر                                 |

---

## 2. المعمارية المقترحة

### 2.1 التقنيات (تُراجَع أحدث الإصدارات المستقرة من التوثيق الرسمي عند بدء Phase 1)

| الطبقة          | الاختيار                                                                   | السبب                                                                      |
| --------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Framework       | **Next.js 16** (App Router) + React 19 + TypeScript strict                 | Server Components و Server Actions تقلل كشف المنطق للعميل                  |
| التنسيق         | **Tailwind CSS v4** + **shadcn/ui**                                        | خصائص منطقية (`ms-`, `pe-`, `start-`) تدعم RTL تلقائيًا                    |
| الثيم           | **next-themes** (`attribute="class"`, `defaultTheme="system"`)             | يحقن سكربت قبل الرسم فيمنع وميض الثيم الخاطئ ويحفظ الاختيار                |
| اللغات          | **next-intl** مع مسار `/[locale]` (`/ar`, `/en`)                           | أفضل دعم لـ App Router + SEO (hreflang) + تنسيق التواريخ والأرقام والعملات |
| الخطوط          | `IBM Plex Sans Arabic` + `Inter` عبر `next/font`                           | تحميل ذاتي بلا طلبات خارجية، ومظهر احترافي باللغتين                        |
| الحركة          | **motion** (Framer Motion سابقًا) باستخدام `LazyMotion`                    | خفيف، ويحترم `prefers-reduced-motion`                                      |
| النماذج         | React Hook Form + **Zod** (نفس المخطط على العميل والخادم)                  | تحقق موحد                                                                  |
| الخلفية         | **Supabase**: Postgres + Auth + Storage + `pg_cron`                        | RLS على كل الجداول                                                         |
| ربط Supabase    | `@supabase/ssr` (جلسات Cookies HttpOnly)                                   | جلسة آمنة تعمل مع Server Components                                        |
| QR              | `qrcode` للتوليد، `@zxing/browser` للمسح بالكاميرا                         | يعمل في المتصفح دون تطبيق                                                  |
| الخرائط         | Leaflet + OpenStreetMap أثناء التطوير (مجاني)، يُحسم المزوّد قبل الإطلاق   | بلا مفتاح API                                                              |
| Rate Limiting   | جدول + دالة في Postgres (بلا خدمة خارجية)                                  | لا اشتراكات إضافية؛ يمكن النقل إلى Upstash لاحقًا                          |
| الاختبارات      | **Vitest** + Testing Library، **Playwright** للـ E2E، اختبارات SQL للـ RLS |                                                                            |
| Package manager | npm (مثبّت لديك)                                                           |                                                                            |

### 2.2 مبادئ البنية

1. **لا منطق حساس على العميل**: الحجز، الأسعار، العمولة، الدفع، إصدار التذاكر، والتحقق من QR — كلها على الخادم/قاعدة البيانات.
2. **ثلاث طبقات وصول لـ Supabase**:
   - `lib/supabase/client.ts` — المتصفح (anon key + RLS).
   - `lib/supabase/server.ts` — Server Components/Actions بجلسة المستخدم (RLS مفعّلة).
   - `lib/supabase/admin.ts` — Service Role، مع `import "server-only"`، يُستخدم **فقط** في Webhooks والمهام الإدارية.
3. **العمليات الحرجة في دوال Postgres** (`SECURITY DEFINER` مع `search_path` ثابت) لضمان الذرّية: `reserve_tickets`, `confirm_order_payment`, `release_expired_holds`, `check_in_ticket`, `request_refund`, `set_user_role`.
4. **طبقة دفع مجرّدة** (Adapter Pattern):
   ```ts
   interface PaymentProvider {
     createPayment(order): Promise<{ providerPaymentId; redirectUrl }>;
     getPaymentStatus(providerPaymentId): Promise<PaymentStatus>;
     verifyWebhook(rawBody, headers): Promise<VerifiedEvent>; // يرفض أي توقيع غير صالح
     refund(payment, amountFils): Promise<RefundResult>;
   }
   ```
5. **Feature folders**: كل ميزة تحوي `actions.ts` (Server Actions)، `queries.ts`، `schemas.ts` (Zod)، و`components/`.

### 2.3 هيكل المجلدات

```
event-platform/
├─ docs/                       # توثيق عربي (هذه الوثيقة، الإعداد، النشر)
├─ messages/ ar.json, en.json  # ملفات الترجمة المنظمة حسب الـ namespace
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/              # كل تغيير على القاعدة = migration مرقّمة
│  ├─ seed.sql                 # بيانات تطوير وهمية فقط (لا تُشغَّل على الإنتاج)
│  └─ tests/                   # اختبارات RLS والدوال
├─ e2e/                        # Playwright
├─ src/
│  ├─ proxy.ts                 # (middleware في Next 16) — اللغة + تحديث الجلسة + حماية المسارات
│  ├─ i18n/ routing.ts, request.ts, navigation.ts
│  ├─ app/
│  │  ├─ [locale]/
│  │  │  ├─ (public)/          # الرئيسية، الفعاليات، التصنيفات، المنظّمون، صفحات ثابتة
│  │  │  ├─ (auth)/            # login, register, forgot-password, reset-password
│  │  │  ├─ checkout/
│  │  │  ├─ account/           # لوحة العميل
│  │  │  ├─ organizer/         # لوحة المنظّم
│  │  │  ├─ admin/             # لوحة المدير
│  │  │  ├─ not-found.tsx, error.tsx
│  │  ├─ auth/callback/route.ts        # OAuth + تأكيد البريد
│  │  ├─ api/webhooks/payments/[provider]/route.ts
│  │  ├─ sitemap.ts, robots.ts, global-error.tsx
│  ├─ components/ ui/ (shadcn), layout/, shared/
│  ├─ features/ events/, booking/, payments/, tickets/, organizer/, admin/, auth/
│  ├─ lib/ supabase/, payments/providers/, money.ts, dates.ts, rate-limit.ts, env.ts, logger.ts
│  └─ types/ database.ts       # مولّد من Supabase
├─ .env.example                # أسماء المتغيرات فقط بلا قيم
```

### 2.4 تدفق الحجز والدفع

```
العميل يختار التذاكر
   │  Server Action: createOrder (Zod + rate limit)
   ▼
RPC reserve_tickets()  ── قفل FOR UPDATE ── فحص المخزون ── reserved += qty
   │  ينشئ order(status=pending_payment, expires_at=now()+15m) + order_items
   │  يحسب السعر والرسوم والعمولة على الخادم (لا يثق بأي سعر من العميل)
   ▼
PaymentProvider.createPayment()  ← payments(status=initiated)
   ▼
تحويل المستخدم لصفحة الدفع (KNET / بطاقات)
   ├──► Webhook موقّع ──► verifyWebhook ──► payment_events (unique) ──► confirm_order_payment()
   │                                                   reserved -= qty, sold += qty، إصدار tickets
   └──► صفحة النتيجة: تستعلم المزوّد من الخادم + تقرأ حالة الطلب (لا تغيّر شيئًا بنفسها إلا عبر نفس الدالة الـ Idempotent)

pg_cron كل دقيقة: release_expired_holds() ── يحرر الحجوزات المنتهية ويجعل الطلب expired
```

### 2.5 الأدوار والصلاحيات

- **Customer**: الافتراضي لكل مستخدم جديد (Trigger ينشئ `profiles` عند التسجيل).
- **Organizer**: ليس عمودًا في الملف الشخصي، بل **عضوية** في `organizer_members` لجهة منظّمة `organizers.status = 'approved'`. أدوار داخلية: `owner`, `manager`, `scanner` (للبوابات فقط).
- **Admin**: `profiles.platform_role = 'admin'`. العمود محجوب عن التعديل من دور `authenticated` (Column privileges + Trigger)، ويُعيَّن أول Admin يدويًا عبر SQL في لوحة Supabase، وبعدها فقط عبر `set_user_role()` المسجّلة في `audit_logs`.
- دوال مساعدة للـ RLS: `is_admin()`, `is_org_member(org_id, roles[])`.

---

## 3. تصميم قاعدة البيانات

كل الجداول: `id uuid primary key default gen_random_uuid()`، `created_at`/`updated_at timestamptz` (Trigger للتحديث)، RLS مفعّل. المبالغ `bigint` بالفلس. الأوقات `timestamptz` وتُعرض بتوقيت `Asia/Kuwait`.

### 3.1 الأنواع (Enums)

```
platform_role:     customer | admin
organizer_status:  pending | approved | rejected | suspended
member_role:       owner | manager | scanner
event_status:      draft | pending_review | published | rejected | cancelled
order_status:      pending_payment | paid | expired | cancelled | refunded | partially_refunded | needs_refund
payment_status:    initiated | pending | succeeded | failed | cancelled | refunded
ticket_status:     valid | checked_in | void
refund_status:     requested | approved | processing | succeeded | failed | rejected
payout_status:     pending | processing | paid | failed
```

### 3.2 الجداول

| الجدول                | الحقول الرئيسية                                                                                                                                                                                                                                                                                                                                | ملاحظات                                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **profiles**          | `id → auth.users`, full_name, phone, avatar_url, preferred_locale, platform_role                                                                                                                                                                                                                                                               | ينشأ تلقائيًا بـ Trigger                                                                                                           |
| **organizers**        | name_ar/name_en, slug ✱, description_ar/en, logo_url, contact_email, phone, commercial_reg_no, status, commission_bps (اختياري يتجاوز الافتراضي), reviewed_by, reviewed_at, rejection_reason                                                                                                                                                   | طلب الانضمام = صف بحالة pending                                                                                                    |
| **organizer_members** | organizer_id, user_id, role                                                                                                                                                                                                                                                                                                                    | `unique(organizer_id, user_id)`                                                                                                    |
| **event_categories**  | slug ✱, name_ar, name_en, icon, sort_order, is_active                                                                                                                                                                                                                                                                                          | 12 تصنيفًا مبدئيًا في migration                                                                                                    |
| **events**            | organizer_id, category_id, slug ✱, title_ar/en, summary_ar/en, description_ar/en, cover_image_path, venue_name_ar/en, address_ar/en, governorate, area, lat, lng, starts_at, ends_at, status, is_featured, is_free (محسوب), min_price_fils (محسوب), submitted_at, published_at, reviewed_by, rejection_reason, cancelled_reason, search_vector | `CHECK (ends_at > starts_at)`؛ فهرس GIN للبحث النصي بالعربية والإنجليزية؛ فهارس على (status, starts_at), category_id, organizer_id |
| **event_images**      | event_id, storage_path, alt_ar/en, sort_order                                                                                                                                                                                                                                                                                                  |                                                                                                                                    |
| **ticket_types**      | event_id, name_ar/en, description_ar/en, price_fils (≥0), quantity_total, quantity_sold, quantity_reserved, max_per_order, sales_start_at, sales_end_at, is_active, sort_order                                                                                                                                                                 | `CHECK (quantity_sold + quantity_reserved <= quantity_total)` — خط الدفاع الأخير ضد الحجز الزائد                                   |
| **orders**            | order_number ✱ (قصير مقروء), user_id, event_id, status, subtotal_fils, service_fee_fils, total_fils, platform_commission_fils, organizer_net_fils, currency='KWD', locale, expires_at, paid_at, buyer_name/email/phone                                                                                                                         | فهرس على (status, expires_at) لمهمة التحرير                                                                                        |
| **order_items**       | order_id, ticket_type_id, quantity, unit_price_fils, line_total_fils                                                                                                                                                                                                                                                                           | لقطة للسعر وقت الشراء                                                                                                              |
| **payments**          | order_id, provider, provider_payment_id ✱, provider_invoice_id, status, amount_fils, method (knet/card/…), idempotency_key ✱, raw_response jsonb, failure_reason                                                                                                                                                                               | `unique(provider, provider_payment_id)`                                                                                            |
| **payment_events**    | provider, provider_event_id ✱, payload jsonb, signature_valid, processed_at, error                                                                                                                                                                                                                                                             | سجل Webhooks + Idempotency                                                                                                         |
| **tickets**           | order_id, order_item_id, ticket_type_id, event_id, owner_user_id, code (قصير للعرض) ✱, token_hash ✱, status, checked_in_at, checked_in_by                                                                                                                                                                                                      | `token` الخام يظهر للمالك فقط عبر خادم                                                                                             |
| **favorites**         | user_id, event_id                                                                                                                                                                                                                                                                                                                              | `primary key (user_id, event_id)`                                                                                                  |
| **refunds**           | order_id, payment_id, amount_fils, reason, status, requested_by, processed_by, provider_refund_id                                                                                                                                                                                                                                              | يعيد المخزون ويُلغي التذاكر                                                                                                        |
| **payouts**           | organizer_id, period_start, period_end, gross_fils, commission_fils, refunds_fils, net_fils, status, reference, paid_at, created_by                                                                                                                                                                                                            |                                                                                                                                    |
| **payout_items**      | payout_id, order_id, amount_fils                                                                                                                                                                                                                                                                                                               | لربط كل طلب بالدفعة التي سُوّي فيها                                                                                                |
| **notifications**     | user_id, type, title_ar/en, body_ar/en, link, read_at                                                                                                                                                                                                                                                                                          |                                                                                                                                    |
| **platform_settings** | key ✱, value jsonb, updated_by                                                                                                                                                                                                                                                                                                                 | مثل `default_commission_bps`, `service_fee`, `hold_minutes`                                                                        |
| **audit_logs**        | actor_id, action, entity_type, entity_id, before jsonb, after jsonb, ip, user_agent                                                                                                                                                                                                                                                            | **Insert-only**: لا Update ولا Delete لأي دور                                                                                      |
| **rate_limits**       | key, window_start, count                                                                                                                                                                                                                                                                                                                       | لـ Rate limiting داخل Postgres                                                                                                     |

✱ = فريد (unique)

**الشعبية "حسب بيانات فعلية"**: View `event_popularity` = مجموع التذاكر المدفوعة آخر 30 يومًا + عدد المفضلة — لا أرقام مصطنعة.

### 3.3 ملخص سياسات RLS

| الجدول                                       | Customer                                 | Organizer (عضو)                                               | Admin                    | عام (anon)     |
| -------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------- | ------------------------ | -------------- |
| events                                       | قراءة المنشورة                           | CRUD لفعاليات جهته؛ لا يستطيع وضع `published` بنفسه (Trigger) | الكل                     | قراءة المنشورة |
| ticket_types                                 | قراءة لفعاليات منشورة                    | CRUD لفعالياته؛ العدّادات لا تُعدَّل إلا عبر RPC              | الكل                     | قراءة          |
| orders / order_items                         | طلباته فقط (قراءة) — الإنشاء عبر RPC فقط | قراءة طلبات فعالياته                                          | الكل                     | ✗              |
| payments / payment_events                    | قراءة مدفوعات طلباته / ✗                 | ✗ / ✗                                                         | الكل                     | ✗              |
| tickets                                      | تذاكره فقط                               | قراءة تذاكر فعالياته؛ check-in عبر RPC فقط                    | الكل                     | ✗              |
| favorites / notifications                    | صفوفه فقط                                | —                                                             | —                        | ✗              |
| organizers                                   | قراءة المعتمدة؛ إنشاء طلب (pending)      | تعديل بيانات جهته (عدا status والعمولة)                       | الكل                     | قراءة المعتمدة |
| refunds                                      | طلب استرجاع لطلباته + قراءتها            | قراءة                                                         | الكل                     | ✗              |
| payouts                                      | ✗                                        | قراءة مستحقاته                                                | الكل                     | ✗              |
| platform_settings / audit_logs / rate_limits | ✗                                        | ✗                                                             | قراءة (التعديل عبر دوال) | ✗              |

**Storage**: Bucket `event-media` (قراءة عامة)؛ الرفع مسموح فقط في المسار `{organizer_id}/…` لأعضاء الجهة، أنواع `image/jpeg|png|webp|avif` فقط، حد 5MB. Bucket `org-docs` خاص للوثائق التجارية.

---

## 4. خريطة الصفحات

**عامة** (كلها تحت `/ar` أو `/en`)

- `/` الرئيسية: Hero + بحث (اسم/منطقة/تاريخ/تصنيف)، مميزة، هذا الأسبوع، نهاية الأسبوع (الخميس–السبت في الكويت)، مجانية، قادمة، الأكثر شعبية، التصنيفات، دعوة المنظّمين، Footer
- `/events` البحث والفلاتر (نص، تصنيف، تاريخ، محافظة/منطقة، مجاني/مدفوع، نطاق السعر، الترتيب) — الحالة في الـ URL لمشاركة النتائج
- `/events/[slug]` التفاصيل: الغلاف، المعرض، الوصف، التاريخ، الخريطة، المنظّم، التذاكر وحالتها (Available / Sold Out / Cancelled / Ended)، الكمية، الحجز، المشاركة، المفضلة، فعاليات مشابهة
- `/categories/[slug]`، `/organizers/[slug]`
- `/about`، `/contact`، `/help`، `/terms`، `/privacy`، `/refund-policy`
- `not-found` (404)، `error` (500)

**المصادقة**: `/login`، `/register`، `/forgot-password`، `/reset-password`، `/auth/callback` (Route Handler)

**الدفع**: `/checkout/[orderNumber]` (ملخص + عداد المهلة + زر الدفع) ← `/checkout/[orderNumber]/result`

**لوحة العميل** `/account`: الملف الشخصي، `orders` و`orders/[id]`، `tickets` و`tickets/[id]` (QR)، `favorites`، `notifications`

**لوحة المنظّم** `/organizer`: `apply` (طلب الانضمام)، النظرة العامة (مبيعات/حجوزات/إيرادات)، `events`، `events/new`، `events/[id]/edit` (تفاصيل، صور، تذاكر، مراجعة وإرسال)، `events/[id]/orders`، `events/[id]/attendees`، `scan` (ماسح QR)، `reports` (تصدير CSV)، `payouts`، `team`، `settings`

**لوحة المدير** `/admin`: النظرة العامة، `organizers` (طلبات الانضمام)، `events` (قائمة المراجعة)، `users`، `orders`، `payments`، `refunds`، `payouts`، `reports`، `settings` (العمولة والرسوم)، `audit-logs`

---

## 5. بوابة الدفع — التوصية

|                           | **MyFatoorah**                                                         | **Tap Payments**                           |
| ------------------------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| بيئة Sandbox              | متاحة بـ Token تجريبي عام منشور في التوثيق — نبدأ فورًا دون إنشاء حساب | تتطلب إنشاء حساب للحصول على مفاتيح Sandbox |
| KNET + بطاقات + Apple Pay | نعم                                                                    | نعم                                        |
| Webhook موقّع             | نعم (HMAC-SHA256 بمفتاح سري من لوحة التاجر)                            | نعم (hashstring)                           |
| تقسيم المستحقات           | ميزة "Suppliers/Multi-vendor" معلنة                                    | ميزة "Destinations/Marketplace" معلنة      |

**التوصية**: البدء بـ **MyFatoorah Sandbox** لأنه لا يتطلب إنشاء حساب، مع إبقاء الطبقة مجرّدة لإضافة Tap لاحقًا.

**تنبيه مهم بخصوص تقسيم المستحقات**: كلا المزوّدين يعلن عن ميزة تقسيم، لكن تفعيلها يعتمد على **موافقة حساب التاجر ونوع الترخيص التجاري** وشروط KYC لكل منظّم. لذلك لن نفترض توفرها: النموذج الافتراضي هو أن المنصة تستلم كامل المبلغ، ويحسب النظام عمولة كل طلب ومستحقات المنظّم في دفتر داخلي، ويصرفها المدير عبر `payouts` (تحويل بنكي يدوي مُسجّل). سنؤكد التفاصيل مع المزوّد قبل الإطلاق.

**لن تُنفَّذ أي عملية دفع حقيقية** — كل شيء في Sandbox حتى موافقتك الصريحة على مفاتيح Live.

---

## 6. خطة التنفيذ

| المرحلة                      | المخرجات                                                                                                                                                                        | التحقق في نهايتها                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **1. الإعداد والبنية**       | Next.js + TS strict + Tailwind + shadcn + ESLint/Prettier + Vitest + Playwright + هيكل المجلدات + `env.ts` (تحقق Zod من المتغيرات) + `.gitignore` + `.env.example` + `git init` | lint، typecheck، build، اختبار وحدة تجريبي                                         |
| **2. الهوية والواجهة**       | Design tokens (كحلي/بنفسجي/أزرق كهربائي) للثيمين، next-themes، next-intl (ar/en + RTL)، الخطوط، Header/Footer، الرئيسية بمكونات Skeleton/Empty/Error، Toasts، 404/500           | Playwright: تبديل اللغة والاتجاه والثيم، عدم وجود وميض، اختبار Accessibility (axe) |
| **3. قاعدة البيانات**        | Migrations للجداول والـ Enums والفهارس والقيود والدوال وRLS وStorage وpg_cron + seed تطوير + توليد الأنواع                                                                      | اختبارات RLS لكل دور + اختبار تزامن للحجز + Supabase advisors                      |
| **4. المصادقة**              | Email/Password + Google OAuth + Callback + نسيت/إعادة كلمة المرور + حماية المسارات في proxy والخادم                                                                             | E2E للتسجيل والدخول؛ Google يُختبر يدويًا بعد إعدادك                               |
| **5. الفعاليات والبحث**      | القوائم، التفاصيل، الفلاتر، البحث النصي، المفضلة، المشاركة، الخريطة، SEO (metadata, sitemap, JSON-LD Event)                                                                     | اختبارات + Lighthouse                                                              |
| **6. لوحة المنظّم**          | طلب الانضمام، إنشاء/تعديل الفعالية (نموذج متعدد الخطوات)، رفع الصور، المسودة والإرسال للمراجعة                                                                                  | E2E لإنشاء فعالية كاملة                                                            |
| **7. التذاكر والحجوزات**     | `reserve_tickets`، صفحة Checkout بعداد، تحرير الحجوزات المنتهية، إصدار التذاكر، QR، الماسح، منع الاستخدام المزدوج، الإلغاء                                                      | اختبار تزامن (عشرات الطلبات المتوازية على آخر تذكرة)                               |
| **8. الدفع التجريبي**        | Adapter MyFatoorah، Webhook + تحقق التوقيع + Idempotency، إعادة المحاولة، الاسترجاع، العمولات                                                                                   | اختبار Webhook مكرر/مزوّر/متأخر؛ دفع Sandbox كامل                                  |
| **9. لوحة المدير والتقارير** | مراجعة المنظّمين والفعاليات، المستخدمين والصلاحيات، المدفوعات والاسترجاعات، المستحقات، التقارير، Audit Log                                                                      | اختبارات صلاحيات: كل مسار Admin يرفض غير المدير                                    |
| **10. الجودة والنشر**        | تدقيق أمني، Rate limiting، Security headers/CSP، تحسين الأداء، توثيق النشر على Vercel وإعدادات الإنتاج                                                                          | الحزمة الكاملة: lint + typecheck + unit + E2E + build                              |

بعد كل مرحلة: تشغيل الاختبارات فعليًا، عرض النتائج، Commit واضح، ثم الرفع إلى GitHub **بعد موافقتك**.

---

## 7. ما يحتاج إجراءً أو قرارًا منك

| البند                                                                                                                                                        | التكلفة                                 | متى                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | ------------------------------- |
| مشروع Supabase للتطوير (انظر الأسئلة)                                                                                                                        | مجاني (Free tier: يتوقف بعد أسبوع خمول) | قبل Phase 3                     |
| ✅ مستودع GitHub جاهز: `git@github.com:Aljeaanabdullah/event-platform.git` (فارغ، والوصول عبر SSH يعمل) — تأكد أنه **Private**                               | مجاني                                   | الرفع نهاية Phase 1 بعد موافقتك |
| Google Cloud OAuth Client (سأعطيك الخطوات بالتفصيل)                                                                                                          | مجاني                                   | Phase 4                         |
| SMTP مخصص للبريد (Supabase المدمج محدود بعدد قليل من الرسائل في الساعة ولا يصلح للإنتاج) — مثل Resend                                                        | يوجد مستوى مجاني                        | قبل الإطلاق                     |
| حساب MyFatoorah تاجر (Live) + التحقق من دعم التقسيم                                                                                                          | حسب عقد المزوّد                         | قبل الإطلاق                     |
| **الإنتاج**: Vercel Hobby **لا يسمح بالاستخدام التجاري** ← Vercel Pro (~20$ شهريًا لكل عضو)؛ Supabase Pro (~25$ شهريًا) لتجنب التوقف والنسخ الاحتياطي اليومي | مدفوع — لن يُفعَّل دون موافقتك          | قبل الإطلاق                     |
| أول حساب Admin: تشغيل سطر SQL واحد بنفسك في لوحة Supabase                                                                                                    | —                                       | Phase 9                         |
