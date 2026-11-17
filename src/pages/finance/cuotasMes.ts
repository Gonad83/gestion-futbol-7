import type { FilaCuota } from '../../lib/api/finanzas';

/** Enero y febrero no se cobran (temporada libre). */
export const esMesSinCuota = (mes: number) => mes <= 2;

/** Cuánto falta por cobrar este mes y a cuántos jugadores. */
export function pendientesDelMes(payments: FilaCuota[], quotaAmount: number) {
  const pendientes = payments.filter(p => !p.isExempt && p.status !== 'Pagado');
  return { cantidad: pendientes.length, monto: pendientes.reduce((s, p) => s + Math.max(0, quotaAmount - Number(p.amount || 0)), 0) };
}

/** Iniciales para el avatar: "Matías Bravo" → "MB". */
export const iniciales = (nombre: string) =>
  nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?';

export const METODOS_PAGO = ['Transferencia', 'Efectivo', 'Link de Pago'] as const;
