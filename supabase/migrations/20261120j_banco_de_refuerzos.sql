-- Refuerzos para completar un partido.
--
--  1. De confianza: los invitados que ya jugaron con el equipo (match_guests).
--  2. Banco entre equipos: jugadores de cualquier equipo que se ofrecen como
--     refuerzo en su región. Un capitán (o subcapitán) los busca y les pide
--     jugar; si aceptan, entran al partido como invitados. Nunca se muestra el
--     correo ni otro dato de contacto: todo pasa por la app.

-- ── 1. Invitados frecuentes ────────────────────────────────────────────────
create or replace function public.invitados_frecuentes(p_team integer)
returns table (nombre text, veces integer, ultima timestamptz, rating numeric, posicion text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.es_armador(p_team) then
    raise exception 'Solo el capitán o un subcapitán ve los invitados.';
  end if;
  return query
    select (array_agg(trim(regexp_replace(g.name, '\s*\(I\)\s*$', '', 'i')) order by g.created_at desc))[1],
           count(*)::integer,
           max(m.date),
           (array_agg(g.rating order by g.created_at desc))[1],
           (array_agg(g.position order by g.created_at desc))[1]
    from public.match_guests g
    join public.matches m on m.id = g.match_id
    where m.team_id = p_team
    group by lower(trim(regexp_replace(g.name, '\s*\(I\)\s*$', '', 'i')))
    order by count(*) desc, max(m.date) desc
    limit 60;
end;
$$;
revoke all on function public.invitados_frecuentes(integer) from public, anon;
grant execute on function public.invitados_frecuentes(integer) to authenticated;

-- ── 2. Banco entre equipos ─────────────────────────────────────────────────
create table if not exists public.refuerzos_disponibles (
  player_id  uuid primary key references public.players(id) on delete cascade,
  region     text not null,
  comuna     text check (comuna is null or char_length(comuna) <= 60),
  nota       text check (nota is null or char_length(nota) <= 140),
  activo     boolean not null default true,
  actualizado timestamptz not null default now()
);
alter table public.refuerzos_disponibles enable row level security;
create policy "refuerzo: el jugador ve lo suyo" on public.refuerzos_disponibles for select to authenticated
  using (public.es_mi_ficha(player_id));
create policy "refuerzo: el jugador se anota" on public.refuerzos_disponibles for insert to authenticated
  with check (public.es_mi_ficha(player_id));
create policy "refuerzo: el jugador cambia lo suyo" on public.refuerzos_disponibles for update to authenticated
  using (public.es_mi_ficha(player_id)) with check (public.es_mi_ficha(player_id));
create policy "refuerzo: el jugador se borra" on public.refuerzos_disponibles for delete to authenticated
  using (public.es_mi_ficha(player_id));

create table if not exists public.solicitudes_refuerzo (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references public.matches(id) on delete cascade,
  player_id    uuid not null references public.players(id) on delete cascade,
  estado       text not null default 'Pendiente' check (estado in ('Pendiente', 'Aceptada', 'Rechazada', 'Cancelada')),
  guest_id     uuid references public.match_guests(id) on delete set null,
  creada_por   uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  respondida_at timestamptz,
  unique (match_id, player_id)
);
alter table public.solicitudes_refuerzo enable row level security;
-- Solo lectura directa; todo cambio pasa por las funciones de abajo.
create policy "solicitud: la ven el capitán del partido y el refuerzo" on public.solicitudes_refuerzo for select to authenticated
  using (public.es_armador(public.equipo_del_partido(match_id)) or public.es_mi_ficha(player_id));

/** El capitán busca refuerzos de otros equipos para un partido suyo. */
create or replace function public.buscar_refuerzos(p_match uuid, p_region text default null)
returns table (player_id uuid, nombre text, apodo text, foto text, posicion text, posicion2 text, rating integer,
               region text, comuna text, nota text, equipo text, estado text)
language plpgsql stable security definer set search_path = public as $$
declare v_team integer := public.equipo_del_partido(p_match);
begin
  if v_team is null or not public.es_armador(v_team) then
    raise exception 'Solo el capitán o un subcapitán busca refuerzos.';
  end if;
  return query
    select p.id, p.name, p.nickname, nullif(p.photo_url, ''), p.position, p.secondary_position, p.rating,
           r.region, r.comuna, r.nota, t.team_name, s.estado
    from public.refuerzos_disponibles r
    join public.players p on p.id = r.player_id
    left join public.team_settings t on t.id = p.team_id
    left join public.solicitudes_refuerzo s on s.match_id = p_match and s.player_id = p.id
    where r.activo
      and p.status = 'Activo'
      and p.user_id is not null
      and p.team_id is distinct from v_team
      and (p_region is null or r.region = p_region)
    order by (s.estado is null) desc, r.actualizado desc
    limit 50;
end;
$$;
revoke all on function public.buscar_refuerzos(uuid, text) from public, anon;
grant execute on function public.buscar_refuerzos(uuid, text) to authenticated;

/** El capitán le pide a un refuerzo jugar un partido. Le llega un aviso al celular. */
create or replace function public.pedir_refuerzo(p_match uuid, p_player uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_team integer := public.equipo_del_partido(p_match);
  v_id uuid;
begin
  if v_team is null or not public.es_armador(v_team) then
    raise exception 'Solo el capitán o un subcapitán pide refuerzos.';
  end if;
  if not exists (select 1 from public.matches where id = p_match and status = 'Programado' and date > now()) then
    raise exception 'El partido ya pasó o no está programado.';
  end if;
  if not exists (
    select 1 from public.refuerzos_disponibles r join public.players p on p.id = r.player_id
    where r.player_id = p_player and r.activo and p.status = 'Activo' and p.team_id is distinct from v_team
  ) then
    raise exception 'Ese jugador ya no está disponible como refuerzo.';
  end if;
  if (select count(*) from public.solicitudes_refuerzo where match_id = p_match and estado = 'Pendiente') >= 10 then
    raise exception 'Ya hay 10 pedidos sin responder para este partido. Espera respuestas o cancela alguno.';
  end if;

  insert into public.solicitudes_refuerzo (match_id, player_id)
  values (p_match, p_player)
  on conflict (match_id, player_id) do update
    set estado = 'Pendiente', created_at = now(), respondida_at = null, creada_por = auth.uid()
    where public.solicitudes_refuerzo.estado in ('Rechazada', 'Cancelada')
  returning id into v_id;
  if v_id is null then
    raise exception 'Ya le pediste a este jugador para este partido.';
  end if;

  perform public.pedir_push(jsonb_build_object('tipo', 'refuerzo', 'match_id', p_match, 'solicitud_id', v_id));
  return v_id;
end;
$$;
revoke all on function public.pedir_refuerzo(uuid, uuid) from public, anon;
grant execute on function public.pedir_refuerzo(uuid, uuid) to authenticated;

/** El capitán retira un pedido; si ya estaba aceptado, saca al invitado. */
create or replace function public.cancelar_refuerzo(p_solicitud uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s public.solicitudes_refuerzo;
begin
  select * into s from public.solicitudes_refuerzo where id = p_solicitud for update;
  if s.id is null or not public.es_armador(public.equipo_del_partido(s.match_id)) then
    raise exception 'No se encontró el pedido.';
  end if;
  if s.guest_id is not null then delete from public.match_guests where id = s.guest_id; end if;
  update public.solicitudes_refuerzo set estado = 'Cancelada', guest_id = null where id = p_solicitud;
end;
$$;
revoke all on function public.cancelar_refuerzo(uuid) from public, anon;
grant execute on function public.cancelar_refuerzo(uuid) to authenticated;

/**
 * El refuerzo responde. Si acepta entra al partido como invitado, con su
 * posición y nivel; si después se baja, sale de la lista. Se avisa al capitán.
 */
create or replace function public.responder_refuerzo(p_solicitud uuid, p_acepta boolean)
returns text language plpgsql security definer set search_path = public as $$
declare
  s public.solicitudes_refuerzo;
  j public.players;
  v_guest uuid;
  v_estado text := case when p_acepta then 'Aceptada' else 'Rechazada' end;
begin
  select * into s from public.solicitudes_refuerzo where id = p_solicitud for update;
  if s.id is null or not public.es_mi_ficha(s.player_id) then
    raise exception 'No se encontró el pedido.';
  end if;
  if s.estado = 'Cancelada' then raise exception 'El capitán retiró este pedido.'; end if;
  if not exists (select 1 from public.matches where id = s.match_id and status = 'Programado' and date > now()) then
    raise exception 'El partido ya pasó o no está programado.';
  end if;
  if s.estado = v_estado then return v_estado; end if;

  select * into j from public.players where id = s.player_id;
  if p_acepta then
    insert into public.match_guests (match_id, name, rating, position)
    values (s.match_id, j.name, coalesce(j.rating, 5), coalesce(nullif(j.position, ''), 'Invitado'))
    returning id into v_guest;
  elsif s.guest_id is not null then
    delete from public.match_guests where id = s.guest_id;
  end if;

  update public.solicitudes_refuerzo
     set estado = v_estado, respondida_at = now(), guest_id = v_guest
   where id = p_solicitud;
  perform public.pedir_push(jsonb_build_object('tipo', 'refuerzo_respuesta', 'match_id', s.match_id, 'solicitud_id', s.id));
  return v_estado;
end;
$$;
revoke all on function public.responder_refuerzo(uuid, boolean) from public, anon;
grant execute on function public.responder_refuerzo(uuid, boolean) to authenticated;

/** Pedidos recibidos por el jugador conectado, de partidos que no han pasado. */
create or replace function public.mis_pedidos_refuerzo()
returns table (id uuid, estado text, fecha timestamptz, lugar text, formato text, equipo text, pedido timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.estado, m.date, m.location, m.match_type, t.team_name, s.created_at
  from public.solicitudes_refuerzo s
  join public.matches m on m.id = s.match_id
  left join public.team_settings t on t.id = m.team_id
  where public.es_mi_ficha(s.player_id)
    and s.estado in ('Pendiente', 'Aceptada')
    and m.status = 'Programado' and m.date > now()
  order by m.date;
$$;
revoke all on function public.mis_pedidos_refuerzo() from public, anon;
grant execute on function public.mis_pedidos_refuerzo() to authenticated;

/** Pedidos hechos para un partido (lo ve el capitán, con el nombre del refuerzo). */
create or replace function public.pedidos_del_partido(p_match uuid)
returns table (id uuid, player_id uuid, nombre text, estado text, equipo text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.es_armador(public.equipo_del_partido(p_match)) then
    raise exception 'Solo el capitán o un subcapitán ve los pedidos.';
  end if;
  return query
    select s.id, s.player_id, p.name, s.estado, t.team_name
    from public.solicitudes_refuerzo s
    join public.players p on p.id = s.player_id
    left join public.team_settings t on t.id = p.team_id
    where s.match_id = p_match and s.estado <> 'Cancelada'
    order by s.created_at;
end;
$$;
revoke all on function public.pedidos_del_partido(uuid) from public, anon;
grant execute on function public.pedidos_del_partido(uuid) to authenticated;
