/**
 * Datos de Caja.
 *
 * Lo que la pantalla de Caja le pide o le guarda a Supabase, separado de cómo
 * se dibuja. Las cuentas (cuotas del mes, morosidad, resumen) son funciones
 * puras para poder probarlas sin base de datos.
 */
import { supabase, withTimeout } from '../supabase';
import { applyRebalancePlan, planHasChanges, planRebalance, type PaymentRow } from '../paymentLedger';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface JugadorCaja {
  id: string;
  name: string;
  nickname: string | null;
  status: string;
  created_at: string | null;
}

/** Una fila de la tabla de cuotas: un jugador en el mes elegido. */
export interface FilaCuota {
  player_id: string;
  joined_at: string | null;
  name: string;
  nickname: string | null;
  payment_id: string | null;
  /** Dinero realmente recibido ese mes (no la deuda). */
  amount: number;
  status: string;
  isExempt: boolean;
  /** Exento porque el mes es anterior a su ingreso. */
  isAutoExempt: boolean;
  /** Exento porque el capitán lo marcó así. */
  isManualExempt: boolean;
  notified_at: string | null;
  payment_method: string | null;
}

export interface MesPendiente {
  year: number;
  month: number;
}

export interface MorosoCaja {
  id: string;
  name: string;
  nickname: string | null;
  pendingMonths: MesPendiente[];
  totalDebt: number;
}

/** Un ingreso o un gasto de la caja. */
export interface Movimiento {
  id: string;
  concept: string;
  amount: number;
  date: string;
  team_id?: number;
  created_at?: string;
}

export interface DatosCaja {
  quota: number;
  settingsId: number | null;
  payments: FilaCuota[];
  morosos: MorosoCaja[];
  allPaidAmount: number;
  expenses: Movimiento[];
  cashIncomes: Movimiento[];
}

export interface ResumenCaja {
  totalCashIncomes: number;
  totalExpenses: number;
  balance: number;
  avgMonthlyExp: number;
  mesesRespaldo: number;
  morososThisMonth: number;
  totalActivePlayers: number;
  tasaMora: number;
  monthlyIncome: number;
}

export type FiltroEstado = 'todos' | 'pagado' | 'pendiente';

/** Cuota que se asume si el equipo aún no configuró la suya. */
export const CUOTA_POR_DEFECTO = 8000;

// ── Cuentas (sin base de datos) ──────────────────────────────────────────────

/** Arma la tabla de cuotas del mes: una fila por jugador con su estado y lo que pagó. */
export function cuotasDelMes(
  jugadores: JugadorCaja[],
  historial: PaymentRow[],
  month: number,
  year: number,
  quota: number,
): FilaCuota[] {
  const delMes = historial.filter((h) => h.month === month && h.year === year);

  return jugadores.map((p) => {
    // Si hubiera más de una fila en el mes, manda la pagada y luego la de mayor monto.
    const suyos = delMes
      .filter((py) => py.player_id === p.id)
      .sort((a, b) => {
        if (a.status === 'Pagado' && b.status !== 'Pagado') return -1;
        if (b.status === 'Pagado' && a.status !== 'Pagado') return 1;
        return Number(b.amount) - Number(a.amount);
      });
    const payment = suyos[0];

    // Un mes anterior al ingreso del jugador no se cobra.
    const joinDate = p.created_at ? new Date(p.created_at) : null;
    const joinYear = joinDate?.getFullYear() ?? year;
    const joinMonth = joinDate ? joinDate.getMonth() + 1 : month;
    const isAutoExempt = year < joinYear || (year === joinYear && month < joinMonth);
    const isManualExempt = !isAutoExempt && payment?.status === 'Exento';
    const isExempt = isAutoExempt || isManualExempt;

    // n8n deja "Pendiente" con el monto de la cuota como deuda; aquí `amount`
    // siempre es lo recibido, así que esa deuda cuenta como 0.
    let recibido = Number(payment?.amount ?? 0);
    if ((payment?.status === 'Pendiente' || payment?.status === 'Atrasado') && recibido >= quota) recibido = 0;

    return {
      player_id: p.id,
      joined_at: p.created_at ?? null,
      name: p.name,
      nickname: p.nickname,
      payment_id: payment?.id ?? null,
      amount: recibido,
      status: isExempt ? 'Exento' : (payment?.status ?? 'Pendiente'),
      isExempt,
      isAutoExempt,
      isManualExempt,
      notified_at: payment?.notified_at ?? null,
      payment_method: payment?.payment_method ?? null,
    };
  });
}

