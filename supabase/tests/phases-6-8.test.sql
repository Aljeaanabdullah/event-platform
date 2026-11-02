-- =====================================================================
-- اختبارات قاعدة البيانات للمراحل 6–8
-- =====================================================================
-- نفس آلية database.test.sql: كتلة DO واحدة، انتحال الأدوار عبر set_config،
-- وفي النهاية استثناء يحمل الملخص => يُلغى كل شيء (لا يبقى أي أثر).
-- النتيجة المتوقعة: "TEST_SUMMARY passed=N failed=0".
-- =====================================================================
do $test$
declare
  u_admin uuid := gen_random_uuid();
  u_owner uuid := gen_random_uuid();
  u_other uuid := gen_random_uuid();
  u_scanner uuid := gen_random_uuid();
  u_c1 uuid := gen_random_uuid();
  u_c2 uuid := gen_random_uuid();
  v_org uuid := gen_random_uuid();
  v_org2 uuid := gen_random_uuid();
  v_cat uuid;
  v_event uuid;
  v_event2 uuid;
  v_tt uuid;
  v_tt_free uuid;
  v_order record;
  v_pay record;
  v_ticket record;
  v_txt text;
  v_json jsonb;
  v_n bigint;
  v_rows integer;
  passed integer := 0;
  failures text[] := '{}';
