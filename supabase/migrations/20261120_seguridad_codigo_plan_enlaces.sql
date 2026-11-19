-- Cuatro puertas que seguían abiertas después de 20260928_seguridad_por_equipo:
--   1. cualquier usuario leía la fila completa de los equipos visibles en la
--      Arena, incluido su código de invitación, y con él se unía al equipo;
--   2. el capitán podía cambiar el plan de su equipo y su vencimiento;
--   3. un jugador podía cambiar la fecha de alta de su ficha (de ella salen los
--      meses que debe) y sus notas de forma, técnica, visión, ataque y defensa;
--   4. el enlace "Voy / No voy" del correo no llevaba ninguna clave: bastaba
--      conocer los identificadores para responder por otro.

-- ── 1. El equipo solo lo ven sus miembros ──────────────────────────────────
drop policy if exists "equipo: ver el mío y los de la Arena" on public.team_settings;
drop policy if exists "equipo: ver el mío" on public.team_settings;
create policy "equipo: ver el mío" on public.team_settings for select to authenticated
  using (public.es_miembro(id) or public.es_superadmin());

-- La Arena muestra de los otros equipos solo su ficha pública.
create or replace function public.equipos_arena()
returns table (
  id integer, team_name text, logo_url text, city text, commune text, region text,
  age_range text, preferred_format text, team_description text
) language sql stable security definer set search_path = public as $$
  select t.id, t.team_name, t.logo_url, t.city, t.commune, t.region,
         t.age_range, t.preferred_format, t.team_description
  from public.team_settings t
  where t.arena_visible;
$$;
revoke all on function public.equipos_arena() from public, anon;
grant execute on function public.equipos_arena() to authenticated;

-- ── 2. El plan lo cambia el pago, no el capitán ────────────────────────────
-- Desde la app (rol authenticated) estas columnas no se tocan. Las funciones
-- que aplican un pago corren como dueñas de la base y sí pueden.
create or replace function public.proteger_plan_equipo()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.id              := old.id;
    new.plan            := old.plan;
    new.tier            := old.tier;
    new.plan_expires_at := old.plan_expires_at;
    new.owner_id        := old.owner_id;
  end if;
  return new;
end;
$$;
drop trigger if exists proteger_plan_equipo on public.team_settings;
create trigger proteger_plan_equipo before update on public.team_settings
  for each row execute function public.proteger_plan_equipo();

-- ── 3. Lo que un jugador no cambia de su ficha ─────────────────────────────
create or replace function public.proteger_ficha_jugador()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.es_admin_equipo(old.team_id) then
    return new;
  end if;
  new.id         := old.id;
  new.team_id    := old.team_id;
  new.is_admin   := old.is_admin;
  new.match_role := old.match_role;
  new.rating     := old.rating;
  new.forma      := old.forma;
  new.tecnica    := old.tecnica;
  new.vision     := old.vision;
  new.ataque     := old.ataque;
  new.defensa    := old.defensa;
  new.email      := old.email;
  new.created_at := old.created_at;
  if old.user_id is not null or new.user_id is distinct from auth.uid() then
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;
revoke all on function public.proteger_ficha_jugador() from public, anon, authenticated;
revoke all on function public.proteger_plan_equipo() from public, anon, authenticated;

-- ── 4. Clave en el enlace de asistencia ────────────────────────────────────
-- Cada enlace lleva una clave que sale de un secreto guardado solo en la base
-- (cron_tokens, sin acceso desde la app), del jugador y del partido. Sirve
-- para ese jugador en ese partido y para nadie más.
insert into public.cron_tokens (nombre, token)
select 'asistencia', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
where not exists (select 1 from public.cron_tokens where nombre = 'asistencia');

-- Devuelve null si el jugador y el partido no son del mismo equipo.
create or replace function public.token_asistencia_interno(p_player uuid, p_match uuid)
returns text language sql stable security definer set search_path = public as $$
  select left(encode(sha256(convert_to(c.token || ':' || p.id || ':' || m.id || ':' || c.token, 'UTF8')), 'hex'), 32)
  from public.cron_tokens c, public.players p, public.matches m
  where c.nombre = 'asistencia' and p.id = p_player and m.id = p_match and p.team_id = m.team_id;
$$;

create or replace function public.tokens_asistencia_interno(p_match uuid)
returns table (player_id uuid, token text)
language sql stable security definer set search_path = public as $$
  select p.id, public.token_asistencia_interno(p.id, m.id)
  from public.matches m join public.players p on p.team_id = m.team_id
  where m.id = p_match;
$$;

-- Para quien manda los correos desde la app: capitán o subcapitán del equipo.
create or replace function public.tokens_asistencia(p_match uuid)
returns table (player_id uuid, token text)
language sql stable security definer set search_path = public as $$
  select t.player_id, t.token
  from public.tokens_asistencia_interno(p_match) t
  where public.es_armador(public.equipo_del_partido(p_match));
$$;

revoke all on function public.token_asistencia_interno(uuid, uuid) from public, anon, authenticated;
revoke all on function public.tokens_asistencia_interno(uuid) from public, anon, authenticated;
revoke all on function public.tokens_asistencia(uuid) from public, anon;
grant execute on function public.token_asistencia_interno(uuid, uuid) to service_role;
grant execute on function public.tokens_asistencia_interno(uuid) to service_role;
grant execute on function public.tokens_asistencia(uuid) to authenticated;
