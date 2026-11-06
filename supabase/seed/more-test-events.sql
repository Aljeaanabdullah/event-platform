-- 24 فعالية تجريبية إضافية لتجربة الحجز والدفع (قاعدة التطوير فقط — لا تُنفَّذ على الإنتاج).
-- تتبع جهة الاختبار is_test، فتُحذف مع remove-test-data.sql. آمنة للتكرار.
-- عمدًا: كلها مدفوعة، بدون تصنيف sports أو محافظة hawalli، وسعرها أقل من 25 د.ك،
-- حتى لا تغيّر نتائج الفلاتر التي تعتمد عليها اختبارات e2e/events.spec.ts.
insert into public.events (
  id, organizer_id, category_id, slug, title_ar, title_en, summary_ar, summary_en, description_ar, description_en,
  venue_name_ar, venue_name_en, governorate, area, is_online,
  starts_at, ends_at, status, is_featured, submitted_at, published_at, created_by
)
select
  ('e2e00000-0000-4000-8000-0000000001' || lpad(v.n::text, 2, '0'))::uuid,
  'e2e00000-0000-4000-8000-0000000000a1'::uuid,
  (select id from public.event_categories where slug = v.cat),
  'e2e-more-' || v.slug, v.title_ar || ' (تجريبية)', v.title_en || ' (Test)',
  'فعالية تجريبية لاختبار الحجز والدفع.', 'A test event for booking and payment checks.',
  'فعالية تجريبية لأغراض الاختبار فقط، ولن تُقام فعليًا.', 'A test event for QA purposes only. It will not take place.',
  v.venue_ar, v.venue_en, v.gov::public.kuwait_governorate, v.area, false,
  now() + make_interval(days => v.days), now() + make_interval(days => v.days, hours => v.hours),
  'published', v.n % 8 = 0, now(), now(), 'e2e00000-0000-4000-8000-000000000002'::uuid
