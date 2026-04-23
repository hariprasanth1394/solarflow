-- Reset + seed utilities for inventory demo/testing cycles
-- Safe, repeatable, organization-scoped

-- 1) Optional schema hardening for test metadata
alter table if exists public.spares
  add column if not exists item_code text,
  add column if not exists is_test_data boolean not null default false;

alter table if exists public.systems
  add column if not exists system_code text,
  add column if not exists is_test_data boolean not null default false;

alter table if exists public.system_components
  add column if not exists is_test_data boolean not null default false;

alter table if exists public.stock_transactions
  add column if not exists is_test_data boolean not null default false;

create unique index if not exists ux_spares_org_item_code
  on public.spares (organization_id, item_code)
  where item_code is not null;

create unique index if not exists ux_systems_org_system_code
  on public.systems (organization_id, system_code)
  where system_code is not null;

-- 2) Audit table for reset/seed executions
create table if not exists public.inventory_test_seed_runs (
  id bigserial primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  executed_by uuid references public.users(id) on delete set null,
  executed_at timestamptz not null default now(),
  rows_deleted jsonb not null default '{}'::jsonb,
  rows_inserted jsonb not null default '{}'::jsonb,
  notes text
);

create index if not exists idx_inventory_test_seed_runs_org
  on public.inventory_test_seed_runs (organization_id, executed_at desc);

-- 3) Availability view (recommended)
create or replace view public.system_availability_view as
with component_availability as (
  select
    s.organization_id,
    s.id as system_id,
    coalesce(s.system_code, upper(s.system_name)) as system_code,
    s.system_name,
    sp.id as spare_id,
    coalesce(sp.item_code, upper(sp.name)) as item_code,
    sp.name as item_name,
    sc.quantity_required,
    sp.stock_quantity,
    floor(coalesce(sp.stock_quantity, 0) / nullif(sc.quantity_required, 0))::int as buildable_units
  from public.systems s
  join public.system_components sc
    on sc.system_id = s.id
   and sc.organization_id = s.organization_id
  join public.spares sp
    on sp.id = sc.spare_id
   and sp.organization_id = s.organization_id
),
ranked as (
  select
    ca.*,
    row_number() over (
      partition by ca.organization_id, ca.system_id
      order by ca.buildable_units asc, ca.item_name asc
    ) as rn
  from component_availability ca
),
availability as (
  select
    organization_id,
    system_id,
    system_code,
    system_name,
    min(buildable_units) as available_count
  from component_availability
  group by organization_id, system_id, system_code, system_name
)
select
  a.organization_id,
  a.system_id,
  a.system_code,
  a.system_name,
  coalesce(a.available_count, 0) as available_count,
  coalesce(r.item_name, 'N/A') as limiting_item
from availability a
left join ranked r
  on r.organization_id = a.organization_id
 and r.system_id = a.system_id
 and r.rn = 1;

