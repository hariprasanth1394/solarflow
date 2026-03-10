-- SolarFlow Supabase query performance indexes
-- Focus: common tenant filters + sort keys for dashboard/list/report workloads

create index if not exists idx_customers_org_created_at
  on public.customers (organization_id, created_at desc);

create index if not exists idx_customers_org_current_stage_created_at
  on public.customers (organization_id, current_stage, created_at desc);

create index if not exists idx_tasks_org_customer_created_at
  on public.tasks (organization_id, related_customer_id, created_at desc);

create index if not exists idx_tasks_org_status_due_date
  on public.tasks (organization_id, status, due_date);

create index if not exists idx_documents_org_customer_created_at
  on public.documents (organization_id, related_customer_id, created_at desc);

create index if not exists idx_customer_progress_org_customer_created_at
  on public.customer_progress (organization_id, customer_id, created_at desc);

create index if not exists idx_activity_logs_org_created_at
  on public.activity_logs (organization_id, created_at desc);

create index if not exists idx_spares_org_created_at
  on public.spares (organization_id, created_at desc);
