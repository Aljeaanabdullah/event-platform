-- =====================================================================
-- Event Platform — Migration 9: استكشاف الفعاليات (Phase 5)
-- =====================================================================
-- * organizers.is_test: يميّز بيانات الاختبار حتى لا تظهر في الموقع العام.
--   الواجهة تمرّر p_include_test = true فقط في التطوير/المعاينة (SHOW_TEST_DATA=1).
-- * search_events: بحث + فلاتر + ترتيب + ترقيم في استعلام واحد.
-- * get_event_details: كل بيانات صفحة الفعالية العامة في JSON واحد.
-- الدوال قراءة فقط، تُرجع أعمدة عامة فقط، ولا تعرض إلا:
--   فعاليات منشورة (أو ملغاة في صفحة التفاصيل) لجهات معتمدة.
-- تغييرات إضافية فقط: لا تكسر الكود المنشور حاليًا.
-- =====================================================================

alter table public.organizers add column is_test boolean not null default false;
comment on column public.organizers.is_test is 'بيانات اختبار: تُستبعد من الموقع العام دائمًا في الإنتاج';

-- عدد المقاعد المتاحة لنوع تذكرة (للعرض فقط — الحجز الفعلي يتحقق داخل reserve_tickets بقفل)
create function public.ticket_available(p_tt public.ticket_types)
returns integer
language sql
immutable
set search_path = ''
as $$
  select greatest(p_tt.quantity_total - p_tt.quantity_sold - p_tt.quantity_reserved, 0);
$$;

