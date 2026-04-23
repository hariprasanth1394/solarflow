-- Production-grade Inventory Import/Export foundation
-- Safe additive migration (non-destructive)

-- A) inventory_items table updates / creation
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  item_code text not null,
  item_name text not null,
  category text,
  unit text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, item_code)
);

alter table if exists public.inventory_items
  add column if not exists category text,
  add column if not exists unit text,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Optional system code support for filtered import/export keys
alter table if exists public.systems
  add column if not exists system_code text;

-- B) inventory_stock table
create table if not exists public.inventory_stock (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  system_id uuid not null references public.systems(id) on delete cascade,
  quantity numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- C) inventory_transactions table
create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  system_id uuid references public.systems(id) on delete set null,
  type text not null check (type in ('ISSUE', 'ADJUSTMENT')),
  quantity numeric(14,2) not null,
  batch_id uuid,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- D) import_batches table (augment existing import_batches)
create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  file_name text not null,
  uploaded_by uuid references public.users(id) on delete set null,
  total_rows integer not null default 0,
  success_rows integer not null default 0,
  error_rows integer not null default 0,
  status text not null default 'pending',
  batch_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.import_batches
  add column if not exists success_rows integer not null default 0,
  add column if not exists error_rows integer not null default 0,
  add column if not exists status text not null default 'pending',
  add column if not exists batch_key text,
  add column if not exists updated_at timestamptz not null default now();

-- E) constraints and indexes
create unique index if not exists ux_inventory_stock_org_item_system
  on public.inventory_stock (organization_id, item_id, system_id);

create unique index if not exists ux_import_batches_org_batch_key
  on public.import_batches (organization_id, batch_key)
  where batch_key is not null;

create index if not exists idx_inventory_items_org_category
  on public.inventory_items (organization_id, category);

create index if not exists idx_inventory_stock_org_system
  on public.inventory_stock (organization_id, system_id);

create index if not exists idx_inventory_transactions_org_created
  on public.inventory_transactions (organization_id, created_at desc);

create index if not exists idx_import_batches_org_created
  on public.import_batches (organization_id, created_at desc);

-- System availability table
create table if not exists public.system_inventory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  system_id uuid not null references public.systems(id) on delete cascade,
  available_count integer not null default 0,
  limiting_item text,
  updated_at timestamptz not null default now(),
  unique (organization_id, system_id)
);

-- Updated-at trigger helper
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_inventory_items_updated_at on public.inventory_items;
create trigger trg_inventory_items_updated_at
before update on public.inventory_items
for each row execute function public.touch_updated_at();

drop trigger if exists trg_inventory_stock_updated_at on public.inventory_stock;
create trigger trg_inventory_stock_updated_at
before update on public.inventory_stock
for each row execute function public.touch_updated_at();

drop trigger if exists trg_import_batches_updated_at on public.import_batches;
create trigger trg_import_batches_updated_at
before update on public.import_batches
for each row execute function public.touch_updated_at();

