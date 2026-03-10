-- Duplicate prevention guardrails
-- Tenant-scoped unique constraints for high-risk duplicate entities.

-- Clean up duplicate customer emails before applying unique constraint
DELETE FROM public.customers c
WHERE c.id NOT IN (
  SELECT DISTINCT ON (organization_id, lower(trim(email))) id
  FROM public.customers
  WHERE email IS NOT NULL AND trim(email) <> ''
  ORDER BY organization_id, lower(trim(email)), created_at DESC
)
AND c.email IS NOT NULL AND trim(c.email) <> '';

-- Now apply the unique constraint
create unique index if not exists uniq_customers_org_email_ci
  on public.customers (organization_id, lower(trim(email)))
  where email is not null and trim(email) <> '';

create unique index if not exists uniq_spares_org_name_ci
  on public.spares (organization_id, lower(trim(name)));

create unique index if not exists uniq_documents_org_file_url
  on public.documents (organization_id, file_url);