begin
  insert into auth.users (id, email, aud, role, raw_user_meta_data, created_at, updated_at)
  values
    (u_admin, 'p6-admin@test.local', 'authenticated', 'authenticated', '{}', now(), now()),
    (u_owner, 'p6-owner@test.local', 'authenticated', 'authenticated', '{}', now(), now()),
    (u_other, 'p6-other@test.local', 'authenticated', 'authenticated', '{}', now(), now()),
    (u_scanner, 'p6-scan@test.local', 'authenticated', 'authenticated', '{}', now(), now()),
    (u_c1, 'p6-c1@test.local', 'authenticated', 'authenticated', '{}', now(), now()),
    (u_c2, 'p6-c2@test.local', 'authenticated', 'authenticated', '{}', now(), now());
  update public.profiles set platform_role = 'admin' where id = u_admin;

  insert into public.organizers (id, slug, name_ar, name_en, contact_email, status, created_by)
  values
    (v_org, 'p6-org-one', 'جهة', 'Org One', 'o@test.local', 'approved', u_owner),
    (v_org2, 'p6-org-two', 'جهة 2', 'Org Two', 'o2@test.local', 'approved', u_other);
  insert into public.organizer_members (organizer_id, user_id, role) values
    (v_org, u_owner, 'owner'), (v_org2, u_other, 'owner'), (v_org, u_scanner, 'scanner');
  select id into v_cat from public.event_categories where slug = 'workshops';

  -- ===================================================================
  -- Phase 6 — المنظّم
  -- ===================================================================
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_owner, 'role', 'authenticated')::text, true);

  -- P6-01: إنشاء مسودة وأنواع تذاكر عبر RLS
  insert into public.events (organizer_id, category_id, slug, title_ar, title_en, starts_at, ends_at, created_by, governorate)
  values (v_org, v_cat, 'p6-event-one', 'فعالية اختبار', 'Test Event', now() + interval '10 days', now() + interval '10 days 3 hours', u_owner, 'capital')
  returning id into v_event;
  insert into public.ticket_types (event_id, name_ar, name_en, price_fils, quantity_total, max_per_order)
  values (v_event, 'عادية', 'General', 5250, 5, 3) returning id into v_tt;
  insert into public.ticket_types (event_id, name_ar, name_en, price_fils, quantity_total, max_per_order)
  values (v_event, 'مجانية', 'Free', 0, 50, 4) returning id into v_tt_free;
  passed := passed + 1;

  -- P6-02: لا يستطيع المنظّم تغيير الحالة أو التمييز بنفسه (صلاحيات الأعمدة)
  begin
    update public.events set status = 'published' where id = v_event;
    failures := failures || 'P6-02 organizer set status';
  exception when insufficient_privilege then passed := passed + 1;
  end;
  begin
    update public.events set is_featured = true where id = v_event;
    failures := failures || 'P6-02b organizer set featured';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- P6-03: لا يتلاعب بعدادات المبيعات
  begin
    update public.ticket_types set quantity_sold = 3 where id = v_tt;
    failures := failures || 'P6-03 organizer set quantity_sold';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- P6-04: لوحة المنظّم لجهته
  v_json := public.get_organizer_dashboard(v_org);
  if (v_json ->> 'events_total')::int = 1 and (v_json ->> 'events_draft')::int = 1 then
    passed := passed + 1; else failures := failures || ('P6-04 dashboard ' || v_json::text); end if;

  -- P6-05: الإرسال للمراجعة + إشعار المدراء
  perform public.submit_event_for_review(v_event);
  if (select status from public.events where id = v_event) = 'pending_review' then
    passed := passed + 1; else failures := failures || 'P6-05 submit'; end if;
  -- (الإشعار يُقرأ كـ postgres لاحقًا)

  -- P6-06: لا يعدّل الفعالية وهي قيد المراجعة
  update public.events set title_en = 'Hacked' where id = v_event;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then passed := passed + 1; else failures := failures || 'P6-06 edit while pending'; end if;

  -- P6-07: لا يعتمد فعاليته بنفسه
  begin
    perform public.review_event(v_event, true, null);
    failures := failures || 'P6-07 self approve';
  exception when others then
    if sqlerrm = 'FORBIDDEN' then passed := passed + 1; else failures := failures || ('P6-07 ' || sqlerrm); end if;
  end;

  -- ===== منظّم جهة أخرى =====
  perform set_config('request.jwt.claims', json_build_object('sub', u_other, 'role', 'authenticated')::text, true);

  -- P6-08: لا يرى أرقام أو مسودات جهة أخرى
  begin
    perform public.get_organizer_dashboard(v_org);
    failures := failures || 'P6-08 other dashboard';
  exception when others then
    if sqlerrm = 'FORBIDDEN' then passed := passed + 1; else failures := failures || ('P6-08 ' || sqlerrm); end if;
  end;
  select count(*) into v_n from public.events where id = v_event;
  if v_n = 0 then passed := passed + 1; else failures := failures || 'P6-08b sees other org pending event'; end if;

  -- P6-09: لا يضيف تذاكر لفعالية جهة أخرى
  begin
    insert into public.ticket_types (event_id, name_ar, name_en, price_fils, quantity_total)
    values (v_event, 'x', 'x', 1, 1);
    failures := failures || 'P6-09 insert ticket into other org';
  exception when insufficient_privilege then passed := passed + 1;
  end;

  -- P6-10: الماسح (scanner) لا يرى لوحة المبيعات
  perform set_config('request.jwt.claims', json_build_object('sub', u_scanner, 'role', 'authenticated')::text, true);
  begin
    perform public.get_organizer_dashboard(v_org);
    failures := failures || 'P6-10 scanner dashboard';
  exception when others then
    if sqlerrm = 'FORBIDDEN' then passed := passed + 1; else failures := failures || ('P6-10 ' || sqlerrm); end if;
  end;

  -- ===== المدير =====
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);

  -- P6-11: الرفض يتطلب سببًا
  begin
    perform public.review_event(v_event, false, '  ');
    failures := failures || 'P6-11 reject without reason';
  exception when others then
    if sqlerrm = 'REASON_REQUIRED' then passed := passed + 1; else failures := failures || ('P6-11 ' || sqlerrm); end if;
  end;

  -- P6-12: رفض مع سبب => rejected + إشعار للمنظّم
  perform public.review_event(v_event, false, 'الصور غير واضحة');
  perform set_config('role', 'postgres', true);
  if (select status from public.events where id = v_event) = 'rejected'
     and (select rejection_reason from public.events where id = v_event) = 'الصور غير واضحة'
     and exists (select 1 from public.notifications where user_id = u_owner and type = 'event_rejected')
     and exists (select 1 from public.notifications where user_id = u_admin and type = 'event_submitted') then
    passed := passed + 1; else failures := failures || 'P6-12 reject + notifications'; end if;

  -- P6-13: سجل التدقيق سجّل تغيّر الحالة
  select count(*) into v_n from public.audit_logs
  where entity_type = 'events' and entity_id = v_event::text and actor_id = u_admin;
  if v_n >= 1 then passed := passed + 1; else failures := failures || 'P6-13 audit'; end if;

  -- P6-14: المنظّم يعدّل المرفوضة ويعيد الإرسال، والمدير يعتمد => تظهر في البحث العام
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_owner, 'role', 'authenticated')::text, true);
  update public.events set summary_en = 'Clearer images' where id = v_event;
  perform public.submit_event_for_review(v_event);
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  perform public.review_event(v_event, true, null);
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into v_n from public.search_events(p_q => 'Test Event');
  if v_n = 1 and public.get_event_details('p6-event-one') is not null then
    passed := passed + 1; else failures := failures || ('P6-14 public visibility n=' || v_n); end if;

  -- P6-15: بيانات الاختبار مستبعدة من العام
  perform set_config('role', 'postgres', true);
  update public.organizers set is_test = true where id = v_org;
  perform set_config('role', 'anon', true);
  if (select count(*) from public.search_events(p_q => 'Test Event')) = 0
     and public.get_event_details('p6-event-one') is null
     and (select count(*) from public.search_events(p_q => 'Test Event', p_include_test => true)) = 1 then
    passed := passed + 1; else failures := failures || 'P6-15 is_test isolation'; end if;
  perform set_config('role', 'postgres', true);
  update public.organizers set is_test = false where id = v_org;

  -- ===== النتيجة =====
  raise exception 'TEST_SUMMARY passed=% failed=% %', passed, coalesce(array_length(failures, 1), 0), array_to_string(failures, ' | ');
end;
$test$;
