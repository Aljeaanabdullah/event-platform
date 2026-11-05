# الدفع الإلكتروني (Sandbox) — Event Platform

> Phase 8. **لا توجد أي معاملات مالية حقيقية.** العملة KWD، والإعدادات المعتمدة محفوظة:
> عمولة المنصة 5%، رسوم الخدمة على المشتري 0، مدة الحجز المؤقت 15 دقيقة.

## حالة التكامل (بصدق)

| المكوّن                       | الحالة                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| Adapter + مزوّد وهمي (`mock`) | ✅ مبني ومُختبر (Vitest + E2E). منفصل تمامًا عن المزوّد الحقيقي ومعطّل في Production.         |
| MyFatoorah                    | ⚠️ مكتوب حسب التوثيق الرسمي (v2) و**لم يُختبر مع خادم MyFatoorah** — لا يوجد مفتاح Sandbox.   |
| تأكيد الدفع وإصدار التذاكر    | ✅ منطقه مُختبر بالوحدة؛ ⚠️ المسار الكامل عبر الخادم يحتاج `SUPABASE_SECRET_KEY` (غير مضبوط). |
| Tap Payments                  | ❌ غير منفَّذ (الـ Adapter يسمح بإضافته لاحقًا).                                              |
| Payouts للمنظّمين             | ❌ غير منفَّذة عمدًا (حساب المستحقات فقط).                                                    |

**لماذا MyFatoorah؟** مزوّد كويتي يدعم KNET والبطاقات، بيئة اختبار عامة (`apitest.myfatoorah.com`)، صفحة دفع مستضافة
(فلا نلمس بيانات البطاقة)، و"Multi-Vendor/Suppliers" لتوزيع المبالغ على عدة منظّمين مستقبلًا.

## المسار

```
/checkout/[orderId]
  └─ startPayment (Server Action)
       ├─ start_order_payment(order, provider)   ← المبلغ من orders.total_fils فقط، يرفض المنتهي/المدفوع/المجاني، حد 5 محاولات
       ├─ provider.createSession(...)            ← فاتورة + رابط صفحة مستضافة
       └─ attach_payment_session(payment, sessionId)
  → صفحة المزوّد (MyFatoorah أو /payments/mock/[paymentId])
  → Webhook: POST /api/payments/webhook/[provider]     (المصدر الموثوق)
  → عودة المستخدم: GET /api/payments/callback/[provider] (منبّه فقط — يطلب التحقق من المزوّد ثم يحوّل)
  → /checkout/[orderId]/status → success | failed | cancelled | processing | expired | refund
```

## قواعد الأمان المطبّقة

| المطلوب                       | التنفيذ                                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| لا سعر من المتصفح             | الحجز يرسل معرّفات وكميات فقط؛ `start_order_payment` تأخذ المبلغ من قاعدة البيانات                                           |
| حساب السعر على الخادم         | `reserve_tickets` بالفلس (أعداد صحيحة)                                                                                       |
| التحقق من توقيع Webhook       | mock: HMAC-SHA256 على الجسم الخام + `timingSafeEqual`. MyFatoorah: الإشعار غير موثوق إطلاقًا — نسأل `GetPaymentStatus`       |
| Idempotency                   | `payment_events (provider, provider_event_id)` فريد؛ نفس الحدث مرتين = `duplicate_event`؛ `confirm_order_payment` idempotent |
| لا تذاكر قبل تأكيد موثوق      | التذاكر تُصدر فقط داخل `confirm_order_payment` (service_role) بعد التحقق                                                     |
| رابط العودة ليس دليلًا        | صفحات success/failed/cancelled تقرأ قاعدة البيانات؛ رابط `/success` لطلب غير مدفوع يُعاد إلى `/status`                       |
| منع تكرار إصدار التذاكر       | `already_paid` + `duplicate_payment` (يُسجَّل في التدقيق للاسترجاع)                                                          |
| الدفع المتأخر / الحجز المنتهي | `confirm_order_payment`: يعيد الحجز إن توفرت الكمية، وإلا `needs_refund`                                                     |
| مبلغ غير صحيح                 | `AMOUNT_MISMATCH` + تعليم الدفعة فاشلة (409)                                                                                 |
| مفاتيح الدفع                  | متغيرات خادم فقط (`MYFATOORAH_API_KEY`, `MOCK_PAYMENT_SECRET`) — لا `NEXT_PUBLIC_`                                           |
| بيانات البطاقة                | لا نستقبلها ولا نخزّنها: صفحة مستضافة. صفحة الـ mock نفسها بلا أي حقل إدخال (مُختبر)                                         |

## العمولات (حساب فقط — بلا Payouts)

- عند الحجز: `platform_commission_fils = round_half_up(subtotal × 5%)`، `organizer_net_fils = subtotal − commission`.
- [`src/features/payments/commission.ts`](../src/features/payments/commission.ts): نفس المعادلة + رسوم البوابة (إن عُرفت من
  MyFatoorah `TotalServiceCharge` تُحفظ في `payments.gateway_fee_fils`) وصافي المنصة بعدها. مُختبرة (لا فلس ضائع).
- لوحة المنظّم تعرض: المبيعات، العمولة، الصافي (قبل رسوم البوابة والاسترجاعات).

## الإعداد

| المتغير                 | المكان           | ملاحظة                                      |
| ----------------------- | ---------------- | ------------------------------------------- |
| `SUPABASE_SECRET_KEY`   | خادم             | **مطلوب** لمعالجة أي إشعار دفع              |
| `PAYMENT_PROVIDER=mock` | محلي/Preview فقط | يُتجاهل في Production دائمًا                |
| `MOCK_PAYMENT_SECRET`   | محلي/Preview     | 16 حرفًا على الأقل، عشوائي                  |
| `MYFATOORAH_API_KEY`    | خادم             | مفتاح Sandbox من بوابة MyFatoorah التجريبية |
| `MYFATOORAH_BASE_URL`   | خادم             | `https://apitest.myfatoorah.com` للاختبار   |

في بوابة MyFatoorah: فعّل Webhook V2 إلى `https://<domain>/api/payments/webhook/myfatoorah`.

## الاختبارات

- **Vitest** (`processor.test.ts`, `commission.test.ts`, `config.test.ts`): نجاح، فشل، إلغاء، تكرار Webhook، توقيع مزوّر،
  مبلغ خاطئ، دفع متأخر (`needs_refund`)، دفعة مجهولة/مزوّد مختلف، MyFatoorah يتجاهل حالة الإشعار ويعتمد على
  `GetPaymentStatus` (بمحاكاة fetch)، دقة المبالغ والعمولة، منع الـ mock في Production.
- **Playwright** (`e2e/payments.spec.ts`): Webhook مزوّر مرفوض، المبلغ في صفحة الإتمام وصفحة المزوّد من الخادم،
  صفحة المزوّد بلا حقول بطاقة، رابط `/success` لا يغيّر الحالة، صفحة دفع مستخدم آخر = 404.
- **لم يُنفَّذ** (يحتاج `SUPABASE_SECRET_KEY`): مسار النجاح الكامل مع إصدار التذاكر عبر الواجهة، ومسار الفشل/الإلغاء
  عبر الإشعار — الاختباران موجودان ويُشغَّلان تلقائيًا عند توفر المفتاح. منطق التأكيد في القاعدة مكتوب في
  `supabase/tests/phases-6-8.test.sql` (لم يُنفَّذ — انظر BLOCKERS).
- **لم يُختبر إطلاقًا**: الاتصال الحقيقي بـ MyFatoorah Sandbox.
