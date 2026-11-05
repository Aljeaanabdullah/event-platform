-- =====================================================================
-- حذف كل بيانات الاختبار (الجهات is_test ومستخدمو e2e00000-*) وما يتبعها.
-- لا يمس أي بيانات حقيقية: كل الشروط مقيّدة بـ is_test أو بمعرّفات e2e00000-*.
-- ملاحظة: سجل التدقيق (audit_logs) إضافة فقط بالتصميم ولا يُحذف منه شيء.
-- =====================================================================

-- الطلبات المرتبطة بفعاليات اختبار أو بمستخدمي اختبار (ترتيب الحذف يحترم on delete restrict)
create or replace view pg_temp.test_orders as
  select o.id from public.orders o
  where o.user_id::text like 'e2e00000-%'
     or o.event_id in (
       select e.id from public.events e join public.organizers g on g.id = e.organizer_id where g.is_test
     );

delete from public.tickets where order_id in (select id from pg_temp.test_orders);
delete from public.refunds where order_id in (select id from pg_temp.test_orders);
delete from public.payout_items where order_id in (select id from pg_temp.test_orders);
delete from public.payments where order_id in (select id from pg_temp.test_orders);
delete from public.order_items where order_id in (select id from pg_temp.test_orders);
delete from public.orders where id in (select id from pg_temp.test_orders);
delete from public.payment_events where payload ->> 'test' = 'true';
delete from public.payouts where organizer_id in (select id from public.organizers where is_test);
delete from public.events where organizer_id in (select id from public.organizers where is_test);
delete from public.organizers where is_test;
delete from public.organizer_members where user_id::text like 'e2e00000-%';
delete from public.notifications where user_id::text like 'e2e00000-%';
delete from auth.users where id::text like 'e2e00000-%';
drop view pg_temp.test_orders;
