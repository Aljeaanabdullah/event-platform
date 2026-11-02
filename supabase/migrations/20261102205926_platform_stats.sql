-- =====================================================================
-- Event Platform — Migration 8: إحصائيات عامة للمنصة (للصفحة الرئيسية)
-- =====================================================================
-- دالة قراءة فقط تُرجع أعدادًا إجمالية (بلا أي بيانات شخصية).
-- لازمة لأن RLS تمنع الزائر — بحق — من عدّ المستخدمين أو الطلبات مباشرة.
-- لا تعدّل أي جدول أو سياسة.
-- =====================================================================
create function public.get_platform_stats()
returns table (published_events bigint, approved_organizers bigint, registered_users bigint, tickets_sold bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.events where status = 'published'),
    (select count(*) from public.organizers where status = 'approved'),
    (select count(*) from public.profiles),
    (select coalesce(sum(quantity_sold), 0)::bigint from public.ticket_types);
$$;

revoke execute on function public.get_platform_stats() from public, service_role;
grant execute on function public.get_platform_stats() to anon, authenticated;
