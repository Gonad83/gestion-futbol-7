import { describe, expect, it } from 'vitest';
import {
  applyRebalancePlan,
  isBillableMonth,
  planHasChanges,
  planRebalance,
  type PaymentRow,
  type RebalancePlan,
} from './paymentLedger';

const CUOTA = 5000;
const JUGADOR = 'jugador-1';
/** Ingresó a mitad de marzo de 2026 (a mitad de mes para no depender de la zona horaria). */
const INGRESO = '2026-03-15T12:00:00Z';

let contador = 0;
const fila = (month: number, year: number, status: string, amount: number | null, extra: Partial<PaymentRow> = {}): PaymentRow => ({
  id: `fila-${++contador}`,
  player_id: JUGADOR,
  month,
  year,
  status,
  amount,
  payment_method: 'Transferencia',
  created_at: `2026-01-01T00:00:${String(contador % 60).padStart(2, '0')}Z`,
  ...extra,
});

const clave = (r: PaymentRow) => `${r.year}-${r.month}`;

/**
 * Hace lo mismo que la base de datos al aplicar un plan, en el mismo orden que
 * applyRebalancePlan, y respeta la regla "un pago por jugador, mes y año":
 * si en algún paso dos filas quedan en el mismo mes, falla.
 */
function aplicarEnMemoria(inicial: PaymentRow[], plan: RebalancePlan): PaymentRow[] {
  let filas = inicial.map((r) => ({ ...r }));
  const revisarUnicidad = () => {
    const vistos = new Set<string>();
    for (const r of filas) {
      if (vistos.has(clave(r))) throw new Error(`Dos filas en el mismo mes: ${clave(r)}`);
      vistos.add(clave(r));
    }
  };

  filas = filas.filter((r) => !plan.deletes.includes(r.id!));
  const ordenados = [...plan.updates].sort(
    (a, b) => (a.changes.month === undefined ? 0 : 1) - (b.changes.month === undefined ? 0 : 1),
  );
  for (const u of ordenados) {
    const destino = filas.find((r) => r.id === u.id);
    if (!destino) throw new Error(`Se actualiza una fila que no existe: ${u.id}`);
    Object.assign(destino, u.changes);
    revisarUnicidad();
  }
  for (const nueva of plan.inserts) {
    filas.push({ ...nueva, id: `nueva-${++contador}` });
    revisarUnicidad();
  }
  return filas;
}

/** Dinero realmente recibido: meses pagados completos más abonos parciales. */
function dinero(filas: PaymentRow[]) {
  return filas.reduce((suma, r) => {
    const monto = Number(r.amount ?? 0);
    if (r.status === 'Pagado') return suma + monto;
    // Un abono es dinero; la deuda anotada por n8n (es_deuda) no.
    if ((r.status === 'Pendiente' || r.status === 'Atrasado') && monto > 0 && !r.es_deuda) return suma + monto;
    return suma;
  }, 0);
}

const resumen = (filas: PaymentRow[]) =>
  filas
    .filter((r) => r.status === 'Pagado' || Number(r.amount ?? 0) > 0 || r.status === 'Exento')
    .map((r) => `${r.year}-${String(r.month).padStart(2, '0')} ${r.status} ${Number(r.amount ?? 0)}`)
    .sort();

/** Registra un pago y devuelve cómo queda la "base de datos". */
function registrar(filas: PaymentRow[], monto: number, opciones: { ingreso?: string | null; cuota?: number; medio?: string | null } = {}) {
  const cuota = opciones.cuota ?? CUOTA;
  const ingreso = opciones.ingreso === undefined ? INGRESO : opciones.ingreso;
  const plan = planRebalance(filas, JUGADOR, ingreso, cuota, monto, opciones.medio ?? null);
  return { plan, despues: aplicarEnMemoria(filas, plan) };
}

describe('isBillableMonth', () => {
  it('enero y febrero no se cobran; el resto sí', () => {
    expect([1, 2].map(isBillableMonth)).toEqual([false, false]);
    expect([3, 4, 5, 6, 7, 8, 9, 10, 11, 12].every(isBillableMonth)).toBe(true);
  });
});

