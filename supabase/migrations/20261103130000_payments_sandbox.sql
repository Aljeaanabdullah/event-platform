-- =====================================================================
-- Event Platform — Migration 12: جلسات الدفع التجريبي (Phase 8)
-- =====================================================================
-- * مزوّد "mock" للتطوير/الاختبار فقط (الواجهة تمنعه في Production).
-- * start_order_payment: المشتري يبدأ دفعة لطلبه — المبلغ يُؤخذ من قاعدة البيانات فقط.
-- * attach_payment_session: ربط معرّف جلسة المزوّد بالدفعة (لنفس المشتري فقط).
-- * mark_payment_failed: للخادم فقط (بعد التحقق من المزوّد) — فشل/إلغاء دون إصدار تذاكر.
-- * gateway_fee_fils: رسوم البوابة عند معرفتها (للتقارير فقط).
-- إصدار التذاكر المدفوعة يبقى حصرًا في confirm_order_payment (service_role).
-- =====================================================================

alter table public.payments drop constraint payments_provider_check;
alter table public.payments
  add constraint payments_provider_check check (provider in ('myfatoorah', 'tap', 'free', 'mock'));
alter table public.payments add column gateway_fee_fils bigint check (gateway_fee_fils >= 0);
alter table public.payments add column expires_at timestamptz;

create function public.start_order_payment(p_order_id uuid, p_provider text)
returns table (payment_id uuid, amount_fils bigint, currency char(3), order_number text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_order public.orders;
  v_payment_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if p_provider not in ('myfatoorah', 'tap', 'mock') then
    raise exception 'INVALID_PROVIDER' using errcode = '22023';
  end if;

  select * into v_order from public.orders where id = p_order_id and user_id = (select auth.uid()) for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_order.status <> 'pending_payment' or v_order.expires_at <= now() then
    raise exception 'ORDER_NOT_PAYABLE' using errcode = 'P0001';
  end if;
  if v_order.total_fils <= 0 then
    raise exception 'ORDER_NOT_PAYABLE' using errcode = 'P0001';
  end if;
  -- حد للمحاولات حتى لا تُنشأ جلسات بلا نهاية
  if (select count(*) from public.payments p where p.order_id = p_order_id) >= 5 then
    raise exception 'TOO_MANY_ATTEMPTS' using errcode = 'P0001';
  end if;

  -- محاولة سابقة لم تكتمل تُعتبر ملغاة (الدفعة الجديدة تحل محلها)
  update public.payments p set status = 'cancelled', failure_reason = 'superseded'
  where p.order_id = p_order_id and p.status in ('initiated', 'pending');

  insert into public.payments (order_id, provider, status, amount_fils, currency, idempotency_key, expires_at)
  values (p_order_id, p_provider, 'initiated', v_order.total_fils, v_order.currency,
          p_provider || ':init:' || gen_random_uuid(), v_order.expires_at)
  returning id into v_payment_id;

  return query select v_payment_id, v_order.total_fils, v_order.currency, v_order.order_number, v_order.expires_at;
end;
$$;

create function public.attach_payment_session(p_payment_id uuid, p_provider_payment_id text, p_invoice_id text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.payments p
  set provider_payment_id = left(p_provider_payment_id, 200),
      provider_invoice_id = left(p_invoice_id, 200),
      status = 'pending'
  where p.id = p_payment_id
    and p.status = 'initiated'
    and p.provider_payment_id is null
    and exists (select 1 from public.orders o where o.id = p.order_id and o.user_id = (select auth.uid()));
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

create function public.mark_payment_failed(
  p_payment_id uuid,
  p_status public.payment_status,
  p_reason text default null,
  p_raw jsonb default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.payment_status;
begin
  if p_status not in ('failed', 'cancelled') then
    raise exception 'INVALID_STATUS' using errcode = '22023';
  end if;
  select status into v_status from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  -- لا نُرجع دفعة ناجحة إلى فاشلة (الأحداث قد تصل بترتيب مختلف)
  if v_status = 'succeeded' then
    return 'ignored_succeeded';
  end if;
  update public.payments
  set status = p_status, failure_reason = left(p_reason, 500), raw_response = coalesce(p_raw, raw_response)
  where id = p_payment_id;
  return 'updated';
end;
$$;

revoke execute on function public.start_order_payment(uuid, text) from public;
revoke execute on function public.attach_payment_session(uuid, text, text) from public;
revoke execute on function public.mark_payment_failed(uuid, public.payment_status, text, jsonb) from public;
grant execute on function public.start_order_payment(uuid, text) to authenticated;
grant execute on function public.attach_payment_session(uuid, text, text) to authenticated;
grant execute on function public.mark_payment_failed(uuid, public.payment_status, text, jsonb) to service_role;
