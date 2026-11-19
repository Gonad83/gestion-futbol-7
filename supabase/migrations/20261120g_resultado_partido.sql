-- Cerrar un partido: marcador entre los dos equipos armados (A y B) y los
-- goles y asistencias de cada jugador. Hasta ahora ningún partido tenía
-- resultado: los 99 seguían en "Programado".

alter table public.matches add column if not exists goles_a integer check (goles_a is null or goles_a between 0 and 99);
alter table public.matches add column if not exists goles_b integer check (goles_b is null or goles_b between 0 and 99);

create table if not exists public.match_player_stats (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  equipo text check (equipo in ('A', 'B')),
  goles integer not null default 0 check (goles between 0 and 50),
  asistencias integer not null default 0 check (asistencias between 0 and 50),
  primary key (match_id, player_id)
);
create index if not exists match_player_stats_player_idx on public.match_player_stats (player_id);

alter table public.match_player_stats enable row level security;
drop policy if exists "estadisticas: ver las de mi equipo" on public.match_player_stats;
create policy "estadisticas: ver las de mi equipo" on public.match_player_stats for select to authenticated
  using (public.es_miembro(public.equipo_del_partido(match_id)) or public.es_superadmin());
-- Se escriben solo con guardar_resultado (que revisa permisos y deja todo junto).
revoke insert, update, delete on public.match_player_stats from anon, authenticated;

-- Guarda marcador y planilla de una vez. Lo puede hacer el capitán o un
-- subcapitán del equipo del partido. p_jugadores: [{player_id, equipo, goles, asistencias}].
create or replace function public.guardar_resultado(p_match uuid, p_goles_a integer, p_goles_b integer, p_jugadores jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_equipo integer := public.equipo_del_partido(p_match);
begin
  if v_equipo is null or not public.es_armador(v_equipo) then
    raise exception 'Solo el capitán o un subcapitán carga el resultado';
  end if;
  if p_goles_a is null or p_goles_b is null or p_goles_a not between 0 and 99 or p_goles_b not between 0 and 99 then
    raise exception 'El marcador no es válido';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(coalesce(p_jugadores, '[]'::jsonb)) as x(player_id uuid)
    where public.equipo_del_jugador(x.player_id) is distinct from v_equipo
  ) then
    raise exception 'Hay jugadores que no son del equipo';
  end if;

  update public.matches set goles_a = p_goles_a, goles_b = p_goles_b, status = 'Jugado' where id = p_match;

  delete from public.match_player_stats where match_id = p_match;
  insert into public.match_player_stats (match_id, player_id, equipo, goles, asistencias)
  select p_match, x.player_id, nullif(x.equipo, ''), greatest(0, coalesce(x.goles, 0)), greatest(0, coalesce(x.asistencias, 0))
  from jsonb_to_recordset(coalesce(p_jugadores, '[]'::jsonb))
    as x(player_id uuid, equipo text, goles integer, asistencias integer)
  where coalesce(x.goles, 0) > 0 or coalesce(x.asistencias, 0) > 0 or nullif(x.equipo, '') is not null;
end;
$$;
revoke all on function public.guardar_resultado(uuid, integer, integer, jsonb) from public, anon;
grant execute on function public.guardar_resultado(uuid, integer, integer, jsonb) to authenticated;
