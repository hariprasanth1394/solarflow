-- Seed platform super admin (provisioned, not linked to auth until first login)
-- No passwords are stored in this migration.

do $$
declare
  v_org_id uuid;
begin
  select id into v_org_id
  from public.organizations
  where name = 'SolarFlow Platform'
  limit 1;

  if v_org_id is null then
    insert into public.organizations (name, industry, plan)
    values ('SolarFlow Platform', 'Solar Energy', 'enterprise')
    returning id into v_org_id;

    insert into public.organization_settings (organization_id, company_name, timezone, currency, language)
    values (v_org_id, 'SolarFlow Platform', 'UTC', 'INR', 'en')
    on conflict (organization_id) do nothing;
  end if;

  if not exists (
    select 1 from public.users where lower(email) = lower('admin@solarflow.local')
  ) then
    insert into public.users (
      organization_id,
      email,
      full_name,
      name,
      role,
      status,
      is_active,
      auth_user_id
    )
    values (
      v_org_id,
      'admin@solarflow.local',
      'SolarFlow Super Admin',
      'SolarFlow Super Admin',
      'SUPER_ADMIN',
      'ACTIVE',
      true,
      null
    );
  end if;
end $$;
