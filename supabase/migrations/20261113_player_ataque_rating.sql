-- Quinta sub-estrella: Ataque (1-7). `rating` pasa a ser el promedio
-- redondeado de Forma, Técnica, Visión, Ataque y Defensa.

alter table public.players add column if not exists ataque smallint;

-- Los jugadores existentes parten con Ataque igual a su rating actual.
update public.players set ataque = rating where ataque is null;
