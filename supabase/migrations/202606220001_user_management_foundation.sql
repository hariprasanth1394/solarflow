-- SolarFlow user management foundation
-- Evolves public.users in place (no duplicate profile table).
-- Decouples business user id from auth.users via auth_user_id.
-- Disables self-registration via auth trigger removal.

create extension if not exists "pgcrypto";

-- =====================================================
-- Roles reference (seed definitions)
-- =====================================================

create table if not exists public.roles (
  key text primary key,
  label text not null,
  description text,
  created_at timestamptz not null default now()
);

insert into public.roles (key, label, description) values
  ('SUPER_ADMIN', 'Super Admin', 'Full platform access including user management'),
  ('ADMIN', 'Admin', 'Operational admin without user management'),
  ('MANAGER', 'Manager', 'Customers, tasks, documents, dashboard'),
  ('TECHNICIAN', 'Technician', 'Assigned tasks and installations only'),
  ('VIEWER', 'Viewer', 'Read-only access')
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description;

-- =====================================================
-- Evolve public.users
-- =====================================================

alter table public.users
  add column if not exists auth_user_id uuid,
  add column if not exists full_name text,
  add column if not exists is_active boolean not null default true,
  add column if not exists last_login_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid references public.users(id) on delete set null;

-- Backfill auth link and display name from legacy columns
update public.users
set auth_user_id = id
where auth_user_id is null;

update public.users
set full_name = coalesce(full_name, name)
where full_name is null and name is not null;

update public.users
set email = concat('unknown+', id::text, '@solarflow.local')
where email is null or trim(email) = '';

-- Drop legacy auth coupling on primary key
alter table public.users drop constraint if exists users_id_fkey;

alter table public.users
  alter column id set default gen_random_uuid();

alter table public.users
  alter column email set not null;

create unique index if not exists idx_users_email_lower_unique
  on public.users (lower(email));

create unique index if not exists idx_users_auth_user_id_unique
  on public.users (auth_user_id)
  where auth_user_id is not null;

alter table public.users drop constraint if exists users_auth_user_id_fkey;
alter table public.users
  add constraint users_auth_user_id_fkey
  foreign key (auth_user_id) references auth.users(id) on delete set null;

-- Drop legacy check constraints before normalizing values to uppercase
alter table public.users drop constraint if exists users_role_check;
alter table public.users drop constraint if exists users_status_check;

-- Normalize legacy role/status values
update public.users set role = upper(trim(role)) where role is not null;
update public.users set role = 'TECHNICIAN' where role in ('EMPLOYEE', 'MEMBER');
update public.users set role = 'ADMIN' where role = 'OWNER';
update public.users set role = 'VIEWER' where role not in ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TECHNICIAN', 'VIEWER');

update public.users set status = upper(trim(status)) where status is not null;
update public.users set status = 'ACTIVE' where status in ('ACTIVE', 'APPROVED');
update public.users set status = 'INACTIVE' where status not in ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');

update public.users set is_active = (status = 'ACTIVE');

alter table public.users
  add constraint users_role_check
  check (role in ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TECHNICIAN', 'VIEWER'));

alter table public.users
  add constraint users_status_check
  check (status in ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'));

alter table public.users alter column role set default 'VIEWER';
alter table public.users alter column status set default 'PENDING';

-- =====================================================
-- Custom user permissions
-- =====================================================

create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  permission_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, permission_key)
);

create index if not exists idx_user_permissions_user on public.user_permissions(user_id);

-- =====================================================
-- Login audit
-- =====================================================

create table if not exists public.login_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  email text,
  provider text,
  event_type text not null check (event_type in ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'ACCESS_DENIED', 'LOGOUT')),
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_login_audit_user on public.login_audit(user_id);
create index if not exists idx_login_audit_email on public.login_audit(lower(email));
create index if not exists idx_login_audit_created_at on public.login_audit(created_at desc);

-- =====================================================
-- Disable self-registration trigger
-- =====================================================

drop trigger if exists on_auth_user_created on auth.users;

-- =====================================================
-- Auth / RBAC helper functions
-- =====================================================

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.users
  where auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.users
  where auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.users
  where auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'SUPER_ADMIN', false);
$$;

create or replace function public.user_has_permission(p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_permissions up
    where up.user_id = public.current_app_user_id()
      and up.permission_key = p_permission_key
  );
$$;

create or replace function public.touch_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.touch_users_updated_at();

-- =====================================================
-- Provision validation (auth identity -> business user)
-- =====================================================

