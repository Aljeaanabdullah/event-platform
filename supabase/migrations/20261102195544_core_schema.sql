-- =====================================================================
-- Event Platform — Migration 1: الأنواع والجداول والقيود والفهارس
-- =====================================================================
-- مبادئ:
--   * كل المفاتيح UUID، وكل الجداول بها created_at/updated_at.
--   * كل المبالغ أعداد صحيحة بالفلس (bigint): 1 د.ك = 1000 فلس.
--   * لا صلاحيات افتراضية لـ anon/authenticated: كل صلاحية تُمنح صراحةً في Migration 3.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) إغلاق الصلاحيات الافتراضية
-- Supabase يمنح anon و authenticated كل الصلاحيات على أي جدول/دالة جديدة.
-- نلغي ذلك حتى لا يُكشف أي جدول أو دالة بالخطأ عبر الـ API.
-- ---------------------------------------------------------------------
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------
-- 1) الأنواع (Enums)
-- ---------------------------------------------------------------------
create type public.platform_role as enum ('customer', 'admin');
create type public.organizer_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.member_role as enum ('owner', 'manager', 'scanner');
create type public.event_status as enum ('draft', 'pending_review', 'published', 'rejected', 'cancelled');
create type public.order_status as enum (
  'pending_payment', 'paid', 'expired', 'cancelled', 'refunded', 'partially_refunded', 'needs_refund'
);
create type public.payment_status as enum ('initiated', 'pending', 'succeeded', 'failed', 'cancelled', 'refunded');
create type public.ticket_status as enum ('valid', 'checked_in', 'void');
create type public.refund_status as enum ('requested', 'approved', 'processing', 'succeeded', 'failed', 'rejected');
create type public.payout_status as enum ('pending', 'processing', 'paid', 'failed');
create type public.app_locale as enum ('ar', 'en');
create type public.kuwait_governorate as enum (
  'capital', 'hawalli', 'farwaniya', 'ahmadi', 'jahra', 'mubarak-al-kabeer'
);

-- ---------------------------------------------------------------------
-- 2) دالة تحديث updated_at تلقائيًا
-- ---------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3) الجداول
-- ---------------------------------------------------------------------

-- الملفات الشخصية: صف لكل مستخدم في auth.users (يُنشأ تلقائيًا بـ Trigger)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 120),
  phone text check (phone ~ '^\+?[0-9 ]{6,20}$'),
  avatar_url text check (char_length(avatar_url) <= 1000),
  preferred_locale public.app_locale not null default 'ar',
  platform_role public.platform_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_platform_role_idx on public.profiles (platform_role) where platform_role <> 'customer';

-- الجهات المنظِّمة (شركة/فريق). الانضمام = صف بحالة pending يراجعه المدير.
create table public.organizers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  name_ar text not null check (char_length(name_ar) between 2 and 120),
  name_en text not null check (char_length(name_en) between 2 and 120),
  description_ar text check (char_length(description_ar) <= 2000),
  description_en text check (char_length(description_en) <= 2000),
  logo_path text,
  contact_email text not null check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_phone text check (contact_phone ~ '^\+?[0-9 ]{6,20}$'),
  website_url text check (website_url ~* '^https?://'),
  commercial_reg_no text check (char_length(commercial_reg_no) <= 50),
  status public.organizer_status not null default 'pending',
  -- عمولة خاصة بهذا المنظّم (basis points: 500 = 5%). null = الافتراضية من platform_settings
  commission_bps integer check (commission_bps between 0 and 10000),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text check (char_length(rejection_reason) <= 1000),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index organizers_status_idx on public.organizers (status);

create table public.organizer_members (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'manager',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organizer_id, user_id)
);
create index organizer_members_user_idx on public.organizer_members (user_id);

