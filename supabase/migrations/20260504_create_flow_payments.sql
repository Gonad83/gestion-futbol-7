create table if not exists public.flow_payments (
  id              uuid primary key default gen_random_uuid(),
  token           text unique not null,
  commerce_order  text,
  flow_order      bigint,
  amount          numeric,
  payer_email     text,
  plan            text,
  status          text default 'paid',
  paid_at         timestamptz,
  created_at      timestamptz default now()
);

alter table public.flow_payments enable row level security;

-- Solo el service role puede leer/escribir (llamado desde Edge Functions)
create policy "service role full access" on public.flow_payments
  for all using (auth.role() = 'service_role');
