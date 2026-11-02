-- =====================================================================
-- اختبارات قاعدة البيانات: RLS لكل دور + الحجز + الدفع + التحقق من QR
-- =====================================================================
-- طريقة العمل:
--   * كتلة DO واحدة تنشئ مستخدمين وبيانات اختبار، وتنتحل كل دور عبر
--     set_config('role') و request.jwt.claims (نفس آلية Supabase).
--   * في النهاية ترفع استثناء يحتوي ملخص النتائج => يتم التراجع عن كل شيء تلقائيًا
--     (لا يبقى أي أثر في قاعدة البيانات).
-- التشغيل: نفّذ الملف كاملًا عبر SQL Editor أو أداة execute_sql.
-- النتيجة المتوقعة: رسالة تبدأ بـ "TEST_SUMMARY passed=N failed=0".
-- =====================================================================
do $test$
declare
  -- المستخدمون
  u_admin uuid := gen_random_uuid();
  u_owner uuid := gen_random_uuid();
  u_scanner uuid := gen_random_uuid();
  u_c1 uuid := gen_random_uuid();
  u_c2 uuid := gen_random_uuid();
  -- البيانات
  v_org uuid;
  v_cat uuid;
  v_event uuid;
  v_draft_event uuid;
  v_tt_general uuid;
  v_tt_vip uuid;
  v_tt_free uuid;
  v_order record;
  v_order2 record;
  v_ticket uuid;
  v_token text;
  v_txt text;
  v_json jsonb;
  v_n bigint;
  v_rows integer;
  -- النتائج
  passed integer := 0;
  failures text[] := '{}';
