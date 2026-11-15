/** Formatos de texto que se repiten en varias pantallas. */

export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

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
