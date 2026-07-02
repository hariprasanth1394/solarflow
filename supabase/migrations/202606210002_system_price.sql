alter table public.systems
  add column if not exists price numeric(14,2);

comment on column public.systems.price is 'Template list price in INR';
