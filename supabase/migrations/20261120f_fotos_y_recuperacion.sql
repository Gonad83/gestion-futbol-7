-- 1. Fotos ('foto jugadores'): cualquier usuario con sesión podía reemplazar
--    cualquier archivo, por ejemplo la foto de otro jugador o el logo de otro
--    equipo. Ahora solo sube quien pertenece a un equipo, y solo reemplaza o
--    borra lo que subió él. Además el bucket acepta solo imágenes de hasta 5 MB.
drop policy if exists "Permitir subida de fotos" on storage.objects;
drop policy if exists "Permitir actualizar fotos" on storage.objects;
drop policy if exists "fotos: borrar las mías" on storage.objects;

create policy "Permitir subida de fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'foto jugadores' and exists (select 1 from public.mis_equipos()));
create policy "Permitir actualizar fotos" on storage.objects for update to authenticated
  using (bucket_id = 'foto jugadores' and owner = auth.uid())
  with check (bucket_id = 'foto jugadores' and owner = auth.uid());
create policy "fotos: borrar las mías" on storage.objects for delete to authenticated
  using (bucket_id = 'foto jugadores' and owner = auth.uid());

update storage.buckets
   set file_size_limit = 5 * 1024 * 1024,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
 where id = 'foto jugadores';

-- 2. "Olvidé mi contraseña" tenía un tope de 60 pedidos por hora para TODOS:
--    cualquiera podía gastarlo y nadie más recibía el correo. Ahora el tope es
--    por correo y por conexión (IP); se guarda la IP para contarlos.
alter table public.password_reset_requests add column if not exists ip text;
create index if not exists password_reset_requests_ip_idx on public.password_reset_requests (ip, created_at desc);
