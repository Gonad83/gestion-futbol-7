-- Notificaciones push en el celular (Web Push).
--
-- · push_suscripciones: un celular o navegador de un jugador que aceptó avisos.
-- · push_config: el par de llaves VAPID que exige el estándar. Lo genera la
--   función enviar-push la primera vez; nadie lo ve desde la app.
-- · Al crear un partido de los próximos 10 días se avisa al equipo.
--   (Un partido repetido semanal crea muchos de una vez: solo avisan los cercanos.)

create table if not exists public.push_suscripciones (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  user_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  ultimo_uso timestamptz
);
create index if not exists push_suscripciones_player_idx on public.push_suscripciones (player_id);
alter table public.push_suscripciones enable row level security;
revoke all on public.push_suscripciones from anon, authenticated;
grant select, delete on public.push_suscripciones to authenticated;
drop policy if exists "push: ver las mías" on public.push_suscripciones;
create policy "push: ver las mías" on public.push_suscripciones for select to authenticated using (user_id = auth.uid());
drop policy if exists "push: borrar las mías" on public.push_suscripciones;
create policy "push: borrar las mías" on public.push_suscripciones for delete to authenticated using (user_id = auth.uid());

create table if not exists public.push_config (
  id integer primary key default 1 check (id = 1),
  public_key text not null,
  private_key text not null,
  created_at timestamptz not null default now()
);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;

insert into public.cron_tokens (nombre, token)
select 'push', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
where not exists (select 1 from public.cron_tokens where nombre = 'push');

-- El jugador registra su celular. Se asocia a su ficha (la de su cuenta).
create or replace function public.registrar_push(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_jugador uuid;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 or length(p_p256dh) > 200 or length(p_auth) > 100 then
    raise exception 'Suscripción no válida';
  end if;
  select id into v_jugador from public.players where user_id = auth.uid() order by created_at limit 1;
  if v_jugador is null then raise exception 'Tu cuenta no está vinculada a una ficha de jugador'; end if;
  insert into public.push_suscripciones (player_id, user_id, endpoint, p256dh, auth)
  values (v_jugador, auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set player_id = excluded.player_id, user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
end;
$$;
revoke all on function public.registrar_push(text, text, text) from public, anon;
grant execute on function public.registrar_push(text, text, text) to authenticated;

-- Pide a enviar-push un aviso (asíncrono: no frena a quien guardó).
create or replace function public.pedir_push(p_cuerpo jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://wmcycxnydunfjnirmjuy.supabase.co/functions/v1/enviar-push',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-token', (select token from public.cron_tokens where nombre = 'push')),
    body := p_cuerpo
  );
end;
$$;
revoke all on function public.pedir_push(jsonb) from public, anon, authenticated;

create or replace function public.push_partido_nuevo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'Programado' and new.date > now() and new.date < now() + interval '10 days' then
    perform public.pedir_push(jsonb_build_object('tipo', 'partido_nuevo', 'match_id', new.id));
  end if;
  return null;
end;
$$;
drop trigger if exists push_partido_nuevo on public.matches;
create trigger push_partido_nuevo after insert on public.matches
  for each row execute function public.push_partido_nuevo();
revoke all on function public.push_partido_nuevo() from public, anon, authenticated;

-- Quien entra desde la lista de espera también recibe un push (además del correo).
create or replace function public.promover_lista_espera(p_match uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_cupo integer;
  v_van integer;
  v_fila record;
  v_subidos uuid[] := '{}';
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
    v_subidos := v_subidos || v_fila.player_id;
  end loop;

  if array_length(v_subidos, 1) > 0 then
    perform net.http_post(
      url := 'https://wmcycxnydunfjnirmjuy.supabase.co/functions/v1/aviso-lista-espera',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'x-cron-token', (select token from public.cron_tokens where nombre = 'lista-espera')),
      body := '{}'::jsonb
    );
    perform public.pedir_push(jsonb_build_object('tipo', 'cupo_liberado', 'match_id', p_match, 'player_ids', to_jsonb(v_subidos)));
  end if;
  return coalesce(array_length(v_subidos, 1), 0);
end;
$$;
revoke all on function public.promover_lista_espera(uuid) from public, anon, authenticated;
