-- Avisos automáticos que el capitán prende o apaga en Ajustes.
--   aviso_partidos → recordatorio 24 h antes de cada partido a quien no ha respondido.
--   aviso_cuotas   → avisos de cuota del día 1 y del día 15.
--   aviso_cumples  → saludo por correo a cada jugador el día de su cumpleaños.
--   aviso_eventos  → recordatorio 24 h antes de eventos sociales (asados, juntas)
--                    preguntando si se suma o no.
alter table public.team_settings
  add column if not exists aviso_partidos boolean not null default true,
  add column if not exists aviso_cuotas   boolean not null default true,
  add column if not exists aviso_cumples  boolean not null default true,
  add column if not exists aviso_eventos  boolean not null default true;

-- Un saludo por jugador y año: evita mandar dos veces si la función se repite.
create table if not exists public.saludos_cumple (
  player_id uuid not null references public.players(id) on delete cascade,
  year integer not null,
  sent_at timestamptz not null default now(),
  primary key (player_id, year)
);
alter table public.saludos_cumple enable row level security;
revoke all on public.saludos_cumple from anon, authenticated;
