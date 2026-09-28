-- Seguridad por equipo.
--
-- Hasta ahora las reglas de acceso tenían tres problemas:
--   · "admin" era global: el rol de public.users no estaba atado a un equipo, y
--     register_new_captain —que cualquiera podía llamar sin sesión— dejaba a
--     quien quisiera como admin de todo;
--   · varias tablas aceptaban escrituras de cualquiera (asistencia, invitados,
--     votos MVP, amistosos) o lecturas sin sesión (jugadores con su correo);
--   · un jugador podía editar toda su ficha, incluido is_admin y rating.
--
-- Ahora cada permiso se decide por equipo:
--   miembro  → ve los datos de su equipo;
--   armador  → capitán o subcapitán: además arma equipos y marca asistencia;
--   admin    → dueño del equipo (o jugador marcado is_admin): administra todo.
-- El superadmin de la plataforma solo lee, para su panel de estadísticas.

-- ── Ayudantes ───────────────────────────────────────────────────────────────
create or replace function public.es_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(lower(auth.email()) = 'garaosd@gmail.com', false);
$$;

create or replace function public.mis_equipos()
returns setof integer language sql stable security definer set search_path = public as $$
  select p.team_id from public.players p
  where p.team_id is not null
    and auth.uid() is not null
    and (p.user_id = auth.uid() or (auth.email() is not null and lower(p.email) = lower(auth.email())))
  union
  select t.id from public.team_settings t where auth.uid() is not null and t.owner_id = auth.uid();
$$;

create or replace function public.es_miembro(p_team integer)
returns boolean language sql stable security definer set search_path = public as $$
  select p_team is not null and p_team in (select public.mis_equipos());
$$;

create or replace function public.es_admin_equipo(p_team integer)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and p_team is not null and (
    exists (select 1 from public.team_settings t where t.id = p_team and t.owner_id = auth.uid())
    or exists (select 1 from public.players p where p.team_id = p_team and p.user_id = auth.uid() and p.is_admin)
  );
$$;

create or replace function public.es_armador(p_team integer)
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_admin_equipo(p_team) or exists (
    select 1 from public.players p
    where p.team_id = p_team and p.user_id = auth.uid() and p.match_role in ('captain', 'subcaptain')
  );
$$;

create or replace function public.equipo_del_partido(p_match uuid)
returns integer language sql stable security definer set search_path = public as $$
  select team_id from public.matches where id = p_match;
$$;

create or replace function public.equipo_del_jugador(p_player uuid)
returns integer language sql stable security definer set search_path = public as $$
  select team_id from public.players where id = p_player;
$$;

create or replace function public.es_mi_ficha(p_player uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.players p
    where p.id = p_player
      and (p.user_id = auth.uid() or (auth.email() is not null and lower(p.email) = lower(auth.email())))
  );
$$;

-- ── Borrar todas las reglas anteriores de estas tablas ─────────────────────
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('players','matches','attendance','generated_teams','match_guests',
                        'match_mvp_votes','mvp_winners','payments','expenses','cash_incomes',
                        'team_settings','users','friendly_requests')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Nadie sin sesión escribe directo en las tablas: el registro de capitanes y
-- jugadores pasa por funciones que validan.
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- ── players ────────────────────────────────────────────────────────────────
create policy "jugadores: ver los de mi equipo" on public.players for select to authenticated
  using (public.es_miembro(team_id) or public.es_superadmin());
create policy "jugadores: el admin agrega" on public.players for insert to authenticated
  with check (public.es_admin_equipo(team_id));
create policy "jugadores: el admin edita" on public.players for update to authenticated
  using (public.es_admin_equipo(team_id)) with check (public.es_admin_equipo(team_id));
create policy "jugadores: cada uno edita su ficha" on public.players for update to authenticated
  using (user_id = auth.uid() or (user_id is null and lower(email) = lower(auth.email())))
  with check (user_id = auth.uid());
