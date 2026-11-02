-- =====================================================================
-- Event Platform — Migration 2: دوال الصلاحيات، المستخدمون، سجل التدقيق، والمراجعات
-- =====================================================================
-- كل الدوال SECURITY DEFINER تستخدم search_path فارغًا وأسماء مؤهلة بالكامل
-- لمنع هجمات تبديل المخطط (search_path hijacking).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) دوال التحقق من الدور (تُستخدم داخل سياسات RLS)
-- ---------------------------------------------------------------------
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and platform_role = 'admin'
  );
$$;

-- عضو في جهة منظِّمة (بأي دور، أو بأدوار محددة)
create function public.is_org_member(p_organizer_id uuid, p_roles public.member_role[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organizer_members m
    where m.organizer_id = p_organizer_id
      and m.user_id = (select auth.uid())
      and (p_roles is null or m.role = any (p_roles))
  );
$$;

-- يملك صلاحية إدارة محتوى الجهة: مالك أو مدير، والجهة معتمدة
create function public.can_manage_organizer(p_organizer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organizer_members m
    join public.organizers o on o.id = m.organizer_id
    where m.organizer_id = p_organizer_id
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'manager')
      and o.status = 'approved'
  );
$$;

create function public.can_manage_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id and public.can_manage_organizer(e.organizer_id)
  );
$$;

-- ---------------------------------------------------------------------
-- 2) سجل التدقيق (إضافة فقط)
-- ---------------------------------------------------------------------
create function public.log_audit(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_before jsonb default null,
  p_after jsonb default null,
  p_metadata jsonb default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after, metadata)
  values ((select auth.uid()), p_action, p_entity_type, p_entity_id, p_before, p_after, p_metadata);
$$;

-- منع تعديل أو حذف سجل التدقيق لأي دور (حتى service_role)
create function public.prevent_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_logs is append-only' using errcode = 'insufficient_privilege';
end;
$$;

create trigger audit_logs_immutable
  before update or delete on public.audit_logs
  for each row execute function public.prevent_audit_mutation();
create trigger audit_logs_no_truncate
  before truncate on public.audit_logs
  for each statement execute function public.prevent_audit_mutation();

revoke update, delete, truncate on public.audit_logs from service_role;

