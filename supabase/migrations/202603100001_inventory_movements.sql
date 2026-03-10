-- Introduce first-class inventory movements ledger for installation workflow
-- This migration is additive and backward-compatible with stock_transactions.

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid null references public.customers(id) on delete set null,
  system_id uuid null references public.systems(id) on delete set null,
  spare_id uuid not null references public.spares(id) on delete cascade,
  movement_type text not null check (movement_type in ('reserve', 'release', 'consume', 'purchase', 'adjustment')),
  quantity numeric(14,2) not null,
  reference text null,
  notes text null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_movements_org_created_at
  on public.inventory_movements (organization_id, created_at desc);

create index if not exists idx_inventory_movements_org_spare
  on public.inventory_movements (organization_id, spare_id, created_at desc);

create index if not exists idx_inventory_movements_org_customer
  on public.inventory_movements (organization_id, customer_id, created_at desc)
  where customer_id is not null;

create unique index if not exists uq_inventory_movements_org_reference
  on public.inventory_movements (organization_id, reference)
  where reference is not null and btrim(reference) <> '';

alter table public.inventory_movements enable row level security;

drop policy if exists inventory_movements_org_all on public.inventory_movements;
create policy inventory_movements_org_all
  on public.inventory_movements
  for all
  using (organization_id = public.current_user_org_id())
  with check (organization_id = public.current_user_org_id());

-- Backfill historical installation movement records from stock_transactions references.
insert into public.inventory_movements (
  organization_id,
  customer_id,
  spare_id,
  movement_type,
  quantity,
  reference,
  notes,
  metadata,
  created_at
)
select
  st.organization_id,
  nullif(split_part(st.reference, ':', 2), '')::uuid as customer_id,
  st.spare_id,
  case
    when st.reference like 'reserve:%' then 'reserve'
    when st.reference like 'release:%' then 'release'
    when st.reference like 'consume:%' then 'consume'
    when st.type = 'purchase' then 'purchase'
    else 'adjustment'
  end as movement_type,
  abs(st.quantity),
  st.reference,
  'Backfilled from stock_transactions',
  jsonb_build_object('source', 'stock_transactions', 'stock_transaction_id', st.id, 'legacy_type', st.type),
  st.created_at
from public.stock_transactions st
where st.reference like 'reserve:%'
   or st.reference like 'release:%'
   or st.reference like 'consume:%'
on conflict do nothing;