create policy "jugadores: el admin elimina" on public.players for delete to authenticated
  using (public.es_admin_equipo(team_id));

-- Lo que un jugador puede cambiar de su propia ficha: nombre, apodo, puestos,
-- foto, estado y cumpleaños. El equipo, el rol, el rating y el correo los
-- decide el admin; user_id solo se vincula (de vacío a uno mismo).
create or replace function public.proteger_ficha_jugador()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.es_admin_equipo(old.team_id) then
    return new;
  end if;
  new.team_id    := old.team_id;
  new.is_admin   := old.is_admin;
  new.match_role := old.match_role;
  new.rating     := old.rating;
  new.email      := old.email;
  if old.user_id is not null or new.user_id is distinct from auth.uid() then
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;
drop trigger if exists proteger_ficha_jugador on public.players;
create trigger proteger_ficha_jugador before update on public.players
  for each row execute function public.proteger_ficha_jugador();

-- ── matches ────────────────────────────────────────────────────────────────
create policy "partidos: ver los de mi equipo" on public.matches for select to authenticated
  using (public.es_miembro(team_id) or public.es_superadmin());
create policy "partidos: el admin administra" on public.matches for all to authenticated
  using (public.es_admin_equipo(team_id)) with check (public.es_admin_equipo(team_id));

-- ── attendance ─────────────────────────────────────────────────────────────
create policy "asistencia: ver la de mi equipo" on public.attendance for select to authenticated
  using (public.es_miembro(public.equipo_del_partido(match_id)) or public.es_superadmin());
create policy "asistencia: armador o el propio jugador" on public.attendance for all to authenticated
  using (
    public.es_armador(public.equipo_del_partido(match_id))
    or (public.es_mi_ficha(player_id) and public.equipo_del_jugador(player_id) = public.equipo_del_partido(match_id))
  )
  with check (
    public.es_armador(public.equipo_del_partido(match_id))
    or (public.es_mi_ficha(player_id) and public.equipo_del_jugador(player_id) = public.equipo_del_partido(match_id))
  );

-- ── generated_teams y match_guests: los arma el capitán ────────────────────
create policy "equipos armados: ver" on public.generated_teams for select to authenticated
  using (public.es_miembro(public.equipo_del_partido(match_id)) or public.es_superadmin());
create policy "equipos armados: armador" on public.generated_teams for all to authenticated
  using (public.es_armador(public.equipo_del_partido(match_id)))
  with check (public.es_armador(public.equipo_del_partido(match_id)));

create policy "invitados: ver" on public.match_guests for select to authenticated
  using (public.es_miembro(public.equipo_del_partido(match_id)) or public.es_superadmin());
create policy "invitados: armador" on public.match_guests for all to authenticated
  using (public.es_armador(public.equipo_del_partido(match_id)))
  with check (public.es_armador(public.equipo_del_partido(match_id)));

-- ── MVP: un voto por jugador, por un compañero, sin cambiarlo después ──────
create policy "votos: ver los de mi equipo" on public.match_mvp_votes for select to authenticated
  using (public.es_miembro(public.equipo_del_partido(match_id)));
create policy "votos: votar por mí" on public.match_mvp_votes for insert to authenticated
  with check (
    public.es_mi_ficha(voter_player_id)
    and voter_player_id <> voted_player_id
    and public.equipo_del_jugador(voter_player_id) = public.equipo_del_partido(match_id)
    and public.equipo_del_jugador(voted_player_id) = public.equipo_del_partido(match_id)
  );
create policy "votos: el admin borra" on public.match_mvp_votes for delete to authenticated
  using (public.es_admin_equipo(public.equipo_del_partido(match_id)));

create policy "mvp: ver los de mi equipo" on public.mvp_winners for select to authenticated
  using (public.es_miembro(public.equipo_del_partido(match_id)) or public.es_superadmin());
create policy "mvp: cualquier compañero cierra la votación" on public.mvp_winners for insert to authenticated
  with check (public.es_miembro(public.equipo_del_partido(match_id)));
