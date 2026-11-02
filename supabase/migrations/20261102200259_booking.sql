-- =====================================================================
-- Event Platform — Migration 4: الحجز والتذاكر والتحقق من QR
-- =====================================================================
-- منع الحجز الزائد:
--   1) قفل صفوف أنواع التذاكر (SELECT ... FOR UPDATE) بترتيب ثابت لتفادي الـ deadlock.
--   2) فحص المتاح داخل نفس المعاملة.
--   3) القيد ticket_types_capacity_check كخط دفاع أخير.
-- الحجز المؤقت: الطلب pending_payment يحجز الكمية حتى expires_at، ثم تحرره مهمة pg_cron.
-- الدفع: لا يُعتبر الطلب مدفوعًا إلا عبر confirm_order_payment (للخادم فقط بعد تحقق Webhook).
-- =====================================================================

-- ---------------------------------------------------------------------
-- إعدادات المنصة (قراءة رقمية مع قيمة افتراضية)
-- ---------------------------------------------------------------------
create function public.setting_int(p_key text, p_default bigint)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (value #>> '{}')::bigint from public.platform_settings where key = p_key), p_default);
$$;

-- ---------------------------------------------------------------------
-- إتمام الطلب: تحويل الكميات إلى "مباعة"، إصدار التذاكر، وإشعار المشتري
-- داخلية فقط (لا صلاحية تنفيذ لأي دور خارجي)
-- p_from_reserved = true عندما تكون الكميات محجوزة مؤقتًا لهذا الطلب
-- ---------------------------------------------------------------------
create function public._finalize_order(p_order_id uuid, p_from_reserved boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_item record;
begin
  select * into v_order from public.orders where id = p_order_id;

  for v_item in
    select oi.id, oi.ticket_type_id, oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id
    order by oi.ticket_type_id
  loop
    update public.ticket_types
    set quantity_sold = quantity_sold + v_item.quantity,
        quantity_reserved = quantity_reserved - case when p_from_reserved then v_item.quantity else 0 end
    where id = v_item.ticket_type_id;

    -- تذكرة مستقلة لكل وحدة، ولكل منها رمز QR فريد
    insert into public.tickets (order_id, order_item_id, ticket_type_id, event_id, owner_user_id)
    select p_order_id, v_item.id, v_item.ticket_type_id, v_order.event_id, v_order.user_id
    from generate_series(1, v_item.quantity);
  end loop;

  update public.orders
  set status = 'paid', paid_at = now(), expires_at = null
  where id = p_order_id;

  insert into public.notifications (user_id, type, title_ar, title_en, body_ar, body_en, link)
  values (
    v_order.user_id, 'order_paid',
    'تم تأكيد حجزك', 'Your booking is confirmed',
    'رقم الطلب ' || v_order.order_number || ' — تذاكرك جاهزة.',
    'Order ' || v_order.order_number || ' — your tickets are ready.',
    '/account/orders/' || v_order.id
  );
end;
$$;

-- ---------------------------------------------------------------------
-- الحجز: ينشئ طلبًا ويحجز التذاكر مؤقتًا بشكل ذري
-- p_items: [{"ticket_type_id": "...", "quantity": 2}, ...]
-- ---------------------------------------------------------------------
create function public.reserve_tickets(
  p_event_id uuid,
  p_items jsonb,
  p_buyer_name text default null,
  p_buyer_email text default null,
  p_buyer_phone text default null,
  p_locale public.app_locale default 'ar'
)
returns table (order_id uuid, order_number text, status public.order_status, total_fils bigint, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
-- (أسماء أعمدة الإرجاع مثل status و expires_at تُعامل كأعمدة جداول عند التعارض)
declare
  v_uid uuid := (select auth.uid());
  v_event public.events;
  v_organizer public.organizers;
  v_item_count integer;
  v_distinct_count integer;
  v_locked_count integer;
  v_tt public.ticket_types;
  v_ids uuid[];
  v_qtys integer[];
  v_i integer;
  v_subtotal bigint := 0;
  v_fee bigint := 0;
  v_commission bigint := 0;
  v_commission_bps bigint;
  v_hold_minutes bigint := public.setting_int('hold_minutes', 15);
  v_order public.orders;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  -- التحقق من شكل الطلب
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'INVALID_ITEMS' using errcode = '22023';
  end if;
  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 10 then
    raise exception 'INVALID_ITEMS' using errcode = '22023';
  end if;

  -- تحويل العناصر إلى مصفوفتين مرتبتين حسب نوع التذكرة (بدون جداول مؤقتة)
  begin
    select array_agg(x.id order by x.id), array_agg(x.qty order by x.id)
    into v_ids, v_qtys
    from (
      select (e ->> 'ticket_type_id')::uuid as id, (e ->> 'quantity')::integer as qty
      from jsonb_array_elements(p_items) e
    ) x;
  exception when others then
    raise exception 'INVALID_ITEMS' using errcode = '22023';
  end;

  select count(distinct u) into v_distinct_count from unnest(v_ids) u;
  if v_distinct_count <> v_item_count
     or array_position(v_ids, null) is not null
     or exists (select 1 from unnest(v_qtys) q where q is null or q < 1) then
    raise exception 'INVALID_ITEMS' using errcode = '22023';
  end if;

  -- الفعالية يجب أن تكون منشورة ولم تنتهِ
  select * into v_event from public.events where id = p_event_id;
  if not found or v_event.status <> 'published' or v_event.ends_at <= now() then
    raise exception 'EVENT_NOT_ON_SALE' using errcode = 'P0001';
  end if;

  -- منع احتكار المخزون بطلبات معلّقة كثيرة
  if (
    select count(*) from public.orders o
    where o.user_id = v_uid and o.status = 'pending_payment' and o.expires_at > now()
  ) >= public.setting_int('max_pending_orders_per_user', 3) then
    raise exception 'TOO_MANY_PENDING_ORDERS' using errcode = 'P0001';
  end if;

  -- القفل: ترتيب ثابت حسب id لتفادي deadlock بين معاملات متزامنة
  perform 1 from public.ticket_types tt
  where tt.id = any (v_ids)
  order by tt.id
  for update;

  select count(*) into v_locked_count
  from public.ticket_types tt
  where tt.id = any (v_ids) and tt.event_id = p_event_id;
  if v_locked_count <> v_item_count then
    raise exception 'INVALID_ITEMS' using errcode = '22023';
  end if;

  for v_i in 1 .. v_item_count loop
    select * into v_tt from public.ticket_types where id = v_ids[v_i];

    if not v_tt.is_active
       or (v_tt.sales_start_at is not null and v_tt.sales_start_at > now())
       or (v_tt.sales_end_at is not null and v_tt.sales_end_at <= now()) then
      raise exception 'TICKET_NOT_ON_SALE' using errcode = 'P0001', detail = v_tt.id::text;
    end if;
    if v_qtys[v_i] < v_tt.min_per_order or v_qtys[v_i] > v_tt.max_per_order then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0001', detail = v_tt.id::text;
    end if;
    if v_tt.quantity_total - v_tt.quantity_sold - v_tt.quantity_reserved < v_qtys[v_i] then
      raise exception 'SOLD_OUT' using errcode = 'P0001', detail = v_tt.id::text;
    end if;

    v_subtotal := v_subtotal + v_tt.price_fils * v_qtys[v_i];
  end loop;

  -- الرسوم (على المشتري) والعمولة (من حصة المنظّم) — تُحسب على الخادم فقط
  if v_subtotal > 0 then
    v_fee := (v_subtotal * public.setting_int('service_fee_bps', 0) + 5000) / 10000
             + public.setting_int('service_fee_fixed_fils', 0);
  end if;
  select * into v_organizer from public.organizers where id = v_event.organizer_id;
  v_commission_bps := coalesce(v_organizer.commission_bps, public.setting_int('default_commission_bps', 0));
  v_commission := (v_subtotal * v_commission_bps + 5000) / 10000;

  insert into public.orders (
    user_id, event_id, status, subtotal_fils, service_fee_fils, total_fils,
    platform_commission_fils, organizer_net_fils, locale, buyer_name, buyer_email, buyer_phone, expires_at
  ) values (
    v_uid, p_event_id, 'pending_payment', v_subtotal, v_fee, v_subtotal + v_fee,
    v_commission, v_subtotal - v_commission, p_locale,
    left(trim(p_buyer_name), 120), lower(trim(p_buyer_email)), p_buyer_phone,
    now() + make_interval(mins => v_hold_minutes::integer)
  )
  returning * into v_order;

  insert into public.order_items (
    order_id, ticket_type_id, quantity, unit_price_fils, line_total_fils, ticket_name_ar, ticket_name_en
  )
  select v_order.id, tt.id, r.qty, tt.price_fils, tt.price_fils * r.qty, tt.name_ar, tt.name_en
  from unnest(v_ids, v_qtys) as r (id, qty) join public.ticket_types tt on tt.id = r.id;

  update public.ticket_types tt
  set quantity_reserved = tt.quantity_reserved + r.qty
  from unnest(v_ids, v_qtys) as r (id, qty)
  where tt.id = r.id;

  -- الطلبات المجانية بالكامل: تُؤكَّد فورًا بدون بوابة دفع
  if v_order.total_fils = 0 then
    insert into public.payments (order_id, provider, status, amount_fils, idempotency_key)
    values (v_order.id, 'free', 'succeeded', 0, 'free:' || v_order.id);
    perform public._finalize_order(v_order.id, true);
    select * into v_order from public.orders where id = v_order.id;
  end if;

  return query select v_order.id, v_order.order_number, v_order.status, v_order.total_fils, v_order.expires_at;
end;
$$;

-- ---------------------------------------------------------------------
-- تأكيد الدفع — للخادم فقط بعد التحقق من Webhook أو من استعلام المزوّد
-- Idempotent: استدعاؤه مرتين لنفس الدفعة لا يُصدر تذاكر مرتين.
-- النتيجة: paid | already_paid | needs_refund | duplicate_payment
-- ---------------------------------------------------------------------
create function public.confirm_order_payment(
  p_order_id uuid,
  p_provider text,
  p_provider_payment_id text,
  p_amount_fils bigint
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_available boolean := true;
  v_item record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if p_amount_fils <> v_order.total_fils then
    raise exception 'AMOUNT_MISMATCH' using errcode = 'P0001';
  end if;

  -- تسجيل الدفعة الناجحة (أو تحديثها إن وُجدت)
  insert into public.payments (order_id, provider, provider_payment_id, status, amount_fils, idempotency_key)
  values (p_order_id, p_provider, p_provider_payment_id, 'succeeded', p_amount_fils, p_provider || ':' || p_provider_payment_id)
  on conflict (provider, provider_payment_id) do update set status = 'succeeded';

  if v_order.status = 'paid' then
    -- دفعة ثانية لطلب مدفوع أصلًا = دفع مكرر يحتاج استرجاعًا
    if exists (
      select 1 from public.payments
      where order_id = p_order_id and status = 'succeeded'
        and not (provider = p_provider and provider_payment_id = p_provider_payment_id)
        and provider <> 'free'
    ) then
      perform public.log_audit('payment.duplicate', 'orders', p_order_id::text, null, null,
        jsonb_build_object('provider', p_provider, 'provider_payment_id', p_provider_payment_id));
      return 'duplicate_payment';
    end if;
    return 'already_paid';
  end if;

  if v_order.status = 'pending_payment' then
    perform public._finalize_order(p_order_id, true);
    return 'paid';
  end if;

  if v_order.status in ('expired', 'cancelled') then
    -- الدفعة وصلت بعد انتهاء الحجز المؤقت: نحاول إعادة حجز نفس الكميات
    perform 1 from public.ticket_types
    where id in (select ticket_type_id from public.order_items where order_id = p_order_id)
    order by id
    for update;

    for v_item in
      select oi.quantity, tt.quantity_total, tt.quantity_sold, tt.quantity_reserved
      from public.order_items oi join public.ticket_types tt on tt.id = oi.ticket_type_id
      where oi.order_id = p_order_id
    loop
      if v_item.quantity_total - v_item.quantity_sold - v_item.quantity_reserved < v_item.quantity then
        v_available := false;
      end if;
    end loop;

    if v_available then
      perform public._finalize_order(p_order_id, false);
      return 'paid';
    end if;

    update public.orders set status = 'needs_refund' where id = p_order_id;
    perform public.log_audit('order.needs_refund', 'orders', p_order_id::text, null, null,
      jsonb_build_object('reason', 'paid_after_hold_expired_and_sold_out'));
    return 'needs_refund';
  end if;

  -- أي حالة أخرى (مسترجع، يحتاج استرجاع…) لا تُصدر تذاكر
  return 'needs_refund';
end;
$$;

-- ---------------------------------------------------------------------
-- تحرير الحجوزات المؤقتة المنتهية (pg_cron كل دقيقة)
-- SKIP LOCKED: لا تنتظر طلبًا يُعالَج دفعه في نفس اللحظة
-- ---------------------------------------------------------------------
create function public.release_expired_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_count integer := 0;
begin
  for v_order_id in
    select o.id from public.orders o
    where o.status = 'pending_payment' and o.expires_at < now()
    order by o.expires_at
    limit 500
    for update skip locked
  loop
    update public.ticket_types tt
    set quantity_reserved = tt.quantity_reserved - oi.quantity
    from public.order_items oi
    where oi.order_id = v_order_id and tt.id = oi.ticket_type_id;

    update public.orders set status = 'expired' where id = v_order_id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- المستخدم يلغي طلبه المعلّق ليحرر التذاكر فورًا
create function public.cancel_pending_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.orders
  where id = p_order_id and user_id = (select auth.uid()) and status = 'pending_payment'
  for update;
  if not found then
    raise exception 'NOT_FOUND_OR_INVALID_STATUS' using errcode = 'P0002';
  end if;

  update public.ticket_types tt
  set quantity_reserved = tt.quantity_reserved - oi.quantity
  from public.order_items oi
  where oi.order_id = p_order_id and tt.id = oi.ticket_type_id;

  update public.orders set status = 'cancelled', cancelled_at = now(), expires_at = null where id = p_order_id;
end;
$$;

-- ---------------------------------------------------------------------
-- رمز QR: يُعطى لمالك التذكرة فقط
-- ---------------------------------------------------------------------
create function public.get_ticket_qr_token(p_ticket_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select t.qr_token from public.tickets t
  where t.id = p_ticket_id and t.owner_user_id = (select auth.uid()) and t.status in ('valid', 'checked_in');
$$;

-- ---------------------------------------------------------------------
-- التحقق من التذكرة عند الدخول — ذري: لا يمكن استخدام التذكرة مرتين
-- النتيجة: ok | already_used | void | wrong_event | invalid
-- "invalid" تُرجَع أيضًا لغير المصرّح لهم حتى لا نكشف وجود التذكرة
-- ---------------------------------------------------------------------
create function public.check_in_ticket(p_qr_token text, p_event_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_ticket public.tickets;
  v_org uuid;
  v_checked_at timestamptz;
  v_info jsonb;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if p_qr_token is null or p_qr_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('result', 'invalid');
  end if;

  select * into v_ticket from public.tickets where qr_token = p_qr_token;
  if not found then
    return jsonb_build_object('result', 'invalid');
  end if;

  select e.organizer_id into v_org from public.events e where e.id = v_ticket.event_id;
  if not public.is_org_member(v_org, array['owner', 'manager', 'scanner']::public.member_role[]) then
    return jsonb_build_object('result', 'invalid');
  end if;

  select jsonb_build_object(
    'ticket_id', v_ticket.id, 'code', v_ticket.code,
    'ticket_type_ar', tt.name_ar, 'ticket_type_en', tt.name_en,
    'event_id', e.id, 'event_title_ar', e.title_ar, 'event_title_en', e.title_en
  ) into v_info
  from public.ticket_types tt join public.events e on e.id = tt.event_id
  where tt.id = v_ticket.ticket_type_id;

  if p_event_id is not null and v_ticket.event_id <> p_event_id then
    return v_info || jsonb_build_object('result', 'wrong_event');
  end if;

  update public.tickets
  set status = 'checked_in', checked_in_at = now(), checked_in_by = v_uid
  where id = v_ticket.id and status = 'valid'
  returning checked_in_at into v_checked_at;

  if v_checked_at is not null then
    return v_info || jsonb_build_object('result', 'ok', 'checked_in_at', v_checked_at);
  end if;

  select status, checked_in_at into v_ticket.status, v_ticket.checked_in_at from public.tickets where id = v_ticket.id;
  if v_ticket.status = 'checked_in' then
    return v_info || jsonb_build_object('result', 'already_used', 'checked_in_at', v_ticket.checked_in_at);
  end if;
  return v_info || jsonb_build_object('result', 'void');
end;
$$;

-- ---------------------------------------------------------------------
-- "الأكثر شعبية" من بيانات فعلية: تذاكر مدفوعة + إضافات للمفضلة
-- ---------------------------------------------------------------------
create function public.get_popular_events(p_limit integer default 8, p_days integer default 30)
returns table (event_id uuid, tickets_sold bigint, favorites_count bigint, score bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with sold as (
    select o.event_id, sum(oi.quantity)::bigint as n
    from public.orders o join public.order_items oi on oi.order_id = o.id
    where o.status = 'paid' and o.paid_at > now() - make_interval(days => p_days)
    group by o.event_id
  ),
  favs as (
    select f.event_id, count(*)::bigint as n
    from public.favorites f
    where f.created_at > now() - make_interval(days => p_days)
    group by f.event_id
  )
  select e.id, coalesce(s.n, 0), coalesce(f.n, 0), coalesce(s.n, 0) * 3 + coalesce(f.n, 0)
  from public.events e
  left join sold s on s.event_id = e.id
  left join favs f on f.event_id = e.id
  where e.status = 'published' and e.ends_at > now() and (s.n is not null or f.n is not null)
  order by 4 desc, e.starts_at
  limit least(greatest(p_limit, 1), 50);
$$;

-- ---------------------------------------------------------------------
-- صلاحيات التنفيذ
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

-- (إعادة منح دوال Migration 2 بعد الإلغاء الشامل أعلاه)
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_org_member(uuid, public.member_role[]) to authenticated;
grant execute on function public.can_manage_organizer(uuid) to authenticated;
grant execute on function public.can_manage_event(uuid) to authenticated;
grant execute on function public.apply_as_organizer(text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.set_organizer_status(uuid, public.organizer_status, text) to authenticated;
grant execute on function public.submit_event_for_review(uuid) to authenticated;
grant execute on function public.withdraw_event_submission(uuid) to authenticated;
grant execute on function public.review_event(uuid, boolean, text) to authenticated;
grant execute on function public.set_event_featured(uuid, boolean) to authenticated;
grant execute on function public.set_user_role(uuid, public.platform_role) to authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- الحجز والتذاكر
grant execute on function public.reserve_tickets(uuid, jsonb, text, text, text, public.app_locale) to authenticated;
grant execute on function public.cancel_pending_order(uuid) to authenticated;
grant execute on function public.get_ticket_qr_token(uuid) to authenticated;
grant execute on function public.check_in_ticket(text, uuid) to authenticated;
grant execute on function public.get_popular_events(integer, integer) to anon, authenticated;

-- للخادم فقط: تأكيد الدفع وتحرير الحجوزات
grant execute on function public.confirm_order_payment(uuid, text, text, bigint) to service_role;
grant execute on function public.release_expired_holds() to service_role;

-- دوال داخلية: لا أحد خارج قاعدة البيانات
revoke execute on function public._finalize_order(uuid, boolean) from service_role;
revoke execute on function public.setting_int(text, bigint) from service_role;
revoke execute on function public.log_audit(text, text, text, jsonb, jsonb, jsonb) from service_role;

-- ---------------------------------------------------------------------
-- المهام المجدولة
-- ---------------------------------------------------------------------
create extension if not exists pg_cron;

select cron.schedule('release-expired-holds', '* * * * *', $$select public.release_expired_holds()$$);
select cron.schedule('cleanup-rate-limits', '17 3 * * *', $$delete from public.rate_limits where window_start < now() - interval '2 days'$$);
