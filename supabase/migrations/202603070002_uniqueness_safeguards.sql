-- Uniqueness safeguards for duplicate prevention

create unique index if not exists uq_customers_org_email_ci
  on public.customers (organization_id, lower(email))
  where email is not null;

create unique index if not exists uq_spares_org_name_ci
  on public.spares (organization_id, lower(name));

create unique index if not exists uq_systems_org_system_name_ci
  on public.systems (organization_id, lower(system_name));
