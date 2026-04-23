-- Excel Import Module Schema
-- Handles batch stock imports with full audit trail

-- Import batches table - tracks each import operation
create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid not null references public.users(id) on delete restrict,
  batch_status text not null default 'pending' check (batch_status in ('pending', 'validated', 'processing', 'completed', 'failed', 'rolled_back')),
  file_hash text not null unique,
  file_name text not null,
  total_rows integer not null,
  success_count integer default 0,
  failure_count integer default 0,
  validation_errors jsonb not null default '[]'::jsonb,
  batch_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  processed_at timestamptz,
  completed_at timestamptz
);

create index if not exists idx_import_batches_org on public.import_batches(organization_id);
create index if not exists idx_import_batches_status on public.import_batches(batch_status);
create index if not exists idx_import_batches_created_at on public.import_batches(created_at desc);
create index if not exists idx_import_batches_file_hash on public.import_batches(file_hash);

-- Import records - individual rows from import
create table if not exists public.import_records (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  spare_id uuid references public.spares(id) on delete set null,
  system_id uuid references public.systems(id) on delete set null,
  row_number integer not null,
  item_code text not null,
  system_code text,
  current_stock_imported numeric(14,2),
  issued_qty numeric(14,2),
  closing_stock numeric(14,2),
  unit_cost numeric(14,2),
  record_status text not null default 'pending' check (record_status in ('pending', 'validated', 'processing', 'completed', 'error', 'skipped')),
  validation_errors jsonb not null default '[]'::jsonb,
  validation_warnings jsonb not null default '[]'::jsonb,
  before_stock numeric(14,2),
  after_stock numeric(14,2),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(batch_id, row_number)
);

create index if not exists idx_import_records_batch on public.import_records(batch_id);
create index if not exists idx_import_records_org on public.import_records(organization_id);
create index if not exists idx_import_records_spare on public.import_records(spare_id);
create index if not exists idx_import_records_system on public.import_records(system_id);
create index if not exists idx_import_records_status on public.import_records(record_status);

-- Enhanced stock_transactions table to link to import batch
alter table if exists public.stock_transactions
add column if not exists batch_id uuid references public.import_batches(id) on delete set null;

alter table if exists public.stock_transactions
add column if not exists import_record_id uuid references public.import_records(id) on delete set null;

create index if not exists idx_stock_txn_batch on public.stock_transactions(batch_id);
create index if not exists idx_stock_txn_import_record on public.stock_transactions(import_record_id);

-- Audit logging function for import operations
create or replace function public.log_import_activity(
  p_organization_id uuid,
  p_user_id uuid,
  p_action text,
  p_batch_id uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_logs (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    p_organization_id,
    p_user_id,
    p_action,
    'import_batch',
    p_batch_id,
    p_details
  );
end;
$$;

-- Function to calculate system availability after import
create or replace function public.calculate_system_availability(
  p_organization_id uuid
)
returns table(
  system_id uuid,
  system_name text,
  available_count integer,
  shortage_exists boolean,
  missing_items jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_system record;
  v_component record;
  v_available integer;
  v_min_available integer;
  v_missing_items jsonb;
begin
  -- Iterate through each system
  for v_system in 
    select s.id, s.system_name 
    from systems s 
    where s.organization_id = p_organization_id
  loop
    v_available := null;
    v_missing_items := '[]'::jsonb;
    
    -- Get each component required for system
    for v_component in 
      select 
        sc.spare_id,
        sp.name,
        sc.quantity_required,
        coalesce(sp.stock_quantity, 0) as current_stock
      from system_components sc
      join spares sp on sp.id = sc.spare_id
      where sc.system_id = v_system.id
        and sp.organization_id = p_organization_id
    loop
      -- Calculate how many systems can be built with this component
      v_available := floor(v_component.current_stock::numeric / v_component.quantity_required);
      
      -- Track if shortage exists
      if v_available < 1 then
        v_missing_items := v_missing_items || jsonb_build_object(
          'spare_id', v_component.spare_id,
          'name', v_component.name,
          'required', v_component.quantity_required,
          'available', v_component.current_stock,
          'shortage', v_component.quantity_required - v_component.current_stock
        );
      end if;
      
      -- Keep minimum availability
      if v_available is null or v_available < 0 then
        v_available := 0;
      elsif v_available is not null and (v_min_available is null or v_available < v_min_available) then
        v_min_available := v_available;
      end if;
    end loop;
    
    if v_min_available is null then
      v_min_available := 0;
    end if;
    
    return query select 
      v_system.id,
      v_system.system_name,
      v_min_available,
      jsonb_array_length(v_missing_items) > 0,
      v_missing_items;
    
    v_min_available := null;
  end loop;
end;
$$;

-- RLS Policies for import tables
alter table public.import_batches enable row level security;
alter table public.import_records enable row level security;

create policy "import_batches_org_select" on public.import_batches
  for select using (organization_id = (select organization_id from auth.users u join public.users pu on u.id = pu.id where u.id = auth.uid()));

create policy "import_batches_org_insert" on public.import_batches
  for insert with check (organization_id = (select organization_id from auth.users u join public.users pu on u.id = pu.id where u.id = auth.uid()));

create policy "import_records_org_select" on public.import_records
  for select using (organization_id = (select organization_id from auth.users u join public.users pu on u.id = pu.id where u.id = auth.uid()));

create policy "import_records_org_insert" on public.import_records
  for insert with check (organization_id = (select organization_id from auth.users u join public.users pu on u.id = pu.id where u.id = auth.uid()));
