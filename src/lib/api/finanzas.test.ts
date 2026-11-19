import { describe, expect, it, vi } from 'vitest';

// Estas pruebas solo usan las cuentas; no se conectan a Supabase.
vi.mock('../supabase', () => ({ supabase: {}, withTimeout: (p: Promise<unknown>) => p }));

import type { PaymentRow } from '../paymentLedger';
import { aCsv, csvDeCaja, htmlDeCaja, type DatosReporte } from '../reportesCaja';
import { clp, escapeHtml } from '../formato';
import { cuotasDelMes, filtrarCuotas, morososDeCaja, resumenDeCaja, type FilaCuota, type JugadorCaja, type Movimiento } from './finanzas';

const CUOTA = 5000;
/** 15 de mayo de 2026. */
const HOY = new Date(2026, 4, 15);

const jugador = (id: string, ingreso = '2026-03-15T12:00:00Z', extra: Partial<JugadorCaja> = {}): JugadorCaja => ({
  id, name: `Jugador ${id}`, nickname: null, status: 'Activo', created_at: ingreso, ...extra,
});
const pago = (player_id: string, month: number, status: string, amount = CUOTA, extra: Partial<PaymentRow> = {}): PaymentRow => ({
  id: `${player_id}-${month}-${status}`, player_id, month, year: 2026, status, amount, ...extra,
});
const mov = (concept: string, amount: number, date: string): Movimiento => ({ id: concept, concept, amount, date });

describe('cuotasDelMes', () => {
  it('sin fila de pago, el jugador queda pendiente con 0 recibido', () => {
    const [f] = cuotasDelMes([jugador('a')], [], 5, 2026, CUOTA);
    expect(f).toMatchObject({ player_id: 'a', status: 'Pendiente', amount: 0, payment_id: null, isExempt: false });
  });

  it('muestra el pago del mes con su medio de pago', () => {
    const [f] = cuotasDelMes([jugador('a')], [pago('a', 5, 'Pagado', CUOTA, { payment_method: 'Efectivo' }), pago('a', 4, 'Pagado')], 5, 2026, CUOTA);
    expect(f).toMatchObject({ status: 'Pagado', amount: CUOTA, payment_method: 'Efectivo', payment_id: 'a-5-Pagado' });
  });

  it('una deuda anotada por n8n (pendiente con el monto de la cuota) cuenta como 0 recibido', () => {
    const [f] = cuotasDelMes([jugador('a')], [pago('a', 5, 'Pendiente', CUOTA)], 5, 2026, CUOTA);
    expect(f).toMatchObject({ status: 'Pendiente', amount: 0 });
  });

  it('un abono parcial se muestra con su monto', () => {
    const [f] = cuotasDelMes([jugador('a')], [pago('a', 5, 'Pendiente', 2000)], 5, 2026, CUOTA);
    expect(f).toMatchObject({ status: 'Pendiente', amount: 2000 });
  });

  it('si hay dos filas en el mes, manda la pagada', () => {
    const [f] = cuotasDelMes([jugador('a')], [pago('a', 5, 'Pendiente', 9000), pago('a', 5, 'Pagado', CUOTA)], 5, 2026, CUOTA);
    expect(f.status).toBe('Pagado');
  });

  it('un mes anterior al ingreso queda exento automáticamente', () => {
    const [f] = cuotasDelMes([jugador('a', '2026-06-15T12:00:00Z')], [], 5, 2026, CUOTA);
    expect(f).toMatchObject({ status: 'Exento', isExempt: true, isAutoExempt: true, isManualExempt: false });
  });

  it('distingue la exención marcada a mano', () => {
    const [f] = cuotasDelMes([jugador('a')], [pago('a', 5, 'Exento', 0)], 5, 2026, CUOTA);
    expect(f).toMatchObject({ status: 'Exento', isAutoExempt: false, isManualExempt: true });
  });

  it('no mezcla pagos de otros jugadores ni de otros meses', () => {
    const filas = cuotasDelMes([jugador('a'), jugador('b')], [pago('a', 5, 'Pagado'), pago('b', 4, 'Pagado')], 5, 2026, CUOTA);
    expect(filas.map((f) => f.status)).toEqual(['Pagado', 'Pendiente']);
  });
});

