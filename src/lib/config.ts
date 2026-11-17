/**
 * Valores fijos de la plataforma, en un solo lugar.
 *
 * El correo del dueño de la plataforma solo decide qué se MUESTRA en pantalla;
 * el permiso real lo da la base de datos (función es_superadmin en Supabase).
 * Si cambia, hay que cambiarlo en los dos lados.
 */
export const SUPER_ADMIN_EMAIL = 'garaosd@gmail.com';

/**
 * Inter Generaciones SSCC es un torneo propio de Real Ebolo FC (equipo 1 en
 * team_settings): los demás equipos no ven la sección.
 */
export const EQUIPO_INTER_GENERACIONES = 1;

export function tieneInterGeneraciones(teamId?: number | null) {
  return Number(teamId) === EQUIPO_INTER_GENERACIONES;
}

export function esSuperAdmin(email?: string | null) {
  return (email ?? '').toLowerCase() === SUPER_ADMIN_EMAIL;
}
