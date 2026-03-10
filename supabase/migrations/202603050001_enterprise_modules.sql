-- Enterprise SolarFlow advanced modules tables

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid null references public.customers(id) on delete set null,
  title text not null,
  system_capacity_kw numeric(10,2) not null default 0,
  installation_cost numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_price numeric(14,2) not null default 0,
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  component_name text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  total_price numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_pipeline (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_name text not null,
  company text null,
  contact text null,
  status text not null default 'Lead',
  estimated_value numeric(14,2) null,
  assigned_to text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid null references public.customers(id) on delete set null,
  name text not null,
  status text not null default 'Site survey',
  progress integer not null default 0,
  assigned_engineer text null,
  start_date date null,
  end_date date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  status text not null default 'Pending',
  assigned_to text null,
  due_date date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type text not null,
  category text null,
  amount numeric(14,2) not null default 0,
  cost numeric(14,2) null,
  month text null,
  reference text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quotations_org on public.quotations(organization_id);
create index if not exists idx_quotation_items_org on public.quotation_items(organization_id);
create index if not exists idx_sales_pipeline_org on public.sales_pipeline(organization_id);
create index if not exists idx_projects_org on public.projects(organization_id);
create index if not exists idx_project_tasks_org on public.project_tasks(organization_id);
create index if not exists idx_financial_transactions_org on public.financial_transactions(organization_id);

drop trigger if exists trg_set_updated_at_quotations on public.quotations;
create trigger trg_set_updated_at_quotations
before update on public.quotations
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_set_updated_at_quotation_items on public.quotation_items;
create trigger trg_set_updated_at_quotation_items
before update on public.quotation_items
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_set_updated_at_sales_pipeline on public.sales_pipeline;
create trigger trg_set_updated_at_sales_pipeline
before update on public.sales_pipeline
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_set_updated_at_projects on public.projects;
create trigger trg_set_updated_at_projects
before update on public.projects
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_set_updated_at_project_tasks on public.project_tasks;
create trigger trg_set_updated_at_project_tasks
before update on public.project_tasks
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_set_updated_at_financial_transactions on public.financial_transactions;
create trigger trg_set_updated_at_financial_transactions
before update on public.financial_transactions
for each row execute function public.set_updated_at_timestamp();

alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.sales_pipeline enable row level security;
alter table public.projects enable row level security;
alter table public.project_tasks enable row level security;
alter table public.financial_transactions enable row level security;

drop policy if exists quotations_org_all on public.quotations;
create policy quotations_org_all on public.quotations for all using (organization_id = public.current_user_org_id()) with check (organization_id = public.current_user_org_id());

drop policy if exists quotation_items_org_all on public.quotation_items;
create policy quotation_items_org_all on public.quotation_items for all using (organization_id = public.current_user_org_id()) with check (organization_id = public.current_user_org_id());

drop policy if exists sales_pipeline_org_all on public.sales_pipeline;
create policy sales_pipeline_org_all on public.sales_pipeline for all using (organization_id = public.current_user_org_id()) with check (organization_id = public.current_user_org_id());

drop policy if exists projects_org_all on public.projects;
create policy projects_org_all on public.projects for all using (organization_id = public.current_user_org_id()) with check (organization_id = public.current_user_org_id());

drop policy if exists project_tasks_org_all on public.project_tasks;
create policy project_tasks_org_all on public.project_tasks for all using (organization_id = public.current_user_org_id()) with check (organization_id = public.current_user_org_id());

drop policy if exists financial_transactions_org_all on public.financial_transactions;
create policy financial_transactions_org_all on public.financial_transactions for all using (organization_id = public.current_user_org_id()) with check (organization_id = public.current_user_org_id());
