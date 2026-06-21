-- Add proof_url column to payments table for payment proof attachments

alter table public.payments
  add column if not exists proof_url text null;

comment on column public.payments.proof_url is 'Storage path to the uploaded payment proof (image/PDF)';
