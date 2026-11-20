-- Celular de cada jugador (+569XXXXXXXX). Lo ven los de su equipo, como el correo.
alter table public.players add column if not exists phone text
  check (phone is null or phone ~ '^\+?[0-9 ]{8,16}$');
comment on column public.players.phone is 'Celular del jugador, formato +569XXXXXXXX.';
