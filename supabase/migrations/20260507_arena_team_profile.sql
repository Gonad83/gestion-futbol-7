-- Fase 1 Arena: campos de perfil público del equipo para matchmaking
alter table public.team_settings
  add column if not exists city        text,
  add column if not exists commune     text,
  add column if not exists region      text,
  add column if not exists age_range   text default 'Open',
  add column if not exists preferred_format text default '7vs7',
  add column if not exists arena_visible boolean default true,
  add column if not exists team_description text;

comment on column public.team_settings.city               is 'Ciudad del equipo (ej: Santiago)';
comment on column public.team_settings.commune            is 'Comuna del equipo (ej: Las Condes)';
comment on column public.team_settings.region             is 'Región del equipo';
comment on column public.team_settings.age_range          is 'Rango etario: Open, Sub-18, Sub-21, 25+, 35+, 40+, Mixto';
comment on column public.team_settings.preferred_format   is 'Formato preferido: 5vs5, 7vs7, 11vs11, Todos';
comment on column public.team_settings.arena_visible      is 'Si el equipo aparece en la arena pública';
comment on column public.team_settings.team_description   is 'Descripción corta del equipo';
