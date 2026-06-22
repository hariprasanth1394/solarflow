-- Provision Google super admins for first login (admin-provisioned access model)

do $$
declare
  v_org_id uuid;
  v_user record;
begin
  select id into v_org_id
  from public.organizations
  order by created_at
  limit 1;

  if v_org_id is null then
    raise exception 'No organization found — run seed migrations first';
  end if;

  for v_user in
    select *
    from (
      values
        ('harifolowurheart@gmail.com', 'Hari Super Admin'),
        ('superuser01@gmail.com', 'Super User')
    ) as t(email, full_name)
  loop
    update public.users
    set
      role = 'SUPER_ADMIN',
      status = 'ACTIVE',
      is_active = true,
      full_name = coalesce(public.users.full_name, public.users.name, v_user.full_name),
      name = coalesce(public.users.name, public.users.full_name, v_user.full_name),
      updated_at = now()
    where lower(email) = lower(v_user.email);

    if not found then
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
        lower(v_user.email),
        v_user.full_name,
        v_user.full_name,
        'SUPER_ADMIN',
        'ACTIVE',
        true,
        null
      );
    end if;
  end loop;
end $$;
