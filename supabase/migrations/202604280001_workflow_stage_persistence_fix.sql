-- Fix workflow stage persistence bug
-- Add independent stage status columns to prevent recalculation overwrites

alter table public.customers
  add column if not exists submission_completed boolean not null default false,
  add column if not exists approval_completed boolean not null default false,
  add column if not exists installation_completed boolean not null default false,
  add column if not exists closure_completed boolean not null default false;

-- Migrate existing data from current_stage
update public.customers
set
  submission_completed = case when current_stage in ('SUBMITTED', 'APPROVED', 'INSTALLATION', 'CLOSED') then true else false end,
  approval_completed = case when current_stage in ('APPROVED', 'INSTALLATION', 'CLOSED') then true else false end,
  installation_completed = case when current_stage in ('INSTALLATION', 'CLOSED') then true else false end,
  closure_completed = case when current_stage = 'CLOSED' then true else false end;

-- Create indexes for performance
create index if not exists idx_customers_stage_completion on public.customers(submission_completed, approval_completed, installation_completed, closure_completed);