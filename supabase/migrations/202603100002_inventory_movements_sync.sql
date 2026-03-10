-- Keep legacy stock level updates working while inventory_movements becomes source of truth.
-- Inserts corresponding stock_transactions rows when inventory_movements are created.

create or replace function public.sync_inventory_movement_to_stock_transaction()
returns trigger
language plpgsql
as $$
declare
  v_stock_type text;
  v_stock_quantity numeric(14,2);
begin
  if new.movement_type = 'reserve' then
    v_stock_type := 'adjustment';
    v_stock_quantity := -abs(new.quantity);
  elsif new.movement_type = 'release' then
    v_stock_type := 'adjustment';
    v_stock_quantity := abs(new.quantity);
  elsif new.movement_type = 'consume' then
    v_stock_type := 'usage';
    v_stock_quantity := abs(new.quantity);
  elsif new.movement_type = 'purchase' then
    v_stock_type := 'purchase';
    v_stock_quantity := abs(new.quantity);
  else
    v_stock_type := 'adjustment';
    v_stock_quantity := new.quantity;
  end if;

  insert into public.stock_transactions (
    organization_id,
    spare_id,
    type,
    quantity,
    reference,
    created_at
  )
  values (
    new.organization_id,
    new.spare_id,
    v_stock_type,
    v_stock_quantity,
    new.reference,
    new.created_at
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists trg_sync_inventory_movement_to_stock_transaction on public.inventory_movements;
create trigger trg_sync_inventory_movement_to_stock_transaction
after insert on public.inventory_movements
for each row execute function public.sync_inventory_movement_to_stock_transaction();