-- تسجيل تلقائي للتغييرات الحساسة
create function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text;
begin
  v_id := coalesce(
    (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id',
    (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'key'
  );
  perform public.log_audit(
    lower(tg_table_name || '.' || tg_op),
    tg_table_name,
    v_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end;
$$;

create trigger audit_profiles_role
  after update of platform_role on public.profiles
  for each row when (old.platform_role is distinct from new.platform_role)
  execute function public.audit_row_change();

create trigger audit_organizers_status
  after update of status, commission_bps on public.organizers
  for each row when (old.status is distinct from new.status or old.commission_bps is distinct from new.commission_bps)
  execute function public.audit_row_change();

create trigger audit_events_status
  after update of status, is_featured on public.events
  for each row when (old.status is distinct from new.status or old.is_featured is distinct from new.is_featured)
  execute function public.audit_row_change();

create trigger audit_platform_settings
  after insert or update or delete on public.platform_settings
  for each row execute function public.audit_row_change();

create trigger audit_refunds
  after insert or update of status on public.refunds
  for each row execute function public.audit_row_change();

create trigger audit_payouts
  after insert or update of status on public.payouts
  for each row execute function public.audit_row_change();

-- ---------------------------------------------------------------------
-- 3) إنشاء الملف الشخصي تلقائيًا عند التسجيل (بريد أو Google)
-- ---------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_locale text := v_meta ->> 'locale';
begin
  insert into public.profiles (id, email, full_name, avatar_url, preferred_locale)
  values (
    new.id,
    new.email,
    left(nullif(trim(coalesce(v_meta ->> 'full_name', v_meta ->> 'name', '')), ''), 120),
    left(coalesce(v_meta ->> 'avatar_url', v_meta ->> 'picture'), 1000),
    case when v_locale like 'en%' then 'en'::public.app_locale else 'ar'::public.app_locale end
  );
  -- ملاحظة: الدور دائمًا customer — لا يمكن تعيين admin من بيانات التسجيل
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------
-- 4) Rate limiting (نافذة ثابتة) — للخادم فقط (service_role)
-- ---------------------------------------------------------------------
create function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

-- ---------------------------------------------------------------------
-- 5) الانضمام كمنظّم ومراجعة المنظّمين
-- ---------------------------------------------------------------------
create function public.apply_as_organizer(
  p_slug text,
  p_name_ar text,
  p_name_en text,
  p_contact_email text,
  p_contact_phone text default null,
  p_description_ar text default null,
  p_description_en text default null,
  p_website_url text default null,
  p_commercial_reg_no text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  -- منع إغراق المراجعة بالطلبات
  if (select count(*) from public.organizers where created_by = v_uid and status = 'pending') >= 2 then
    raise exception 'TOO_MANY_PENDING_APPLICATIONS' using errcode = 'P0001';
  end if;

  insert into public.organizers (
    slug, name_ar, name_en, contact_email, contact_phone, description_ar, description_en,
    website_url, commercial_reg_no, created_by
  ) values (
    lower(trim(p_slug)), trim(p_name_ar), trim(p_name_en), lower(trim(p_contact_email)), p_contact_phone,
    p_description_ar, p_description_en, p_website_url, p_commercial_reg_no, v_uid
  )
  returning id into v_id;

  insert into public.organizer_members (organizer_id, user_id, role) values (v_id, v_uid, 'owner');
  perform public.log_audit('organizer.apply', 'organizers', v_id::text, null, null, null);
  return v_id;
end;
$$;

create function public.set_organizer_status(
  p_organizer_id uuid,
  p_status public.organizer_status,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_status in ('rejected', 'suspended') and coalesce(trim(p_reason), '') = '' then
    raise exception 'REASON_REQUIRED' using errcode = 'P0001';
  end if;

  update public.organizers
  set status = p_status,
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      rejection_reason = case when p_status in ('rejected', 'suspended') then p_reason end
  where id = p_organizer_id;

  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 6) دورة حياة الفعالية: إرسال للمراجعة، سحب، اعتماد/رفض، تمييز
-- ---------------------------------------------------------------------
create function public.submit_event_for_review(p_event_id uuid)
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
end;
$$;

create function public.withdraw_event_submission(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.events set status = 'draft'
  where id = p_event_id and status = 'pending_review' and public.can_manage_organizer(organizer_id);
  if not found then
    raise exception 'NOT_FOUND_OR_INVALID_STATUS' using errcode = 'P0002';
  end if;
end;
$$;

create function public.review_event(p_event_id uuid, p_approve boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
      rejection_reason = case when p_approve then null else p_reason end,
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = p_event_id and status = 'pending_review';

  if not found then
    raise exception 'NOT_FOUND_OR_INVALID_STATUS' using errcode = 'P0002';
  end if;
end;
$$;

create function public.set_event_featured(p_event_id uuid, p_featured boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.events set is_featured = p_featured where id = p_event_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 7) تغيير أدوار المستخدمين — للمدير فقط، ولا يمكنه تغيير دوره هو
-- ---------------------------------------------------------------------
create function public.set_user_role(p_user_id uuid, p_role public.platform_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'CANNOT_CHANGE_OWN_ROLE' using errcode = 'P0001';
  end if;
  update public.profiles set platform_role = p_role where id = p_user_id;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 8) صلاحيات تنفيذ الدوال
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

-- دوال التحقق: تُستدعى داخل سياسات RLS، فيجب أن تكون قابلة للتنفيذ
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_org_member(uuid, public.member_role[]) to authenticated;
grant execute on function public.can_manage_organizer(uuid) to authenticated;
grant execute on function public.can_manage_event(uuid) to authenticated;

-- عمليات المستخدم المسجّل (كل دالة تتحقق من الصلاحية داخليًا)
grant execute on function public.apply_as_organizer(text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.set_organizer_status(uuid, public.organizer_status, text) to authenticated;
grant execute on function public.submit_event_for_review(uuid) to authenticated;
grant execute on function public.withdraw_event_submission(uuid) to authenticated;
grant execute on function public.review_event(uuid, boolean, text) to authenticated;
grant execute on function public.set_event_featured(uuid, boolean) to authenticated;
grant execute on function public.set_user_role(uuid, public.platform_role) to authenticated;

-- للخادم فقط
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
