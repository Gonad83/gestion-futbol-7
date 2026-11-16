-- Pendiente de ejecutar en Supabase (SQL Editor) al 16/11/2026. Va después de 20261116_plan_tier.sql.
-- Un plan pagado dura lo pagado: un mes (monthly) o un año (annual). Cada pago se aplica una sola vez.
alter table public.team_settings add column if not exists plan_expires_at timestamptz;
alter table public.flow_payments add column if not exists applied_at timestamptz;

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
     or v_cuenta.created_at < now() - interval '30 minutes' then
    raise exception 'Registro no válido: vuelve a crear la cuenta';
  end if;
  if exists (select 1 from public.team_settings where owner_id = p_owner_id) then
    raise exception 'Esta cuenta ya tiene un equipo';
  end if;
  if coalesce(trim(p_team_name), '') = '' then
    raise exception 'Falta el nombre del equipo';
  end if;
  -- Solo queda con plan pagado si existe un pago confirmado y sin usar de ese correo; si no, parte gratis.
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

-- Reemplaza a la versión de tres parámetros: ahora recibe el token del pago y lo aplica una sola vez.
-- Si el equipo tiene tiempo pagado sin usar, el nuevo período se suma a continuación (renovación anticipada).
drop function if exists public.aplicar_pago_flow(text, text, text);

create or replace function public.aplicar_pago_flow(p_token text)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_pago public.flow_payments%rowtype;
  v_filas integer;
begin
  select * into v_pago from public.flow_payments where token = p_token and status = 'paid' for update;
  if not found or v_pago.applied_at is not null or v_pago.plan not in ('monthly', 'annual') then
    return 0;
  end if;
  update public.team_settings t
     set plan = v_pago.plan,
         tier = coalesce(v_pago.tier, t.tier),
         plan_expires_at = greatest(now(), coalesce(t.plan_expires_at, now()))
                           + case when v_pago.plan = 'annual' then interval '1 year' else interval '1 month' end
    from auth.users u
   where u.id = t.owner_id and lower(u.email) = lower(trim(v_pago.payer_email));
  get diagnostics v_filas = row_count;
  if v_filas > 0 then
    update public.flow_payments set applied_at = now() where id = v_pago.id;
  end if;
  return v_filas;
end;
$function$;

revoke all on function public.aplicar_pago_flow(text) from public, anon, authenticated;
grant execute on function public.aplicar_pago_flow(text) to service_role;
