-- =====================================================================
-- Event Platform — Migration 3: الصلاحيات وسياسات RLS
-- =====================================================================
-- طبقتان للحماية:
--   1) GRANT على مستوى الأعمدة: يحدد ما يمكن قراءته/تعديله أصلًا
--      (مثلًا: لا أحد يستطيع تعديل platform_role أو status أو عدادات التذاكر مباشرة).
--   2) RLS: يحدد أي الصفوف يراها/يعدّلها كل مستخدم.
-- العمليات الحساسة (الحجز، الدفع، المراجعة، الأدوار) تتم فقط عبر دوال SECURITY DEFINER.
-- ملاحظة: (select auth.uid()) داخل السياسات لتقييمها مرة واحدة لكل استعلام (أداء أفضل).
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (full_name, phone, avatar_url, preferred_locale) on public.profiles to authenticated;

create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- organizers
-- الزوار يرون الأعمدة العامة للجهات المعتمدة فقط
-- ---------------------------------------------------------------------
grant select (id, slug, name_ar, name_en, description_ar, description_en, logo_path, website_url, status, created_at)
  on public.organizers to anon;
grant select on public.organizers to authenticated;
grant update (name_ar, name_en, description_ar, description_en, logo_path, contact_email, contact_phone, website_url)
  on public.organizers to authenticated;

create policy "organizers: public read approved" on public.organizers
  for select to anon
  using (status = 'approved');

create policy "organizers: read approved, own, or admin" on public.organizers
  for select to authenticated
  using (status = 'approved' or public.is_org_member(id) or public.is_admin());

create policy "organizers: owner/manager update profile" on public.organizers
  for update to authenticated
  using (public.is_org_member(id, array['owner', 'manager']::public.member_role[]) or public.is_admin())
  with check (public.is_org_member(id, array['owner', 'manager']::public.member_role[]) or public.is_admin());

-- ---------------------------------------------------------------------
-- organizer_members
-- ---------------------------------------------------------------------
grant select, insert, delete on public.organizer_members to authenticated;
grant update (role) on public.organizer_members to authenticated;

create policy "members: read own org or admin" on public.organizer_members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_org_member(organizer_id) or public.is_admin());

-- المالك يدير الأعضاء الآخرين، ولا يمكن إنشاء/تعديل/حذف دور "مالك" من الواجهة
create policy "members: owner adds non-owner members" on public.organizer_members
  for insert to authenticated
  with check (role <> 'owner' and public.is_org_member(organizer_id, array['owner']::public.member_role[]));

create policy "members: owner updates non-owner members" on public.organizer_members
  for update to authenticated
  using (role <> 'owner' and public.is_org_member(organizer_id, array['owner']::public.member_role[]))
  with check (role <> 'owner' and public.is_org_member(organizer_id, array['owner']::public.member_role[]));

create policy "members: owner removes non-owner members" on public.organizer_members
  for delete to authenticated
  using (role <> 'owner' and public.is_org_member(organizer_id, array['owner']::public.member_role[]));

-- ---------------------------------------------------------------------
-- event_categories
-- ---------------------------------------------------------------------
grant select on public.event_categories to anon, authenticated;
grant insert, update on public.event_categories to authenticated;

create policy "categories: public read active" on public.event_categories
  for select to anon, authenticated
  using (is_active or public.is_admin());

create policy "categories: admin insert" on public.event_categories
  for insert to authenticated with check (public.is_admin());

create policy "categories: admin update" on public.event_categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- events
-- الحالة (status) والتمييز (is_featured) لا تُعدَّل إلا عبر دوال المراجعة.
-- المنظّم يعدّل المحتوى فقط في حالتي المسودة والمرفوضة.
-- ---------------------------------------------------------------------
grant select (
  id, organizer_id, category_id, slug, title_ar, title_en, summary_ar, summary_en, description_ar, description_en,
  cover_image_path, venue_name_ar, venue_name_en, address_ar, address_en, governorate, area, latitude, longitude,
  is_online, starts_at, ends_at, timezone, status, is_featured, published_at, cancelled_at, cancellation_reason,
  created_at, updated_at, search_vector
) on public.events to anon;
grant select on public.events to authenticated;