/** Meses cobrables sin pagar de cada jugador desde su ingreso hasta `hoy`, del que más debe al que menos. */
export function morososDeCaja(jugadores: JugadorCaja[], historial: PaymentRow[], quota: number, hoy: Date = new Date()): MorosoCaja[] {
  const curMonth = hoy.getMonth() + 1;
  const curYear = hoy.getFullYear();

  return jugadores
    .map((p) => {
      const joinDate = p.created_at ? new Date(p.created_at) : null;
      const cubiertos = new Set(
        historial
          .filter((h) => h.player_id === p.id && (h.status === 'Pagado' || h.status === 'Exento'))
          .map((h) => `${h.year}-${h.month}`),
      );
      const pendingMonths: MesPendiente[] = [];
      let y = joinDate?.getFullYear() ?? curYear;
      let m = joinDate ? joinDate.getMonth() + 1 : curMonth;
      while (y < curYear || (y === curYear && m <= curMonth)) {
        if (m > 2 && !cubiertos.has(`${y}-${m}`)) pendingMonths.push({ year: y, month: m });
        m++;
        if (m > 12) { m = 1; y++; }
      }
      return { id: p.id, name: p.name, nickname: p.nickname, pendingMonths, totalDebt: pendingMonths.length * quota };
    })
    .filter((p) => p.pendingMonths.length > 0)
    .sort((a, b) => b.pendingMonths.length - a.pendingMonths.length);
}

const suma = (filas: { amount: number | string | null }[]) => filas.reduce((acc, f) => acc + Number(f.amount), 0);

/** Totales e indicadores que se muestran arriba de Caja. */
export function resumenDeCaja(
  datos: Pick<DatosCaja, 'payments' | 'morosos' | 'allPaidAmount' | 'expenses' | 'cashIncomes'>,
  hoy: Date = new Date(),
): ResumenCaja {
  const totalCashIncomes = suma(datos.cashIncomes);
  const totalExpenses = suma(datos.expenses);
  const balance = datos.allPaidAmount + totalCashIncomes - totalExpenses;

  // Gasto promedio de los meses que tuvieron gastos.
  const porMes: Record<string, number> = {};
  datos.expenses.forEach((e) => {
    if (!e.date) return;
    const mes = String(e.date).slice(0, 7);
    porMes[mes] = (porMes[mes] || 0) + Number(e.amount);
  });
  const montos = Object.values(porMes);
  const avgMonthlyExp = montos.length > 0 ? montos.reduce((a, b) => a + b, 0) / montos.length : 0;

  const curMonth = hoy.getMonth() + 1;
  const curYear = hoy.getFullYear();
  const morososThisMonth = datos.morosos.filter((p) => p.pendingMonths.some((m) => m.month === curMonth && m.year === curYear)).length;
  const totalActivePlayers = datos.payments.filter((p) => !p.isAutoExempt).length;

  return {
    totalCashIncomes,
    totalExpenses,
    balance,
    avgMonthlyExp,
    mesesRespaldo: avgMonthlyExp > 0 ? Math.round((balance / avgMonthlyExp) * 10) / 10 : 0,
    morososThisMonth,
    totalActivePlayers,
    tasaMora: totalActivePlayers > 0 ? Math.round((morososThisMonth / totalActivePlayers) * 100) : 0,
    monthlyIncome: suma(datos.payments.filter((p) => p.status === 'Pagado')),
  };
}

/** Filtra la tabla de cuotas por nombre o apodo y por estado. */
export function filtrarCuotas(filas: FilaCuota[], busqueda: string, estado: FiltroEstado): FilaCuota[] {
  return filas.filter((p) => {
    const coincideTexto = !busqueda.trim() || `${p.name} ${p.nickname ?? ''}`.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado =
      estado === 'todos' ||
      (estado === 'pagado' && p.status === 'Pagado') ||
      (estado === 'pendiente' && p.status !== 'Pagado' && p.status !== 'Exento');
    return coincideTexto && coincideEstado;
  });
}

// ── Lecturas ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function filas<T = any>(consulta: PromiseLike<{ data: any }>, ms = 10000): Promise<T[]> {
  const { data } = await withTimeout(Promise.resolve(consulta), ms);
  return (data as T[] | null) || [];
}

/** Evita que dos cargas seguidas reacomoden pagos al mismo tiempo. */
let reacomodando = false;

/**
 * Carga todo lo que muestra Caja para un mes.
 * Si quien mira es capitán y hay pagos fuera de orden, los reacomoda y guarda;
 * a los demás solo se les muestra ya reacomodado.
 */
