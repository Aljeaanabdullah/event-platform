# Event Platform

منصة لاكتشاف الفعاليات وحجز تذاكرها في الكويت، ثنائية اللغة (العربية/الإنجليزية)، وقابلة للتوسع لدول الخليج.

- خطة المشروع والمعمارية وتصميم قاعدة البيانات: [docs/PLAN.md](docs/PLAN.md)
- قاعدة البيانات والصلاحيات: [docs/DATABASE.md](docs/DATABASE.md)
- المصادقة وإعداد Google OAuth: [docs/AUTH.md](docs/AUTH.md)

## التقنيات

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres, Auth, Storage) · next-intl · next-themes · React Hook Form + Zod · Vitest · Playwright

## المتطلبات

- Node.js 24 أو أحدث
- npm

## التشغيل محليًا

```bash
npm install
cp .env.example .env.local   # ثم املأ القيم
npm run dev
```

افتح http://localhost:3000

## الأوامر

| الأمر               | الوظيفة                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `npm run dev`       | خادم التطوير                                                                                 |
| `npm run build`     | بناء نسخة الإنتاج                                                                            |
| `npm run start`     | تشغيل نسخة الإنتاج                                                                           |
| `npm run lint`      | فحص ESLint                                                                                   |
| `npm run typecheck` | فحص TypeScript                                                                               |
| `npm run format`    | تنسيق الكود بـ Prettier                                                                      |
| `npm run test`      | اختبارات الوحدات (Vitest)                                                                    |
| `npm run test:e2e`  | اختبارات E2E (Playwright) — تتطلب `npm run build` أولًا، و`npx playwright install` مرة واحدة |
| `npm run check`     | كل الفحوصات معًا قبل أي Commit                                                               |

## هيكل المشروع

```
docs/            التوثيق
e2e/             اختبارات Playwright
src/app/         الصفحات والمسارات (App Router)
src/components/  المكونات (ui = shadcn)
src/lib/         الأدوات المشتركة
  supabase/      client (متصفح) · server (جلسة المستخدم) · admin (مفتاح سري، للخادم فقط)
  env.ts         متغيرات البيئة العامة (مع تحقق Zod)
  env.server.ts  متغيرات البيئة السرية (server-only)
  money.ts       المبالغ بالفلس (1 د.ك = 1000 فلس)
```

## قواعد الأمان

- لا تُرفع ملفات `.env*` (عدا `.env.example`) ولا أي مفتاح أو كلمة مرور.
- `SUPABASE_SECRET_KEY` يُستخدم فقط عبر `src/lib/supabase/admin.ts` المحمي بـ `server-only`.
- الصلاحيات تُفرض في قاعدة البيانات (RLS) وعلى الخادم، وليس بإخفاء الأزرار.
- كل المبالغ أعداد صحيحة بالفلس، ولا تُحسب بأعداد عشرية.

## التجربة البصرية (Phase 2)

- **مجسم التذكرة ثلاثي الأبعاد** (`src/components/three/`): Three.js + React Three Fiber + Drei.
  - يُحمَّل كسولًا بعد خمول المتصفح ولا يدخل في حزمة الصفحة الأولى.
  - بديل ثابت بـ CSS عند: عدم دعم WebGL، تفعيل "تقليل الحركة"، أو وضع توفير البيانات.
  - جودة مخفّضة تلقائيًا على الجوال والأجهزة الضعيفة، ويتوقف الرسم عند خروجه من الشاشة.
  - نص التذكرة يُرسم عبر Canvas لدعم العربية والإنجليزية بخطوط الموقع.
- **الحركة** (`src/components/motion/`): Motion لظهور الأقسام أثناء التمرير، وميل ثلاثي الأبعاد خفيف للبطاقات (للماوس فقط)، وخلفية تفاعلية بـ CSS.
- **صفحة عرض المكونات** للتطوير فقط: `/ar/dev/ui` (تُرجع 404 في الإنتاج).

## التصميم السينمائي (فرع feature/cinematic-ui)

- **نظام التصميم** في `src/app/globals.css`: ألوان الثيمين، الزجاج (`.glass`)، حدود النيون (`.neon-border`)، والتوهج (`glow-primary`، `bg-gradient-neon`).
- **أفق الكويت** (`src/components/home/kuwait-skyline.tsx`): رسم SVG بالكود، ألوانه عبر أصناف CSS مرتبطة بالثيم.
- **المشهد ثلاثي الأبعاد** (`src/components/three/`): تذكرة فوق منصة متوهجة مع حلقات وأشعة، بلا مكتبات معالجة لاحقة.
- **الإحصائيات** من دالة `get_platform_stats` (أرقام حقيقية)، وتُعرض المزايا بدلها حتى تصل الفعاليات المنشورة إلى 10.
- **معاينة التصميم ببيانات تجريبية** (للتطوير فقط، 404 في الإنتاج): `/ar/dev/home-preview` و `/en/dev/home-preview`.