grant insert (
  organizer_id, category_id, slug, title_ar, title_en, summary_ar, summary_en, description_ar, description_en,
  cover_image_path, venue_name_ar, venue_name_en, address_ar, address_en, governorate, area, latitude, longitude,
  is_online, starts_at, ends_at, created_by
) on public.events to authenticated;

grant update (
  category_id, slug, title_ar, title_en, summary_ar, summary_en, description_ar, description_en,
  cover_image_path, venue_name_ar, venue_name_en, address_ar, address_en, governorate, area, latitude, longitude,
  is_online, starts_at, ends_at
) on public.events to authenticated;

grant delete on public.events to authenticated;

create policy "events: public read published" on public.events
  for select to anon
  using (status in ('published', 'cancelled'));

create policy "events: read published, own org, or admin" on public.events
  for select to authenticated
  using (status in ('published', 'cancelled') or public.is_org_member(organizer_id) or public.is_admin());

create policy "events: managers create drafts" on public.events
  for insert to authenticated
  with check (
    status = 'draft'
    and created_by = (select auth.uid())
    and public.can_manage_organizer(organizer_id)
  );

create policy "events: managers edit drafts, admin edits any" on public.events
  for update to authenticated
  using ((status in ('draft', 'rejected') and public.can_manage_organizer(organizer_id)) or public.is_admin())
  with check ((status in ('draft', 'rejected') and public.can_manage_organizer(organizer_id)) or public.is_admin());

create policy "events: managers delete drafts" on public.events
  for delete to authenticated
  using (status = 'draft' and public.can_manage_organizer(organizer_id));

-- ---------------------------------------------------------------------
-- event_images
-- ---------------------------------------------------------------------
grant select on public.event_images to anon, authenticated;
grant insert, delete on public.event_images to authenticated;
grant update (alt_ar, alt_en, sort_order) on public.event_images to authenticated;

create policy "event_images: read if event visible" on public.event_images
  for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id));

create policy "event_images: managers insert" on public.event_images
  for insert to authenticated
  with check (exists (
    select 1 from public.events e
    where e.id = event_id and e.status in ('draft', 'rejected') and public.can_manage_organizer(e.organizer_id)
  ));

create policy "event_images: managers update" on public.event_images
  for update to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_id and e.status in ('draft', 'rejected') and public.can_manage_organizer(e.organizer_id)
  ));

create policy "event_images: managers delete" on public.event_images
  for delete to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_id and e.status in ('draft', 'rejected') and public.can_manage_organizer(e.organizer_id)
  ));

-- ---------------------------------------------------------------------
-- ticket_types
-- عدادات المباع/المحجوز لا تُعدَّل إلا من دوال الحجز
-- ---------------------------------------------------------------------
grant select on public.ticket_types to anon, authenticated;
grant insert (
  event_id, name_ar, name_en, description_ar, description_en, price_fils, quantity_total,
  min_per_order, max_per_order, sales_start_at, sales_end_at, is_active, sort_order
) on public.ticket_types to authenticated;
grant update (
  name_ar, name_en, description_ar, description_en, price_fils, quantity_total,
  min_per_order, max_per_order, sales_start_at, sales_end_at, is_active, sort_order
) on public.ticket_types to authenticated;
grant delete on public.ticket_types to authenticated;

create policy "ticket_types: read if event visible" on public.ticket_types
  for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id));

create policy "ticket_types: managers insert" on public.ticket_types
  for insert to authenticated
  with check (exists (
    select 1 from public.events e
    where e.id = event_id and e.status in ('draft', 'rejected') and public.can_manage_organizer(e.organizer_id)
  ));

create policy "ticket_types: managers update" on public.ticket_types
  for update to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_id and e.status in ('draft', 'rejected') and public.can_manage_organizer(e.organizer_id)
  ))
  with check (exists (
    select 1 from public.events e
    where e.id = event_id and e.status in ('draft', 'rejected') and public.can_manage_organizer(e.organizer_id)
  ));

create policy "ticket_types: managers delete unsold" on public.ticket_types
  for delete to authenticated
  using (
    quantity_sold = 0 and quantity_reserved = 0
    and exists (
      select 1 from public.events e
      where e.id = event_id and e.status in ('draft', 'rejected') and public.can_manage_organizer(e.organizer_id)
    )
  );

