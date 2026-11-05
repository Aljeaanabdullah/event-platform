-- =====================================================================
-- بيانات اختبار معزولة (للتطوير و E2E فقط)
-- =====================================================================
-- * كل الجهات هنا is_test = true => لا تظهر في الموقع العام في الإنتاج أبدًا،
--   وتظهر محليًا/في المعاينة فقط عند SHOW_TEST_DATA=1.
-- * لا يوجد حساب مدير هنا (عمدًا): مسارات الإدارة تُختبر في supabase/tests داخل معاملة تُلغى.
-- * كلمة المرور لا تُحفظ في Git: استبدل __E2E_PASSWORD__ بقيمة E2E_TEST_PASSWORD من .env.local
--   (الأداة scripts/seed-test-data.mjs تطبع الملف بعد الاستبدال).
-- * آمن لإعادة التشغيل: يحذف بيانات الاختبار السابقة أولًا (انظر remove-test-data.sql).
-- =====================================================================

\ir remove-test-data.sql

-- ---------------------------------------------------------------------
-- المستخدمون (معرّفات ثابتة تبدأ بـ e2e00000 لتسهيل التنظيف)
-- ---------------------------------------------------------------------
with u (id, email, full_name) as (
  values
    ('e2e00000-0000-4000-8000-000000000001'::uuid, 'e2e-customer@example.test', 'E2E Customer'),
    ('e2e00000-0000-4000-8000-000000000002'::uuid, 'e2e-organizer@example.test', 'E2E Organizer'),
    ('e2e00000-0000-4000-8000-000000000003'::uuid, 'e2e-organizer2@example.test', 'E2E Other Organizer'),
    ('e2e00000-0000-4000-8000-000000000004'::uuid, 'e2e-customer2@example.test', 'E2E Customer Two')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('__E2E_PASSWORD__', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.full_name), now(), now(),
  '', '', '', ''
from u;

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id::text, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now()
from auth.users u
where u.id::text like 'e2e00000-%';

-- ---------------------------------------------------------------------
-- الجهات المنظِّمة (معتمدة + is_test)
-- ---------------------------------------------------------------------
insert into public.organizers (id, slug, name_ar, name_en, contact_email, status, is_test, created_by, reviewed_at)
values
  ('e2e00000-0000-4000-8000-0000000000a1', 'e2e-test-organizer', 'منظّم تجريبي', 'Test Organizer',
   'e2e-organizer@example.test', 'approved', true, 'e2e00000-0000-4000-8000-000000000002', now()),
  ('e2e00000-0000-4000-8000-0000000000a2', 'e2e-other-organizer', 'منظّم تجريبي آخر', 'Other Test Organizer',
   'e2e-organizer2@example.test', 'approved', true, 'e2e00000-0000-4000-8000-000000000003', now());

insert into public.organizer_members (organizer_id, user_id, role) values
  ('e2e00000-0000-4000-8000-0000000000a1', 'e2e00000-0000-4000-8000-000000000002', 'owner'),
  ('e2e00000-0000-4000-8000-0000000000a2', 'e2e00000-0000-4000-8000-000000000003', 'owner');

-- ---------------------------------------------------------------------
-- الفعاليات (العناوين تحمل "(تجريبية)/(Test)" بوضوح)
-- التواريخ نسبية لوقت التشغيل
-- ---------------------------------------------------------------------
insert into public.events (
  id, organizer_id, category_id, slug, title_ar, title_en, summary_ar, summary_en, description_ar, description_en,
  venue_name_ar, venue_name_en, address_ar, address_en, governorate, area, latitude, longitude, is_online,
  starts_at, ends_at, status, is_featured, submitted_at, published_at, created_by
)
select
  v.id::uuid, v.org::uuid, (select id from public.event_categories where slug = v.cat), v.slug,
  v.title_ar, v.title_en, v.summary_ar, v.summary_en,
  'فعالية تجريبية لأغراض الاختبار فقط. ' || v.summary_ar,
  'A test event for QA purposes only. ' || v.summary_en,
  v.venue_ar, v.venue_en, v.addr_ar, v.addr_en, v.gov::public.kuwait_governorate, v.area,
  v.lat, v.lng, false,
  now() + v.starts, now() + v.starts + v.dur, 'draft', v.featured, null, null,
  case when v.org like '%a1' then 'e2e00000-0000-4000-8000-000000000002'::uuid
       else 'e2e00000-0000-4000-8000-000000000003'::uuid end
from (values
  ('e2e00000-0000-4000-8000-0000000000e1', 'e2e00000-0000-4000-8000-0000000000a1', 'tech-ai', 'e2e-tech-forum',
   'ملتقى الكويت للتقنية (تجريبية)', 'Kuwait Tech Forum (Test)',
   'جلسات حول الذكاء الاصطناعي والبرمجيات', 'Sessions on AI and software',
   'أبراج الكويت', 'Kuwait Towers', 'شارع الخليج العربي', 'Arabian Gulf Street', 'capital', 'Sharq',
   29.389700, 48.003600, interval '5 days', interval '6 hours', true),
  ('e2e00000-0000-4000-8000-0000000000e2', 'e2e00000-0000-4000-8000-0000000000a1', 'family', 'e2e-family-day',
   'يوم العائلة المفتوح (تجريبية)', 'Open Family Day (Test)',
   'أنشطة مجانية للأطفال والعائلات', 'Free activities for kids and families',
   'حديقة الشهيد', 'Al Shaheed Park', null, null, 'capital', null,
   null, null, interval '2 days', interval '4 hours', false),
  ('e2e00000-0000-4000-8000-0000000000e3', 'e2e00000-0000-4000-8000-0000000000a1', 'music', 'e2e-music-night',
   'أمسية موسيقية (تجريبية)', 'Music Night (Test)',
   'حفل موسيقي في الهواء الطلق', 'An open-air concert',
   'مسرح سالمية', 'Salmiya Theater', null, null, 'hawalli', 'Salmiya',
   null, null, interval '12 days', interval '3 hours', true),
  ('e2e00000-0000-4000-8000-0000000000e4', 'e2e00000-0000-4000-8000-0000000000a2', 'sports', 'e2e-marathon',
   'ماراثون الأحمدي (تجريبية)', 'Ahmadi Marathon (Test)',
   'سباق جري للهواة والمحترفين', 'A running race for amateurs and pros',
   'الأحمدي', 'Ahmadi', null, null, 'ahmadi', null,
   null, null, interval '20 days', interval '5 hours', false),
  ('e2e00000-0000-4000-8000-0000000000e5', 'e2e00000-0000-4000-8000-0000000000a2', 'business', 'e2e-startup-summit',
   'قمة الشركات الناشئة (تجريبية)', 'Startup Summit (Test)',
   'لقاء رواد الأعمال والمستثمرين', 'Founders meet investors',
   'مركز الجهراء', 'Jahra Center', null, null, 'jahra', null,
   null, null, interval '30 days', interval '8 hours', false),
  ('e2e00000-0000-4000-8000-0000000000e6', 'e2e00000-0000-4000-8000-0000000000a1', 'workshops', 'e2e-sold-out-workshop',
   'ورشة تصوير مكتملة (تجريبية)', 'Sold-out Photo Workshop (Test)',
   'ورشة عملية للتصوير', 'A hands-on photography workshop',
   'الفروانية', 'Farwaniya', null, null, 'farwaniya', null,
   null, null, interval '8 days', interval '2 hours', false),
  ('e2e00000-0000-4000-8000-0000000000e7', 'e2e00000-0000-4000-8000-0000000000a1', 'theater', 'e2e-pending-play',
   'مسرحية قيد المراجعة (تجريبية)', 'Play Under Review (Test)',
   'لا يجب أن تظهر للعامة', 'Must not be publicly visible',
   'مسرح الدسمة', 'Dasma Theater', null, null, 'capital', null,
   null, null, interval '15 days', interval '2 hours', false),
  ('e2e00000-0000-4000-8000-0000000000e8', 'e2e00000-0000-4000-8000-0000000000a1', 'education', 'e2e-draft-course',
   'دورة مسودة (تجريبية)', 'Draft Course (Test)',
   'مسودة لا يجب أن تظهر للعامة', 'A draft that must not be public',
   'مبارك الكبير', 'Mubarak Al-Kabeer', null, null, 'mubarak-al-kabeer', null,
   null, null, interval '25 days', interval '3 hours', false)
) as v (id, org, cat, slug, title_ar, title_en, summary_ar, summary_en, venue_ar, venue_en, addr_ar, addr_en,
        gov, area, lat, lng, starts, dur, featured);

-- أنواع التذاكر (قبل تغيير الحالة لأن سياسات التعديل تخص المسودات)
insert into public.ticket_types (event_id, name_ar, name_en, price_fils, quantity_total, quantity_sold, max_per_order, sort_order)
values
  ('e2e00000-0000-4000-8000-0000000000e1', 'عادية', 'General', 15000, 200, 0, 10, 1),
  ('e2e00000-0000-4000-8000-0000000000e1', 'كبار الشخصيات', 'VIP', 45500, 20, 0, 4, 2),
  ('e2e00000-0000-4000-8000-0000000000e2', 'دخول مجاني', 'Free entry', 0, 500, 0, 6, 1),
  ('e2e00000-0000-4000-8000-0000000000e3', 'عادية', 'General', 8250, 150, 0, 10, 1),
  ('e2e00000-0000-4000-8000-0000000000e4', 'مشارك', 'Runner', 5000, 300, 0, 2, 1),
  ('e2e00000-0000-4000-8000-0000000000e5', 'حضور', 'Attendee', 25000, 100, 0, 5, 1),
  ('e2e00000-0000-4000-8000-0000000000e6', 'مقعد', 'Seat', 12000, 10, 10, 2, 1),
  ('e2e00000-0000-4000-8000-0000000000e7', 'عادية', 'General', 7000, 80, 0, 6, 1),
  ('e2e00000-0000-4000-8000-0000000000e8', 'عادية', 'General', 3000, 40, 0, 4, 1);

-- الحالات النهائية (كـ postgres: محاكاة لمسار المراجعة)
update public.events
set status = 'published', submitted_at = now(), published_at = now(), reviewed_at = now()
where id::text like 'e2e00000-%' and slug not in ('e2e-pending-play', 'e2e-draft-course');

update public.events set status = 'pending_review', submitted_at = now()
where slug = 'e2e-pending-play';
