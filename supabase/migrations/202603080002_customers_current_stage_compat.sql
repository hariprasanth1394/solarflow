-- Compatibility fix: ensure customers.current_stage exists for workflow-aware queries

alter table public.customers
  add column if not exists current_stage text;

update public.customers
set current_stage = case
  when coalesce(lower(status), '') like '%closed%' then 'CLOSED'
  when coalesce(lower(status), '') like '%inactive%' then 'CLOSED'
  when coalesce(lower(status), '') like '%completed%' then 'CLOSED'
  when coalesce(lower(status), '') like '%install%' then 'INSTALLATION'
  when coalesce(lower(status), '') like '%approve%' then 'APPROVED'
  when coalesce(lower(status), '') like '%submit%' then 'SUBMITTED'
  when coalesce(lower(status), '') like '%gov%' then 'SUBMITTED'
  when coalesce(lower(status), '') like '%active%' then 'SUBMITTED'
  else 'CREATED'
end
where current_stage is null;

create index if not exists idx_customers_org_current_stage
  on public.customers (organization_id, current_stage);