export async function cargarCaja(teamId: number, month: number, year: number, isAdmin: boolean): Promise<DatosCaja> {
  // 1. Jugadores: los vigentes para la tabla y todos para el saldo.
  const [jugadores, todos] = await Promise.all([
    filas<JugadorCaja>(
      supabase.from('players').select('id, name, nickname, status, created_at').in('status', ['Activo', 'Lesionado']).eq('team_id', teamId),
    ),
    filas<{ id: string }>(supabase.from('players').select('id').eq('team_id', teamId)),
  ]);
  const playerIds = jugadores.map((p) => p.id);
  const allPlayerIds = todos.map((p) => p.id);

  // 2. El resto, siempre filtrado por el equipo.
  const [pagadosIniciales, expenses, cashIncomes, settingsRes, historialInicial] = await Promise.all([
    allPlayerIds.length === 0 ? [] : filas<{ amount: number }>(supabase.from('payments').select('amount').eq('status', 'Pagado').in('player_id', allPlayerIds)),
    filas<Movimiento>(supabase.from('expenses').select('*').eq('team_id', teamId).order('date', { ascending: false })),
    filas<Movimiento>(supabase.from('cash_incomes').select('*').eq('team_id', teamId).order('date', { ascending: false })),
    withTimeout(Promise.resolve(supabase.from('team_settings').select('id, quota_amount').eq('id', teamId).single()), 10000),
    playerIds.length === 0 ? [] : filas<PaymentRow>(supabase.from('payments').select('*').in('player_id', playerIds)),
  ]);
  let pagados = pagadosIniciales;
  let historial = historialInicial;
  const quota = Number(settingsRes.data?.quota_amount ?? CUOTA_POR_DEFECTO);

  // 3. Reacomodo: los pagos cubren siempre el mes pendiente más antiguo.
  const planes = jugadores.map((p) => planRebalance(historial.filter((h) => h.player_id === p.id), p.id, p.created_at, quota));
  const conCambios = planes.filter(planHasChanges);
  if (isAdmin && conCambios.length > 0 && !reacomodando) {
    reacomodando = true;
    try {
      for (const plan of conCambios) await applyRebalancePlan(supabase, plan);
      const [histRes, paidRes] = await Promise.all([
        supabase.from('payments').select('*').in('player_id', playerIds),
        supabase.from('payments').select('amount').eq('status', 'Pagado').in('player_id', allPlayerIds),
      ]);
      if (!histRes.error) historial = histRes.data || [];
      if (!paidRes.error) pagados = paidRes.data || [];
    } catch (err) {
      console.error('Error reacomodando pagos:', err);
      historial = planes.flatMap((p) => p.rows);
    } finally {
      reacomodando = false;
    }
  } else if (conCambios.length > 0) {
    historial = planes.flatMap((p) => p.rows);
  }

  return {
    quota,
    settingsId: settingsRes.data?.id ?? null,
    payments: cuotasDelMes(jugadores, historial, month, year, quota),
    morosos: morososDeCaja(jugadores, historial, quota),
    allPaidAmount: suma(pagados),
    expenses,
    cashIncomes,
  };
}

// ── Escrituras ───────────────────────────────────────────────────────────────

export function guardarCuota(settingsId: number | null, monto: number) {
  return settingsId
    ? supabase.from('team_settings').update({ quota_amount: monto, updated_at: new Date().toISOString() }).eq('id', settingsId)
    : supabase.from('team_settings').insert([{ quota_amount: monto }]);
}

/** Marca el mes de un jugador como exento (crea la fila si no existía). */
export function marcarExento(fila: FilaCuota, month: number, year: number) {
  return fila.payment_id
    ? supabase.from('payments').update({ status: 'Exento', amount: 0 }).eq('id', fila.payment_id)
    : supabase.from('payments').insert([{ player_id: fila.player_id, month, year, amount: 0, status: 'Exento' }]);
}

/** Deja una fila de pago como pendiente y sin monto (quitar exención o anular un pago). */
export function dejarPendiente(paymentId: string) {
  return supabase.from('payments').update({ status: 'Pendiente', amount: 0 }).eq('id', paymentId);
}

/** Registra un pago o abono: se aplica al mes pendiente más antiguo y el saldo pasa a los siguientes. */
export async function registrarPago(fila: FilaCuota, quota: number, monto: number, medio: string) {
  const { data: rows, error } = await supabase.from('payments').select('*').eq('player_id', fila.player_id);
  if (error) throw error;
  await applyRebalancePlan(supabase, planRebalance(rows || [], fila.player_id, fila.joined_at, quota, monto, medio));
}

type TablaMovimientos = 'expenses' | 'cash_incomes';

export function agregarMovimiento(tabla: TablaMovimientos, teamId: number | null, datos: { concept: string; amount: string; date: string }) {
  return supabase.from(tabla).insert([{ concept: datos.concept, amount: parseFloat(datos.amount), date: datos.date, team_id: teamId }]);
}

export function eliminarMovimiento(tabla: TablaMovimientos, teamId: number, id: string) {
  return supabase.from(tabla).delete().eq('id', id).eq('team_id', teamId);
}