describe('planRebalance: registrar pagos', () => {
  it('el primer pago cubre el mes de ingreso', () => {
    const { plan, despues } = registrar([], CUOTA, { medio: 'Efectivo' });
    expect(plan.inserts).toHaveLength(1);
    expect(plan.inserts[0]).toMatchObject({ player_id: JUGADOR, month: 3, year: 2026, status: 'Pagado', amount: CUOTA, payment_method: 'Efectivo' });
    expect(resumen(despues)).toEqual(['2026-03 Pagado 5000']);
  });

  it('un pago adelantado de dos cuotas cubre dos meses seguidos', () => {
    const { despues } = registrar([], CUOTA * 2);
    expect(resumen(despues)).toEqual(['2026-03 Pagado 5000', '2026-04 Pagado 5000']);
  });

  it('un abono queda como pendiente con su monto', () => {
    const { despues } = registrar([], 3000);
    expect(resumen(despues)).toEqual(['2026-03 Pendiente 3000']);
  });

  it('dos abonos que juntos superan la cuota completan el mes y el resto pasa al siguiente', () => {
    const primero = registrar([], 3000).despues;
    const { despues } = registrar(primero, 3000);
    expect(resumen(despues)).toEqual(['2026-03 Pagado 5000', '2026-04 Pendiente 1000']);
    expect(dinero(despues)).toBe(6000);
  });

  it('el pago nuevo va al mes pendiente más antiguo, no al mes en curso', () => {
    const filas = [fila(3, 2026, 'Pagado', CUOTA)];
    const { despues } = registrar(filas, CUOTA);
    expect(resumen(despues)).toEqual(['2026-03 Pagado 5000', '2026-04 Pagado 5000']);
  });

  it('salta enero y febrero', () => {
    const { despues } = registrar([], CUOTA * 3, { ingreso: '2025-11-15T12:00:00Z' });
    expect(resumen(despues)).toEqual(['2025-11 Pagado 5000', '2025-12 Pagado 5000', '2026-03 Pagado 5000']);
  });

  it('salta los meses exentos y no los toca', () => {
    const exento = fila(4, 2026, 'Exento', 0);
    const { plan, despues } = registrar([exento], CUOTA * 2);
    expect(resumen(despues)).toEqual(['2026-03 Pagado 5000', '2026-04 Exento 0', '2026-05 Pagado 5000']);
    expect(plan.deletes).not.toContain(exento.id);
    expect(plan.updates.map((u) => u.id)).not.toContain(exento.id);
  });

  it('usa una fila de deuda que ya existía en ese mes en vez de crear otra', () => {
    // n8n dejaba "Pendiente" con el monto de la cuota como deuda (es_deuda), no como dinero recibido.
    const deuda = fila(3, 2026, 'Pendiente', CUOTA, { es_deuda: true });
    const { plan, despues } = registrar([deuda], CUOTA, { medio: 'Efectivo' });
    expect(plan.inserts).toHaveLength(0);
    expect(plan.updates).toEqual([{ id: deuda.id, changes: { status: 'Pagado', payment_method: 'Efectivo', es_deuda: false } }]);
    expect(resumen(despues)).toEqual(['2026-03 Pagado 5000']);
  });

  it('una deuda sin pagar no cuenta como dinero', () => {
    const deuda = fila(3, 2026, 'Pendiente', CUOTA, { es_deuda: true });
    const plan = planRebalance([deuda], JUGADOR, INGRESO, CUOTA);
    expect(planHasChanges(plan)).toBe(false);
    expect(dinero(plan.rows)).toBe(0);
  });

  it('cambiar la cuota no borra ni inventa abonos', () => {
    const abono = () => [fila(3, 2026, 'Pendiente', 3000)];
    // Cuota más alta: el abono sigue siendo $3.000 recibidos.
    expect(dinero(planRebalance(abono(), JUGADOR, INGRESO, 10000).rows)).toBe(3000);
    // Cuota más baja: el abono alcanza para un mes completo y el resto sigue a cuenta del siguiente.
    const bajada = planRebalance(abono(), JUGADOR, INGRESO, 2000);
    expect(resumen(bajada.rows)).toEqual(['2026-03 Pagado 2000', '2026-04 Pendiente 1000']);
    expect(dinero(bajada.rows)).toBe(3000);
  });

  it('un monto negativo no descuenta nada', () => {
    const filas = [fila(3, 2026, 'Pagado', CUOTA)];
    const plan = planRebalance(filas, JUGADOR, INGRESO, CUOTA, -2000);
    expect(planHasChanges(plan)).toBe(false);
  });
});

