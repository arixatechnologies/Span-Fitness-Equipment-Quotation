create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  product_name text not null,
  brand_id uuid constraint products_brand_id_fkey references public.brands(id) on delete set null,
  category_id uuid constraint products_category_id_fkey references public.categories(id) on delete set null,
  sub_category_id uuid constraint products_sub_category_id_fkey references public.categories(id) on delete set null,
  image_url text,
  unit_price numeric(12,2) not null default 0,
  special_price numeric(12,2) not null default 0,
  gst_percent numeric(5,2) not null default 18,
  stock_availability text,
  description text,
  technical_specifications text,
  dimensions text,
  machine_weight text,
  stack_weight text,
  warranty_note text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  business_name text,
  phone text not null,
  suffix text,
  alternate_phone text,
  email text,
  gst_number text,
  address text,
  city text,
  state text,
  pincode text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default 'SPAN FITNESS EQUIPMENTS',
  logo_url text,
  gst_number text not null default '37EHKPK9679G1ZH',
  phone_numbers text not null default '9703344483 | 9840639509',
  email text not null default 'spanfitnessequipments@gmail.com',
  address text not null default 'GROUND FLOOR, 50-81-26, SEETHAMMAPETA JUNCTION, MAIN ROAD, Visakhapatnam - 530016.',
  bank_name text not null default 'HDFC Bank',
  bank_account_no text not null default '50200062043280',
  bank_branch text not null default 'Vishakhapatnam',
  bank_ifsc text not null default 'HDFC0006274',
  pdf_theme_color text not null default '#93B5C6',
  default_gst_percent numeric(5,2) not null default 18,
  default_gst_mode text not null default 'add' check (default_gst_mode in ('add', 'included', 'none')),
  default_validity_days integer not null default 30,
  default_terms text not null,
  default_warranty text not null,
  default_delivery text not null,
  default_transportation text not null,
  default_payment_terms text not null,
  default_after_sales_support text not null,
  authorized_person_name text not null default 'Authorized Signatory',
  authorized_person_designation text not null default 'For SPAN FITNESS EQUIPMENTS',
  signature_url text,
  brand_footer_heading text not null default 'ASSOCIATED FITNESS BRANDS',
  brand_footer_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_footer_logos (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  base_quote_number text not null,
  revision integer not null default 0,
  quote_number text not null unique,
  quote_date date not null default current_date,
  validity_days integer not null default 30,
  customer_id uuid references public.customers(id) on delete set null,
  customer_snapshot jsonb not null,
  total_list_price numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total_special_price numeric(12,2) not null default 0,
  gst_amount numeric(12,2) not null default 0,
  net_total numeric(12,2) not null default 0,
  round_off numeric(12,2) not null default 0,
  grand_total numeric(12,2) not null default 0,
  gst_mode text not null default 'add' check (gst_mode in ('add', 'included', 'none')),
  terms text not null,
  payment_terms text not null,
  transportation_note text not null,
  delivery_note text not null,
  warranty_note text not null,
  after_sales_support text not null,
  bank_details jsonb not null,
  company_settings_snapshot jsonb not null,
  prepared_by text not null,
  status text not null default 'Draft' check (status in ('Draft', 'Sent', 'Accepted', 'Rejected', 'Cancelled')),
  pdf_url text,
  pdf_path text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (base_quote_number, revision)
);

create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  sku text,
  product_name text not null,
  brand_name text,
  image_url text,
  description text,
  specifications text,
  dimensions text,
  machine_weight text,
  stack_weight text,
  unit_price numeric(12,2) not null default 0,
  special_price numeric(12,2) not null default 0,
  qty numeric(10,2) not null default 1,
  gst_percent numeric(5,2) not null default 18,
  list_total numeric(12,2) not null default 0,
  special_total numeric(12,2) not null default 0,
  gst_amount numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pdf_files (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  storage_path text not null,
  signed_url text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger brands_set_updated_at
before update on public.brands
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger company_settings_set_updated_at
before update on public.company_settings
for each row execute function public.set_updated_at();

create trigger brand_footer_logos_set_updated_at
before update on public.brand_footer_logos
for each row execute function public.set_updated_at();

create trigger quotations_set_updated_at
before update on public.quotations
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.company_settings enable row level security;
alter table public.brand_footer_logos enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.pdf_files enable row level security;
alter table public.activity_logs enable row level security;

-- The application uses custom admin auth and server-only Supabase service-role access.
-- RLS stays enabled so anonymous/public clients cannot manage business data directly.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('company-assets', 'company-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('quotation-pdfs', 'quotation-pdfs', false, 10485760, array['application/pdf'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public read product images"
on storage.objects for select to public
using (bucket_id = 'product-images');

create policy "public read company assets"
on storage.objects for select to public
using (bucket_id = 'company-assets');

create index if not exists products_search_idx
on public.products using gin (
  to_tsvector('english', coalesce(sku, '') || ' ' || coalesce(product_name, '') || ' ' || coalesce(description, ''))
);

create index if not exists quotations_quote_number_idx on public.quotations (quote_number);
create index if not exists quotation_items_quotation_id_idx on public.quotation_items (quotation_id);