-- 4) Reset + seed function (RPC-callable)
create or replace function public.reset_inventory_test_data(
  p_organization_id uuid,
  p_confirm text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rows_deleted jsonb := '{}'::jsonb;
  v_rows_inserted jsonb := '{}'::jsonb;
  v_cnt integer := 0;
  v_notes text := 'Inventory test data reset + seed';
  v_file_hash_seed text := encode(gen_random_bytes(16), 'hex');
begin
  if p_organization_id is null then
    raise exception 'p_organization_id is required';
  end if;

  if p_confirm is distinct from 'RESET_INVENTORY_TEST_DATA' then
    raise exception 'Safety check failed: pass p_confirm = RESET_INVENTORY_TEST_DATA';
  end if;

  if not exists (select 1 from public.organizations o where o.id = p_organization_id) then
    raise exception 'Organization % not found', p_organization_id;
  end if;

  -- Optional membership check for authenticated user calls
  if v_user_id is not null then
    if not exists (
      select 1
      from public.users u
      where u.id = v_user_id
        and u.organization_id = p_organization_id
    ) then
      raise exception 'Current user is not part of organization %', p_organization_id;
    end if;
  end if;

  -- DELETE ORDER (dependency-safe):
  -- allocations/system-inventory -> transactions -> bom -> systems -> stock/items

  -- Optional tables (if present in other environments)
  if to_regclass('public.system_inventory_allocations') is not null then
    execute 'with d as (delete from public.system_inventory_allocations where organization_id = $1 returning 1) select count(*) from d'
      into v_cnt using p_organization_id;
    v_rows_deleted := v_rows_deleted || jsonb_build_object('system_inventory_allocations', v_cnt);
  end if;

  if to_regclass('public.system_inventory') is not null then
    execute 'with d as (delete from public.system_inventory where organization_id = $1 returning 1) select count(*) from d'
      into v_cnt using p_organization_id;
    v_rows_deleted := v_rows_deleted || jsonb_build_object('system_inventory', v_cnt);
  end if;

  if to_regclass('public.inventory_transactions') is not null then
    execute 'with d as (delete from public.inventory_transactions where organization_id = $1 returning 1) select count(*) from d'
      into v_cnt using p_organization_id;
    v_rows_deleted := v_rows_deleted || jsonb_build_object('inventory_transactions', v_cnt);
  end if;

  if to_regclass('public.inventory_stock') is not null then
    execute 'with d as (delete from public.inventory_stock where organization_id = $1 returning 1) select count(*) from d'
      into v_cnt using p_organization_id;
    v_rows_deleted := v_rows_deleted || jsonb_build_object('inventory_stock', v_cnt);
  end if;

  if to_regclass('public.customer_inventory_allocations') is not null then
    execute 'with d as (delete from public.customer_inventory_allocations where organization_id = $1 returning 1) select count(*) from d'
      into v_cnt using p_organization_id;
    v_rows_deleted := v_rows_deleted || jsonb_build_object('customer_inventory_allocations', v_cnt);
  end if;

  if to_regclass('public.customer_inventory') is not null then
    execute 'with d as (delete from public.customer_inventory where organization_id = $1 returning 1) select count(*) from d'
      into v_cnt using p_organization_id;
    v_rows_deleted := v_rows_deleted || jsonb_build_object('customer_inventory', v_cnt);
  end if;

  -- Import-module tables (if installed)
  if to_regclass('public.import_records') is not null then
    execute 'with d as (delete from public.import_records where organization_id = $1 returning 1) select count(*) from d'
      into v_cnt using p_organization_id;
    v_rows_deleted := v_rows_deleted || jsonb_build_object('import_records', v_cnt);
  end if;

  if to_regclass('public.import_batches') is not null then
    execute 'with d as (delete from public.import_batches where organization_id = $1 returning 1) select count(*) from d'
      into v_cnt using p_organization_id;
    v_rows_deleted := v_rows_deleted || jsonb_build_object('import_batches', v_cnt);
  end if;

  -- Core inventory/system tables
  with d as (
    delete from public.stock_transactions
    where organization_id = p_organization_id
    returning 1
  )
  select count(*) into v_cnt from d;
  v_rows_deleted := v_rows_deleted || jsonb_build_object('stock_transactions', v_cnt);

  with d as (
    delete from public.system_components
    where organization_id = p_organization_id
    returning 1
  )
  select count(*) into v_cnt from d;
  v_rows_deleted := v_rows_deleted || jsonb_build_object('system_components', v_cnt);

  with d as (
    delete from public.systems
    where organization_id = p_organization_id
    returning 1
  )
  select count(*) into v_cnt from d;
  v_rows_deleted := v_rows_deleted || jsonb_build_object('systems', v_cnt);

  with d as (
    delete from public.spares
    where organization_id = p_organization_id
    returning 1
  )
  select count(*) into v_cnt from d;
  v_rows_deleted := v_rows_deleted || jsonb_build_object('spares', v_cnt);

  -- Optional alternate items table
  if to_regclass('public.inventory_items') is not null then
    execute 'with d as (delete from public.inventory_items where organization_id = $1 returning 1) select count(*) from d'
      into v_cnt using p_organization_id;
    v_rows_deleted := v_rows_deleted || jsonb_build_object('inventory_items', v_cnt);
  end if;

  -- ==========================================================
  -- Seed: spare items (15 rows)
  -- ==========================================================
  insert into public.spares (
    organization_id,
    item_code,
    name,
    category,
    unit,
    stock_quantity,
    min_stock,
    cost_price,
    is_test_data
  )
  select
    p_organization_id,
    v.item_code,
    v.item_name,
    v.category,
    v.unit,
    v.stock_qty,
    v.min_stock,
    v.cost,
    true
  from (
    values
      ('SP-001', 'Mono PERC Panel 540W', 'Panel', 'Nos', 290::numeric, 60::numeric, 9200::numeric),
      ('SP-002', 'On-Grid Inverter 5KW', 'Inverter', 'Nos', 31::numeric, 8::numeric, 38500::numeric),
      ('SP-003', 'On-Grid Inverter 10KW', 'Inverter', 'Nos', 12::numeric, 4::numeric, 72000::numeric),
      ('SP-004', 'Lithium Battery 5kWh', 'Battery', 'Nos', 18::numeric, 6::numeric, 98000::numeric),
      ('SP-005', 'MC4 Connector Pair', 'Connector', 'Pair', 890::numeric, 200::numeric, 190::numeric),
      ('SP-006', 'DC Cable 6 sqmm', 'Cable', 'Meter', 5000::numeric, 1200::numeric, 85::numeric),
      ('SP-007', 'AC Cable 10 sqmm', 'Cable', 'Meter', 2200::numeric, 700::numeric, 160::numeric),
      ('SP-008', 'Galvanized Mounting Rail', 'Structure', 'Meter', 788::numeric, 260::numeric, 480::numeric),
      ('SP-009', 'Mid Clamp', 'Structure', 'Nos', 1400::numeric, 400::numeric, 45::numeric),
      ('SP-010', 'End Clamp', 'Structure', 'Nos', 1300::numeric, 380::numeric, 48::numeric),
      ('SP-011', 'Earthing Kit', 'Safety', 'Set', 95::numeric, 30::numeric, 650::numeric),
      ('SP-012', 'SPD Type-II', 'Protection', 'Nos', 42::numeric, 18::numeric, 2100::numeric),
      ('SP-013', 'DC MCB 32A', 'Protection', 'Nos', 65::numeric, 25::numeric, 850::numeric),
      ('SP-014', 'ACDB 3-Phase', 'Distribution', 'Nos', 22::numeric, 10::numeric, 6200::numeric),
      ('SP-015', 'Monitoring Gateway', 'Electronics', 'Nos', 9::numeric, 5::numeric, 14500::numeric)
  ) as v(item_code, item_name, category, unit, stock_qty, min_stock, cost);

  get diagnostics v_cnt = row_count;
  v_rows_inserted := v_rows_inserted || jsonb_build_object('spares', v_cnt);

  -- ==========================================================
  -- Seed: system definitions (4 rows)
  -- ==========================================================
  insert into public.systems (
    organization_id,
    system_code,
    system_name,
    capacity_kw,
    description,
    is_test_data
  )
  select
    p_organization_id,
    v.system_code,
    v.system_name,
    v.capacity_kw,
    v.description,
    true
  from (
    values
      ('SYS-5KW', '5KW Solar Kit', 5::numeric, 'Residential 5kW rooftop kit'),
      ('SYS-10KW', '10KW Solar Kit', 10::numeric, 'Commercial 10kW rooftop kit'),
      ('SYS-15KW', '15KW Industrial Kit', 15::numeric, 'Industrial starter kit with 15kW output'),
      ('SYS-HYB-8KW', '8KW Hybrid Backup Kit', 8::numeric, 'Hybrid system with battery backup')
  ) as v(system_code, system_name, capacity_kw, description);

  get diagnostics v_cnt = row_count;
  v_rows_inserted := v_rows_inserted || jsonb_build_object('systems', v_cnt);

  -- ==========================================================
  -- Seed: BOM (system_components)
  -- ==========================================================
  insert into public.system_components (
    organization_id,
    system_id,
    spare_id,
    quantity_required,
    is_test_data
  )
  select
    p_organization_id,
    s.id,
    sp.id,
    bom.required_qty,
    true
  from (
    values
      -- 5KW kit
      ('SYS-5KW', 'SP-001', 10::numeric),
      ('SYS-5KW', 'SP-002', 1::numeric),
      ('SYS-5KW', 'SP-005', 20::numeric),
      ('SYS-5KW', 'SP-006', 120::numeric),
      ('SYS-5KW', 'SP-008', 30::numeric),

      -- 10KW kit
      ('SYS-10KW', 'SP-001', 20::numeric),
      ('SYS-10KW', 'SP-003', 1::numeric),
      ('SYS-10KW', 'SP-005', 40::numeric),
      ('SYS-10KW', 'SP-006', 240::numeric),
      ('SYS-10KW', 'SP-008', 60::numeric),

      -- 15KW kit
      ('SYS-15KW', 'SP-001', 28::numeric),
      ('SYS-15KW', 'SP-003', 2::numeric),
      ('SYS-15KW', 'SP-005', 56::numeric),
      ('SYS-15KW', 'SP-006', 360::numeric),
      ('SYS-15KW', 'SP-008', 84::numeric),

      -- 8KW hybrid kit
      ('SYS-HYB-8KW', 'SP-001', 16::numeric),
      ('SYS-HYB-8KW', 'SP-002', 1::numeric),
      ('SYS-HYB-8KW', 'SP-004', 2::numeric),
      ('SYS-HYB-8KW', 'SP-005', 32::numeric),
      ('SYS-HYB-8KW', 'SP-006', 200::numeric)
  ) as bom(system_code, item_code, required_qty)
  join public.systems s
    on s.organization_id = p_organization_id
   and s.system_code = bom.system_code
  join public.spares sp
    on sp.organization_id = p_organization_id
   and sp.item_code = bom.item_code;

  get diagnostics v_cnt = row_count;
  v_rows_inserted := v_rows_inserted || jsonb_build_object('system_components', v_cnt);

  -- ==========================================================
  -- Seed: stock transactions (initial adjustment for auditability)
  -- ==========================================================
  insert into public.stock_transactions (
    organization_id,
    spare_id,
    type,
    quantity,
    reference,
    is_test_data
  )
  select
    p_organization_id,
    sp.id,
    'adjustment',
    sp.stock_quantity,
    'TEST_SEED_INIT_' || v_file_hash_seed,
    true
  from public.spares sp
  where sp.organization_id = p_organization_id
    and sp.is_test_data = true;

  get diagnostics v_cnt = row_count;
  v_rows_inserted := v_rows_inserted || jsonb_build_object('stock_transactions', v_cnt);

  -- Audit log
  insert into public.inventory_test_seed_runs (
    organization_id,
    executed_by,
    rows_deleted,
    rows_inserted,
    notes
  ) values (
    p_organization_id,
    v_user_id,
    v_rows_deleted,
    v_rows_inserted,
    v_notes
  );

  return jsonb_build_object(
    'success', true,
    'organization_id', p_organization_id,
    'rows_deleted', v_rows_deleted,
    'rows_inserted', v_rows_inserted,
    'executed_at', now(),
    'hint', 'Use system_availability_view to verify seeded BOM availability'
  );
exception
  when others then
    raise exception 'reset_inventory_test_data failed: %', sqlerrm;
end;
$$;

comment on function public.reset_inventory_test_data(uuid, text)
is 'Safely resets and reseeds inventory/system demo data for one organization. Requires confirmation token RESET_INVENTORY_TEST_DATA.';

grant execute on function public.reset_inventory_test_data(uuid, text) to authenticated;
grant execute on function public.reset_inventory_test_data(uuid, text) to service_role;

-- Example calls:
-- select public.reset_inventory_test_data('00000000-0000-0000-0000-000000000000'::uuid, 'RESET_INVENTORY_TEST_DATA');
-- select * from public.system_availability_view where organization_id = '00000000-0000-0000-0000-000000000000'::uuid;