-- Availability recomputation
create or replace function public.recalculate_system_inventory(
  p_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.system_inventory (organization_id, system_id, available_count, limiting_item, updated_at)
  with component_availability as (
    select
      s.organization_id,
      s.id as system_id,
      sp.name as spare_name,
      floor(coalesce(sp.stock_quantity, 0) / nullif(sc.quantity_required, 0))::int as can_build
    from public.systems s
    join public.system_components sc
      on sc.system_id = s.id
     and sc.organization_id = s.organization_id
    join public.spares sp
      on sp.id = sc.spare_id
     and sp.organization_id = s.organization_id
    where s.organization_id = p_organization_id
  ), ranked as (
    select
      ca.*, row_number() over (partition by ca.organization_id, ca.system_id order by ca.can_build asc, ca.spare_name asc) as rn
    from component_availability ca
  ), summary as (
    select
      organization_id,
      system_id,
      min(can_build) as available_count
    from component_availability
    group by organization_id, system_id
  )
  select
    s.organization_id,
    s.system_id,
    coalesce(s.available_count, 0),
    r.spare_name,
    now()
  from summary s
  left join ranked r
    on r.organization_id = s.organization_id
   and r.system_id = s.system_id
   and r.rn = 1
  on conflict (organization_id, system_id)
  do update set
    available_count = excluded.available_count,
    limiting_item = excluded.limiting_item,
    updated_at = now();
end;
$$;

-- Atomic import apply RPC (UPSERT + transactions + availability refresh)
create or replace function public.apply_inventory_import_v2(
  p_organization_id uuid,
  p_uploaded_by uuid,
  p_file_name text,
  p_batch_key text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid;
  v_total_rows integer := 0;
  v_error_rows integer := 0;
  v_success_rows integer := 0;
  v_new_rows integer := 0;
  v_updated_rows integer := 0;
  v_unchanged_rows integer := 0;
  v_txn_rows integer := 0;
begin
  if p_organization_id is null then
    raise exception 'p_organization_id is required';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  select count(*) into v_total_rows from jsonb_array_elements(p_rows);

  insert into public.import_batches (
    organization_id,
    file_name,
    uploaded_by,
    total_rows,
    status,
    batch_key,
    created_at,
    updated_at
  ) values (
    p_organization_id,
    coalesce(p_file_name, 'inventory-import.xlsx'),
    p_uploaded_by,
    v_total_rows,
    'processing',
    p_batch_key,
    now(),
    now()
  )
  on conflict (organization_id, batch_key)
  do update set
    updated_at = now()
  returning id into v_batch_id;

  create temporary table tmp_rows on commit drop as
  select
    coalesce(r."rowNumber", 0)::int as row_number,
    upper(trim(coalesce(r."itemCode", ''))) as item_code,
    trim(coalesce(r."itemName", '')) as item_name,
    upper(trim(coalesce(r."systemCode", ''))) as system_code,
    coalesce(r."currentStock", 0)::numeric as current_stock,
    coalesce(r."closingStock", r."currentStock", 0)::numeric as imported_stock,
    coalesce(r."unitCost", 0)::numeric as unit_cost,
    upper(coalesce(r."importStatus", 'UNCHANGED')) as import_status,
    coalesce(r."errors", '[]'::jsonb) as errors
  from jsonb_to_recordset(p_rows) as r(
    "rowNumber" int,
    "itemCode" text,
    "itemName" text,
    "systemCode" text,
    "currentStock" numeric,
    "closingStock" numeric,
    "unitCost" numeric,
    "importStatus" text,
    "errors" jsonb
  );

  select count(*) into v_error_rows
  from tmp_rows
  where import_status = 'ERROR'
     or coalesce(jsonb_array_length(errors), 0) > 0;

  if v_error_rows > 0 then
    update public.import_batches
    set error_rows = v_error_rows,
        success_rows = 0,
        status = 'failed',
        updated_at = now()
    where id = v_batch_id;

    raise exception 'Cannot apply import with % error rows', v_error_rows;
  end if;

  create temporary table tmp_systems on commit drop as
  select
    s.id as system_id,
    upper(coalesce(s.system_code, s.system_name)) as system_key
  from public.systems s
  where s.organization_id = p_organization_id;

  create temporary table tmp_item_upsert on commit drop as
  select distinct
    item_code,
    item_name,
    coalesce(unit_cost, 0) as unit_cost
  from tmp_rows
  where item_code <> '';

  insert into public.inventory_items (
    organization_id,
    item_code,
    item_name,
    category,
    unit,
    is_active,
    created_at,
    updated_at
  )
  select
    p_organization_id,
    u.item_code,
    u.item_name,
    'Imported',
    'Nos',
    true,
    now(),
    now()
  from tmp_item_upsert u
  on conflict (organization_id, item_code)
  do update set
    item_name = excluded.item_name,
    updated_at = now();

  create temporary table tmp_resolved on commit drop as
  select
    r.*,
    i.id as item_id,
    s.system_id,
    st.quantity as db_quantity
  from tmp_rows r
  join public.inventory_items i
    on i.organization_id = p_organization_id
   and i.item_code = r.item_code
  left join tmp_systems s
    on s.system_key = r.system_code
  left join public.inventory_stock st
    on st.organization_id = p_organization_id
   and st.item_id = i.id
   and st.system_id = s.system_id;

  select count(*) into v_new_rows
  from tmp_resolved
  where coalesce(db_quantity, 0) = 0 and imported_stock > 0 and import_status = 'NEW';

  select count(*) into v_updated_rows
  from tmp_resolved
  where import_status in ('UPDATED', 'NEW')
    and system_id is not null
    and abs(coalesce(db_quantity, 0) - imported_stock) > 0.01;

  select count(*) into v_unchanged_rows
  from tmp_resolved
  where import_status = 'UNCHANGED'
     or abs(coalesce(db_quantity, 0) - imported_stock) <= 0.01;

  insert into public.inventory_stock (
    organization_id,
    item_id,
    system_id,
    quantity,
    created_at,
    updated_at
  )
  select
    p_organization_id,
    item_id,
    system_id,
    imported_stock,
    now(),
    now()
  from tmp_resolved
  where system_id is not null
  on conflict (organization_id, item_id, system_id)
  do update set
    quantity = excluded.quantity,
    updated_at = now();

  insert into public.inventory_transactions (
    organization_id,
    item_id,
    system_id,
    type,
    quantity,
    batch_id,
    created_by,
    created_at
  )
  select
    p_organization_id,
    item_id,
    system_id,
    case
      when imported_stock - coalesce(db_quantity, 0) < 0 then 'ISSUE'
      else 'ADJUSTMENT'
    end,
    abs(imported_stock - coalesce(db_quantity, 0)),
    v_batch_id,
    p_uploaded_by,
    now()
  from tmp_resolved
  where system_id is not null
    and abs(imported_stock - coalesce(db_quantity, 0)) > 0.01;

  get diagnostics v_txn_rows = row_count;

  -- Sync legacy spares stock for compatibility with existing BOM availability pipeline
  insert into public.spares (
    organization_id,
    name,
    stock_quantity,
    min_stock,
    cost_price,
    category,
    unit,
    created_at
  )
  select
    p_organization_id,
    i.item_name,
    coalesce(sum(st.quantity), 0),
    0,
    0,
    i.category,
    i.unit,
    now()
  from public.inventory_items i
  left join public.inventory_stock st
    on st.organization_id = i.organization_id
   and st.item_id = i.id
  where i.organization_id = p_organization_id
  group by i.organization_id, i.item_name, i.category, i.unit
  on conflict do nothing;

  update public.spares sp
  set stock_quantity = x.total_qty
  from (
    select i.item_name, coalesce(sum(st.quantity), 0) as total_qty
    from public.inventory_items i
    left join public.inventory_stock st
      on st.organization_id = i.organization_id
     and st.item_id = i.id
    where i.organization_id = p_organization_id
    group by i.item_name
  ) x
  where sp.organization_id = p_organization_id
    and upper(sp.name) = upper(x.item_name);

  perform public.recalculate_system_inventory(p_organization_id);

  v_success_rows := v_total_rows - v_error_rows;

  update public.import_batches
  set success_rows = v_success_rows,
      error_rows = v_error_rows,
      status = 'completed',
      updated_at = now()
  where id = v_batch_id;

  return jsonb_build_object(
    'success', true,
    'batchId', v_batch_id,
    'summary', jsonb_build_object(
      'totalRows', v_total_rows,
      'successRows', v_success_rows,
      'errorRows', v_error_rows,
      'newRows', v_new_rows,
      'updatedRows', v_updated_rows,
      'unchangedRows', v_unchanged_rows
    ),
    'transactionsInserted', v_txn_rows,
    'status', 'completed'
  );
exception
  when others then
    if v_batch_id is not null then
      update public.import_batches
      set status = 'failed',
          updated_at = now()
      where id = v_batch_id;
    end if;

    raise exception 'apply_inventory_import_v2 failed: %', sqlerrm;
end;
$$;

grant execute on function public.recalculate_system_inventory(uuid) to authenticated;
grant execute on function public.recalculate_system_inventory(uuid) to service_role;
grant execute on function public.apply_inventory_import_v2(uuid, uuid, text, text, jsonb) to authenticated;
grant execute on function public.apply_inventory_import_v2(uuid, uuid, text, text, jsonb) to service_role;
