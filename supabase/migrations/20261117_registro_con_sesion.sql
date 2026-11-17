-- Registro con Google: la cuenta se crea al volver de Google y el equipo se
-- crea después, con sesión iniciada. El límite de 30 minutos desde que se creó
-- la cuenta existía para el registro sin sesión (correo por confirmar), donde
-- no hay otra forma de saber que quien llama es el dueño. Con sesión, auth.uid()
-- ya lo prueba, así que el límite solo se aplica cuando no hay sesión.
-- Todo lo demás queda igual.

create or replace function public.register_new_captain(p_team_name text, p_join_code text, p_plan text, p_captain_name text, p_captain_email text, p_owner_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_join_code text := upper(trim(p_join_code));
  v_team_id integer;
  v_plan text := 'free';
  v_tier text;
  v_pago uuid;
  v_vence timestamptz;
  v_cuenta auth.users%rowtype;
begin
  if auth.uid() is not null and auth.uid() <> p_owner_id then
    raise exception 'La cuenta no corresponde';
  end if;
  select * into v_cuenta from auth.users where id = p_owner_id;
  if not found
     or lower(v_cuenta.email) <> lower(trim(p_captain_email))
     or (auth.uid() is null and v_cuenta.created_at < now() - interval '30 minutes') then
    raise exception 'Registro no válido: vuelve a crear la cuenta';
  end if;
  if exists (select 1 from public.team_settings where owner_id = p_owner_id) then
    raise exception 'Esta cuenta ya tiene un equipo';
  end if;
  if coalesce(trim(p_team_name), '') = '' then
    raise exception 'Falta el nombre del equipo';
  end if;
  if p_plan in ('monthly', 'annual') then
    select f.id, f.tier into v_pago, v_tier from public.flow_payments f
    where lower(f.payer_email) = lower(v_cuenta.email) and f.status = 'paid' and f.plan = p_plan and f.applied_at is null
    order by f.paid_at desc nulls last limit 1
    for update;
    if found then
      v_plan := p_plan;
      v_vence := now() + case when p_plan = 'annual' then interval '1 year' else interval '1 month' end;
    end if;
  end if;
  if v_join_code = '' or exists (select 1 from public.team_settings where upper(join_code) = v_join_code) then
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', ceil(random() * 32)::int, 1), '')
      into v_join_code from generate_series(1, 6);
  end if;
  insert into public.team_settings (team_name, join_code, plan, tier, plan_expires_at, owner_id)
  values (left(trim(p_team_name), 80), v_join_code, v_plan, case when v_plan = 'free' then null else v_tier end, v_vence, p_owner_id)
  returning id into v_team_id;
  if v_pago is not null then
    update public.flow_payments set applied_at = now() where id = v_pago;
  end if;
  insert into public.players (name, email, position, status, rating, is_admin, team_id, user_id)
  values (left(coalesce(nullif(trim(p_captain_name), ''), split_part(v_cuenta.email, '@', 1)), 80),
          lower(v_cuenta.email), 'Capitán', 'Activo', 3, true, v_team_id, p_owner_id)
  on conflict ((lower(email))) do nothing;
  insert into public.users (id, role) values (p_owner_id, 'admin')
  on conflict (id) do update set role = 'admin';
end;
$function$;
