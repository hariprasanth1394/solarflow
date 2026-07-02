-- Dedicated public avatars bucket + profile RPC enrichment

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1)::uuid = (
    select u.organization_id from public.users u where u.auth_user_id = auth.uid() limit 1
  )
  and split_part(name, '/', 2)::uuid = (
    select u.id from public.users u where u.auth_user_id = auth.uid() limit 1
  )
);

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
for update to authenticated
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1)::uuid = (
    select u.organization_id from public.users u where u.auth_user_id = auth.uid() limit 1
  )
  and split_part(name, '/', 2)::uuid = (
    select u.id from public.users u where u.auth_user_id = auth.uid() limit 1
  )
)
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1)::uuid = (
    select u.organization_id from public.users u where u.auth_user_id = auth.uid() limit 1
  )
  and split_part(name, '/', 2)::uuid = (
    select u.id from public.users u where u.auth_user_id = auth.uid() limit 1
  )
);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1)::uuid = (
    select u.organization_id from public.users u where u.auth_user_id = auth.uid() limit 1
  )
  and split_part(name, '/', 2)::uuid = (
    select u.id from public.users u where u.auth_user_id = auth.uid() limit 1
  )
);

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
    'organization_name', o.name,
    'email', u.email,
    'full_name', coalesce(u.full_name, u.name),
    'role', u.role,
    'status', u.status,
    'is_active', u.is_active,
    'avatar_url', u.avatar_url,
    'last_login_at', u.last_login_at,
    'created_at', u.created_at,
    'updated_at', u.updated_at
  )
  from public.users u
  join public.organizations o on o.id = u.organization_id
  where u.auth_user_id = auth.uid()
  limit 1;
$$;
