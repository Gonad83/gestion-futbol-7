-- Inter Generaciones SSCC: una edición por año y por equipo, con la lista de
-- jugadores que participan, la cuota, las bases descargables y una galería de
-- fotos y videos.
--
-- Permisos:
--   miembro del equipo → ve todo y sube fotos/videos (y borra los suyos);
--   admin del equipo   → crea la edición, edita detalles, cuota, bases,
--                        participantes y pagos, y borra cualquier archivo.

create table if not exists public.intergen_editions (
  id          uuid primary key default gen_random_uuid(),
  team_id     integer not null references public.team_settings(id) on delete cascade,
  year        integer not null,
  fee         integer not null default 20000,
  start_date  date,
  end_date    date,
  location    text,
  category    text,
  details     text,
  payment_info text,
  bases_url   text,
  bases_name  text,
  bases_path  text,
  created_at  timestamptz not null default now(),
  unique (team_id, year)
);

create table if not exists public.intergen_participants (
  id          uuid primary key default gen_random_uuid(),
  edition_id  uuid not null references public.intergen_editions(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  paid        boolean not null default false,
  paid_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (edition_id, player_id)
);

create table if not exists public.intergen_media (
  id           uuid primary key default gen_random_uuid(),
  edition_id   uuid not null references public.intergen_editions(id) on delete cascade,
  kind         text not null check (kind in ('photo', 'video')),
  url          text not null,
  storage_path text,
  caption      text,
  uploaded_by  uuid default auth.uid(),
  created_at   timestamptz not null default now()
);

create index if not exists intergen_participants_edition_idx on public.intergen_participants(edition_id);
create index if not exists intergen_media_edition_idx on public.intergen_media(edition_id);

create or replace function public.equipo_de_edicion(p_edition uuid)
returns integer language sql stable security definer set search_path = public as $$
  select team_id from public.intergen_editions where id = p_edition;
$$;

alter table public.intergen_editions     enable row level security;
alter table public.intergen_participants enable row level security;
alter table public.intergen_media        enable row level security;

drop policy if exists "intergen ediciones: ver" on public.intergen_editions;
drop policy if exists "intergen ediciones: admin" on public.intergen_editions;
create policy "intergen ediciones: ver" on public.intergen_editions for select to authenticated
  using (public.es_miembro(team_id) or public.es_superadmin());
create policy "intergen ediciones: admin" on public.intergen_editions for all to authenticated
  using (public.es_admin_equipo(team_id)) with check (public.es_admin_equipo(team_id));

drop policy if exists "intergen participantes: ver" on public.intergen_participants;
drop policy if exists "intergen participantes: admin" on public.intergen_participants;
create policy "intergen participantes: ver" on public.intergen_participants for select to authenticated
  using (public.es_miembro(public.equipo_de_edicion(edition_id)) or public.es_superadmin());
create policy "intergen participantes: admin" on public.intergen_participants for all to authenticated
  using (public.es_admin_equipo(public.equipo_de_edicion(edition_id)))
  with check (
    public.es_admin_equipo(public.equipo_de_edicion(edition_id))
    and public.equipo_del_jugador(player_id) = public.equipo_de_edicion(edition_id)
  );

drop policy if exists "intergen media: ver" on public.intergen_media;
drop policy if exists "intergen media: miembro sube" on public.intergen_media;
drop policy if exists "intergen media: borrar" on public.intergen_media;
create policy "intergen media: ver" on public.intergen_media for select to authenticated
  using (public.es_miembro(public.equipo_de_edicion(edition_id)) or public.es_superadmin());
create policy "intergen media: miembro sube" on public.intergen_media for insert to authenticated
  with check (public.es_miembro(public.equipo_de_edicion(edition_id)) and uploaded_by = auth.uid());
create policy "intergen media: borrar" on public.intergen_media for delete to authenticated
  using (uploaded_by = auth.uid() or public.es_admin_equipo(public.equipo_de_edicion(edition_id)));

-- ── Archivos: bucket público, carpeta por equipo ({team_id}/{año}/...) ───────
insert into storage.buckets (id, name, public, file_size_limit)
values ('intergeneraciones', 'intergeneraciones', true, 104857600)
on conflict (id) do update set public = true, file_size_limit = 104857600;

create or replace function public.equipo_de_ruta(p_name text)
returns integer language sql immutable as $$
  select case when split_part(p_name, '/', 1) ~ '^[0-9]+$'
              then split_part(p_name, '/', 1)::integer end;
$$;

drop policy if exists "intergen archivos: miembro sube" on storage.objects;
drop policy if exists "intergen archivos: borrar" on storage.objects;
drop policy if exists "intergen archivos: admin reemplaza" on storage.objects;
create policy "intergen archivos: miembro sube" on storage.objects for insert to authenticated
  with check (bucket_id = 'intergeneraciones' and public.es_miembro(public.equipo_de_ruta(name)));
create policy "intergen archivos: admin reemplaza" on storage.objects for update to authenticated
  using (bucket_id = 'intergeneraciones' and public.es_admin_equipo(public.equipo_de_ruta(name)));
create policy "intergen archivos: borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'intergeneraciones'
         and (owner = auth.uid() or public.es_admin_equipo(public.equipo_de_ruta(name))));

-- Igual que el resto de las tablas: sin sesión no se escribe.
revoke insert, update, delete, truncate, references, trigger on public.intergen_editions, public.intergen_participants, public.intergen_media from anon;
revoke truncate, references, trigger on public.intergen_editions, public.intergen_participants, public.intergen_media from authenticated;
