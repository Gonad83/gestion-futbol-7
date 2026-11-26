-- Inter Generaciones: resultados de los partidos del torneo (grupos y copas).
-- Cada fila es un partido del programa oficial, identificado por su código
-- (P1…P18, Q1…Q4, SP1, SP2, S1, S2, FP, FO).
--
-- Permisos:
--   miembro del equipo              → ve los resultados;
--   admin, capitán o subcapitán     → los ingresa, corrige y borra.

create table if not exists public.intergen_results (
  id             uuid primary key default gen_random_uuid(),
  team_id        integer not null references public.team_settings(id) on delete cascade,
  year           integer not null,
  match_code     text not null,
  home_goals     integer not null check (home_goals >= 0),
  away_goals     integer not null check (away_goals >= 0),
  home_yellows   integer not null default 0 check (home_yellows >= 0),
  away_yellows   integer not null default 0 check (away_yellows >= 0),
  -- Solo en copas, cuando el partido termina empatado.
  penalty_winner text check (penalty_winner in ('local', 'visita')),
  updated_at     timestamptz not null default now(),
  unique (team_id, year, match_code)
);

alter table public.intergen_results enable row level security;

drop policy if exists "intergen resultados: ver" on public.intergen_results;
drop policy if exists "intergen resultados: capitanes" on public.intergen_results;
create policy "intergen resultados: ver" on public.intergen_results for select to authenticated
  using (public.es_miembro(team_id) or public.es_superadmin());
create policy "intergen resultados: capitanes" on public.intergen_results for all to authenticated
  using (public.es_armador(team_id)) with check (public.es_armador(team_id));

-- Igual que el resto de las tablas: sin sesión no se escribe.
revoke insert, update, delete, truncate, references, trigger on public.intergen_results from anon;
revoke truncate, references, trigger on public.intergen_results from authenticated;