create or replace function public.validate_and_link_provisioned_user(
  p_provider text default 'email',
  p_ip_address text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_id uuid := auth.uid();
  v_email text;
  v_meta jsonb;
  v_user public.users%rowtype;
  v_avatar text;
  v_display_name text;
begin
  if v_auth_id is null then
    insert into public.login_audit (email, provider, event_type, ip_address, user_agent, metadata)
    values (null, p_provider, 'LOGIN_FAILED', p_ip_address, p_user_agent, '{"reason":"NOT_AUTHENTICATED"}'::jsonb);
    return jsonb_build_object('allowed', false, 'reason', 'NOT_AUTHENTICATED');
  end if;

  select email, raw_user_meta_data
    into v_email, v_meta
  from auth.users
  where id = v_auth_id;

  if v_email is null or trim(v_email) = '' then
    insert into public.login_audit (user_id, email, provider, event_type, ip_address, user_agent, metadata)
    values (null, null, p_provider, 'LOGIN_FAILED', p_ip_address, p_user_agent, '{"reason":"MISSING_EMAIL"}'::jsonb);
    return jsonb_build_object('allowed', false, 'reason', 'MISSING_EMAIL');
  end if;

  select *
    into v_user
  from public.users
  where lower(email) = lower(v_email)
  limit 1;

  if not found then
    insert into public.login_audit (email, provider, event_type, ip_address, user_agent, metadata)
    values (v_email, p_provider, 'ACCESS_DENIED', p_ip_address, p_user_agent, '{"reason":"NOT_PROVISIONED"}'::jsonb);
    return jsonb_build_object('allowed', false, 'reason', 'NOT_PROVISIONED');
  end if;

  if v_user.status <> 'ACTIVE' or v_user.is_active is distinct from true then
    insert into public.login_audit (user_id, email, provider, event_type, ip_address, user_agent, metadata)
    values (
      v_user.id,
      v_email,
      p_provider,
      'ACCESS_DENIED',
      p_ip_address,
      p_user_agent,
      jsonb_build_object('reason', 'STATUS_' || v_user.status)
    );
    return jsonb_build_object('allowed', false, 'reason', 'STATUS_' || v_user.status, 'status', v_user.status);
  end if;

  v_avatar := coalesce(v_meta ->> 'avatar_url', v_meta ->> 'picture');
  v_display_name := coalesce(v_meta ->> 'full_name', v_meta ->> 'name');

  update public.users
  set
    auth_user_id = v_auth_id,
    last_login_at = now(),
    updated_at = now(),
    avatar_url = coalesce(v_avatar, avatar_url),
    full_name = case
      when full_name is null or trim(full_name) = '' then coalesce(v_display_name, full_name)
      else full_name
    end
  where id = v_user.id
  returning * into v_user;

  insert into public.login_audit (user_id, email, provider, event_type, ip_address, user_agent, metadata)
  values (
    v_user.id,
    v_email,
    p_provider,
    'LOGIN_SUCCESS',
    p_ip_address,
    p_user_agent,
    jsonb_build_object('role', v_user.role)
  );

  return jsonb_build_object(
    'allowed', true,
    'user_id', v_user.id,
    'organization_id', v_user.organization_id,
    'role', v_user.role,
    'email', v_user.email,
    'full_name', v_user.full_name,
    'status', v_user.status
  );
end;
$$;

create or replace function public.log_auth_event(
  p_event_type text,
  p_email text default null,
  p_provider text default null,
  p_user_id uuid default null,
  p_ip_address text default null,
  p_user_agent text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.login_audit (
    user_id, email, provider, event_type, ip_address, user_agent, metadata
  ) values (
    p_user_id, p_email, p_provider, p_event_type, p_ip_address, p_user_agent, coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.get_my_profile()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', u.id,
    'auth_user_id', u.auth_user_id,
    'organization_id', u.organization_id,
    'email', u.email,
    'full_name', coalesce(u.full_name, u.name),
    'role', u.role,
    'status', u.status,
    'is_active', u.is_active,
    'avatar_url', u.avatar_url,
    'last_login_at', u.last_login_at
  )
  from public.users u
  where u.auth_user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.validate_and_link_provisioned_user(text, text, text) to authenticated;
grant execute on function public.log_auth_event(text, text, text, uuid, text, text, jsonb) to authenticated;
grant execute on function public.get_my_profile() to authenticated;

-- =====================================================
-- RLS: users, permissions, login_audit
-- =====================================================

alter table public.roles enable row level security;
alter table public.user_permissions enable row level security;
alter table public.login_audit enable row level security;

drop policy if exists roles_read_authenticated on public.roles;
create policy roles_read_authenticated on public.roles
for select to authenticated
using (true);

drop policy if exists users_select_self on public.users;
drop policy if exists users_select_org on public.users;
drop policy if exists users_insert_admin on public.users;
drop policy if exists users_update_self_or_admin on public.users;

create policy users_select_self on public.users
for select to authenticated
using (auth_user_id = auth.uid());

create policy users_select_org_super_admin on public.users
for select to authenticated
using (
  organization_id = public.current_user_org_id()
  and public.current_user_role() = 'SUPER_ADMIN'
);

create policy users_insert_super_admin on public.users
for insert to authenticated
with check (
  organization_id = public.current_user_org_id()
  and public.current_user_role() = 'SUPER_ADMIN'
);

create policy users_update_super_admin on public.users
for update to authenticated
using (
  organization_id = public.current_user_org_id()
  and public.current_user_role() = 'SUPER_ADMIN'
)
with check (
  organization_id = public.current_user_org_id()
  and public.current_user_role() = 'SUPER_ADMIN'
);

create policy users_update_self_profile on public.users
for update to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

create or replace function public.enforce_users_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.auth_user_id = auth.uid() and not public.is_super_admin() then
    if new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.is_active is distinct from old.is_active
      or new.organization_id is distinct from old.organization_id
      or new.email is distinct from old.email then
      raise exception 'Cannot modify privileged account fields';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_users_self_update on public.users;
create trigger trg_enforce_users_self_update
before update on public.users
for each row execute function public.enforce_users_self_update();

drop policy if exists user_permissions_select on public.user_permissions;
create policy user_permissions_select on public.user_permissions
for select to authenticated
using (
  user_id = public.current_app_user_id()
  or (
    public.current_user_role() = 'SUPER_ADMIN'
    and exists (
      select 1 from public.users u
      where u.id = user_permissions.user_id
        and u.organization_id = public.current_user_org_id()
    )
  )
);

-- Add organization_id to user_permissions for admin scoping via join is heavy;
-- scope by user ownership / super admin via user_id join in app for now.

drop policy if exists user_permissions_manage_super_admin on public.user_permissions;
create policy user_permissions_manage_super_admin on public.user_permissions
for all to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = user_permissions.user_id
      and u.organization_id = public.current_user_org_id()
      and public.current_user_role() = 'SUPER_ADMIN'
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = user_permissions.user_id
      and u.organization_id = public.current_user_org_id()
      and public.current_user_role() = 'SUPER_ADMIN'
  )
);

