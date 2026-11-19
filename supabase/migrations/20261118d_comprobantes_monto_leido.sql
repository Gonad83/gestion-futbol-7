-- Lectura automática (OCR) del comprobante: el monto que se leyó de la imagen
-- en el teléfono del jugador al subirla (ver src/lib/leerComprobante.ts).
-- Es una ayuda para el capitán: si no coincide con lo declarado, Caja lo avisa.
alter table public.comprobantes
  add column if not exists monto_leido numeric check (monto_leido is null or (monto_leido > 0 and monto_leido <= 10000000));
comment on column public.comprobantes.monto_leido is 'Monto que la lectura automática (OCR) encontró en la imagen al subirla; null si no se pudo leer.';
