// Reacomodo de cuotas: los pagos de un jugador siempre cubren primero el mes
// pendiente más antiguo y el saldo se corre hacia los meses siguientes.
// Así nunca queda un mes "Pagado" con un mes anterior impago, y un pago
// adelantado no se pierde cuando empieza un mes nuevo.

export interface PaymentRow {
  id?: string;
  player_id: string;
  month: number;
  year: number;
  amount: number | string | null;
  status: string;
  payment_method?: string | null;
  notified_at?: string | null;
  created_at?: string | null;
}

export interface RebalancePlan {
  /** Filas como deberían quedar después del reacomodo (para mostrar). */
  rows: PaymentRow[];
  deletes: string[];
  updates: { id: string; changes: Partial<PaymentRow> }[];
  inserts: PaymentRow[];
}

const key = (y: number, m: number) => `${y}-${m}`;
const cmpYM = (a: { year: number; month: number }, b: { year: number; month: number }) =>
  a.year !== b.year ? a.year - b.year : a.month - b.month;

/** Enero y febrero no tienen cuota. */
export const isBillableMonth = (month: number) => month > 2;

/** Cuánto dinero aporta realmente la fila (n8n inserta "Pendiente" con amount = cuota como deuda). */
const partialAmount = (r: PaymentRow, quota: number) => {
  if (r.status !== 'Pendiente' && r.status !== 'Atrasado') return 0;
  const a = Number(r.amount ?? 0);
  return a > 0 && a < quota ? a : 0;
};

/**
 * Calcula cómo deben quedar los pagos de UN jugador.
 * @param rows        todas las filas de payments del jugador
 * @param joinDate    fecha de ingreso (players.created_at)
 * @param quota       cuota mensual actual
 * @param extraCredit dinero nuevo a abonar (pago que se está registrando)
 * @param method      medio de pago para filas nuevas
 */
