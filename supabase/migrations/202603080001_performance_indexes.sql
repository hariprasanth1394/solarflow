-- Performance indexes for common SaaS query patterns

create index if not exists idx_customers_org_created_at
  on public.customers (organization_id, created_at desc);

create index if not exists idx_tasks_org_customer
  on public.tasks (organization_id, related_customer_id);

create index if not exists idx_tasks_org_status_due_date
  on public.tasks (organization_id, status, due_date asc);

create index if not exists idx_documents_org_customer_created_at
  on public.documents (organization_id, related_customer_id, created_at desc);

create index if not exists idx_spares_org_stock_quantity
  on public.spares (organization_id, stock_quantity asc);

create index if not exists idx_activity_logs_org_entity_created_at
  on public.activity_logs (organization_id, entity_type, entity_id, created_at desc);
