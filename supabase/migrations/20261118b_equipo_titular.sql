-- Equipo titular armado a mano por el capitán: { formacion, puestos: [id | null, ...] }.
-- Null o sin puestos = se arma solo con los mejores por estrellas.
alter table public.team_settings add column if not exists titular jsonb;