describe('planRebalance: reacomodo de lo que ya estaba', () => {
  it('un mes pagado con meses anteriores impagos se corre al más antiguo', () => {
    const mayo = fila(5, 2026, 'Pagado', CUOTA);
    const plan = planRebalance([mayo], JUGADOR, INGRESO, CUOTA);
    expect(plan.inserts).toHaveLength(0);
    expect(plan.deletes).toHaveLength(0);
    expect(plan.updates).toEqual([{ id: mayo.id, changes: expect.objectContaining({ month: 3, year: 2026, status: 'Pagado', amount: CUOTA }) }]);
  });

  it('si el pago más antiguo es anterior al ingreso, se parte desde ese pago', () => {
    const anterior = fila(11, 2025, 'Pagado', CUOTA);
    const plan = planRebalance([anterior], JUGADOR, INGRESO, CUOTA);
    expect(planHasChanges(plan)).toBe(false);
  });

  it('respeta el monto histórico de un mes pagado aunque la cuota haya cambiado', () => {
    const antiguo = fila(3, 2026, 'Pagado', 4000);
    const plan = planRebalance([antiguo], JUGADOR, INGRESO, CUOTA);
    expect(planHasChanges(plan)).toBe(false);
    expect(resumen(plan.rows)).toEqual(['2026-03 Pagado 4000']);
  });

  it('sin cambios que hacer, el plan sale vacío', () => {
    const filas = [fila(3, 2026, 'Pagado', CUOTA), fila(4, 2026, 'Pagado', CUOTA), fila(5, 2026, 'Pendiente', 2000)];
    expect(planHasChanges(planRebalance(filas, JUGADOR, INGRESO, CUOTA))).toBe(false);
  });

  it('con cuota en cero no se queda pegado', () => {
    const plan = planRebalance([], JUGADOR, INGRESO, 0, 1000);
    expect(plan.inserts.length).toBeLessThanOrEqual(1);
  });

  it('un jugador sin pagos ni fecha de ingreso no genera movimientos', () => {
    expect(planHasChanges(planRebalance([], JUGADOR, null, CUOTA))).toBe(false);
  });
});

