-- Comprobantes de pago de cuotas.
-- El jugador sube la foto o PDF de su transferencia desde Mi perfil; queda
-- "por_revisar" hasta que el capitán lo aprueba (y entonces se registra el pago
-- en payments, igual que si lo anotara a mano en Caja) o lo rechaza con un motivo.
-- Los archivos van en un bucket privado: ruta <team_id>/<player_id>/<archivo>.

create table if not exists public.comprobantes (
  id uuid primary key default gen_random_uuid(),
  team_id integer not null references public.team_settings(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  amount numeric not null check (amount > 0 and amount <= 10000000),
  file_path text not null,
  nota text check (char_length(nota) <= 300),
  status text not null default 'por_revisar' check (status in ('por_revisar', 'aprobado', 'rechazado')),
  motivo text check (char_length(motivo) <= 300),
  monto_aprobado numeric,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists comprobantes_equipo_estado on public.comprobantes (team_id, status, created_at desc);
create index if not exists comprobantes_jugador on public.comprobantes (player_id, created_at desc);

alter table public.comprobantes enable row level security;

create policy "comprobantes: ver el mío o, si soy admin, los del equipo"
  on public.comprobantes for select
  using (public.es_mi_ficha(player_id) or public.es_admin_equipo(team_id));

-- Solo puede subirse a nombre propio, en el equipo real del jugador y sin revisar.
create policy "comprobantes: el jugador sube el suyo"
  on public.comprobantes for insert
  with check (
    public.es_mi_ficha(player_id)
    and team_id = public.equipo_del_jugador(player_id)
    and status = 'por_revisar'
    and reviewed_at is null and reviewed_by is null and monto_aprobado is null
    and split_part(file_path, '/', 1) = team_id::text
    and split_part(file_path, '/', 2) = player_id::text
  );

create policy "comprobantes: el admin revisa"
  on public.comprobantes for update
  using (public.es_admin_equipo(team_id))
  with check (public.es_admin_equipo(team_id));

-- El jugador puede retirar uno que aún no se revisa; el admin, cualquiera.
create policy "comprobantes: borrar"
  on public.comprobantes for delete
  using ((public.es_mi_ficha(player_id) and status = 'por_revisar') or public.es_admin_equipo(team_id));

-- Bucket privado, 5 MB, solo imágenes y PDF.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Jugador dueño de la ruta (segundo tramo), o null si no es un uuid.
create or replace function public.jugador_de_ruta(p_name text)
returns uuid
language sql
immutable
set search_path to ''
as $$
  select case when split_part(p_name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then split_part(p_name, '/', 2)::uuid end;
$$;

create policy "comprobantes archivos: el jugador sube el suyo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'comprobantes'
    and public.es_mi_ficha(public.jugador_de_ruta(name))
    and public.equipo_de_ruta(name) = public.equipo_del_jugador(public.jugador_de_ruta(name))
  );

create policy "comprobantes archivos: ver el mío o los del equipo si soy admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'comprobantes'
    and (public.es_mi_ficha(public.jugador_de_ruta(name)) or public.es_admin_equipo(public.equipo_de_ruta(name)))
  );

create policy "comprobantes archivos: borrar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'comprobantes'
    and (public.es_mi_ficha(public.jugador_de_ruta(name)) or public.es_admin_equipo(public.equipo_de_ruta(name)))
  );