from (values
  (1, 'conferences', 'marketing-summit', 'مؤتمر التسويق الرقمي', 'Digital Marketing Conference', 'فندق الريجنسي', 'Regency Hotel', 'capital', 'Kuwait City', 12, 6),
  (2, 'conferences', 'health-forum', 'منتدى الصحة والعافية', 'Health & Wellness Forum', 'أرض المعارض', 'Fairgrounds', 'farwaniya', 'Mishref', 16, 5),
  (3, 'workshops', 'coffee-workshop', 'ورشة تحضير القهوة المختصة', 'Specialty Coffee Workshop', 'استوديو القهوة', 'Coffee Studio', 'capital', 'Shuwaikh', 9, 3),
  (4, 'workshops', 'pottery-class', 'ورشة صناعة الفخار', 'Pottery Making Class', 'مرسم الفنون', 'Arts Studio', 'ahmadi', 'Fahaheel', 13, 2),
  (5, 'workshops', 'calligraphy', 'دورة الخط العربي', 'Arabic Calligraphy Course', 'مركز الفنون', 'Arts Center', 'jahra', 'Jahra', 20, 4),
  (6, 'tech-ai', 'ai-bootcamp', 'معسكر الذكاء الاصطناعي', 'AI Bootcamp', 'مساحة الابتكار', 'Innovation Hub', 'capital', 'Sharq', 18, 8),
  (7, 'tech-ai', 'cyber-day', 'يوم الأمن السيبراني', 'Cybersecurity Day', 'برج التجارة', 'Trade Tower', 'capital', 'Kuwait City', 24, 6),
  (8, 'tech-ai', 'game-dev', 'ملتقى مطوري الألعاب', 'Game Developers Meetup', 'مساحة العمل', 'Coworking Space', 'farwaniya', 'Ardiya', 30, 4),
  (9, 'business', 'founders-night', 'أمسية رواد الأعمال', 'Founders Night', 'نادي الأعمال', 'Business Club', 'capital', 'Dasman', 11, 3),
  (10, 'business', 'ecommerce', 'ملتقى التجارة الإلكترونية', 'E-commerce Forum', 'قاعة المؤتمرات', 'Conference Hall', 'mubarak-al-kabeer', 'Sabah Al-Salem', 22, 5),
  (11, 'exhibitions', 'books-fair', 'معرض الكتاب المستعمل', 'Used Books Fair', 'الساحة الكبرى', 'Grand Plaza', 'capital', 'Mirqab', 15, 8),
  (12, 'exhibitions', 'cars-show', 'معرض السيارات الكلاسيكية', 'Classic Cars Show', 'أرض المعارض', 'Fairgrounds', 'farwaniya', 'Mishref', 27, 7),
  (13, 'exhibitions', 'art-gallery', 'معرض الفن المعاصر', 'Contemporary Art Exhibition', 'جاليري البحر', 'Sea Gallery', 'capital', 'Shuwaikh', 34, 6),
  (14, 'entertainment', 'comedy-night', 'أمسية الكوميديا', 'Comedy Night', 'مسرح المدينة', 'City Theater', 'ahmadi', 'Mangaf', 10, 2),
  (15, 'entertainment', 'magic-show', 'عرض السحر', 'Magic Show', 'قاعة العروض', 'Show Hall', 'jahra', 'Jahra', 19, 2),
  (16, 'entertainment', 'movie-night', 'ليلة السينما المفتوحة', 'Open-air Movie Night', 'الواجهة البحرية', 'Waterfront', 'capital', 'Shuwaikh', 26, 3),
  (17, 'theater', 'classic-play', 'مسرحية من التراث', 'Heritage Play', 'المسرح الوطني', 'National Theater', 'capital', 'Kuwait City', 14, 3),
  (18, 'theater', 'kids-play', 'مسرحية الأطفال', 'Kids Play', 'مسرح الأسرة', 'Family Theater', 'mubarak-al-kabeer', 'Qurain', 21, 2),
  (19, 'music', 'oud-evening', 'أمسية العود', 'Oud Evening', 'دار الأوبرا', 'Opera House', 'capital', 'Kuwait City', 17, 3),
  (20, 'music', 'jazz-night', 'ليلة الساكسفون', 'Jazz Night', 'قاعة النغم', 'Melody Hall', 'ahmadi', 'Ahmadi', 28, 3),
  (21, 'family', 'science-day', 'يوم العلوم للعائلة', 'Family Science Day', 'مركز الاكتشاف', 'Discovery Center', 'farwaniya', 'Rabiya', 23, 6),
  (22, 'education', 'study-abroad', 'ملتقى الدراسة في الخارج', 'Study Abroad Forum', 'قاعة الجامعة', 'University Hall', 'jahra', 'Sulaibiya', 32, 5),
  (23, 'education', 'public-speaking', 'دورة فن الإلقاء', 'Public Speaking Course', 'معهد المهارات', 'Skills Institute', 'capital', 'Qibla', 36, 6),
  (24, 'outdoor', 'desert-camp', 'مخيم الصحراء', 'Desert Camp', 'مخيم الوفرة', 'Wafra Camp', 'ahmadi', 'Wafra', 40, 12)
) as v (n, cat, slug, title_ar, title_en, venue_ar, venue_en, gov, area, days, hours)
on conflict (id) do nothing;

insert into public.ticket_types (event_id, name_ar, name_en, price_fils, quantity_total, max_per_order, sort_order)
select
  ('e2e00000-0000-4000-8000-0000000001' || lpad(n::text, 2, '0'))::uuid, 'عادية', 'General',
  -- من 3.000 إلى 19.750 د.ك
  2500 + (n * 750) % 17500 - ((n * 750) % 17500) % 250, 100 + n * 5, 10, 1
from generate_series(1, 24) as n
where not exists (
  select 1 from public.ticket_types t
  where t.event_id = ('e2e00000-0000-4000-8000-0000000001' || lpad(n::text, 2, '0'))::uuid
);

-- كل فعالية ثالثة لها تذكرة ثانية أغلى
insert into public.ticket_types (event_id, name_ar, name_en, price_fils, quantity_total, max_per_order, sort_order)
select
  ('e2e00000-0000-4000-8000-0000000001' || lpad(n::text, 2, '0'))::uuid, 'كبار الشخصيات', 'VIP',
  (2500 + (n * 750) % 17500 - ((n * 750) % 17500) % 250) * 2, 20, 4, 2
from generate_series(3, 24, 3) as n
where not exists (
  select 1 from public.ticket_types t
  where t.event_id = ('e2e00000-0000-4000-8000-0000000001' || lpad(n::text, 2, '0'))::uuid and t.name_en = 'VIP'
);
