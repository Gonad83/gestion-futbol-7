-- Migration: Add mercadopago_events table
create table if not exists public.mercadopago_events (
  id uuid default uuid_generate_v4() primary key,
  payment_id text not null,
  status text not null,
  status_detail text,
  metadata jsonb,
  raw_data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.mercadopago_events enable row level security;

-- Policies
create policy "Admins can view mp events" on public.mercadopago_events 
  for select using (
    exists (
      select 1 from public.users 
      where id = auth.uid() and role = 'admin'
    )
  );
