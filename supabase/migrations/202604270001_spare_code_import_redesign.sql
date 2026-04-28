alter table public.spares
add column if not exists spare_code text;

create or replace function public.generate_spare_code()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := 'SPR-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 10));
    exit when not exists (
      select 1
      from public.spares
      where spare_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

update public.spares
set spare_code = public.generate_spare_code()
where spare_code is null or btrim(spare_code) = '';

alter table public.spares
alter column spare_code set default public.generate_spare_code();

alter table public.spares
alter column spare_code set not null;

create unique index if not exists idx_spares_spare_code_unique
on public.spares(spare_code);

alter table public.spares
drop constraint if exists spares_spare_code_unique;

alter table public.spares
add constraint spares_spare_code_unique unique using index idx_spares_spare_code_unique;