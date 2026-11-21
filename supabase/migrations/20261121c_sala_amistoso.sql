-- Sala del amistoso: los dos equipos se ven en una misma cancha, cada uno
-- elige su camiseta sin repetir la del rival y sus capitanes se escriben.
-- Coordinan los armadores de cada equipo: administrador, capitán o subcapitán.

-- Camiseta de cada equipo en ese partido: quien publicó (local) y quien desafió (visita).
alter table public.friendly_requests
  add column if not exists color_local  text,
  add column if not exists color_visita text;

-- Cada equipo cambia solo su camiseta, y no puede tomar la que ya eligió el rival.
create or replace function public.elegir_color_amistoso(p_solicitud uuid, p_color text)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.friendly_requests%rowtype;
begin
  if p_color not in ('black','white','blue','emerald','yellow','red','purple','lightblue') then
    raise exception 'Color no válido';
  end if;
  select * into r from public.friendly_requests where id = p_solicitud for update;
  if not found then
    raise exception 'El amistoso no existe';
  end if;
  if public.es_armador(r.team_id) then
    if r.color_visita = p_color then raise exception 'Ese color ya lo eligió el rival'; end if;
    update public.friendly_requests set color_local = p_color where id = p_solicitud;
  elsif r.challenger_team_id is not null and public.es_armador(r.challenger_team_id) then
    if r.color_local = p_color then raise exception 'Ese color ya lo eligió el rival'; end if;
    update public.friendly_requests set color_visita = p_color where id = p_solicitud;
  else
    raise exception 'Solo el capitán o subcapitán de uno de los dos equipos elige la camiseta';
  end if;
end;
$$;
revoke all on function public.elegir_color_amistoso(uuid, text) from public, anon;
grant execute on function public.elegir_color_amistoso(uuid, text) to authenticated;

-- Mensajes entre los dos equipos de un amistoso.
create table if not exists public.mensajes_amistoso (
  id           uuid        primary key default gen_random_uuid(),
  solicitud_id uuid        not null references public.friendly_requests(id) on delete cascade,
  team_id      integer     not null references public.team_settings(id) on delete cascade,
  autor        uuid        default auth.uid(),
  texto        text        not null check (char_length(btrim(texto)) between 1 and 500),
  created_at   timestamptz not null default now()
);
create index if not exists mensajes_amistoso_solicitud_idx on public.mensajes_amistoso (solicitud_id, created_at);

alter table public.mensajes_amistoso enable row level security;
revoke all on public.mensajes_amistoso from anon, authenticated;
grant select, insert on public.mensajes_amistoso to authenticated;

drop policy if exists "mensajes: leen los dos equipos" on public.mensajes_amistoso;
create policy "mensajes: leen los dos equipos" on public.mensajes_amistoso for select to authenticated
  using (exists (
    select 1 from public.friendly_requests r
    where r.id = mensajes_amistoso.solicitud_id
      and (public.es_armador(r.team_id) or public.es_armador(r.challenger_team_id))
  ));

drop policy if exists "mensajes: escribe mi equipo" on public.mensajes_amistoso;
create policy "mensajes: escribe mi equipo" on public.mensajes_amistoso for insert to authenticated
  with check (
    autor = auth.uid()
    and public.es_armador(team_id)
    and exists (
      select 1 from public.friendly_requests r
      where r.id = mensajes_amistoso.solicitud_id
        and r.challenger_team_id is not null
        and mensajes_amistoso.team_id in (r.team_id, r.challenger_team_id)
    )
  );

-- Cada equipo tiene su propio partido del amistoso en el calendario; así cada
-- uno responde "Voy / No voy" y la sala sabe quiénes juegan por lado.
alter table public.matches
  add column if not exists friendly_request_id uuid references public.friendly_requests(id) on delete set null;
create index if not exists matches_friendly_request_idx on public.matches (friendly_request_id);

-- Aceptar el desafío confirma el amistoso y crea el partido en el calendario
-- de los dos equipos (antes solo lo recibía quien publicó).
create or replace function public.aceptar_amistoso(p_solicitud uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r public.friendly_requests%rowtype;
  v_cuando timestamptz;
  v_local text;
  v_visita text;
begin
  select * into r from public.friendly_requests where id = p_solicitud for update;
  if not found then raise exception 'El amistoso no existe'; end if;
  if not public.es_armador(r.team_id) then raise exception 'Solo el equipo que publicó puede aceptar'; end if;
  if r.status <> 'challenged' or r.challenger_team_id is null then raise exception 'Este amistoso no tiene un desafío pendiente'; end if;

  update public.friendly_requests set status = 'matched' where id = p_solicitud;
  v_cuando := (r.date::text || ' ' || r.time)::timestamp at time zone 'America/Santiago';
  select team_name into v_local  from public.team_settings where id = r.team_id;
  select team_name into v_visita from public.team_settings where id = r.challenger_team_id;

  insert into public.matches (team_id, date, location, match_type, event_type, status, description, friendly_request_id)
  select e.equipo, v_cuando, r.location, r.format, 'Amistoso', 'Programado', 'Amistoso vs ' || e.rival, r.id
  from (values (r.team_id, v_visita), (r.challenger_team_id, v_local)) as e(equipo, rival)
  where not exists (
    select 1 from public.matches m where m.friendly_request_id = r.id and m.team_id = e.equipo
  );
end;
$$;
revoke all on function public.aceptar_amistoso(uuid) from public, anon;
grant execute on function public.aceptar_amistoso(uuid) to authenticated;

-- Lo que ve la sala: los jugadores de los dos equipos (solo lo de la lámina)
-- y si cada uno marcó "Voy" en el partido de su equipo. Solo para miembros de
-- alguno de los dos equipos.
create or replace function public.sala_amistoso(p_solicitud uuid)
returns table (
  team_id integer, id uuid, name text, nickname text, "position" text, rating integer,
  photo_url text, mvps integer, va boolean, hay_partido boolean
) language plpgsql stable security definer set search_path = public as $$
declare
  r public.friendly_requests%rowtype;
begin
  select * into r from public.friendly_requests f where f.id = p_solicitud;
  if not found or not (public.es_miembro(r.team_id) or public.es_miembro(r.challenger_team_id)) then
    return;
  end if;
  return query
  select p.team_id, p.id, p.name, p.nickname, p.position, p.rating, p.photo_url,
         (select count(*)::integer from public.mvp_winners w where w.player_id = p.id),
         exists (select 1 from public.attendance a where a.match_id = m.id and a.player_id = p.id and a.status = 'Voy'),
         m.id is not null
  from public.players p
  left join lateral (
    select x.id from public.matches x
    where x.friendly_request_id = r.id and x.team_id = p.team_id and x.status <> 'Cancelado'
    order by x.created_at limit 1
  ) m on true
  where p.team_id in (r.team_id, r.challenger_team_id) and p.status = 'Activo'
  order by p.rating desc nulls last, p.name;
end;
$$;
revoke all on function public.sala_amistoso(uuid) from public, anon;
grant execute on function public.sala_amistoso(uuid) to authenticated;