describe('morososDeCaja', () => {
  it('cuenta los meses cobrables sin pagar desde el ingreso hasta hoy', () => {
    const [m] = morososDeCaja([jugador('a')], [pago('a', 4, 'Pagado')], CUOTA, HOY);
    expect(m.pendingMonths).toEqual([{ year: 2026, month: 3 }, { year: 2026, month: 5 }]);
    expect(m.totalDebt).toBe(CUOTA * 2);
  });

  it('descuenta los abonos de los meses pendientes, pero no la deuda anotada ni abonos de meses futuros', () => {
    const historial = [
      pago('a', 3, 'Pendiente', 2000),   // abono a marzo
      pago('a', 4, 'Pendiente', CUOTA),  // deuda anotada, no es dinero recibido
      pago('a', 6, 'Pendiente', 1000),   // abono a un mes que aún no se cobra
    ];
    const [m] = morososDeCaja([jugador('a')], historial, CUOTA, HOY);
    expect(m.pendingMonths).toHaveLength(3);
    expect(m.abonado).toBe(2000);
    expect(m.totalDebt).toBe(CUOTA * 3 - 2000);
  });

  it('salta enero y febrero y los meses exentos', () => {
    const [m] = morososDeCaja([jugador('a', '2025-11-15T12:00:00Z')], [pago('a', 4, 'Exento', 0)], CUOTA, HOY);
    expect(m.pendingMonths.map((p) => `${p.year}-${p.month}`)).toEqual(['2025-11', '2025-12', '2026-3', '2026-5']);
  });

  it('quien está al día no aparece, y se ordena del que más debe al que menos', () => {
    const alDia = [3, 4, 5].map((mes) => pago('c', mes, 'Pagado'));
    const morosos = morososDeCaja([jugador('a', '2026-05-10T12:00:00Z'), jugador('b'), jugador('c')], alDia, CUOTA, HOY);
    expect(morosos.map((m) => [m.id, m.pendingMonths.length])).toEqual([['b', 3], ['a', 1]]);
  });
});

describe('resumenDeCaja', () => {
  const fila = (extra: Partial<FilaCuota>): FilaCuota => ({
    player_id: 'x', joined_at: null, name: 'X', nickname: null, payment_id: null, amount: 0, status: 'Pendiente',
    isExempt: false, isAutoExempt: false, isManualExempt: false, notified_at: null, payment_method: null, ...extra,
  });

  it('saldo = cuotas pagadas + ingresos − gastos', () => {
    const r = resumenDeCaja({ payments: [], morosos: [], allPaidAmount: 50000, cashIncomes: [mov('rifa', 20000, '2026-05-01')], expenses: [mov('cancha', 30000, '2026-05-02')] }, HOY);
    expect(r).toMatchObject({ totalCashIncomes: 20000, totalExpenses: 30000, balance: 40000 });
  });

  it('meses de respaldo según el gasto promedio de los meses con gastos', () => {
    const expenses = [mov('a', 10000, '2026-03-05'), mov('b', 10000, '2026-03-20'), mov('c', 40000, '2026-04-10')];
    const r = resumenDeCaja({ payments: [], morosos: [], allPaidAmount: 120000, cashIncomes: [], expenses }, HOY);
    expect(r.avgMonthlyExp).toBe(30000);
    expect(r.mesesRespaldo).toBe(2);
  });

  it('sin gastos no divide por cero', () => {
    const r = resumenDeCaja({ payments: [], morosos: [], allPaidAmount: 1000, cashIncomes: [], expenses: [] }, HOY);
    expect(r).toMatchObject({ avgMonthlyExp: 0, mesesRespaldo: 0, tasaMora: 0 });
  });

  it('tasa de morosidad: quienes deben el mes en curso sobre los que no están exentos por ingreso', () => {
    const payments = [fila({ player_id: 'a', status: 'Pagado', amount: CUOTA }), fila({ player_id: 'b' }), fila({ player_id: 'c' }), fila({ player_id: 'd', isAutoExempt: true })];
    const morosos = [
      { id: 'b', name: 'B', nickname: null, pendingMonths: [{ year: 2026, month: 5 }], abonado: 0, totalDebt: CUOTA },
      { id: 'c', name: 'C', nickname: null, pendingMonths: [{ year: 2026, month: 4 }], abonado: 0, totalDebt: CUOTA },
    ];
    const r = resumenDeCaja({ payments, morosos, allPaidAmount: 0, cashIncomes: [], expenses: [] }, HOY);
    expect(r).toMatchObject({ morososThisMonth: 1, totalActivePlayers: 3, tasaMora: 33, monthlyIncome: CUOTA });
  });
});

