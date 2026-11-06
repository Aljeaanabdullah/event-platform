-- التحديث المباشر لحالة الدفع في لوحة الإدارة.
-- Realtime يطبّق RLS: المدير يرى كل التغييرات، والمشتري يرى طلباته فقط.
alter publication supabase_realtime add table public.orders, public.payments;
