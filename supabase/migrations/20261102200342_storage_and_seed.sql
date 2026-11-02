-- =====================================================================
-- Event Platform — Migration 5: التخزين (Storage) والبيانات الأساسية
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) حاويات التخزين
--   event-media: صور الفعاليات وشعارات المنظّمين — قراءة عامة، كتابة لأعضاء الجهة فقط
--   org-docs:    وثائق المنظّمين (سجل تجاري…) — خاصة تمامًا
-- المسار إلزاميًا: {organizer_id}/... حتى تتحقق السياسات من العضوية
-- الأنواع والأحجام مقيدة على مستوى الحاوية (لا يمكن رفع ملفات تنفيذية أو SVG)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('event-media', 'event-media', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('org-docs', 'org-docs', false, 10 * 1024 * 1024, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- يستخرج organizer_id من أول مجلد في المسار بأمان (null إذا لم يكن UUID)
create function public.storage_path_organizer(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when (storage.foldername(p_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(p_name))[1])::uuid
  end;
$$;
grant execute on function public.storage_path_organizer(text) to authenticated;

create policy "event-media: org managers upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'event-media'
    and public.is_org_member(public.storage_path_organizer(name), array['owner', 'manager']::public.member_role[])
  );

create policy "event-media: org managers update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'event-media'
    and public.is_org_member(public.storage_path_organizer(name), array['owner', 'manager']::public.member_role[])
  );

create policy "event-media: org managers delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'event-media'
    and public.is_org_member(public.storage_path_organizer(name), array['owner', 'manager']::public.member_role[])
  );

create policy "org-docs: org managers or admin read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'org-docs'
    and (
      public.is_org_member(public.storage_path_organizer(name), array['owner', 'manager']::public.member_role[])
      or public.is_admin()
    )
  );

create policy "org-docs: org managers upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-docs'
    and public.is_org_member(public.storage_path_organizer(name), array['owner', 'manager']::public.member_role[])
  );

create policy "org-docs: org managers delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'org-docs'
    and public.is_org_member(public.storage_path_organizer(name), array['owner', 'manager']::public.member_role[])
  );

-- ---------------------------------------------------------------------
-- 2) التصنيفات المبدئية (نفس الـ slugs المستخدمة في الواجهة)
-- ---------------------------------------------------------------------
insert into public.event_categories (slug, name_ar, name_en, icon, sort_order) values
  ('conferences', 'مؤتمرات', 'Conferences', 'mic-2', 10),
  ('workshops', 'ورش عمل', 'Workshops', 'presentation', 20),
  ('tech-ai', 'تقنية وذكاء اصطناعي', 'Tech & AI', 'cpu', 30),
  ('business', 'أعمال وريادة', 'Business & Startups', 'briefcase', 40),
  ('exhibitions', 'معارض', 'Exhibitions', 'images', 50),
  ('entertainment', 'ترفيه', 'Entertainment', 'party-popper', 60),
  ('theater', 'مسرح', 'Theater', 'drama', 70),
  ('music', 'موسيقى', 'Music', 'music', 80),
  ('sports', 'رياضة', 'Sports', 'trophy', 90),
  ('family', 'فعاليات عائلية', 'Family', 'users', 100),
  ('education', 'تعليم', 'Education', 'book-open', 110),
  ('outdoor', 'أنشطة خارجية', 'Outdoor', 'tent', 120)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- 3) إعدادات المنصة الافتراضية (يعدّلها المدير لاحقًا من لوحة التحكم)
-- القيم المالية مبدئية وتحتاج اعتمادك قبل الإطلاق
-- ---------------------------------------------------------------------
insert into public.platform_settings (key, value, is_public, description) values
  ('hold_minutes', '15', false, 'مدة الحجز المؤقت للتذاكر أثناء الدفع (بالدقائق)'),
  ('max_pending_orders_per_user', '3', false, 'أقصى عدد طلبات معلّقة للمستخدم في نفس الوقت'),
  ('service_fee_bps', '0', true, 'رسوم الخدمة على المشتري كنسبة (basis points: 100 = 1%)'),
  ('service_fee_fixed_fils', '0', true, 'رسوم خدمة ثابتة لكل طلب مدفوع (بالفلس)'),
  ('default_commission_bps', '500', false, 'عمولة المنصة الافتراضية من المنظّم (500 = 5%)'),
  ('currency', '"KWD"', true, 'العملة الأساسية')
on conflict (key) do nothing;
