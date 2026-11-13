-- Cuarta sub-estrella: Defensa (1-7). `rating` pasa a ser el promedio
-- redondeado de Forma, Técnica, Visión y Defensa.

alter table public.players add column if not exists defensa smallint;

-- Los jugadores existentes parten con Defensa igual a su rating actual.
update public.players set defensa = rating where defensa is null;
