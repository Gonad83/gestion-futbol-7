-- Permite que usuarios anónimos inserten su propio perfil al registrarse con código de equipo.
-- La validación del team_id se hace en el frontend (código de equipo válido).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'players' and policyname = 'anon can self-register'
  ) then
    execute $policy$
      create policy "anon can self-register" on public.players
        for insert
        to anon
        with check (true);
    $policy$;
  end if;
end $$;

-- Recrea la función como respaldo por si aún existe con tipos incorrectos
create or replace function public.register_new_player(
  p_team_id bigint,
  p_name    text,
  p_email   text,
  p_position text default 'Medio Mixto (MC)'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.players (team_id, name, email, position, status)
  values (p_team_id, p_name, p_email, p_position, 'Activo')
  on conflict (email) do nothing;
end;
$$;

grant execute on function public.register_new_player(bigint, text, text, text) to anon, authenticated;
