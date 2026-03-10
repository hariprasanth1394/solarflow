alter table if exists public.customers
  add column if not exists system_id uuid references public.systems(id) on delete set null;

create index if not exists idx_customers_system_id on public.customers(system_id);
