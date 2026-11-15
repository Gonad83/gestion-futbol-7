/**
 * Valores fijos de la plataforma, en un solo lugar.
 *
 * El correo del dueño de la plataforma solo decide qué se MUESTRA en pantalla;
 * el permiso real lo da la base de datos (función es_superadmin en Supabase).
 * Si cambia, hay que cambiarlo en los dos lados.
 */
export const SUPER_ADMIN_EMAIL = 'garaosd@gmail.com';

export function esSuperAdmin(email?: string | null) {
  return (email ?? '').toLowerCase() === SUPER_ADMIN_EMAIL;
}
