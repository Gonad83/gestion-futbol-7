-- Cupo por partido, lista de espera y "Tal vez".
--
-- · matches.cupo: cuántos juegan (null = sin límite, como hasta ahora).
-- · Si el partido está lleno, quien confirma "Voy" queda en "Espera", por orden
--   de llegada. El capitán o un subcapitán puede pasar por encima del cupo.
-- · Si alguien que iba se baja (o el capitán sube el cupo), entra el primero de
--   la lista de espera y se le avisa por correo (función aviso-lista-espera).
-- · "Tal vez" ya existía en la base; ahora la app lo ofrece.

alter table public.attendance drop constraint if exists attendance_status_check;
alter table public.attendance add constraint attendance_status_check
  check (status in ('Voy', 'No voy', 'Tal vez', 'Espera'));

alter table public.matches add column if not exists cupo integer check (cupo is null or cupo between 2 and 60);

-- A quién hay que avisar que entró desde la lista de espera.
create table if not exists public.avisos_lista_espera (
  id bigint generated always as identity primary key,
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  enviado_at timestamptz,
  error text
);
alter table public.avisos_lista_espera enable row level security;
revoke all on public.avisos_lista_espera from anon, authenticated;

insert into public.cron_tokens (nombre, token)
select 'lista-espera', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
where not exists (select 1 from public.cron_tokens where nombre = 'lista-espera');

-- Antes de guardar: si no hay cupo, "Voy" pasa a "Espera".
create or replace function public.asistencia_respetar_cupo()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_cupo integer;
  v_equipo integer;
  v_van integer;
begin
  if new.status = 'Voy' and (tg_op = 'INSERT' or old.status is distinct from 'Voy') then
    -- Un partido a la vez: dos confirmaciones simultáneas no ocupan el mismo cupo.
    select cupo, team_id into v_cupo, v_equipo from public.matches where id = new.match_id for update;
    if v_cupo is not null and not (auth.uid() is not null and public.es_armador(v_equipo)) then
      select count(*) into v_van from public.attendance
      where match_id = new.match_id and status = 'Voy' and id is distinct from new.id;
      if v_van >= v_cupo then
        new.status := 'Espera';
      end if;
    end if;
  end if;
  -- updated_at marca el orden de llegada a la lista de espera.
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.updated_at := clock_timestamp();
  end if;
  return new;
end;
$$;
drop trigger if exists asistencia_respetar_cupo on public.attendance;
create trigger asistencia_respetar_cupo before insert or update on public.attendance
  for each row execute function public.asistencia_respetar_cupo();

-- Sube a los primeros de la lista de espera mientras haya cupo, y deja el aviso pendiente.
create or replace function public.promover_lista_espera(p_match uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_cupo integer;
  v_van integer;
  v_fila record;
  v_subidos integer := 0;
begin
  select cupo into v_cupo from public.matches where id = p_match for update;
  loop
    select count(*) into v_van from public.attendance where match_id = p_match and status = 'Voy';
    exit when v_cupo is not null and v_van >= v_cupo;
    select id, player_id into v_fila from public.attendance
    where match_id = p_match and status = 'Espera'
    order by updated_at, id limit 1 for update skip locked;
    exit when not found;
    update public.attendance set status = 'Voy' where id = v_fila.id;
    insert into public.avisos_lista_espera (match_id, player_id) values (p_match, v_fila.player_id);
    v_subidos := v_subidos + 1;
  end loop;

  if v_subidos > 0 then
    -- Manda los correos sin esperar la respuesta (pg_net es asíncrono).
    perform net.http_post(
      url := 'https://wmcycxnydunfjnirmjuy.supabase.co/functions/v1/aviso-lista-espera',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'x-cron-token', (select token from public.cron_tokens where nombre = 'lista-espera')),
      body := '{}'::jsonb
    );
  end if;
  return v_subidos;
end;
$$;

-- Después de guardar: si alguien que iba dejó de ir, entra el siguiente.
create or replace function public.asistencia_liberar_cupo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'Voy' and (tg_op = 'DELETE' or new.status is distinct from 'Voy') then
    perform public.promover_lista_espera(old.match_id);
  end if;
  return null;
end;
$$;
drop trigger if exists asistencia_liberar_cupo on public.attendance;
create trigger asistencia_liberar_cupo after update or delete on public.attendance
  for each row execute function public.asistencia_liberar_cupo();

-- Si el capitán sube el cupo (o lo quita), entran los que esperaban.
create or replace function public.partido_cambio_cupo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.cupo is distinct from old.cupo and (new.cupo is null or old.cupo is null or new.cupo > old.cupo) then
    perform public.promover_lista_espera(new.id);
  end if;
  return null;
end;
$$;
drop trigger if exists partido_cambio_cupo on public.matches;
create trigger partido_cambio_cupo after update of cupo on public.matches
  for each row execute function public.partido_cambio_cupo();

revoke all on function public.asistencia_respetar_cupo() from public, anon, authenticated;
revoke all on function public.asistencia_liberar_cupo() from public, anon, authenticated;
revoke all on function public.partido_cambio_cupo() from public, anon, authenticated;
revoke all on function public.promover_lista_espera(uuid) from public, anon, authenticated;
