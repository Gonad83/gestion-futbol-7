// Un plan pagado dura lo que se pagó: un mes o un año desde el pago (plan_expires_at).
// Vencido, el equipo vuelve a los límites del plan gratis; no se borra nada.

const DIA = 24 * 60 * 60 * 1000;

/** El plan que rige hoy: el guardado, o 'free' si ya venció. Sin fecha de vencimiento no vence. */
export function planVigente(plan: string | null | undefined, venceEl: string | null | undefined, ahora = new Date()): string {
  const guardado = plan || 'free';
  if (guardado === 'free' || !venceEl) return guardado;
  return new Date(venceEl).getTime() > ahora.getTime() ? guardado : 'free';
}

/** Días que faltan para el vencimiento (negativo si ya pasó); null si el plan no tiene fecha. */
export function diasParaVencer(venceEl: string | null | undefined, ahora = new Date()): number | null {
  if (!venceEl) return null;
  return Math.ceil((new Date(venceEl).getTime() - ahora.getTime()) / DIA);
}
