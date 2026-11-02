# المصادقة والحسابات — Event Platform

## كيف يعمل النظام

| الجزء                   | الملف                                                                                           | الوظيفة                                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| تحديث الجلسة            | [`src/proxy.ts`](../src/proxy.ts) + [`src/lib/supabase/proxy.ts`](../src/lib/supabase/proxy.ts) | يجدد التوكن ويتحقق منه (`getClaims`) قبل كل صفحة، ويحمي `/account` و `/organizer` و `/admin` |
| العمليات                | [`src/features/auth/actions.ts`](../src/features/auth/actions.ts)                               | Server Actions للدخول والتسجيل وGoogle والاستعادة والخروج والملف الشخصي                      |
| التحقق                  | [`src/features/auth/schemas.ts`](../src/features/auth/schemas.ts)                               | مخططات Zod مشتركة بين المتصفح والخادم                                                        |
| الصلاحيات               | [`src/lib/auth/session.ts`](../src/lib/auth/session.ts)                                         | `requireUser` و `requireAdmin` على الخادم (غير المدير يحصل على 404)                          |
| العودة من Google/البريد | [`src/app/auth/callback/route.ts`](../src/app/auth/callback/route.ts)                           | يستبدل رمز PKCE بجلسة                                                                        |
| تأكيد بـ token_hash     | [`src/app/auth/confirm/route.ts`](../src/app/auth/confirm/route.ts)                             | يعمل حتى لو فُتح الرابط في متصفح آخر                                                         |

### مبادئ الأمان

- **الجلسة في كوكيز HttpOnly** تديرها `@supabase/ssr` — لا توكنات في `localStorage`.
- **التحقق من الهوية بـ `getClaims()`** (توقيع JWT متحقق منه)، وليس بـ `getSession()`.
- **الصلاحيات على الخادم وفي قاعدة البيانات**: قائمة المستخدم في الـ Header للعرض فقط.
- **CSRF**: Server Actions في Next.js تتحقق من `Origin` تلقائيًا.
- **Open Redirect**: معامل `next` يُقبل فقط كمسار داخلي يبدأ بلغة مدعومة (`safeRedirectPath`).
- **لا كشف للحسابات**: الدخول الخاطئ رسالة عامة، والاستعادة نفس الرد دائمًا، والتسجيل ببريد موجود يعرض "تحقق من بريدك".
- **Rate limiting** لكل عملية حساسة (حسب IP والبريد) — يتطلب `SUPABASE_SECRET_KEY`، وفي الإنتاج يرفض الطلبات إن غاب المفتاح.
- **الدور لا يُحدد من المتصفح**: نوع الحساب عند التسجيل مجرد توجيه؛ المنظّم يصبح منظّمًا بعد اعتماد المدير، والمدير يُعيَّن يدويًا.

## خطوات الإعداد (من حسابك — لا تشارك أي مفتاح في المحادثة)

### 1) Google Cloud Console

1. أنشئ مشروعًا (مثل `Event Platform`).
2. **APIs & Services → OAuth consent screen**: نوع **External**، اسم التطبيق، بريد الدعم، النطاقات `openid` و `email` و `profile`. أضف بريدك في **Test users** ما دام التطبيق في وضع _Testing_.
3. **Credentials → Create Credentials → OAuth client ID** → **Web application**:
   - Authorized JavaScript origins: `http://localhost:3000` (وأضف نطاق الإنتاج لاحقًا)
   - Authorized redirect URIs: `https://cfzupsclmcpwgvumyvaq.supabase.co/auth/v1/callback`
4. انسخ **Client ID** و **Client Secret**.

### 2) Supabase Dashboard (`event-platform-dev`)

1. **Authentication → Sign In / Providers → Google**: فعّله والصق Client ID و Client Secret.
2. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback` و `http://localhost:3000/auth/confirm`
3. **Authentication → Sign In / Providers → Email**: أبقِ _Confirm email_ مفعّلًا. اضبط _Minimum password length_ على **8**.
4. **Project Settings → API Keys → Secret keys**: انسخ المفتاح إلى `SUPABASE_SECRET_KEY` في `.env.local`.

### 3) (موصى به) قوالب البريد

**Authentication → Email Templates**: استبدل `{{ .ConfirmationURL }}` بـ:

- _Confirm signup_: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/ar/account`
- _Reset password_: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`

بدون هذا التعديل تعمل الروابط أيضًا، لكن فقط إذا فُتحت في نفس المتصفح الذي بدأ منه التسجيل.

### 4) أول مدير

بعد تسجيل دخولك لأول مرة، نفّذ في **SQL Editor**:

```sql
update public.profiles set platform_role = 'admin' where email = 'your-email@example.com';
```

## قيود معروفة

- **بريد Supabase المدمج** يرسل فقط لأعضاء فريق المشروع وبعدد محدود في الساعة. للاختبار ببريد آخر أو للإنتاج يلزم SMTP مخصص (مثل Resend) — Phase 10.
- **حماية كلمات المرور المسرّبة** (HaveIBeenPwned) متاحة في خطة Supabase Pro فقط.
- **تغيير البريد الإلكتروني** من صفحة الحساب غير متاح بعد.

## الإنتاج

عند النشر: أضف نطاق الإنتاج في Google (origins) وفي Supabase (Site URL + Redirect URLs)، واضبط `NEXT_PUBLIC_SITE_URL` على النطاق الحقيقي.