create policy "mvp: el admin corrige" on public.mvp_winners for update to authenticated
  using (public.es_admin_equipo(public.equipo_del_partido(match_id)))
  with check (public.es_admin_equipo(public.equipo_del_partido(match_id)));
create policy "mvp: el admin borra" on public.mvp_winners for delete to authenticated
  using (public.es_admin_equipo(public.equipo_del_partido(match_id)));

-- Quien cierra la votación no decide el ganador: se cuenta aquí, con los votos
-- guardados. Empate: gana quien llegó primero a ese número de votos.
create or replace function public.contar_ganador_mvp()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ganador uuid;
  v_votos integer;
begin
  select voted_player_id, count(*) into v_ganador, v_votos
  from public.match_mvp_votes
  where match_id = new.match_id and voted_player_id is not null
  group by voted_player_id
  order by count(*) desc, max(created_at) asc
  limit 1;

  if v_ganador is null then
    raise exception 'No hay votos para este partido';
  end if;

  new.player_id := v_ganador;
  new.vote_count := v_votos;
  select name, photo_url into new.player_name, new.player_photo_url
  from public.players where id = v_ganador;
  return new;
end;
$$;
drop trigger if exists contar_ganador_mvp on public.mvp_winners;
create trigger contar_ganador_mvp before insert on public.mvp_winners
  for each row execute function public.contar_ganador_mvp();

-- ── Plata: los jugadores ven la de su equipo, el admin la maneja ───────────
create policy "pagos: ver los de mi equipo" on public.payments for select to authenticated
  using (public.es_miembro(public.equipo_del_jugador(player_id)) or public.es_superadmin());
create policy "pagos: el admin administra" on public.payments for all to authenticated
  using (public.es_admin_equipo(public.equipo_del_jugador(player_id)))
  with check (public.es_admin_equipo(public.equipo_del_jugador(player_id)));

create policy "gastos: ver los de mi equipo" on public.expenses for select to authenticated
  using (public.es_miembro(team_id) or public.es_superadmin());
create policy "gastos: el admin administra" on public.expenses for all to authenticated
  using (public.es_admin_equipo(team_id)) with check (public.es_admin_equipo(team_id));

create policy "ingresos: ver los de mi equipo" on public.cash_incomes for select to authenticated
  using (public.es_miembro(team_id) or public.es_superadmin());
create policy "ingresos: el admin administra" on public.cash_incomes for all to authenticated
  using (public.es_admin_equipo(team_id)) with check (public.es_admin_equipo(team_id));

-- ── team_settings ──────────────────────────────────────────────────────────
-- Se ve el equipo propio y los que se muestran en la Arena. Sin sesión no se
-- lee nada: el código para unirse se valida con buscar_equipo_por_codigo.
create policy "equipo: ver el mío y los de la Arena" on public.team_settings for select to authenticated
  using (public.es_miembro(id) or arena_visible or public.es_superadmin());
create policy "equipo: el admin edita" on public.team_settings for update to authenticated
  using (public.es_admin_equipo(id)) with check (public.es_admin_equipo(id));

-- La cuota mensual la usa Finanzas y la columna no existía: la pantalla
-- mostraba siempre $8.000 y guardar otra cuota daba error.
alter table public.team_settings add column if not exists quota_amount numeric;

-- ── users: cada uno ve su rol; nadie lo cambia desde la app ────────────────
create policy "usuarios: ver mi rol" on public.users for select to authenticated
  using (id = auth.uid() or public.es_superadmin());

-- ── friendly_requests (Arena) ──────────────────────────────────────────────
create policy "amistosos: ver" on public.friendly_requests for select to authenticated
  using (true);
create policy "amistosos: publicar por mi equipo" on public.friendly_requests for insert to authenticated
  with check (public.es_armador(team_id) or public.es_armador(challenger_team_id));
