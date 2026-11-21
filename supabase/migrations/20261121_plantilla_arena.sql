-- La Arena muestra la plantilla del rival antes de desafiarlo o aceptarle un
-- amistoso. De cada jugador sale solo lo que va en su lámina: nombre, apodo,
-- puesto, estrellas y foto. Correo, teléfono, fecha de nacimiento y el resto de
-- la ficha siguen siendo solo para su equipo. Un equipo que se oculta de la
-- Arena (arena_visible = false) tampoco muestra su plantilla.
create or replace function public.plantilla_arena(p_equipo integer)
returns table (
  id uuid, name text, nickname text, "position" text, rating integer, photo_url text
) language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.nickname, p.position, p.rating, p.photo_url
  from public.players p
  join public.team_settings t on t.id = p.team_id
  where p.team_id = p_equipo and t.arena_visible and p.status = 'Activo'
  order by p.rating desc nulls last, p.name;
$$;
revoke all on function public.plantilla_arena(integer) from public, anon;
grant execute on function public.plantilla_arena(integer) to authenticated;
