-- Multi-tenant SaaS backend schema for SolarFlow
-- Supabase/PostgreSQL migration

create extension if not exists "pgcrypto";

-- =====================================================
-- Base tables (dependency order)
-- organizations -> users -> customers -> tasks -> documents
-- -> suppliers -> spares -> systems -> system_components
-- -> stock_transactions -> reports -> dashboard_widgets
-- -> organization_settings -> user_settings -> activity_logs
-- =====================================================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  plan text,
  logo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text,
  email text,
  role text not null default 'employee' check (role in ('admin', 'manager', 'employee', 'viewer')),
  avatar_url text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists idx_users_org on public.users(organization_id);
create index if not exists idx_users_email on public.users(email);

-- =====================================================
-- Helper functions (must be after users)
-- =====================================================

create or replace function public.current_user_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.users
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.users
  where id = auth.uid()
  limit 1;
$$;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  company text,
  address text,
  city text,
  state text,
  country text,
  status text not null default 'active',
  assigned_to uuid references public.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_org on public.customers(organization_id);
create index if not exists idx_customers_assigned_to on public.customers(assigned_to);
create index if not exists idx_customers_created_at on public.customers(created_at desc);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  assigned_to uuid references public.users(id) on delete set null,
  created_by uuid references public.users(id) on delete set null,
  due_date timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_org on public.tasks(organization_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_assigned_to on public.tasks(assigned_to);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  file_url text not null,
  file_type text,
  file_size integer,
  uploaded_by uuid references public.users(id) on delete set null,
  related_customer_id uuid references public.customers(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_documents_org on public.documents(organization_id);
create index if not exists idx_documents_customer on public.documents(related_customer_id);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  contact text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create index if not exists idx_suppliers_org on public.suppliers(organization_id);

create table if not exists public.spares (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text,
  unit text,
  stock_quantity numeric(14,2) not null default 0,
  min_stock numeric(14,2) not null default 0,
  supplier_id uuid references public.suppliers(id) on delete set null,
  cost_price numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_spares_org on public.spares(organization_id);
create index if not exists idx_spares_supplier on public.spares(supplier_id);

create table if not exists public.systems (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  system_name text not null,
  capacity_kw numeric(10,2) not null,
  description text,
  created_at timestamptz not null default now(),
  unique (organization_id, system_name)
);

create index if not exists idx_systems_org on public.systems(organization_id);

create table if not exists public.system_components (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  system_id uuid not null references public.systems(id) on delete cascade,
  spare_id uuid not null references public.spares(id) on delete cascade,
  quantity_required numeric(14,2) not null check (quantity_required > 0),
  created_at timestamptz not null default now(),
  unique (system_id, spare_id)
);

create index if not exists idx_system_components_org on public.system_components(organization_id);
create index if not exists idx_system_components_system on public.system_components(system_id);

create table if not exists public.stock_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  spare_id uuid not null references public.spares(id) on delete cascade,
  type text not null check (type in ('purchase', 'usage', 'adjustment')),
  quantity numeric(14,2) not null,
  reference text,
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_txn_org on public.stock_transactions(organization_id);
create index if not exists idx_stock_txn_spare on public.stock_transactions(spare_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  report_type text not null,
  generated_by uuid references public.users(id) on delete set null,
  file_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_reports_org on public.reports(organization_id);

create table if not exists public.dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  widget_name text not null,
  widget_type text not null,
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_dashboard_widgets_org on public.dashboard_widgets(organization_id);

create table if not exists public.organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  company_name text,
  logo_url text,
  timezone text default 'UTC',
  currency text default 'USD',
  language text default 'en',
  created_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null unique references public.users(id) on delete cascade,
  theme text default 'light',
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_settings_org on public.user_settings(organization_id);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_logs_org on public.activity_logs(organization_id);
create index if not exists idx_activity_logs_user on public.activity_logs(user_id);

-- =====================================================
-- Triggers (after all dependent tables)
-- =====================================================

create or replace function public.set_system_component_org_id()
returns trigger
language plpgsql
as $$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id
  from public.systems
  where id = new.system_id;

  if v_org_id is null then
    raise exception 'Invalid system_id: %', new.system_id;
  end if;

  new.organization_id := v_org_id;
  return new;
end;
$$;

drop trigger if exists trg_set_system_component_org_id on public.system_components;
create trigger trg_set_system_component_org_id
before insert or update on public.system_components
for each row execute function public.set_system_component_org_id();

create or replace function public.apply_stock_transaction()
returns trigger
language plpgsql
as $$
begin
  if new.type = 'purchase' then
    update public.spares
    set stock_quantity = stock_quantity + new.quantity
    where id = new.spare_id
      and organization_id = new.organization_id;
  elsif new.type = 'usage' then
    update public.spares
    set stock_quantity = greatest(0, stock_quantity - new.quantity)
    where id = new.spare_id
      and organization_id = new.organization_id;
  elsif new.type = 'adjustment' then
    update public.spares
    set stock_quantity = greatest(0, stock_quantity + new.quantity)
    where id = new.spare_id
      and organization_id = new.organization_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_apply_stock_transaction on public.stock_transactions;
create trigger trg_apply_stock_transaction
after insert on public.stock_transactions
for each row execute function public.apply_stock_transaction();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  org_name text;
  display_name text;
begin
  org_name := coalesce(new.raw_user_meta_data ->> 'organization_name', format('Organization %s', left(new.id::text, 8)));
  display_name := coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1));

  insert into public.organizations(name, industry, plan)
  values (org_name, null, 'starter')
  returning id into new_org_id;

  insert into public.users(id, organization_id, name, email, role, status)
  values (new.id, new_org_id, display_name, new.email, 'admin', 'active');

  insert into public.organization_settings(organization_id, company_name, timezone, currency, language)
  values (new_org_id, org_name, 'UTC', 'USD', 'en');

  insert into public.user_settings(organization_id, user_id, theme, notifications_enabled)
  values (new_org_id, new.id, 'light', true);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =====================================================
-- View / SQL function
-- =====================================================

create or replace function public.calculate_system_inventory_availability(
  p_organization_id uuid default public.current_user_org_id()
)
returns table (
  system_id uuid,
  system_name text,
  capacity_kw numeric,
  available_systems numeric
)
language sql
stable
as $$
  select
    s.id as system_id,
    s.system_name,
    s.capacity_kw,
    coalesce(min(floor(sp.stock_quantity / nullif(sc.quantity_required, 0))), 0)::numeric as available_systems
  from public.systems s
  left join public.system_components sc
    on sc.system_id = s.id
   and sc.organization_id = s.organization_id
  left join public.spares sp
    on sp.id = sc.spare_id
   and sp.organization_id = s.organization_id
  where s.organization_id = p_organization_id
  group by s.id, s.system_name, s.capacity_kw;
$$;

drop view if exists public.v_system_inventory_availability;
create view public.v_system_inventory_availability as
select *
from public.calculate_system_inventory_availability(public.current_user_org_id());

-- =====================================================
-- RLS policies (after tables)
-- =====================================================

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.tasks enable row level security;
alter table public.documents enable row level security;
alter table public.suppliers enable row level security;
alter table public.spares enable row level security;
alter table public.systems enable row level security;
alter table public.system_components enable row level security;
alter table public.stock_transactions enable row level security;
alter table public.reports enable row level security;
alter table public.dashboard_widgets enable row level security;
alter table public.organization_settings enable row level security;
alter table public.user_settings enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists organizations_select_org on public.organizations;
create policy organizations_select_org on public.organizations
for select using (id = public.current_user_org_id());

drop policy if exists organizations_update_admin on public.organizations;
create policy organizations_update_admin on public.organizations
for update
using (id = public.current_user_org_id() and public.current_user_role() in ('admin', 'manager'))
with check (id = public.current_user_org_id());

drop policy if exists users_select_org on public.users;
create policy users_select_org on public.users
for select using (organization_id = public.current_user_org_id());

drop policy if exists users_insert_admin on public.users;
create policy users_insert_admin on public.users
for insert
with check (organization_id = public.current_user_org_id() and public.current_user_role() = 'admin');

drop policy if exists users_update_self_or_admin on public.users;
create policy users_update_self_or_admin on public.users
for update
using (
  id = auth.uid()
  or (organization_id = public.current_user_org_id() and public.current_user_role() in ('admin', 'manager'))
)
with check (organization_id = public.current_user_org_id());

drop policy if exists customers_org_all on public.customers;
create policy customers_org_all on public.customers
for all
using (organization_id = public.current_user_org_id())
with check (organization_id = public.current_user_org_id());

drop policy if exists tasks_org_all on public.tasks;
create policy tasks_org_all on public.tasks
for all
using (organization_id = public.current_user_org_id())
with check (organization_id = public.current_user_org_id());

drop policy if exists documents_org_all on public.documents;
create policy documents_org_all on public.documents
for all
using (organization_id = public.current_user_org_id())
with check (organization_id = public.current_user_org_id());

drop policy if exists suppliers_org_all on public.suppliers;
create policy suppliers_org_all on public.suppliers
for all
using (organization_id = public.current_user_org_id())
with check (organization_id = public.current_user_org_id());

drop policy if exists spares_org_all on public.spares;
create policy spares_org_all on public.spares
for all
using (organization_id = public.current_user_org_id())
with check (organization_id = public.current_user_org_id());

drop policy if exists systems_org_all on public.systems;
create policy systems_org_all on public.systems
for all
using (organization_id = public.current_user_org_id())
with check (organization_id = public.current_user_org_id());

drop policy if exists system_components_org_all on public.system_components;
create policy system_components_org_all on public.system_components
for all
using (organization_id = public.current_user_org_id())
with check (organization_id = public.current_user_org_id());

drop policy if exists stock_transactions_org_all on public.stock_transactions;
create policy stock_transactions_org_all on public.stock_transactions
for all
using (organization_id = public.current_user_org_id())
with check (organization_id = public.current_user_org_id());

drop policy if exists reports_org_all on public.reports;
create policy reports_org_all on public.reports
for all
using (organization_id = public.current_user_org_id())
with check (organization_id = public.current_user_org_id());

drop policy if exists dashboard_widgets_org_all on public.dashboard_widgets;
create policy dashboard_widgets_org_all on public.dashboard_widgets
for all
using (organization_id = public.current_user_org_id())
with check (organization_id = public.current_user_org_id());

drop policy if exists organization_settings_org_all on public.organization_settings;
create policy organization_settings_org_all on public.organization_settings
for all
using (organization_id = public.current_user_org_id())
with check (organization_id = public.current_user_org_id());

drop policy if exists user_settings_org_all on public.user_settings;
create policy user_settings_org_all on public.user_settings
for all
using (organization_id = public.current_user_org_id())
with check (organization_id = public.current_user_org_id());

drop policy if exists activity_logs_org_all on public.activity_logs;
create policy activity_logs_org_all on public.activity_logs
for all
using (organization_id = public.current_user_org_id())
with check (organization_id = public.current_user_org_id());

-- =====================================================
-- Storage bucket + policies (LAST)
-- =====================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists documents_bucket_read on storage.objects;
create policy documents_bucket_read on storage.objects
for select
using (
  bucket_id = 'documents'
  and split_part(name, '/', 1)::uuid = public.current_user_org_id()
);

drop policy if exists documents_bucket_insert on storage.objects;
create policy documents_bucket_insert on storage.objects
for insert
with check (
  bucket_id = 'documents'
  and split_part(name, '/', 1)::uuid = public.current_user_org_id()
);

drop policy if exists documents_bucket_update on storage.objects;
create policy documents_bucket_update on storage.objects
for update
using (
  bucket_id = 'documents'
  and split_part(name, '/', 1)::uuid = public.current_user_org_id()
)
with check (
  bucket_id = 'documents'
  and split_part(name, '/', 1)::uuid = public.current_user_org_id()
);

drop policy if exists documents_bucket_delete on storage.objects;
create policy documents_bucket_delete on storage.objects
for delete
using (
  bucket_id = 'documents'
  and split_part(name, '/', 1)::uuid = public.current_user_org_id()
);
