-- La plantilla que ve el rival trae también cuántas veces cada jugador fue MVP,
-- para destacar a la figura del equipo (el que más títulos tiene).
drop function if exists public.plantilla_arena(integer);
create function public.plantilla_arena(p_equipo integer)
returns table (
  id uuid, name text, nickname text, "position" text, rating integer, photo_url text, mvps integer
) language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.nickname, p.position, p.rating, p.photo_url,
         (select count(*)::integer from public.mvp_winners w where w.player_id = p.id) as mvps
  from public.players p
  join public.team_settings t on t.id = p.team_id
  where p.team_id = p_equipo and t.arena_visible and p.status = 'Activo'
  order by p.rating desc nulls last, p.name;
$$;
revoke all on function public.plantilla_arena(integer) from public, anon;
grant execute on function public.plantilla_arena(integer) to authenticated;
