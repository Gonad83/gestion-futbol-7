-- Las estrellas de cada jugador se componen de 3 sub-estrellas (1-7):
-- Forma, Técnica y Visión. `rating` pasa a ser el promedio redondeado
-- de las tres, para que el armado de equipos y el resto de la app sigan igual.

alter table public.players add column if not exists forma       smallint;
alter table public.players add column if not exists tecnica     smallint;
alter table public.players add column if not exists vision      smallint;

-- Los jugadores existentes parten con sus 3 sub-estrellas iguales a su rating actual.
update public.players
   set forma       = coalesce(forma, rating),
       tecnica     = coalesce(tecnica, rating),
       vision      = coalesce(vision, rating)
 where forma is null or tecnica is null or vision is null;
