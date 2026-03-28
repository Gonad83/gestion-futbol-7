-- Script para vincular masivamente jugadores con sus cuentas de usuario (Auth)
-- Ejecuta esto en el SQL Editor de Supabase si tienes jugadores creados antes de sus cuentas.

UPDATE public.players p
SET user_id = u.id
FROM public.users u
WHERE p.email ILIKE (
  SELECT email FROM auth.users WHERE id = u.id
)
AND p.user_id IS NULL;

-- Nota: Este script busca coincidencias de Email (sin importar mayúsculas) 
-- y rellena el user_id faltante en la tabla de jugadores.
