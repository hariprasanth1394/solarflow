-- Add payments table and customer payment summary columns

alter table public.customers
  add column if not exists total_cost numeric default 0;

alter table public.customers
  add column if not exists paid_amount numeric default 0;

alter table public.customers
  add column if not exists pending_amount numeric default 0;

alter table public.customers
  add column if not exists payment_status text default 'Pending';

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  installation_id uuid not null references public.customers(id) on delete cascade,
  amount numeric not null,
  payment_date date not null,
  payment_method text,
  notes text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_installation_id on public.payments(installation_id);
create index if not exists idx_payments_organization_id on public.payments(organization_id);

alter table public.payments enable row level security;

-- Basic RLS policy: org-scoped access
drop policy if exists payments_org_all on public.payments;
create policy payments_org_all
  on public.payments
  for all
  using (organization_id = public.current_user_org_id())
  with check (organization_id = public.current_user_org_id());