create table public.event_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_ar text not null,
  name_en text not null,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers (id) on delete restrict,
  category_id uuid not null references public.event_categories (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 120),
  title_ar text not null check (char_length(title_ar) between 3 and 150),
  title_en text not null check (char_length(title_en) between 3 and 150),
  summary_ar text check (char_length(summary_ar) <= 300),
  summary_en text check (char_length(summary_en) <= 300),
  description_ar text check (char_length(description_ar) <= 20000),
  description_en text check (char_length(description_en) <= 20000),
  cover_image_path text,
  venue_name_ar text check (char_length(venue_name_ar) <= 150),
  venue_name_en text check (char_length(venue_name_en) <= 150),
  address_ar text check (char_length(address_ar) <= 300),
  address_en text check (char_length(address_en) <= 300),
  governorate public.kuwait_governorate,
  area text check (char_length(area) <= 80),
  latitude numeric(9, 6) check (latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude between -180 and 180),
  is_online boolean not null default false,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'Asia/Kuwait',
  status public.event_status not null default 'draft',
  is_featured boolean not null default false,
  submitted_at timestamptz,
  published_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text check (char_length(rejection_reason) <= 1000),
  cancelled_at timestamptz,
  cancellation_reason text check (char_length(cancellation_reason) <= 1000),
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- بحث نصي في العناوين والملخصات باللغتين
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title_ar, '') || ' ' || coalesce(title_en, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(summary_ar, '') || ' ' || coalesce(summary_en, '')), 'B')
    || setweight(to_tsvector('simple', coalesce(venue_name_ar, '') || ' ' || coalesce(venue_name_en, '') || ' ' || coalesce(area, '')), 'C')
  ) stored,
  constraint events_dates_check check (ends_at > starts_at),
  constraint events_location_check check (is_online or governorate is not null or venue_name_ar is not null or venue_name_en is not null or status = 'draft')
);
create index events_public_listing_idx on public.events (starts_at) where status = 'published';
create index events_status_idx on public.events (status, submitted_at);
create index events_organizer_idx on public.events (organizer_id);
create index events_category_idx on public.events (category_id);
create index events_search_idx on public.events using gin (search_vector);
create index events_title_trgm_idx on public.events using gin ((title_ar || ' ' || title_en) extensions.gin_trgm_ops);

create table public.event_images (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  storage_path text not null,
  alt_ar text check (char_length(alt_ar) <= 200),
  alt_en text check (char_length(alt_en) <= 200),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index event_images_event_idx on public.event_images (event_id, sort_order);

create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name_ar text not null check (char_length(name_ar) between 1 and 100),
  name_en text not null check (char_length(name_en) between 1 and 100),
  description_ar text check (char_length(description_ar) <= 500),
  description_en text check (char_length(description_en) <= 500),
  price_fils bigint not null check (price_fils >= 0 and price_fils <= 100000000),
  quantity_total integer not null check (quantity_total between 0 and 1000000),
  quantity_sold integer not null default 0 check (quantity_sold >= 0),
  quantity_reserved integer not null default 0 check (quantity_reserved >= 0),
  min_per_order integer not null default 1 check (min_per_order >= 1),
  max_per_order integer not null default 10 check (max_per_order between 1 and 50),
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- خط الدفاع الأخير ضد الحجز الزائد: مستحيل أن يتجاوز المباع + المحجوز مؤقتًا الإجمالي
  constraint ticket_types_capacity_check check (quantity_sold + quantity_reserved <= quantity_total),
  constraint ticket_types_order_limits_check check (min_per_order <= max_per_order),
  constraint ticket_types_sales_window_check check (sales_end_at is null or sales_start_at is null or sales_end_at > sales_start_at)
);
create index ticket_types_event_idx on public.ticket_types (event_id, sort_order);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('EP-' || upper(encode(extensions.gen_random_bytes(5), 'hex'))),
  user_id uuid not null references auth.users (id) on delete restrict,
  event_id uuid not null references public.events (id) on delete restrict,
  status public.order_status not null default 'pending_payment',
  subtotal_fils bigint not null check (subtotal_fils >= 0),
  service_fee_fils bigint not null default 0 check (service_fee_fils >= 0),
  total_fils bigint not null check (total_fils >= 0),
  platform_commission_fils bigint not null default 0 check (platform_commission_fils >= 0),
  organizer_net_fils bigint not null check (organizer_net_fils >= 0),
  refunded_fils bigint not null default 0 check (refunded_fils >= 0),
  currency char(3) not null default 'KWD',
  locale public.app_locale not null default 'ar',
  buyer_name text check (char_length(buyer_name) <= 120),
  buyer_email text check (buyer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  buyer_phone text check (buyer_phone ~ '^\+?[0-9 ]{6,20}$'),
  expires_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_totals_check check (total_fils = subtotal_fils + service_fee_fils),
  constraint orders_net_check check (organizer_net_fils + platform_commission_fils = subtotal_fils),
  constraint orders_refund_check check (refunded_fils <= total_fils)
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_event_idx on public.orders (event_id, status);
-- لمهمة تحرير الحجوزات المؤقتة المنتهية
create index orders_pending_expiry_idx on public.orders (expires_at) where status = 'pending_payment';

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types (id) on delete restrict,
  quantity integer not null check (quantity between 1 and 50),
  -- لقطة للسعر والاسم وقت الشراء (لا تتأثر بتعديل المنظّم لاحقًا)
  unit_price_fils bigint not null check (unit_price_fils >= 0),
  line_total_fils bigint not null check (line_total_fils = unit_price_fils * quantity),
  ticket_name_ar text not null,
  ticket_name_en text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, ticket_type_id)
);
create index order_items_ticket_type_idx on public.order_items (ticket_type_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  provider text not null check (provider in ('myfatoorah', 'tap', 'free')),
  provider_payment_id text,
  provider_invoice_id text,
  status public.payment_status not null default 'initiated',
  amount_fils bigint not null check (amount_fils >= 0),
  currency char(3) not null default 'KWD',
  method text,
  idempotency_key text not null unique,
  failure_reason text,
  -- الاستجابة الخام من المزوّد (لا تُكشف للعميل)
  raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);