drop policy if exists login_audit_select_super_admin on public.login_audit;
create policy login_audit_select_super_admin on public.login_audit
for select to authenticated
using (
  public.current_user_role() = 'SUPER_ADMIN'
  and exists (
    select 1
    from public.users u
    where u.id = login_audit.user_id
      and u.organization_id = public.current_user_org_id()
  )
);

drop policy if exists login_audit_select_self on public.login_audit;
create policy login_audit_select_self on public.login_audit
for select to authenticated
using (user_id = public.current_app_user_id());

-- =====================================================
-- Technician-scoped access (tasks + assigned customers)
-- =====================================================

drop policy if exists tasks_org_all on public.tasks;
create policy tasks_org_read on public.tasks
for select to authenticated
using (
  organization_id = public.current_user_org_id()
  and (
    public.current_user_role() <> 'TECHNICIAN'
    or assigned_to = public.current_app_user_id()
    or created_by = public.current_app_user_id()
  )
);

create policy tasks_org_write on public.tasks
for insert to authenticated
with check (
  organization_id = public.current_user_org_id()
  and public.current_user_role() in ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
);

create policy tasks_org_update on public.tasks
for update to authenticated
using (
  organization_id = public.current_user_org_id()
  and (
    public.current_user_role() in ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
    or (
      public.current_user_role() = 'TECHNICIAN'
      and assigned_to = public.current_app_user_id()
    )
  )
)
with check (organization_id = public.current_user_org_id());

create policy tasks_org_delete on public.tasks
for delete to authenticated
using (
  organization_id = public.current_user_org_id()
  and public.current_user_role() in ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
);

drop policy if exists customers_org_all on public.customers;
create policy customers_org_read on public.customers
for select to authenticated
using (
  organization_id = public.current_user_org_id()
  and (
    public.current_user_role() <> 'TECHNICIAN'
    or assigned_to = public.current_app_user_id()
  )
);

create policy customers_org_write on public.customers
for all to authenticated
using (
  organization_id = public.current_user_org_id()
  and public.current_user_role() in ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
)
with check (
  organization_id = public.current_user_org_id()
  and public.current_user_role() in ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
);

-- Viewer read-only: block mutating policies at app layer; DB still org-scoped.

drop policy if exists organizations_update_admin on public.organizations;
create policy organizations_update_admin on public.organizations
for update to authenticated
using (
  id = public.current_user_org_id()
  and public.current_user_role() in ('SUPER_ADMIN', 'ADMIN')
)
with check (id = public.current_user_org_id());