begin
  -- ===== أدوات مساعدة (تُحاكى بإجراءات داخلية عبر set_config) =====
  -- لا يمكن تعريف دوال داخل DO؛ نستخدم أنماطًا متكررة واضحة.

  -- ===== إنشاء المستخدمين (كـ postgres) =====
  insert into auth.users (id, email, aud, role, raw_user_meta_data, created_at, updated_at)
  values
    (u_admin, 'admin@test.local', 'authenticated', 'authenticated', '{"full_name":"Admin"}', now(), now()),
    (u_owner, 'owner@test.local', 'authenticated', 'authenticated', '{"name":"Owner","locale":"en-US"}', now(), now()),
    (u_scanner, 'scanner@test.local', 'authenticated', 'authenticated', '{}', now(), now()),
    (u_c1, 'c1@test.local', 'authenticated', 'authenticated', '{"full_name":"عميل واحد","picture":"https://x/a.png"}', now(), now()),
    (u_c2, 'c2@test.local', 'authenticated', 'authenticated', '{}', now(), now());

  -- T01: إنشاء الملف الشخصي تلقائيًا بالدور الافتراضي
  select count(*) into v_n from public.profiles
  where id in (u_admin, u_owner, u_scanner, u_c1, u_c2) and platform_role = 'customer';
  if v_n = 5 and (select full_name from public.profiles where id = u_c1) = 'عميل واحد'
     and (select preferred_locale from public.profiles where id = u_owner) = 'en'
     and (select avatar_url from public.profiles where id = u_c1) = 'https://x/a.png' then
    passed := passed + 1; else failures := failures || 'T01 profile auto-create'; end if;

  -- أول مدير يُعيَّن يدويًا (كما سيحدث في الإنتاج عبر SQL Editor)
  update public.profiles set platform_role = 'admin' where id = u_admin;
  select id into v_cat from public.event_categories where slug = 'music';

  -- ===================================================================
  -- العميل c1
  -- ===================================================================
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_c1, 'role', 'authenticated')::text, true);

  -- T02: لا يستطيع ترقية نفسه إلى مدير
  begin
    update public.profiles set platform_role = 'admin' where id = u_c1;
    failures := failures || 'T02 self-promote should fail';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- T03: يعدّل اسمه
  update public.profiles set full_name = 'C1 updated' where id = u_c1;
  get diagnostics v_rows = row_count;
  if v_rows = 1 then passed := passed + 1; else failures := failures || 'T03 update own name'; end if;

  -- T04: لا يرى ملفات الآخرين
  select count(*) into v_n from public.profiles;
  if v_n = 1 then passed := passed + 1; else failures := failures || ('T04 sees ' || v_n || ' profiles'); end if;

  -- T05: لا يستطيع استدعاء set_user_role
  begin
    perform public.set_user_role(u_c1, 'admin');
    failures := failures || 'T05 set_user_role should fail';
  exception when others then
    if sqlerrm = 'FORBIDDEN' then passed := passed + 1; else failures := failures || ('T05 ' || sqlerrm); end if;
  end;

  -- T06: لا يستطيع تأكيد دفع بنفسه (الدالة للخادم فقط)
  begin
    perform public.confirm_order_payment(gen_random_uuid(), 'myfatoorah', 'x', 0);
    failures := failures || 'T06 confirm_order_payment should be denied';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- T07: لا يقرأ سجل التدقيق ولا جدول rate_limits
  select count(*) into v_n from public.audit_logs;
  if v_n = 0 then passed := passed + 1; else failures := failures || 'T07 customer reads audit_logs'; end if;
  begin
    perform 1 from public.rate_limits;
    failures := failures || 'T07b rate_limits readable';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- ===================================================================
  -- المنظّم (owner): طلب انضمام → لا يستطيع النشر قبل الاعتماد
  -- ===================================================================
  perform set_config('request.jwt.claims', json_build_object('sub', u_owner, 'role', 'authenticated')::text, true);

  v_org := public.apply_as_organizer('test-org', 'جهة اختبار', 'Test Org', 'org@test.local');
  if (select status from public.organizers where id = v_org) = 'pending' then
    passed := passed + 1; else failures := failures || 'T08 apply pending'; end if;

  -- T09: لا يستطيع إنشاء فعالية قبل الاعتماد
  begin
    insert into public.events (organizer_id, category_id, slug, title_ar, title_en, starts_at, ends_at, created_by)
    values (v_org, v_cat, 'early-event', 'فعالية مبكرة', 'Early event', now() + interval '10 days', now() + interval '10 days 3 hours', u_owner);
    failures := failures || 'T09 event before approval should fail';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- T10: لا يستطيع اعتماد جهته بنفسه
  begin
    update public.organizers set status = 'approved' where id = v_org;
    failures := failures || 'T10 self-approve should fail';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- ===== المدير يعتمد الجهة =====
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  perform public.set_organizer_status(v_org, 'approved');
  if (select status from public.organizers where id = v_org) = 'approved' then
    passed := passed + 1; else failures := failures || 'T11 admin approve'; end if;

  -- T12: المدير لا يستطيع تغيير دوره هو
  begin
    perform public.set_user_role(u_admin, 'customer');
    failures := failures || 'T12 admin self-demote should fail';
  exception when others then
    if sqlerrm = 'CANNOT_CHANGE_OWN_ROLE' then passed := passed + 1; else failures := failures || ('T12 ' || sqlerrm); end if;
  end;

  -- ===== المنظّم ينشئ الفعالية والتذاكر =====
  perform set_config('request.jwt.claims', json_build_object('sub', u_owner, 'role', 'authenticated')::text, true);

  insert into public.events (organizer_id, category_id, slug, title_ar, title_en, governorate, venue_name_en, starts_at, ends_at, created_by)
  values (v_org, v_cat, 'jazz-night', 'ليلة جاز', 'Jazz Night', 'hawalli', 'Hall', now() + interval '10 days', now() + interval '10 days 3 hours', u_owner)
  returning id into v_event;

  insert into public.events (organizer_id, category_id, slug, title_ar, title_en, starts_at, ends_at, created_by)
  values (v_org, v_cat, 'draft-only', 'مسودة فقط', 'Draft only', now() + interval '20 days', now() + interval '20 days 2 hours', u_owner)
  returning id into v_draft_event;

  insert into public.ticket_types (event_id, name_ar, name_en, price_fils, quantity_total, max_per_order)
  values (v_event, 'عام', 'General', 5000, 3, 5) returning id into v_tt_general;
  insert into public.ticket_types (event_id, name_ar, name_en, price_fils, quantity_total)
  values (v_event, 'كبار الشخصيات', 'VIP', 25000, 10) returning id into v_tt_vip;
  insert into public.ticket_types (event_id, name_ar, name_en, price_fils, quantity_total)
  values (v_event, 'مجاني', 'Free', 0, 100) returning id into v_tt_free;
  passed := passed + 1; -- T13 إنشاء مسودة وتذاكر

  -- T14: لا يستطيع نشر الفعالية مباشرة بتعديل الحالة
  begin
    update public.events set status = 'published' where id = v_event;
    failures := failures || 'T14 direct publish should fail';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- T15: لا يستطيع التلاعب بعدادات المبيعات
  begin
    update public.ticket_types set quantity_sold = 0 where id = v_tt_general;
    failures := failures || 'T15 counter tamper should fail';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  perform public.submit_event_for_review(v_event);

  -- ===== الزائر (anon) والعميل لا يريان المسودات أو المعلّقة =====
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into v_n from public.events where id in (v_event, v_draft_event);
  if v_n = 0 then passed := passed + 1; else failures := failures || 'T16 anon sees unpublished'; end if;

  -- T17: الزائر لا يقرأ بيانات تواصل المنظّم ولا الطلبات
  begin
    perform contact_email from public.organizers;
    failures := failures || 'T17 anon reads contact_email';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  begin
    perform 1 from public.orders;
    failures := failures || 'T17b anon reads orders';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- T18: الزائر يرى الإعدادات العامة فقط
  select count(*) into v_n from public.platform_settings where key in ('service_fee_bps', 'default_commission_bps');
  if v_n = 1 then passed := passed + 1; else failures := failures || ('T18 anon settings=' || v_n); end if;

  -- ===== المدير يعتمد الفعالية =====
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  perform public.review_event(v_event, true);

  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into v_n from public.events where id = v_event and status = 'published';
  if v_n = 1 then passed := passed + 1; else failures := failures || 'T19 anon sees published'; end if;

  -- T20: الزائر لا يستطيع الحجز
  begin
    perform public.reserve_tickets(v_event, jsonb_build_array(jsonb_build_object('ticket_type_id', v_tt_general, 'quantity', 1)));
    failures := failures || 'T20 anon reserve should fail';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- T21: المنظّم لا يعدّل فعالية منشورة مباشرة
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_owner, 'role', 'authenticated')::text, true);
  update public.events set title_en = 'Hacked' where id = v_event;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then passed := passed + 1; else failures := failures || 'T21 edit published'; end if;

  -- ===================================================================
  -- الحجز ومنع تجاوز المخزون
  -- ===================================================================
  perform set_config('request.jwt.claims', json_build_object('sub', u_c1, 'role', 'authenticated')::text, true);

  select * into v_order from public.reserve_tickets(
    v_event, jsonb_build_array(jsonb_build_object('ticket_type_id', v_tt_general, 'quantity', 2)), 'C1', 'c1@test.local');
  if v_order.status = 'pending_payment' and v_order.total_fils = 10000
     and (select quantity_reserved from public.ticket_types where id = v_tt_general) = 2 then
    passed := passed + 1; else failures := failures || 'T22 reserve'; end if;

  -- T23: العمولة تُحسب على الخادم (5% افتراضيًا)
  if (select platform_commission_fils from public.orders where id = v_order.order_id) = 500
     and (select organizer_net_fils from public.orders where id = v_order.order_id) = 9500 then
    passed := passed + 1; else failures := failures || 'T23 commission'; end if;

  -- T24: عميل آخر يطلب 2 والمتبقي 1 فقط => SOLD_OUT
  perform set_config('request.jwt.claims', json_build_object('sub', u_c2, 'role', 'authenticated')::text, true);
  begin
    perform public.reserve_tickets(v_event, jsonb_build_array(jsonb_build_object('ticket_type_id', v_tt_general, 'quantity', 2)));
    failures := failures || 'T24 overbooking allowed!';
  exception when others then
    if sqlerrm = 'SOLD_OUT' then passed := passed + 1; else failures := failures || ('T24 ' || sqlerrm); end if;
  end;

  -- T25: مدخلات غير صالحة (كمية سالبة، تذكرة مكررة، تذكرة من فعالية أخرى)
  begin
    perform public.reserve_tickets(v_event, jsonb_build_array(jsonb_build_object('ticket_type_id', v_tt_vip, 'quantity', -1)));
    failures := failures || 'T25a negative qty';
  exception when others then
    if sqlerrm = 'INVALID_ITEMS' then passed := passed + 1; else failures := failures || ('T25a ' || sqlerrm); end if;
  end;
  begin
    perform public.reserve_tickets(v_event, jsonb_build_array(
      jsonb_build_object('ticket_type_id', v_tt_vip, 'quantity', 1),
      jsonb_build_object('ticket_type_id', v_tt_vip, 'quantity', 1)));
    failures := failures || 'T25b duplicate type';
  exception when others then
    if sqlerrm = 'INVALID_ITEMS' then passed := passed + 1; else failures := failures || ('T25b ' || sqlerrm); end if;
  end;
  begin
    perform public.reserve_tickets(v_draft_event, jsonb_build_array(jsonb_build_object('ticket_type_id', v_tt_vip, 'quantity', 1)));
    failures := failures || 'T25c draft event';
  exception when others then
    if sqlerrm = 'EVENT_NOT_ON_SALE' then passed := passed + 1; else failures := failures || ('T25c ' || sqlerrm); end if;
  end;
  begin
    perform public.reserve_tickets(v_event, jsonb_build_array(jsonb_build_object('ticket_type_id', v_tt_vip, 'quantity', 11)));
    failures := failures || 'T25d above max_per_order';
  exception when others then
    if sqlerrm = 'INVALID_QUANTITY' then passed := passed + 1; else failures := failures || ('T25d ' || sqlerrm); end if;
  end;

  -- T26: c2 لا يرى طلب c1
  select count(*) into v_n from public.orders where id = v_order.order_id;
  if v_n = 0 then passed := passed + 1; else failures := failures || 'T26 c2 sees c1 order'; end if;

  -- T27: المنظّم (المالك) يرى طلبات فعاليته
  perform set_config('request.jwt.claims', json_build_object('sub', u_owner, 'role', 'authenticated')::text, true);
  select count(*) into v_n from public.orders where id = v_order.order_id;
  if v_n = 1 then passed := passed + 1; else failures := failures || 'T27 owner sees order'; end if;

  -- ===================================================================
  -- تأكيد الدفع (كخادم) + Idempotency
  -- ===================================================================
  perform set_config('role', 'postgres', true);

  begin
    perform public.confirm_order_payment(v_order.order_id, 'myfatoorah', 'PAY-1', 9999);
    failures := failures || 'T28 amount mismatch accepted';
  exception when others then
    if sqlerrm = 'AMOUNT_MISMATCH' then passed := passed + 1; else failures := failures || ('T28 ' || sqlerrm); end if;
  end;

  v_txt := public.confirm_order_payment(v_order.order_id, 'myfatoorah', 'PAY-1', 10000);
  if v_txt = 'paid' and (select count(*) from public.tickets where order_id = v_order.order_id) = 2
     and (select quantity_sold from public.ticket_types where id = v_tt_general) = 2
     and (select quantity_reserved from public.ticket_types where id = v_tt_general) = 0 then
    passed := passed + 1; else failures := failures || ('T29 confirm=' || v_txt); end if;

  -- T30: نفس الـ Webhook مرة ثانية => لا تذاكر إضافية
  v_txt := public.confirm_order_payment(v_order.order_id, 'myfatoorah', 'PAY-1', 10000);
  if v_txt = 'already_paid' and (select count(*) from public.tickets where order_id = v_order.order_id) = 2 then
    passed := passed + 1; else failures := failures || ('T30 idempotency=' || v_txt); end if;

  -- T31: دفعة مختلفة لنفس الطلب => دفع مكرر يحتاج استرجاعًا
  v_txt := public.confirm_order_payment(v_order.order_id, 'myfatoorah', 'PAY-2', 10000);
  if v_txt = 'duplicate_payment' and (select count(*) from public.tickets where order_id = v_order.order_id) = 2 then
    passed := passed + 1; else failures := failures || ('T31 duplicate=' || v_txt); end if;

  -- ===================================================================
  -- التذاكر و QR
  -- ===================================================================
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_c1, 'role', 'authenticated')::text, true);

  select count(*) into v_n from public.tickets where owner_user_id = u_c1;
  if v_n = 2 then passed := passed + 1; else failures := failures || 'T32 owner reads tickets'; end if;

  -- T33: عمود qr_token غير قابل للقراءة مباشرة
  begin
    perform qr_token from public.tickets;
    failures := failures || 'T33 qr_token readable';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  select id into v_ticket from public.tickets where order_id = v_order.order_id order by code limit 1;
  v_token := public.get_ticket_qr_token(v_ticket);
  if v_token ~ '^[0-9a-f]{64}$' then passed := passed + 1; else failures := failures || 'T34 owner gets token'; end if;

  -- T35: مستخدم آخر لا يحصل على الرمز، والتحقق منه يُرجع invalid
  perform set_config('request.jwt.claims', json_build_object('sub', u_c2, 'role', 'authenticated')::text, true);
  if public.get_ticket_qr_token(v_ticket) is null
     and public.check_in_ticket(v_token) ->> 'result' = 'invalid' then
    passed := passed + 1; else failures := failures || 'T35 non-staff token/check-in'; end if;

  -- T36: المنظّم يضيف مسؤول بوابة (scanner)، ولا يستطيع إضافة "مالك"
  perform set_config('request.jwt.claims', json_build_object('sub', u_owner, 'role', 'authenticated')::text, true);
  insert into public.organizer_members (organizer_id, user_id, role) values (v_org, u_scanner, 'scanner');
  begin
    insert into public.organizer_members (organizer_id, user_id, role) values (v_org, u_c2, 'owner');
    failures := failures || 'T36 add owner should fail';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- T37: مسؤول البوابة يتحقق من التذكرة => ok ثم already_used
  perform set_config('request.jwt.claims', json_build_object('sub', u_scanner, 'role', 'authenticated')::text, true);
  v_json := public.check_in_ticket(v_token, v_event);
  if v_json ->> 'result' = 'ok' and v_json ->> 'event_title_en' = 'Jazz Night' then
    passed := passed + 1; else failures := failures || ('T37 check-in=' || v_json::text); end if;

  v_json := public.check_in_ticket(v_token, v_event);
  if v_json ->> 'result' = 'already_used' then passed := passed + 1;
  else failures := failures || ('T38 reuse=' || v_json::text); end if;

  -- T39: فعالية خاطئة
  v_json := public.check_in_ticket(v_token, v_draft_event);
  if v_json ->> 'result' = 'wrong_event' then passed := passed + 1; else failures := failures || 'T39 wrong_event'; end if;

  -- T40: مسؤول البوابة لا يرى الطلبات (بيانات المشترين)
  select count(*) into v_n from public.orders;
  if v_n = 0 then passed := passed + 1; else failures := failures || 'T40 scanner sees orders'; end if;

  -- ===================================================================
  -- انتهاء الحجز المؤقت والدفع المتأخر
  -- ===================================================================
  perform set_config('request.jwt.claims', json_build_object('sub', u_c2, 'role', 'authenticated')::text, true);
  select * into v_order2 from public.reserve_tickets(
    v_event, jsonb_build_array(jsonb_build_object('ticket_type_id', v_tt_general, 'quantity', 1)));

  perform set_config('role', 'postgres', true);
  update public.orders set expires_at = now() - interval '1 minute' where id = v_order2.order_id;
  perform public.release_expired_holds();
  if (select status from public.orders where id = v_order2.order_id) = 'expired'
     and (select quantity_reserved from public.ticket_types where id = v_tt_general) = 0 then
    passed := passed + 1; else failures := failures || 'T41 hold release'; end if;

  -- T42: دفع متأخر والتذكرة ما زالت متاحة => يُقبل
  v_txt := public.confirm_order_payment(v_order2.order_id, 'myfatoorah', 'PAY-LATE-1', 5000);
  if v_txt = 'paid' and (select quantity_sold from public.ticket_types where id = v_tt_general) = 3 then
    passed := passed + 1; else failures := failures || ('T42 late paid=' || v_txt); end if;

  -- T43: دفع متأخر بعد نفاد التذاكر => needs_refund وبدون تذاكر
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_c2, 'role', 'authenticated')::text, true);
  select * into v_order2 from public.reserve_tickets(
    v_event, jsonb_build_array(jsonb_build_object('ticket_type_id', v_tt_vip, 'quantity', 10)));
  perform set_config('role', 'postgres', true);
  update public.orders set expires_at = now() - interval '1 minute' where id = v_order2.order_id;
  perform public.release_expired_holds();
  update public.ticket_types set quantity_sold = 10 where id = v_tt_vip; -- بيعت لغيره
  v_txt := public.confirm_order_payment(v_order2.order_id, 'myfatoorah', 'PAY-LATE-2', 250000);
  if v_txt = 'needs_refund' and (select count(*) from public.tickets where order_id = v_order2.order_id) = 0 then
    passed := passed + 1; else failures := failures || ('T43 late soldout=' || v_txt); end if;

  -- T44: قيد السعة يمنع التجاوز حتى لو تجاوزنا الدوال
  begin
    update public.ticket_types set quantity_reserved = 1 where id = v_tt_vip;
    failures := failures || 'T44 capacity constraint';
  exception when check_violation then passed := passed + 1;
  end;

  -- ===================================================================
  -- تذاكر مجانية، حد الطلبات المعلّقة، الإلغاء، المفضلة
  -- ===================================================================
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_c1, 'role', 'authenticated')::text, true);

  select * into v_order2 from public.reserve_tickets(
    v_event, jsonb_build_array(jsonb_build_object('ticket_type_id', v_tt_free, 'quantity', 2)));
  if v_order2.status = 'paid' and v_order2.total_fils = 0
     and (select count(*) from public.tickets where order_id = v_order2.order_id) = 2 then
    passed := passed + 1; else failures := failures || 'T45 free order'; end if;

  -- T46: إلغاء طلب معلّق يحرر الحجز
  perform set_config('role', 'postgres', true);
  update public.ticket_types set quantity_sold = 0 where id = v_tt_vip;
  perform set_config('role', 'authenticated', true);
  select * into v_order2 from public.reserve_tickets(
    v_event, jsonb_build_array(jsonb_build_object('ticket_type_id', v_tt_vip, 'quantity', 1)));
  perform public.cancel_pending_order(v_order2.order_id);
  if (select status from public.orders where id = v_order2.order_id) = 'cancelled'
     and (select quantity_reserved from public.ticket_types where id = v_tt_vip) = 0 then
    passed := passed + 1; else failures := failures || 'T46 cancel pending'; end if;

  -- T47: حد الطلبات المعلّقة (3)
  perform public.reserve_tickets(v_event, jsonb_build_array(jsonb_build_object('ticket_type_id', v_tt_vip, 'quantity', 1)));
  perform public.reserve_tickets(v_event, jsonb_build_array(jsonb_build_object('ticket_type_id', v_tt_vip, 'quantity', 1)));
  perform public.reserve_tickets(v_event, jsonb_build_array(jsonb_build_object('ticket_type_id', v_tt_vip, 'quantity', 1)));
  begin
    perform public.reserve_tickets(v_event, jsonb_build_array(jsonb_build_object('ticket_type_id', v_tt_vip, 'quantity', 1)));
    failures := failures || 'T47 pending limit';
  exception when others then
    if sqlerrm = 'TOO_MANY_PENDING_ORDERS' then passed := passed + 1; else failures := failures || ('T47 ' || sqlerrm); end if;
  end;

  -- T48: المفضلة: فعالية منشورة نعم، مسودة لا
  insert into public.favorites (user_id, event_id) values (u_c1, v_event);
  begin
    insert into public.favorites (user_id, event_id) values (u_c1, v_draft_event);
    failures := failures || 'T48 favorite draft';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- T49: الأكثر شعبية من بيانات فعلية
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select tickets_sold into v_n from public.get_popular_events(5) where event_id = v_event;
  if v_n = 5 then passed := passed + 1; else failures := failures || ('T49 popular sold=' || coalesce(v_n, -1)); end if;

  -- ===================================================================
  -- سجل التدقيق
  -- ===================================================================
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  select count(*) into v_n from public.audit_logs
  where (entity_type = 'organizers' and entity_id = v_org::text) or (entity_type = 'events' and entity_id = v_event::text);
  if v_n >= 3 then passed := passed + 1; else failures := failures || ('T50 audit rows=' || v_n); end if;

  perform set_config('role', 'postgres', true);
  begin
    update public.audit_logs set action = 'tampered';
    failures := failures || 'T51 audit update allowed';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  begin
    delete from public.audit_logs;
    failures := failures || 'T51b audit delete allowed';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- T52: مسار التخزين
  if public.storage_path_organizer(v_org::text || '/events/cover.webp') = v_org
     and public.storage_path_organizer('../etc/passwd') is null then
    passed := passed + 1; else failures := failures || 'T52 storage path'; end if;

  -- ===== النتيجة (الاستثناء يُلغي كل التغييرات) =====
  raise exception 'TEST_SUMMARY passed=% failed=% %', passed, coalesce(array_length(failures, 1), 0), array_to_string(failures, ' | ');
end;
$test$;
