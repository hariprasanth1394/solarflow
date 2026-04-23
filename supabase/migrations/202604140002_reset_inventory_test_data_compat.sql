-- Compatibility wrapper for RPC schema-cache/signature mismatch
-- Supports calls resolved as: reset_inventory_test_data(p_confirm text, p_organization_id uuid)

create or replace function public.reset_inventory_test_data(
  p_confirm text,
  p_organization_id uuid
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.reset_inventory_test_data(p_organization_id, p_confirm);
$$;

comment on function public.reset_inventory_test_data(text, uuid)
is 'Compatibility overload that delegates to reset_inventory_test_data(uuid, text).';

grant execute on function public.reset_inventory_test_data(text, uuid) to authenticated;
grant execute on function public.reset_inventory_test_data(text, uuid) to service_role;
