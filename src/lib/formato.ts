/** Formatos de texto que se repiten en varias pantallas. */

export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/**
 * Fecha de hoy como "aaaa-mm-dd" en la hora del teléfono. `toISOString()` da la
 * fecha en UTC: en Chile, después de las ~20:00 ya es "mañana".
 */
export function hoyLocal(ahora: Date = new Date()): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`;
}

/**
 * Lee una fecha sin hora ("aaaa-mm-dd") como ese día en Chile. `new Date('2026-11-20')`
 * la toma como medianoche UTC, que en Chile todavía es el día 19.
 */
export const fechaSinHora = (texto: string) => new Date(`${texto.slice(0, 10)}T12:00:00`);

/** Pesos chilenos sin decimales: 12500 → "$12.500". */
export const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

/**
 * Deja un texto seguro para ponerlo dentro de HTML. Sin esto, un nombre o un
 * concepto escrito con etiquetas se ejecutaría como código al abrir un reporte.
 */
export function escapeHtml(texto: unknown): string {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Celular en el formato que guarda la base (+569XXXXXXXX). Acepta "912345678",
 * "9 1234 5678", "+56 9 1234 5678"… Vacío → null. Si no parece un número, lanza error.
 */
export function normalizarTelefono(texto: string | null | undefined): string | null {
  const digitos = (texto ?? '').replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.length === 9 && digitos.startsWith('9')) return `+56${digitos}`;
  if (digitos.length === 11 && digitos.startsWith('569')) return `+${digitos}`;
  if (digitos.length >= 8 && digitos.length <= 15) return `+${digitos}`;
  throw new Error('El teléfono no es válido. Escríbelo así: 9 1234 5678.');
}

/** "+56912345678" → "+56 9 1234 5678" para mostrarlo. */
export function mostrarTelefono(tel: string | null | undefined): string {
  if (!tel) return '';
  const m = tel.match(/^\+569(\d{4})(\d{4})$/);
  return m ? `+56 9 ${m[1]} ${m[2]}` : tel;
}
