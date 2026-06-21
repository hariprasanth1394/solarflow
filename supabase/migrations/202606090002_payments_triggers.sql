-- Create functions and triggers to maintain customers payment summary

-- Function to refresh payment summary for a single installation
create or replace function public.refresh_customer_payment_summary(p_installation uuid)
returns void as $$
begin
  -- Update with aggregated paid amount
  update public.customers
  set
    paid_amount = coalesce(sub.total_paid, 0),
    pending_amount = greatest(coalesce(public.customers.total_cost, 0) - coalesce(sub.total_paid, 0), 0),
    payment_status = case
      when coalesce(public.customers.total_cost, 0) <= 0 then 'Pending'
      when coalesce(sub.total_paid, 0) >= public.customers.total_cost then 'Paid'
      when coalesce(sub.total_paid, 0) > 0 then 'Partial'
      else 'Pending'
    end
  from (
    select installation_id, sum(amount) as total_paid
    from public.payments
    where installation_id = p_installation
    group by installation_id
  ) sub
  where public.customers.id = p_installation;

  -- If no payments exist for the installation, ensure defaults are set
  if not found then
    update public.customers
    set
      paid_amount = 0,
      pending_amount = greatest(coalesce(total_cost, 0) - 0, 0),
      payment_status = case
        when coalesce(total_cost, 0) <= 0 then 'Pending'
        else 'Pending'
      end
    where id = p_installation;
  end if;
end;
$$ language plpgsql;

-- Trigger function to call refresh on insert/update/delete
create or replace function public.payments_after_change()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    perform public.refresh_customer_payment_summary(new.installation_id);
    return new;
  elsif (tg_op = 'UPDATE') then
    if new.installation_id is distinct from old.installation_id then
      perform public.refresh_customer_payment_summary(old.installation_id);
      perform public.refresh_customer_payment_summary(new.installation_id);
    else
      perform public.refresh_customer_payment_summary(new.installation_id);
    end if;
    return new;
  elsif (tg_op = 'DELETE') then
    perform public.refresh_customer_payment_summary(old.installation_id);
    return old;
  end if;
  return null;
end;
$$ language plpgsql;

-- Create trigger
drop trigger if exists trg_payments_after_change on public.payments;
create trigger trg_payments_after_change
  after insert or update or delete on public.payments
  for each row
  execute function public.payments_after_change();

-- Backfill existing installations that have payments
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT distinct installation_id FROM public.payments LOOP
    PERFORM public.refresh_customer_payment_summary(r.installation_id);
  END LOOP;
END
$$;