create policy "amistosos: responder" on public.friendly_requests for update to authenticated
  using (
    public.es_armador(team_id) or public.es_armador(challenger_team_id)
    or (challenger_team_id is null and exists (select 1 from public.mis_equipos() e where public.es_armador(e)))
  )
  with check (public.es_armador(team_id) or public.es_armador(challenger_team_id));
create policy "amistosos: borrar el mío" on public.friendly_requests for delete to authenticated
  using (public.es_admin_equipo(team_id));

-- ── flow_payments: solo el servidor ────────────────────────────────────────
revoke all on public.flow_payments from anon, authenticated;

-- Las funciones de registro usaban "on conflict (email)" sin que existiera un
-- índice único en el correo: fallaban siempre. El correo identifica al
-- jugador en toda la app (así se vincula su cuenta), así que es único.
create unique index if not exists players_email_unico on public.players (lower(email));

-- ── Registro de capitán ────────────────────────────────────────────────────
-- Se llama justo después de crear la cuenta, muchas veces sin sesión (hay que
-- confirmar el correo). Por eso no basta con auth.uid(): se exige que la
-- cuenta dueña sea recién creada, con ese mismo correo y sin otro equipo. El
-- plan pagado solo se acepta si hay un pago confirmado a ese correo.
drop function if exists public.register_new_captain(text, text, text, text, text, uuid);
create function public.register_new_captain(
  p_team_name text, p_join_code text, p_plan text,
  p_captain_name text, p_captain_email text, p_owner_id uuid
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_join_code text := upper(trim(p_join_code));
  v_team_id integer;
  v_plan text := 'free';
  v_cuenta auth.users%rowtype;
begin
  if auth.uid() is not null and auth.uid() <> p_owner_id then
    raise exception 'La cuenta no corresponde';
  end if;

  select * into v_cuenta from auth.users where id = p_owner_id;
  if not found
     or lower(v_cuenta.email) <> lower(trim(p_captain_email))
     or v_cuenta.created_at < now() - interval '30 minutes' then
    raise exception 'Registro no válido: vuelve a crear la cuenta';
  end if;

  if exists (select 1 from public.team_settings where owner_id = p_owner_id) then
    raise exception 'Esta cuenta ya tiene un equipo';
  end if;

  if coalesce(trim(p_team_name), '') = '' then
    raise exception 'Falta el nombre del equipo';
  end if;

  if p_plan in ('monthly', 'annual') and exists (
    select 1 from public.flow_payments f
    where lower(f.payer_email) = lower(v_cuenta.email) and f.status = 'paid' and f.plan = p_plan
  ) then
    v_plan := p_plan;
  end if;

  if v_join_code = '' or exists (select 1 from public.team_settings where upper(join_code) = v_join_code) then
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', ceil(random() * 32)::int, 1), '')
      into v_join_code from generate_series(1, 6);
  end if;

  insert into public.team_settings (team_name, join_code, plan, owner_id)
  values (left(trim(p_team_name), 80), v_join_code, v_plan, p_owner_id)
  returning id into v_team_id;

  insert into public.players (name, email, position, status, rating, is_admin, team_id, user_id)
  values (left(coalesce(nullif(trim(p_captain_name), ''), split_part(v_cuenta.email, '@', 1)), 80),
          lower(v_cuenta.email), 'Capitán', 'Activo', 3, true, v_team_id, p_owner_id)
  on conflict ((lower(email))) do nothing;

  insert into public.users (id, role) values (p_owner_id, 'admin')
  on conflict (id) do update set role = 'admin';
end;
$$;
revoke all on function public.register_new_captain(text, text, text, text, text, uuid) from public;
grant execute on function public.register_new_captain(text, text, text, text, text, uuid) to anon, authenticated;

-- ── Unirse a un equipo con el código ───────────────────────────────────────
create or replace function public.buscar_equipo_por_codigo(p_codigo text)
returns table (id integer, team_name text)
language sql stable security definer set search_path = public as $$
  select t.id, t.team_name from public.team_settings t
  where upper(t.join_code) = upper(trim(p_codigo)) and length(trim(p_codigo)) >= 4;
$$;
revoke all on function public.buscar_equipo_por_codigo(text) from public;
grant execute on function public.buscar_equipo_por_codigo(text) to anon, authenticated;

-- Crea la ficha del jugador que se une. Exige el código del equipo y una
-- cuenta real con ese correo (recién creada, o la sesión actual).
drop function if exists public.register_new_player(bigint, text, text, text);
drop function if exists public.register_new_player(integer, text, text, text);
create or replace function public.unirse_con_codigo(
  p_codigo text, p_name text, p_email text, p_position text
) returns integer language plpgsql security definer set search_path = public as $$
declare
  v_team integer;
  v_email text := lower(trim(p_email));
begin
  select id into v_team from public.team_settings where upper(join_code) = upper(trim(p_codigo));
  if v_team is null then
    raise exception 'Código inválido';
  end if;

  if auth.uid() is not null then
    if lower(auth.email()) <> v_email then
      raise exception 'El correo no corresponde a tu cuenta';
    end if;
  elsif not exists (
    select 1 from auth.users u
    where lower(u.email) = v_email and u.created_at > now() - interval '30 minutes'
  ) then
    raise exception 'Primero crea tu cuenta';
  end if;

  insert into public.players (team_id, name, email, position, status, rating, notify, user_id)
  values (v_team, left(trim(p_name), 80), v_email, coalesce(nullif(p_position, ''), 'Medio Mixto (MC)'), 'Activo', 3, true,
          (select id from auth.users where lower(email) = v_email))
  on conflict ((lower(email))) do nothing;
  return v_team;
end;
$$;
revoke all on function public.unirse_con_codigo(text, text, text, text) from public;
grant execute on function public.unirse_con_codigo(text, text, text, text) to anon, authenticated;

-- ── Funciones internas: nadie las llama desde fuera ────────────────────────
alter function public.handle_new_user() set search_path = public;
revoke all on function public.handle_new_user() from public, anon, authenticated;
alter function public.is_admin() set search_path = public;
revoke all on function public.is_admin() from public, anon;

revoke all on function public.es_superadmin() from public, anon;
revoke all on function public.mis_equipos() from public, anon;
revoke all on function public.es_miembro(integer) from public, anon;
revoke all on function public.es_admin_equipo(integer) from public, anon;
revoke all on function public.es_armador(integer) from public, anon;
revoke all on function public.equipo_del_partido(uuid) from public, anon;
revoke all on function public.equipo_del_jugador(uuid) from public, anon;
revoke all on function public.es_mi_ficha(uuid) from public, anon;
grant execute on function public.es_superadmin(), public.mis_equipos(), public.es_miembro(integer),
  public.es_admin_equipo(integer), public.es_armador(integer), public.equipo_del_partido(uuid),
  public.equipo_del_jugador(uuid), public.es_mi_ficha(uuid) to authenticated;
revoke all on function public.proteger_ficha_jugador() from public, anon, authenticated;
revoke all on function public.contar_ganador_mvp() from public, anon, authenticated;

-- ── Fotos de jugadores: subir y cambiar requiere sesión ────────────────────
drop policy if exists "Permitir subida de fotos" on storage.objects;
drop policy if exists "Permitir actualizar fotos" on storage.objects;
create policy "Permitir subida de fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'foto jugadores');
create policy "Permitir actualizar fotos" on storage.objects for update to authenticated
  using (bucket_id = 'foto jugadores');

-- ── Límite para pedir el correo de "olvidé mi contraseña" ──────────────────
create table if not exists public.password_reset_requests (
  id bigint generated always as identity primary key,
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.password_reset_requests enable row level security;
revoke all on public.password_reset_requests from anon, authenticated;
create index if not exists password_reset_requests_email_idx
  on public.password_reset_requests (lower(email), created_at desc);
