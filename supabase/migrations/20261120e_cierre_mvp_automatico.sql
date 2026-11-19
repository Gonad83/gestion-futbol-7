-- La votación del MVP de un partido cierra el domingo de esa semana a las 23:59
-- (hora de Chile). Antes el ganador lo guardaba el teléfono de quien abriera el
-- Inicio después del cierre y dentro de 7 días: si nadie entraba a tiempo, el
-- partido quedaba sin MVP. Ahora lo cierra la base cada hora.
--
-- El ganador lo cuenta el trigger contar_ganador_mvp con los votos guardados.
-- Solo se cierran partidos de los últimos 30 días, para no rellenar el
-- historial con partidos viejos que quedaron sin cerrar.

create or replace function public.cierre_votacion_mvp(p_fecha timestamptz)
returns timestamptz language sql immutable set search_path = public as $$
  -- Domingo de la semana del partido, 23:59:59 en Chile.
  select ((date_trunc('day', p_fecha at time zone 'America/Santiago')
           + make_interval(days => ((7 - extract(dow from p_fecha at time zone 'America/Santiago')::int) % 7))
           + interval '23 hours 59 minutes 59 seconds') at time zone 'America/Santiago');
$$;

create or replace function public.cerrar_votaciones_mvp()
returns integer language plpgsql security definer set search_path = public as $$
declare
  m record;
  cerrados integer := 0;
begin
  for m in
    select x.id, x.date from public.matches x
    where x.event_type = 'Deportivo'
      and x.date > now() - interval '30 days'
      and public.cierre_votacion_mvp(x.date) < now()
      and exists (select 1 from public.match_mvp_votes v where v.match_id = x.id and v.voted_player_id is not null)
      and not exists (select 1 from public.mvp_winners w where w.match_id = x.id)
  loop
    insert into public.mvp_winners (match_id, week_date)
    values (m.id, (m.date at time zone 'America/Santiago')::date)
    on conflict (match_id) do nothing;
    cerrados := cerrados + 1;
  end loop;
  return cerrados;
end;
$$;
revoke all on function public.cerrar_votaciones_mvp() from public, anon, authenticated;
revoke all on function public.cierre_votacion_mvp(timestamptz) from public, anon;

-- Cerrar la votación a mano queda para el capitán o subcapitán, no para cualquier jugador.
drop policy if exists "mvp: cualquier compañero cierra la votación" on public.mvp_winners;
drop policy if exists "mvp: el armador cierra la votación" on public.mvp_winners;
create policy "mvp: el armador cierra la votación" on public.mvp_winners for insert to authenticated
  with check (public.es_armador(public.equipo_del_partido(match_id)));

select cron.unschedule('cerrar-votaciones-mvp')
where exists (select 1 from cron.job where jobname = 'cerrar-votaciones-mvp');
select cron.schedule('cerrar-votaciones-mvp', '5 * * * *', $$ select public.cerrar_votaciones_mvp(); $$);
