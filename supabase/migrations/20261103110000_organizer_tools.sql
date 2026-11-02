-- =====================================================================
-- Event Platform — Migration 10: أدوات المنظّم ومسار المراجعة (Phase 6)
-- =====================================================================
-- * get_organizer_dashboard / get_organizer_event_sales: أرقام فعلية من الطلبات والتذاكر.
--   للقراءة فقط، ولا تُرجع إلا بيانات جهة يملك المستخدم فيها دور owner/manager (أو المدير).
-- * review_event: نفس السلوك السابق + إشعار منشئ الفعالية بالنتيجة.
-- * submit_event_for_review: نفس السلوك السابق + إشعار المدراء بوجود طلب مراجعة.
-- (تغيير حالة الاعتماد يبقى للمدير فقط؛ أعمدة status/is_featured غير قابلة للتعديل من المنظّم أصلًا)
-- =====================================================================

create function public.get_organizer_dashboard(p_organizer_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not (public.is_org_member(p_organizer_id, array['owner', 'manager']::public.member_role[]) or public.is_admin()) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'events_total', count(*),
    'events_published', count(*) filter (where e.status = 'published'),
    'events_pending', count(*) filter (where e.status = 'pending_review'),
    'events_draft', count(*) filter (where e.status in ('draft', 'rejected')),
    'events_upcoming', count(*) filter (where e.status = 'published' and e.starts_at > now())
  ) into v
  from public.events e where e.organizer_id = p_organizer_id;

  select v || jsonb_build_object(
    'orders_paid', count(*),
    'gross_fils', coalesce(sum(o.subtotal_fils), 0),
    'commission_fils', coalesce(sum(o.platform_commission_fils), 0),
    'net_fils', coalesce(sum(o.organizer_net_fils), 0),
    'refunded_fils', coalesce(sum(o.refunded_fils), 0)
  ) into v
  from public.orders o join public.events e on e.id = o.event_id
  where e.organizer_id = p_organizer_id and o.status in ('paid', 'partially_refunded');

  select v || jsonb_build_object(
    'tickets_sold', count(*),
    'checked_in', count(*) filter (where t.status = 'checked_in')
  ) into v
  from public.tickets t join public.events e on e.id = t.event_id
  where e.organizer_id = p_organizer_id and t.status <> 'void';

  return v;
end;
$$;

create function public.get_organizer_event_sales(p_organizer_id uuid)
returns table (
  event_id uuid,
  slug text,
  title_ar text,
  title_en text,
  status public.event_status,
  starts_at timestamptz,
  capacity bigint,
  tickets_sold bigint,
  tickets_reserved bigint,
  checked_in bigint,
  orders_paid bigint,
  gross_fils bigint,
  commission_fils bigint,
  net_fils bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_org_member(p_organizer_id, array['owner', 'manager']::public.member_role[]) or public.is_admin()) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select
    e.id, e.slug, e.title_ar, e.title_en, e.status, e.starts_at,
    coalesce((select sum(tt.quantity_total) from public.ticket_types tt where tt.event_id = e.id), 0)::bigint,
    coalesce((select sum(tt.quantity_sold) from public.ticket_types tt where tt.event_id = e.id), 0)::bigint,
    coalesce((select sum(tt.quantity_reserved) from public.ticket_types tt where tt.event_id = e.id), 0)::bigint,
    (select count(*) from public.tickets t where t.event_id = e.id and t.status = 'checked_in'),
    (select count(*) from public.orders o where o.event_id = e.id and o.status in ('paid', 'partially_refunded')),
    coalesce((select sum(o.subtotal_fils) from public.orders o
      where o.event_id = e.id and o.status in ('paid', 'partially_refunded')), 0)::bigint,
    coalesce((select sum(o.platform_commission_fils) from public.orders o
      where o.event_id = e.id and o.status in ('paid', 'partially_refunded')), 0)::bigint,
    coalesce((select sum(o.organizer_net_fils) from public.orders o
      where o.event_id = e.id and o.status in ('paid', 'partially_refunded')), 0)::bigint
  from public.events e
  where e.organizer_id = p_organizer_id
  order by e.starts_at desc;
end;
$$;

-- ---------------------------------------------------------------------
-- إرسال للمراجعة: نفس التحقق السابق + إشعار المدراء
-- ---------------------------------------------------------------------
create or replace function public.submit_event_for_review(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events;
begin
  select * into v_event from public.events where id = p_event_id for update;
  if not found or not public.can_manage_organizer(v_event.organizer_id) then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_event.status not in ('draft', 'rejected') then
    raise exception 'INVALID_STATUS' using errcode = 'P0001';
  end if;
  if v_event.starts_at <= now() then
    raise exception 'EVENT_IN_PAST' using errcode = 'P0001';
  end if;
  if not v_event.is_online and v_event.governorate is null then
    raise exception 'LOCATION_REQUIRED' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.ticket_types where event_id = p_event_id and is_active) then
    raise exception 'TICKETS_REQUIRED' using errcode = 'P0001';
  end if;

  update public.events
  set status = 'pending_review', submitted_at = now(), rejection_reason = null
  where id = p_event_id;

  insert into public.notifications (user_id, type, title_ar, title_en, body_ar, body_en, link)
  select p.id, 'event_submitted', 'فعالية بانتظار المراجعة', 'Event awaiting review',
    v_event.title_ar, v_event.title_en, '/admin/events'
  from public.profiles p where p.platform_role = 'admin';
end;
$$;

-- ---------------------------------------------------------------------
-- المراجعة: نفس السلوك السابق + إشعار المنظّم بالنتيجة
-- ---------------------------------------------------------------------
create or replace function public.review_event(p_event_id uuid, p_approve boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if not p_approve and coalesce(trim(p_reason), '') = '' then
    raise exception 'REASON_REQUIRED' using errcode = 'P0001';
  end if;

  update public.events
  set status = case when p_approve then 'published'::public.event_status else 'rejected'::public.event_status end,
      published_at = case when p_approve then now() else published_at end,
      rejection_reason = case when p_approve then null else left(trim(p_reason), 1000) end,
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = p_event_id and status = 'pending_review'
  returning * into v_event;

  if not found then
    raise exception 'NOT_FOUND_OR_INVALID_STATUS' using errcode = 'P0002';
  end if;

  insert into public.notifications (user_id, type, title_ar, title_en, body_ar, body_en, link)
  values (
    v_event.created_by,
    case when p_approve then 'event_approved' else 'event_rejected' end,
    case when p_approve then 'تم اعتماد فعاليتك ونشرها' else 'لم تُعتمد فعاليتك' end,
    case when p_approve then 'Your event was approved and published' else 'Your event was not approved' end,
    v_event.title_ar || case when p_approve then '' else ' — ' || v_event.rejection_reason end,
    v_event.title_en || case when p_approve then '' else ' — ' || v_event.rejection_reason end,
    '/organizer/events/' || v_event.id
  );
end;
$$;

revoke execute on function public.get_organizer_dashboard(uuid) from public;
revoke execute on function public.get_organizer_event_sales(uuid) from public;
grant execute on function public.get_organizer_dashboard(uuid) to authenticated;
grant execute on function public.get_organizer_event_sales(uuid) to authenticated;