export function planRebalance(
  rows: PaymentRow[],
  playerId: string,
  joinDate: string | null | undefined,
  quota: number,
  extraCredit = 0,
  method: string | null = null,
): RebalancePlan {
  const exentos = rows.filter(r => r.status === 'Exento');
  const exentoKeys = new Set(exentos.map(r => key(r.year, r.month)));
  const others = rows.filter(r => r.status !== 'Exento');

  const fullRows = others
    .filter(r => r.status === 'Pagado')
    .sort((a, b) => cmpYM(a, b) || String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')));
  const partialRows = others.filter(r => partialAmount(r, quota) > 0);

  // Créditos a ubicar: cada fila Pagado = un mes; los abonos se suman.
  type Credit = { status: 'Pagado' | 'Pendiente'; amount: number; payment_method: string | null };
  const credits: Credit[] = fullRows.map(r => ({
    status: 'Pagado',
    amount: Number(r.amount ?? 0),
    payment_method: r.payment_method ?? null,
  }));
  let partial = partialRows.reduce((s, r) => s + partialAmount(r, quota), 0) + Math.max(0, extraCredit);
  const partialMethod = method ?? partialRows[0]?.payment_method ?? null;
  if (quota > 0) {
    while (partial >= quota) {
      credits.push({ status: 'Pagado', amount: quota, payment_method: partialMethod });
      partial -= quota;
    }
  }
  if (partial > 0) credits.push({ status: 'Pendiente', amount: partial, payment_method: partialMethod });

  // Mes de inicio: ingreso del jugador, o el pago más antiguo si es anterior.
  const join = joinDate ? new Date(joinDate) : null;
  let start = join ? { year: join.getFullYear(), month: join.getMonth() + 1 } : null;
  for (const r of [...fullRows, ...partialRows]) {
    if (!start || cmpYM(r, start) < 0) start = { year: r.year, month: r.month };
  }

  // Asignar créditos a los meses cobrables en orden cronológico.
  const desired = new Map<string, { year: number; month: number } & Credit>();
  if (start && credits.length > 0) {
    let { year: y, month: m } = start;
    let i = 0;
    let guard = 0;
    while (i < credits.length && guard < 600) {
      if (isBillableMonth(m) && !exentoKeys.has(key(y, m))) {
        desired.set(key(y, m), { year: y, month: m, ...credits[i] });
        i++;
      }
      m++; if (m > 12) { m = 1; y++; }
      guard++;
    }
  }

  const deletes: string[] = [];
  const updates: { id: string; changes: Partial<PaymentRow> }[] = [];
  const inserts: PaymentRow[] = [];
  const finalRows: PaymentRow[] = [...exentos];

  // Filas que ya están en un mes de destino se reutilizan en su lugar.
  const used = new Set<PaymentRow>();
  const byKey = new Map<string, PaymentRow[]>();
  for (const r of others) {
    const k = key(r.year, r.month);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(r);
  }

  const pending: ({ year: number; month: number } & Credit)[] = [];
  for (const [k, d] of desired) {
    const atKey = byKey.get(k) ?? [];
    if (atKey.length === 0) { pending.push(d); continue; }
    // Preferir la fila Pagado del mismo mes, luego cualquiera. Un abono parcial
    // no puede reutilizar una fila Pagado (el trigger preserve_paid_payments lo bloquea).
    const keep = d.status === 'Pagado'
      ? (atKey.find(r => r.status === 'Pagado') ?? atKey[0])
      : atKey.find(r => r.status !== 'Pagado');
    if (!keep) {
      for (const r of atKey) { used.add(r); if (r.id) deletes.push(r.id); }
      pending.push(d);
      continue;
    }
    used.add(keep);
    for (const dup of atKey) if (dup !== keep) { used.add(dup); if (dup.id) deletes.push(dup.id); }
    const changes: Partial<PaymentRow> = {};
    if (keep.status !== d.status) changes.status = d.status;
    if (Number(keep.amount ?? 0) !== d.amount) changes.amount = d.amount;
    if (d.payment_method && keep.payment_method !== d.payment_method) changes.payment_method = d.payment_method;
    if (keep.id && Object.keys(changes).length > 0) updates.push({ id: keep.id, changes });
    finalRows.push({ ...keep, ...changes });
  }

  // Filas sobrantes con dinero se mueven a los meses de destino libres.
  const spare = others.filter(r => !used.has(r) && (r.status === 'Pagado' || partialAmount(r, quota) > 0));
  for (const d of pending) {
    const idx = d.status === 'Pagado' ? (spare.length > 0 ? 0 : -1) : spare.findIndex(r => r.status !== 'Pagado');
    const row = idx >= 0 ? spare.splice(idx, 1)[0] : undefined;
    if (row) {
      used.add(row);
      const changes: Partial<PaymentRow> = { month: d.month, year: d.year, status: d.status, amount: d.amount };
      if (d.payment_method) changes.payment_method = d.payment_method;
      if (row.id) updates.push({ id: row.id, changes });
      finalRows.push({ ...row, ...changes });
    } else {
      const ins: PaymentRow = {
        player_id: playerId, month: d.month, year: d.year,
        status: d.status, amount: d.amount, payment_method: d.payment_method ?? 'Transferencia',
      };
      inserts.push(ins);
      finalRows.push(ins);
    }
  }

  // Lo que sobró ya fue contado en otro mes: queda como pendiente sin monto.
  for (const r of others) {
    if (used.has(r)) continue;
    if (r.status === 'Pagado' || partialAmount(r, quota) > 0) {
      if (r.id) updates.push({ id: r.id, changes: { status: 'Pendiente', amount: 0 } });
      finalRows.push({ ...r, status: 'Pendiente', amount: 0 });
    } else {
      finalRows.push(r);
    }
  }

  return { rows: finalRows, deletes, updates, inserts };
}

export const planHasChanges = (p: RebalancePlan) =>
  p.deletes.length > 0 || p.updates.length > 0 || p.inserts.length > 0;

/** Aplica el plan en Supabase: primero borra duplicados, luego actualiza, luego inserta. */
export async function applyRebalancePlan(supabase: any, plan: RebalancePlan) {
  if (plan.deletes.length > 0) {
    const { error } = await supabase.from('payments').delete().in('id', plan.deletes);
    if (error) throw error;
  }
  // Los "liberados" (quedan en 0) van antes que los movimientos para no chocar de mes.
  const sorted = [...plan.updates].sort((a, b) =>
    (a.changes.month === undefined ? 0 : 1) - (b.changes.month === undefined ? 0 : 1));
  for (const u of sorted) {
    const { error } = await supabase.from('payments').update(u.changes).eq('id', u.id);
    if (error) throw error;
  }
  if (plan.inserts.length > 0) {
    const { error } = await supabase.from('payments').insert(plan.inserts);
    if (error) throw error;
  }
}