describe('filtrarCuotas', () => {
  const filas = cuotasDelMes(
    [jugador('a', undefined, { name: 'Ana Rojas' }), jugador('b', undefined, { name: 'Beto', nickname: 'Tanque' }), jugador('c', undefined, { name: 'Caro' })],
    [pago('a', 5, 'Pagado'), pago('c', 5, 'Exento', 0)], 5, 2026, CUOTA,
  );
  const ids = (f: FilaCuota[]) => f.map((x) => x.player_id);

  it('busca por nombre o apodo sin distinguir mayúsculas', () => {
    expect(ids(filtrarCuotas(filas, 'ana', 'todos'))).toEqual(['a']);
    expect(ids(filtrarCuotas(filas, 'TANQUE', 'todos'))).toEqual(['b']);
    expect(ids(filtrarCuotas(filas, '   ', 'todos'))).toEqual(['a', 'b', 'c']);
  });

  it('"pendiente" deja fuera a pagados y exentos', () => {
    expect(ids(filtrarCuotas(filas, '', 'pagado'))).toEqual(['a']);
    expect(ids(filtrarCuotas(filas, '', 'pendiente'))).toEqual(['b']);
  });
});

describe('reportes de Caja', () => {
  const base: DatosReporte = {
    pestana: 'cuotas', month: 5, year: 2026,
    payments: cuotasDelMes([jugador('a', undefined, { name: 'Ana "la 10"', nickname: '<b>Crack</b>' })], [pago('a', 5, 'Pagado')], 5, 2026, CUOTA),
    cashIncomes: [mov('Rifa <script>alert(1)</script>', 20000, '2026-05-01')],
    expenses: [mov('Cancha, mayo', 30000, '2026-05-02')],
    totalCashIncomes: 20000, totalExpenses: 30000,
  };

  it('el CSV escapa comillas y respeta las comas dentro de un texto', () => {
    expect(aCsv([['a "b"', 'c,d', null, 5]])).toBe('"a ""b""","c,d","","5"');
  });

  it('cada pestaña exporta su archivo', () => {
    expect(csvDeCaja(base)).toMatchObject({ nombre: 'cuotas-Mayo-2026', filas: [['Jugador', 'Estado', 'Monto Pagado', 'Mes', 'Año'], ['Ana "la 10"', 'Pagado', CUOTA, 'Mayo', 2026]] });
    expect(csvDeCaja({ ...base, pestana: 'ingresos' }).nombre).toBe('ingresos-caja');
    expect(csvDeCaja({ ...base, pestana: 'gastos' }).filas[1]).toEqual(['Cancha, mayo', 30000, '2026-05-02']);
  });

  it('el reporte para imprimir no deja pasar código escrito en nombres, apodos o conceptos', () => {
    const cuotas = htmlDeCaja(base);
    expect(cuotas).toContain('Control de Cuotas — Mayo 2026');
    expect(cuotas).toContain('&lt;b&gt;Crack&lt;/b&gt;');
    expect(cuotas).not.toContain('<b>Crack</b>');
    expect(cuotas).toContain('Ana &quot;la 10&quot;');

    const ingresos = htmlDeCaja({ ...base, pestana: 'ingresos' });
    expect(ingresos).not.toContain('<script>alert(1)</script>');
    expect(ingresos).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(ingresos).toContain(`+${clp(20000)}`);

    expect(htmlDeCaja({ ...base, pestana: 'gastos' })).toContain(`-${clp(30000)}`);
  });

  it('escapeHtml cubre los cinco caracteres peligrosos y valores vacíos', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
    expect(escapeHtml(null)).toBe('');
  });
});
