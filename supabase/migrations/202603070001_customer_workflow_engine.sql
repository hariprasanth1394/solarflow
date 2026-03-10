-- Customer workflow engine schema updates
-- Adds stage tracking, task-customer linkage, and workflow history

alter table public.customers
  add column if not exists current_stage text not null default 'CREATED';

alter table public.tasks
  add column if not exists related_customer_id uuid null references public.customers(id) on delete set null;

create index if not exists idx_tasks_related_customer_id on public.tasks(related_customer_id);
create index if not exists idx_customers_current_stage on public.customers(current_stage);

create table if not exists public.customer_progress (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  previous_stage text null,
  current_stage text not null,
  trigger_event text not null,
  next_required_action text null,
  metadata jsonb not null default '{}'::jsonb,
  changed_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint customer_progress_stage_check check (current_stage in ('CREATED', 'SUBMITTED', 'APPROVED', 'INSTALLATION', 'CLOSED'))
);

create index if not exists idx_customer_progress_org_customer_created
  on public.customer_progress(organization_id, customer_id, created_at desc);

alter table public.customer_progress enable row level security;

drop policy if exists customer_progress_org_all on public.customer_progress;
create policy customer_progress_org_all
  on public.customer_progress
  for all
  using (organization_id = public.current_user_org_id())
  with check (organization_id = public.current_user_org_id());

update public.customers
set current_stage = case
  when lower(coalesce(status, '')) in ('closed', 'inactive', 'completed') then 'CLOSED'
  when lower(coalesce(status, '')) like '%install%' then 'INSTALLATION'
  when lower(coalesce(status, '')) like '%approved%' then 'APPROVED'
  when lower(coalesce(status, '')) like '%submitted%' then 'SUBMITTED'
  else 'CREATED'
end
where current_stage is null
   or current_stage not in ('CREATED', 'SUBMITTED', 'APPROVED', 'INSTALLATION', 'CLOSED');
