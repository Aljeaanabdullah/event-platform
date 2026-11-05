-- =====================================================================
-- Event Platform — Migration 11: التحقق اليدوي برمز التذكرة القصير (Phase 7)
-- =====================================================================
-- عند تعذّر مسح QR يُدخل الموظف الرمز المطبوع (T-XXXXXXXXXX).
-- تمر عبر check_in_ticket نفسها: نفس فحص العضوية والقفل ومنع إعادة الاستخدام.
-- =====================================================================

create function public.check_in_ticket_code(p_code text, p_event_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if p_code is null or upper(trim(p_code)) !~ '^T-[0-9A-F]{10}$' then
    return jsonb_build_object('result', 'invalid');
  end if;

  select t.qr_token into v_token from public.tickets t where t.code = upper(trim(p_code));
  if v_token is null then
    return jsonb_build_object('result', 'invalid');
  end if;
  return public.check_in_ticket(v_token, p_event_id);
end;
$$;

revoke execute on function public.check_in_ticket_code(text, uuid) from public;
grant execute on function public.check_in_ticket_code(text, uuid) to authenticated;
