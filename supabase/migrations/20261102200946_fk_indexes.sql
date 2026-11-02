-- =====================================================================
-- Event Platform — Migration 6: فهارس المفاتيح الأجنبية المستخدمة في الاستعلامات
-- (من توصيات Supabase Performance Advisor)
-- =====================================================================
create index tickets_order_item_idx on public.tickets (order_item_id);
create index tickets_ticket_type_idx on public.tickets (ticket_type_id);
create index refunds_payment_idx on public.refunds (payment_id);
-- يُستخدم في apply_as_organizer لعدّ الطلبات المعلّقة لكل مستخدم
create index organizers_created_by_idx on public.organizers (created_by);
-- لوحة المنظّم: "فعالياتي"
create index events_created_by_idx on public.events (created_by);
