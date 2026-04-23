-- Import hardening + performance migration
-- Adds transactional bulk-apply RPC and lookup indexes

create index if not exists idx_spares_org_itemkey
  on public.spares (organization_id, upper(coalesce(item_code, name)));

create index if not exists idx_systems_org_systemkey
  on public.systems (organization_id, upper(coalesce(system_code, system_name)));

create index if not exists idx_stock_transactions_org_created
  on public.stock_transactions (organization_id, created_at desc);

create or replace function public.apply_inventory_import_rows(
  p_organization_id uuid,
  p_rows jsonb,
  p_performed_by uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_rows integer := 0;
  v_error_rows integer := 0;
  v_new_rows integer := 0;
  v_updated_rows integer := 0;
  v_unchanged_rows integer := 0;
  v_txn_rows integer := 0;
  v_total_stock numeric := 0;
  v_total_required numeric := 0;
  v_reconciliation_ok boolean := true;
begin
  if p_organization_id is null then
    raise exception 'p_organization_id is required';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  select count(*) into v_total_rows from jsonb_array_elements(p_rows);
  if v_total_rows = 0 then
    return jsonb_build_object(
      'success', true,
      'summary', jsonb_build_object(
        'totalRows', 0,
        'newRows', 0,
        'updatedRows', 0,
        'unchangedRows', 0,
        'errorRows', 0
      )
    );
  end if;

  select count(*) into v_error_rows
  from jsonb_to_recordset(p_rows) as r(
    rowNumber int,
    importStatus text,
    errors jsonb
  )
  where upper(coalesce(r.importStatus, '')) = 'ERROR'
     or coalesce(jsonb_array_length(r.errors), 0) > 0;

  if v_error_rows > 0 then
    raise exception 'Blocking validation errors present in % row(s)', v_error_rows;
  end if;

  create temporary table tmp_import_rows on commit drop as
  with parsed as (
    select
      coalesce(r.rowNumber, 0) as row_number,
      upper(trim(coalesce(r.itemCode, r.itemName, ''))) as item_key,
      trim(coalesce(r.itemName, r.itemCode, '')) as item_name,
      coalesce(r.currentStock, 0)::numeric as current_stock,
      coalesce(r.closingStock, r.currentStock, 0)::numeric as closing_stock,
      coalesce(r.unitCost, 0)::numeric as unit_cost
    from jsonb_to_recordset(p_rows) as r(
      rowNumber int,
      itemCode text,
      itemName text,
      currentStock numeric,
      closingStock numeric,
      unitCost numeric
    )
  ), ranked as (
    select
      p.*,
      row_number() over (partition by p.item_key order by p.row_number desc) as rn
    from parsed p
    where p.item_key <> ''
  )
  select
    row_number,
    item_key,
    item_name,
    current_stock,
    closing_stock,
    unit_cost
  from ranked
  where rn = 1;

  create temporary table tmp_new_keys (
    item_key text primary key
  ) on commit drop;

  insert into tmp_new_keys(item_key)
  select t.item_key
  from tmp_import_rows t
  where not exists (
    select 1
    from public.spares s
    where s.organization_id = p_organization_id
      and upper(coalesce(s.item_code, s.name)) = t.item_key
  );

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
    t.item_key,
    t.item_name,
    'Imported',
    'Nos',
    greatest(t.closing_stock, 0),
    0,
    greatest(t.unit_cost, 0),
    false
  from tmp_import_rows t
  join tmp_new_keys nk on nk.item_key = t.item_key;

  get diagnostics v_new_rows = row_count;

  create temporary table tmp_resolved on commit drop as
  select
    t.row_number,
    t.item_key,
    t.item_name,
    t.current_stock,
    t.closing_stock as desired_stock,
    t.unit_cost,
    s.id as spare_id,
    s.stock_quantity as db_stock,
    s.cost_price as db_cost,
    (nk.item_key is not null) as is_new
  from tmp_import_rows t
  join public.spares s
    on s.organization_id = p_organization_id
   and upper(coalesce(s.item_code, s.name)) = t.item_key
  left join tmp_new_keys nk
    on nk.item_key = t.item_key;

  update public.spares s
  set
    stock_quantity = r.desired_stock,
    cost_price = case
      when r.unit_cost > 0 then r.unit_cost
      else s.cost_price
    end
  from tmp_resolved r
  where s.id = r.spare_id
    and r.is_new = false
    and abs(r.desired_stock - r.db_stock) > 0.01;

  get diagnostics v_updated_rows = row_count;

  select count(*) into v_unchanged_rows
  from tmp_resolved r
  where r.is_new = false
    and abs(r.desired_stock - r.db_stock) <= 0.01;

  insert into public.stock_transactions (
    organization_id,
    spare_id,
    type,
    quantity,
    reference,
    created_at
  )
  select
    p_organization_id,
    r.spare_id,
    'adjustment',
    case
      when r.is_new then r.desired_stock
      else r.desired_stock - r.db_stock
    end as quantity,
    case
      when r.is_new then 'IMPORT_NEW'
      else 'IMPORT_UPDATE'
    end,
    now()
  from tmp_resolved r
  where r.is_new = true
     or abs(r.desired_stock - r.db_stock) > 0.01;

  get diagnostics v_txn_rows = row_count;

  begin
    if to_regclass('public.system_inventory') is not null then
      execute $q$
        with availability as (
          select
            s.organization_id,
            s.id as system_id,
            coalesce(min(floor(coalesce(sp.stock_quantity, 0) / nullif(sc.quantity_required, 0))), 0)::int as available_count
          from public.systems s
          left join public.system_components sc
            on sc.system_id = s.id
           and sc.organization_id = s.organization_id
          left join public.spares sp
            on sp.id = sc.spare_id
           and sp.organization_id = s.organization_id
          where s.organization_id = $1
          group by s.organization_id, s.id
        )
        insert into public.system_inventory (organization_id, system_id, available_count, updated_at)
        select organization_id, system_id, available_count, now()
        from availability
        on conflict (organization_id, system_id)
        do update set
          available_count = excluded.available_count,
          updated_at = now()
      $q$ using p_organization_id;
    end if;
  exception when others then
    null;
  end;

  select coalesce(sum(stock_quantity), 0)
  into v_total_stock
  from public.spares
  where organization_id = p_organization_id;

  select coalesce(sum(quantity_required), 0)
  into v_total_required
  from public.system_components
  where organization_id = p_organization_id;

  v_reconciliation_ok := v_total_stock >= v_total_required;

  return jsonb_build_object(
    'success', true,
    'summary', jsonb_build_object(
      'totalRows', v_total_rows,
      'newRows', v_new_rows,
      'updatedRows', v_updated_rows,
      'unchangedRows', v_unchanged_rows,
      'errorRows', v_error_rows
    ),
    'transactionsInserted', v_txn_rows,
    'reconciliation', jsonb_build_object(
      'totalStock', v_total_stock,
      'totalRequired', v_total_required,
      'status', case when v_reconciliation_ok then 'ok' else 'mismatch' end
    ),
    'processedAt', now()
  );
exception
  when others then
    raise exception 'apply_inventory_import_rows failed: %', sqlerrm;
end;
$$;

comment on function public.apply_inventory_import_rows(uuid, jsonb, uuid)
is 'Atomic bulk import apply: inserts NEW items, updates stock for UPDATED rows, writes stock_transactions, and returns summary.';

grant execute on function public.apply_inventory_import_rows(uuid, jsonb, uuid) to authenticated;
grant execute on function public.apply_inventory_import_rows(uuid, jsonb, uuid) to service_role;