-- ---------------------------------------------------------------------
-- orders / order_items — القراءة فقط؛ الإنشاء والتعديل عبر دوال الحجز والدفع
-- ---------------------------------------------------------------------
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;

create policy "orders: buyer, event managers, or admin" on public.orders
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_admin()
    or exists (
      select 1 from public.events e
      where e.id = event_id and public.is_org_member(e.organizer_id, array['owner', 'manager']::public.member_role[])
    )
  );

create policy "order_items: if order visible" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));

-- ---------------------------------------------------------------------
-- payments — بدون raw_response؛ payment_events للمدير فقط
-- ---------------------------------------------------------------------
grant select (
  id, order_id, provider, provider_payment_id, status, amount_fils, currency, method, failure_reason, created_at, updated_at
) on public.payments to authenticated;

create policy "payments: buyer or admin" on public.payments
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
  );

grant select on public.payment_events to authenticated;
create policy "payment_events: admin only" on public.payment_events
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- tickets — رمز QR (qr_token) غير قابل للقراءة مباشرة لأي دور
-- ---------------------------------------------------------------------
grant select (
  id, order_id, order_item_id, ticket_type_id, event_id, owner_user_id, code, status,
  checked_in_at, checked_in_by, voided_at, void_reason, created_at, updated_at
) on public.tickets to authenticated;

create policy "tickets: owner, event staff, or admin" on public.tickets
  for select to authenticated
  using (
    owner_user_id = (select auth.uid())
    or public.is_admin()
    or exists (select 1 from public.events e where e.id = event_id and public.is_org_member(e.organizer_id))
  );

-- ---------------------------------------------------------------------
-- favorites
-- ---------------------------------------------------------------------
grant select, insert, delete on public.favorites to authenticated;

create policy "favorites: read own" on public.favorites
  for select to authenticated using (user_id = (select auth.uid()));

create policy "favorites: add own for published events" on public.favorites
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.events e where e.id = event_id and e.status = 'published')
  );

create policy "favorites: remove own" on public.favorites
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- refunds / payouts
-- ---------------------------------------------------------------------
grant select on public.refunds to authenticated;
create policy "refunds: buyer, event managers, or admin" on public.refunds
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));

grant select, insert on public.payouts to authenticated;
grant update (status, reference, notes, paid_at) on public.payouts to authenticated;
create policy "payouts: organizer owners/managers or admin" on public.payouts
  for select to authenticated
  using (public.is_admin() or public.is_org_member(organizer_id, array['owner', 'manager']::public.member_role[]));
create policy "payouts: admin insert" on public.payouts
  for insert to authenticated with check (public.is_admin());
create policy "payouts: admin update" on public.payouts
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert on public.payout_items to authenticated;
create policy "payout_items: if payout visible" on public.payout_items
  for select to authenticated
  using (exists (select 1 from public.payouts p where p.id = payout_id));
create policy "payout_items: admin insert" on public.payout_items
  for insert to authenticated with check (public.is_admin());

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "notifications: read own" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: mark own as read" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- platform_settings
-- ---------------------------------------------------------------------
grant select on public.platform_settings to anon, authenticated;
grant insert, delete on public.platform_settings to authenticated;
grant update (value, description, is_public, updated_by) on public.platform_settings to authenticated;

create policy "settings: public keys or admin" on public.platform_settings
  for select to anon, authenticated
  using (is_public or public.is_admin());
create policy "settings: admin insert" on public.platform_settings
  for insert to authenticated with check (public.is_admin());
create policy "settings: admin update" on public.platform_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "settings: admin delete" on public.platform_settings
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- audit_logs — قراءة للمدير فقط. لا إضافة مباشرة (تُضاف عبر الدوال والـ Triggers)
-- ---------------------------------------------------------------------
grant select on public.audit_logs to authenticated;
create policy "audit_logs: admin read" on public.audit_logs
  for select to authenticated using (public.is_admin());

-- rate_limits: لا صلاحيات إطلاقًا لـ anon/authenticated (RLS مفعّل بلا سياسات)
