-- Suscripción mensual con Flow: el capitán inscribe su tarjeta una vez y Flow
-- le cobra solo cada mes. Aquí queda quién se suscribió y a qué, para unir los
-- avisos de cada cobro con su correo y su plan. Cada cobro pagado se registra
-- en flow_payments y se aplica con aplicar_pago_flow, igual que un pago único.
create table if not exists public.flow_suscripciones (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  nombre text,
  equipo text,
  tier text not null check (tier in ('pro', 'elite')),
  plan_flow text not null,
  customer_id text not null,
  subscription_id text unique,
  origen text,
  estado text not null default 'inscribiendo'
    check (estado in ('inscribiendo', 'activa', 'tarjeta_rechazada', 'error', 'cancelada')),
  detalle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists flow_suscripciones_email_idx on public.flow_suscripciones (lower(email), created_at desc);
create index if not exists flow_suscripciones_customer_idx on public.flow_suscripciones (customer_id);

-- Solo las funciones del servidor la leen y escriben.
alter table public.flow_suscripciones enable row level security;
revoke all on public.flow_suscripciones from anon, authenticated;