-- ---------------------------------------------------------------------
-- البحث العام
-- p_sort: date | price_asc | price_desc | newest
-- p_price: free | paid | null
-- p_ids: تقييد النتائج بقائمة (مثل "الأكثر شعبية")
-- ---------------------------------------------------------------------
create function public.search_events(
  p_q text default null,
  p_category text default null,
  p_governorate text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_price text default null,
  p_featured boolean default null,
  p_sort text default 'date',
  p_limit integer default 12,
  p_offset integer default 0,
  p_include_test boolean default false,
  p_ids uuid[] default null,
  p_exclude uuid default null
)
returns table (
  id uuid,
  slug text,
  title_ar text,
  title_en text,
  cover_image_path text,
  starts_at timestamptz,
  ends_at timestamptz,
  venue_name_ar text,
  venue_name_en text,
  is_online boolean,
  governorate public.kuwait_governorate,
  category_slug text,
  organizer_name_ar text,
  organizer_name_en text,
  is_featured boolean,
  min_price_fils bigint,
  seats_available bigint,
  has_tickets boolean,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with params as (
    select
      nullif(trim(p_q), '') as q,
      -- تهريب رموز LIKE حتى لا يتحكم المستخدم بالنمط
      '%' || replace(replace(replace(nullif(trim(p_q), ''), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  ),
  base as (
    select
      e.id, e.slug, e.title_ar, e.title_en, e.cover_image_path, e.starts_at, e.ends_at,
      e.venue_name_ar, e.venue_name_en, e.is_online, e.governorate, c.slug as category_slug,
      o.name_ar as organizer_name_ar, o.name_en as organizer_name_en, e.is_featured, e.published_at,
      (select min(tt.price_fils) from public.ticket_types tt where tt.event_id = e.id and tt.is_active) as min_price_fils,
      (select coalesce(sum(public.ticket_available(tt)), 0) from public.ticket_types tt
        where tt.event_id = e.id and tt.is_active)::bigint as seats_available,
      exists (select 1 from public.ticket_types tt where tt.event_id = e.id and tt.is_active) as has_tickets
    from public.events e
    join public.organizers o on o.id = e.organizer_id
    join public.event_categories c on c.id = e.category_id
    cross join params p
    where e.status = 'published'
      and o.status = 'approved'
      and (p_include_test or not o.is_test)
      and e.ends_at > now()
      and (p_ids is null or e.id = any (p_ids))
      and (p_exclude is null or e.id <> p_exclude)
      and (p_category is null or c.slug = p_category)
      and (p_governorate is null or e.governorate::text = p_governorate)
      and (p_from is null or e.ends_at >= p_from)
      and (p_to is null or e.starts_at < p_to)
      and (p_featured is null or e.is_featured = p_featured)
      and (
        p.q is null
        or e.title_ar ilike p.pattern or e.title_en ilike p.pattern
        or e.summary_ar ilike p.pattern or e.summary_en ilike p.pattern
        or e.description_ar ilike p.pattern or e.description_en ilike p.pattern
        or e.venue_name_ar ilike p.pattern or e.venue_name_en ilike p.pattern
        or e.area ilike p.pattern
        or o.name_ar ilike p.pattern or o.name_en ilike p.pattern
      )
  ),
  filtered as (
    select * from base b
    where p_price is null
      or (p_price = 'free' and b.min_price_fils = 0)
      or (p_price = 'paid' and b.min_price_fils > 0)
  )
  select
    f.id, f.slug, f.title_ar, f.title_en, f.cover_image_path, f.starts_at, f.ends_at,
    f.venue_name_ar, f.venue_name_en, f.is_online, f.governorate, f.category_slug,
    f.organizer_name_ar, f.organizer_name_en, f.is_featured, f.min_price_fils, f.seats_available, f.has_tickets,
    count(*) over () as total_count
  from filtered f
  order by
    case when p_sort = 'price_asc' then coalesce(f.min_price_fils, 9223372036854775807) end asc,
    case when p_sort = 'price_desc' then coalesce(f.min_price_fils, -1) end desc,
    case when p_sort = 'newest' then f.published_at end desc nulls last,
    f.starts_at asc,
    f.id
  limit least(greatest(coalesce(p_limit, 12), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- ---------------------------------------------------------------------
-- تفاصيل فعالية عامة (منشورة أو ملغاة) — null إذا غير متاحة للعامة
-- ---------------------------------------------------------------------
create function public.get_event_details(p_slug text, p_include_test boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id, 'slug', e.slug, 'status', e.status,
    'title_ar', e.title_ar, 'title_en', e.title_en,
    'summary_ar', e.summary_ar, 'summary_en', e.summary_en,
    'description_ar', e.description_ar, 'description_en', e.description_en,
    'cover_image_path', e.cover_image_path,
    'venue_name_ar', e.venue_name_ar, 'venue_name_en', e.venue_name_en,
    'address_ar', e.address_ar, 'address_en', e.address_en,
    'governorate', e.governorate, 'area', e.area,
    'latitude', e.latitude, 'longitude', e.longitude, 'is_online', e.is_online,
    'starts_at', e.starts_at, 'ends_at', e.ends_at, 'is_featured', e.is_featured,
    'published_at', e.published_at, 'updated_at', e.updated_at,
    'cancellation_reason', e.cancellation_reason,
    'category', jsonb_build_object('slug', c.slug, 'name_ar', c.name_ar, 'name_en', c.name_en),
    'organizer', jsonb_build_object('id', o.id, 'slug', o.slug, 'name_ar', o.name_ar, 'name_en', o.name_en),
    'images', coalesce((
      select jsonb_agg(jsonb_build_object('path', i.storage_path, 'alt_ar', i.alt_ar, 'alt_en', i.alt_en)
        order by i.sort_order, i.created_at)
      from public.event_images i where i.event_id = e.id
    ), '[]'::jsonb),
    'ticket_types', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', tt.id, 'name_ar', tt.name_ar, 'name_en', tt.name_en,
        'description_ar', tt.description_ar, 'description_en', tt.description_en,
        'price_fils', tt.price_fils, 'available', public.ticket_available(tt),
        'quantity_total', tt.quantity_total,
        'min_per_order', tt.min_per_order, 'max_per_order', tt.max_per_order,
        'sales_start_at', tt.sales_start_at, 'sales_end_at', tt.sales_end_at
      ) order by tt.sort_order, tt.price_fils)
      from public.ticket_types tt where tt.event_id = e.id and tt.is_active
    ), '[]'::jsonb)
  )
  from public.events e
  join public.organizers o on o.id = e.organizer_id
  join public.event_categories c on c.id = e.category_id
  where e.slug = p_slug
    and e.status in ('published', 'cancelled')
    and o.status = 'approved'
    and (p_include_test or not o.is_test);
$$;

-- الإحصائيات العامة لا تحسب بيانات الاختبار (نفس التوقيع — متوافق مع الكود المنشور)
create or replace function public.get_platform_stats()
returns table (published_events bigint, approved_organizers bigint, registered_users bigint, tickets_sold bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.events e join public.organizers o on o.id = e.organizer_id
      where e.status = 'published' and not o.is_test),
    (select count(*) from public.organizers where status = 'approved' and not is_test),
    (select count(*) from public.profiles),
    (select coalesce(sum(tt.quantity_sold), 0)::bigint from public.ticket_types tt
      join public.events e on e.id = tt.event_id join public.organizers o on o.id = e.organizer_id
      where not o.is_test);
$$;

revoke execute on function public.ticket_available(public.ticket_types) from public;
revoke execute on function public.search_events(text, text, text, timestamptz, timestamptz, text, boolean, text, integer, integer, boolean, uuid[], uuid) from public;
revoke execute on function public.get_event_details(text, boolean) from public;
grant execute on function public.search_events(text, text, text, timestamptz, timestamptz, text, boolean, text, integer, integer, boolean, uuid[], uuid) to anon, authenticated;
grant execute on function public.get_event_details(text, boolean) to anon, authenticated;
grant execute on function public.ticket_available(public.ticket_types) to anon, authenticated;

-- فهارس للبحث بالوصف وأسماء المنظّمين
create index events_published_starts_idx on public.events (organizer_id, starts_at) where status = 'published';
