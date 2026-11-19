// Qué dinero hay de verdad en una fila de payments. Lo usan Caja, el Inicio y el
// reacomodo de pagos, para que todos cuenten igual.
//
//   Pagado            → su monto se recibió (un mes completo).
//   Pendiente/Atrasado → su monto es un abono recibido, salvo que sea la deuda
//                        que anotaba n8n ("Pendiente $8.000"), marcada con es_deuda.
//   Exento            → no hay dinero.
//
// Antes se distinguía el abono de la deuda comparando con la cuota, y por eso
// cambiar la cuota cambiaba el historial.

export interface FilaDinero {
  status: string;
  amount: number | string | null;
  es_deuda?: boolean | null;
}

/** Un abono: dinero recibido a cuenta de un mes que todavía no está pagado completo. */
export const esAbono = (r: FilaDinero) =>
  (r.status === 'Pendiente' || r.status === 'Atrasado') && !r.es_deuda && Number(r.amount ?? 0) > 0;

/** Dinero realmente recibido en la fila. */
export const recibido = (r: FilaDinero) =>
  r.status === 'Pagado' || esAbono(r) ? Math.max(0, Number(r.amount ?? 0)) : 0;

/** Todo lo recibido en cuotas: meses pagados más abonos. */
export const totalRecibido = (filas: FilaDinero[]) => filas.reduce((s, r) => s + recibido(r), 0);
