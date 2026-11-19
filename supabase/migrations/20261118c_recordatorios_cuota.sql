-- Recordatorios automáticos de cuota por correo (función cuota-reminder).
--   Día 1 de cada mes  → aviso de la cuota del mes.
--   Día 15 de cada mes → recordatorio a quienes siguen debiendo.
-- 12:00 UTC = 9:00 en Chile (8:00 en horario de invierno).

-- Un aviso por equipo, mes y tipo: evita enviar dos veces y deja registro.
create table if not exists public.recordatorios_cuota (
  id bigint generated always as identity primary key,
  team_id integer not null references public.team_settings(id) on delete cascade,
  year integer not null,
  month integer not null,
  tipo text not null check (tipo in ('inicio', 'mitad')),
  enviados integer not null default 0,
  sent_at timestamptz not null default now(),
  unique (team_id, year, month, tipo)
);
alter table public.recordatorios_cuota enable row level security;
revoke all on public.recordatorios_cuota from anon, authenticated;

-- Token que pg_cron le manda a la función. Sin políticas: solo el servidor lo lee.
create table if not exists public.cron_tokens (
  nombre text primary key,
  token text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
);
alter table public.cron_tokens enable row level security;
revoke all on public.cron_tokens from anon, authenticated;
insert into public.cron_tokens (nombre) values ('cuota-reminder') on conflict do nothing;

select cron.schedule('cuota-inicio-de-mes', '0 12 1 * *', $cron$
  select net.http_post(
    url := 'https://wmcycxnydunfjnirmjuy.supabase.co/functions/v1/cuota-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (select token from public.cron_tokens where nombre = 'cuota-reminder')
    ),
    body := '{"tipo":"inicio"}'::jsonb
  );
$cron$);

select cron.schedule('cuota-mitad-de-mes', '0 12 15 * *', $cron$
  select net.http_post(
    url := 'https://wmcycxnydunfjnirmjuy.supabase.co/functions/v1/cuota-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (select token from public.cron_tokens where nombre = 'cuota-reminder')
    ),
    body := '{"tipo":"mitad"}'::jsonb
  );
$cron$);
