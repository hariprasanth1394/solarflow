-- Performance indexes for high-frequency SaaS query paths

create index if not exists idx_tasks_org_created_at_desc
  on public.tasks (organization_id, created_at desc);

create index if not exists idx_tasks_org_due_date
  on public.tasks (organization_id, due_date);

create index if not exists idx_activity_logs_org_created_at_desc
  on public.activity_logs (organization_id, created_at desc);

create index if not exists idx_documents_org_created_at_desc
  on public.documents (organization_id, created_at desc);

create index if not exists idx_spares_org_stock_quantity
  on public.spares (organization_id, stock_quantity);

create index if not exists idx_system_components_org_system_created_at
  on public.system_components (organization_id, system_id, created_at desc);