create index payments_order_idx on public.payments (order_id);

-- سجل Webhooks: المفتاح الفريد يمنع معالجة نفس الحدث مرتين
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text,
  payload jsonb not null,
  signature_valid boolean not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  order_item_id uuid not null references public.order_items (id) on delete restrict,
  ticket_type_id uuid not null references public.ticket_types (id) on delete restrict,
  event_id uuid not null references public.events (id) on delete restrict,
  owner_user_id uuid not null references auth.users (id) on delete restrict,
  -- رمز قصير للعرض والبحث اليدوي عند البوابة
  code text not null unique default ('T-' || upper(encode(extensions.gen_random_bytes(5), 'hex'))),
  -- رمز QR سري (256 بت) — لا يُقرأ إلا عبر دالة تتحقق من ملكية التذكرة
  qr_token text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  status public.ticket_status not null default 'valid',
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users (id) on delete set null,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tickets_checkin_check check ((status = 'checked_in') = (checked_in_at is not null))
);
create index tickets_owner_idx on public.tickets (owner_user_id, created_at desc);
create index tickets_event_idx on public.tickets (event_id, status);
create index tickets_order_idx on public.tickets (order_id);

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
create index favorites_event_idx on public.favorites (event_id);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  payment_id uuid references public.payments (id) on delete restrict,
  amount_fils bigint not null check (amount_fils > 0),
  reason text check (char_length(reason) <= 1000),
  status public.refund_status not null default 'requested',
  requested_by uuid references auth.users (id) on delete set null,
  processed_by uuid references auth.users (id) on delete set null,
  provider_refund_id text,
  failure_reason text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index refunds_order_idx on public.refunds (order_id);
create index refunds_status_idx on public.refunds (status);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers (id) on delete restrict,
  period_start date not null,
  period_end date not null,
  gross_fils bigint not null check (gross_fils >= 0),
  commission_fils bigint not null check (commission_fils >= 0),
  refunds_fils bigint not null default 0 check (refunds_fils >= 0),
  net_fils bigint not null,
  status public.payout_status not null default 'pending',
  reference text check (char_length(reference) <= 200),
  notes text check (char_length(notes) <= 1000),
  paid_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payouts_period_check check (period_end >= period_start),
  constraint payouts_net_check check (net_fils = gross_fils - commission_fils - refunds_fils)
);
create index payouts_organizer_idx on public.payouts (organizer_id, period_end desc);

create table public.payout_items (
  id uuid primary key default gen_random_uuid(),
  payout_id uuid not null references public.payouts (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete restrict,
  amount_fils bigint not null,
  created_at timestamptz not null default now(),
  -- كل طلب يُسوّى في دفعة واحدة فقط
  unique (order_id)
);
create index payout_items_payout_idx on public.payout_items (payout_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title_ar text not null,
  title_en text not null,
  body_ar text,
  body_en text,
  link text check (link like '/%'),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.platform_settings (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  value jsonb not null,
  -- الإعدادات العامة (مثل رسوم الخدمة) يمكن عرضها للزوار
  is_public boolean not null default false,
  description text,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- سجل تدقيق: إضافة فقط — يُمنع التعديل والحذف للجميع (انظر Migration 2)
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- Rate limiting داخل Postgres (نافذة زمنية ثابتة)
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);
create index rate_limits_window_idx on public.rate_limits (window_start);

-- ---------------------------------------------------------------------
-- 4) Triggers لتحديث updated_at
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'organizers', 'organizer_members', 'event_categories', 'events', 'event_images',
    'ticket_types', 'orders', 'order_items', 'payments', 'payment_events', 'tickets', 'refunds',
    'payouts', 'notifications', 'platform_settings'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- 5) تفعيل RLS على كل الجداول (السياسات في Migration 3)
-- جدول بلا سياسة = مغلق تمامًا لـ anon و authenticated
-- ---------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    -- ملاحظة: لا نستخدم FORCE حتى تعمل دوال SECURITY DEFINER (المملوكة لـ postgres) كما هو مصمم
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end;
$$;

-- ضمان إضافي: لا صلاحيات متبقية على أي جدول لـ anon/authenticated
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
