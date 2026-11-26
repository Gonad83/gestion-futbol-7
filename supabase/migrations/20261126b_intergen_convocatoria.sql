-- Inter Generaciones: convocatoria por partido. No todos pueden ir a todos los
-- partidos, así que cada jugador inscrito marca si va o no a cada uno.
-- Sin fila = todavía no responde.
--
-- Permisos:
--   miembro del equipo              → ve la convocatoria;
--   el propio jugador               → marca y cambia su respuesta;
--   admin, capitán o subcapitán     → marcan por cualquiera del equipo.

create table if not exists public.intergen_callups (
  id          uuid primary key default gen_random_uuid(),
  edition_id  uuid not null references public.intergen_editions(id) on delete cascade,
  match_code  text not null,
  player_id   uuid not null references public.players(id) on delete cascade,
  status      text not null check (status in ('va', 'no_va')),
  updated_at  timestamptz not null default now(),
  unique (edition_id, match_code, player_id)
);

alter table public.intergen_callups enable row level security;

drop policy if exists "intergen convocatoria: ver" on public.intergen_callups;
drop policy if exists "intergen convocatoria: armador o el propio jugador" on public.intergen_callups;
create policy "intergen convocatoria: ver" on public.intergen_callups for select to authenticated
  using (public.es_miembro(public.equipo_de_edicion(edition_id)) or public.es_superadmin());
create policy "intergen convocatoria: armador o el propio jugador" on public.intergen_callups for all to authenticated
  using (
    public.es_armador(public.equipo_de_edicion(edition_id)) or public.es_mi_ficha(player_id)
  )
  with check (
    public.equipo_del_jugador(player_id) = public.equipo_de_edicion(edition_id)
    and (public.es_armador(public.equipo_de_edicion(edition_id)) or public.es_mi_ficha(player_id))
  );

-- Igual que el resto de las tablas: sin sesión no se escribe.
revoke insert, update, delete, truncate, references, trigger on public.intergen_callups from anon;
revoke truncate, references, trigger on public.intergen_callups from authenticated;