describe('planRebalance: garantías que deben cumplirse siempre', () => {
  const casos: { nombre: string; filas: () => PaymentRow[]; monto: number }[] = [
    { nombre: 'sin historial, una cuota', filas: () => [], monto: CUOTA },
    { nombre: 'sin historial, abono', filas: () => [], monto: 1500 },
    { nombre: 'sin historial, tres cuotas y media', filas: () => [], monto: 17500 },
    { nombre: 'pago suelto en mayo', filas: () => [fila(5, 2026, 'Pagado', CUOTA)], monto: 0 },
    { nombre: 'pago suelto en mayo más una cuota', filas: () => [fila(5, 2026, 'Pagado', CUOTA)], monto: CUOTA },
    {
      nombre: 'abono atrasado y un mes pagado más adelante',
      filas: () => [fila(3, 2026, 'Atrasado', 2000), fila(6, 2026, 'Pagado', CUOTA)],
      monto: 4000,
    },
    {
      nombre: 'deudas de n8n, un exento y pagos desordenados',
      filas: () => [
        fila(3, 2026, 'Pendiente', CUOTA, { es_deuda: true }),
        fila(4, 2026, 'Exento', 0),
        fila(5, 2026, 'Pendiente', CUOTA, { es_deuda: true }),
        fila(7, 2026, 'Pagado', CUOTA),
        fila(9, 2026, 'Pagado', CUOTA),
        fila(10, 2026, 'Pendiente', 1200),
      ],
      monto: 3000,
    },
    {
      nombre: 'abono donde termina cayendo un mes ya pagado',
      filas: () => [fila(3, 2026, 'Pendiente', 2000), fila(4, 2026, 'Pagado', CUOTA)],
      monto: 0,
    },
    {
      nombre: 'historial que cruza el año',
      filas: () => [fila(12, 2026, 'Pagado', CUOTA), fila(4, 2027, 'Pagado', CUOTA), fila(11, 2026, 'Pendiente', 4900)],
      monto: 200,
    },
  ];

  for (const caso of casos) {
    describe(caso.nombre, () => {
      const antes = caso.filas();
      const plan = planRebalance(antes, JUGADOR, INGRESO, CUOTA, caso.monto);
      const despues = aplicarEnMemoria(antes, plan);

      it('no se pierde ni se inventa dinero', () => {
        expect(dinero(despues)).toBe(dinero(antes) + caso.monto);
      });

      it('lo que se muestra coincide con lo que queda guardado', () => {
        const sinId = (filas: PaymentRow[]) => filas.map((r) => `${clave(r)} ${r.status} ${Number(r.amount ?? 0)}`).sort();
        expect(sinId(plan.rows)).toEqual(sinId(despues));
      });

      it('no queda un mes pagado con uno anterior cobrable sin pagar', () => {
        const pagados = despues.filter((r) => r.status === 'Pagado');
        const exentos = new Set(despues.filter((r) => r.status === 'Exento').map(clave));
        const ocupados = new Set(pagados.map(clave));
        const ultimo = pagados.reduce((max, r) => Math.max(max, r.year * 12 + r.month), 0);
        const inicio = Math.min(2026 * 12 + 3, ...pagados.map((r) => r.year * 12 + r.month));
        for (let n = inicio; n < ultimo; n++) {
          const year = Math.floor((n - 1) / 12);
          const month = n - year * 12;
          if (!isBillableMonth(month) || exentos.has(`${year}-${month}`)) continue;
          expect(ocupados.has(`${year}-${month}`), `falta ${year}-${month}`).toBe(true);
        }
      });

      it('a lo más queda un abono parcial, y después del último mes pagado', () => {
        const parciales = despues.filter((r) => r.status !== 'Pagado' && Number(r.amount ?? 0) > 0 && Number(r.amount) < CUOTA);
        expect(parciales.length).toBeLessThanOrEqual(1);
        const ultimoPagado = despues.filter((r) => r.status === 'Pagado').reduce((max, r) => Math.max(max, r.year * 12 + r.month), 0);
        for (const p of parciales) expect(p.year * 12 + p.month).toBeGreaterThan(ultimoPagado);
      });

      it('volver a calcular sobre el resultado no cambia nada', () => {
        expect(planHasChanges(planRebalance(despues, JUGADOR, INGRESO, CUOTA))).toBe(false);
      });
    });
  }
});

describe('applyRebalancePlan', () => {
  function supabaseFalso(error: Error | null = null) {
    const llamadas: { fn: string; args: Record<string, unknown> }[] = [];
    const cliente = {
      rpc: (fn: string, args: Record<string, unknown>) => { llamadas.push({ fn, args }); return Promise.resolve({ error }); },
    };
    return { cliente, llamadas };
  }

  const plan: RebalancePlan = {
    rows: [],
    deletes: ['d1'],
    updates: [
      { id: 'u-mover', changes: { month: 4, year: 2026, status: 'Pagado', amount: CUOTA } },
      { id: 'u-liberar', changes: { status: 'Pendiente', amount: 0 } },
    ],
    inserts: [{ player_id: JUGADOR, month: 5, year: 2026, status: 'Pagado', amount: CUOTA }],
  };

  it('manda todo en una sola llamada (una transacción), liberando meses antes de moverlos', async () => {
    const { cliente, llamadas } = supabaseFalso();
    await applyRebalancePlan(cliente, plan);
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].fn).toBe('aplicar_reacomodo');
    expect(llamadas[0].args.p_borrar).toEqual(['d1']);
    expect((llamadas[0].args.p_cambios as { id: string }[]).map((c) => c.id)).toEqual(['u-liberar', 'u-mover']);
    expect(llamadas[0].args.p_nuevos).toEqual([{ player_id: JUGADOR, month: 5, year: 2026, status: 'Pagado', amount: CUOTA, payment_method: null }]);
  });

  it('con un plan vacío no llama a la base', async () => {
    const { cliente, llamadas } = supabaseFalso();
    await applyRebalancePlan(cliente, { rows: [], deletes: [], updates: [], inserts: [] });
    expect(llamadas).toEqual([]);
  });

  it('si la base rechaza el reacomodo, avisa del error (y la base no deja nada a medias)', async () => {
    const { cliente } = supabaseFalso(new Error('falló'));
    await expect(applyRebalancePlan(cliente, plan)).rejects.toThrow('falló');
  });
});
