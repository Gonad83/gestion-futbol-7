import { supabase } from './supabase';

/**
 * Entrar o crear cuenta con Google.
 *
 * El botón solo aparece si Google está activado en Supabase (Authentication →
 * Sign In / Providers → Google). Así se puede publicar antes de configurarlo:
 * al activarlo, el botón aparece solo, sin volver a publicar la app.
 */

let disponible: Promise<boolean> | null = null;

export function googleDisponible(): Promise<boolean> {
  disponible ??= fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
  })
    .then(r => (r.ok ? r.json() : null))
    .then(datos => datos?.external?.google === true)
    .catch(() => false);
  return disponible;
}

/**
 * Lleva a Google y vuelve a `destino` (una ruta de la app, p. ej. /register-captain?plan=pro).
 * Si la persona ya tenía cuenta con ese correo, Supabase la reconoce y entra a la misma.
 */
export async function entrarConGoogle(destino: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${destino}`,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
}
