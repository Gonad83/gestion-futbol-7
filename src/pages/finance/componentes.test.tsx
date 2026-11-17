import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({ supabase: {}, withTimeout: (p: Promise<unknown>) => p }));

import type { FilaCuota, MorosoCaja, Movimiento } from '../../lib/api/finanzas';
import { clp } from '../../lib/formato';
import { EncabezadoCaja } from './EncabezadoCaja';
import { PestanaCuotas } from './PestanaCuotas';
import { PestanaGastos } from './PestanaGastos';
import { PestanaIngresos } from './PestanaIngresos';
import { PestanaMorosidad } from './PestanaMorosidad';
import { ResumenCaja } from './ResumenCaja';
import { ResumenMes } from './ResumenMes';
import { iniciales, pendientesDelMes } from './cuotasMes';

/**
 * Pruebas de humo: cada bloque de Caja se dibuja sin romperse, vacío y con
 * datos, como capitán y como jugador.
 */
const nada = () => {};
const fila = (id: string, extra: Partial<FilaCuota> = {}): FilaCuota => ({
  player_id: id, joined_at: '2026-03-15T12:00:00Z', name: `Jugador ${id}`, nickname: null, payment_id: null, amount: 0, status: 'Pendiente',
  isExempt: false, isAutoExempt: false, isManualExempt: false, notified_at: null, payment_method: null, ...extra,
});
const cuotas = [
  fila('a', { status: 'Pagado', amount: 5000, payment_id: 'p1', payment_method: 'Efectivo' }),
  fila('b', { amount: 2000, payment_id: 'p2' }),
  fila('c', { status: 'Exento', isExempt: true, isManualExempt: true, payment_id: 'p3' }),
  fila('d', { status: 'Exento', isExempt: true, isAutoExempt: true }),
  fila('e', { nickname: 'Tanque' }),
];
const morosos: MorosoCaja[] = [
  { id: 'b', name: 'Jugador b', nickname: null, pendingMonths: [{ year: 2026, month: 3 }, { year: 2026, month: 5 }], totalDebt: 10000 },
  { id: 'e', name: 'Jugador e', nickname: 'Tanque', pendingMonths: [{ year: 2026, month: 5 }], totalDebt: 5000 },
];
const movimientos: Movimiento[] = [{ id: 'm1', concept: 'Arriendo cancha', amount: 30000, date: '2026-05-02' }];
const formulario = { concept: '', amount: '', date: '2026-05-15' };

describe('bloques de Caja', () => {
  it('encabezado: exportar solo para el capitán', () => {
    expect(renderToString(<EncabezadoCaja isAdmin exportToPDF={nada} exportToCSV={nada} />)).toContain('Exportar la caja');
    expect(renderToString(<EncabezadoCaja isAdmin={false} exportToPDF={nada} exportToCSV={nada} />)).not.toContain('Exportar la caja');
  });

  it.each([['mes' as const], ['total' as const]])('resumen de la caja (cuotas por %s)', (quotaFilter) => {
    const html = renderToString(
      <ResumenCaja quotaFilter={quotaFilter} setQuotaFilter={nada} selectedMonth={5} totalExpenses={30000} balance={-1500} monthlyIncome={5000} allPaidAmount={45000} mesesRespaldo={1.4} />,
    );
    expect(html).toContain(clp(-1500));
    expect(html).toContain(clp(30000));
    expect(html).toContain(quotaFilter === 'mes' ? clp(5000) : clp(45000));
    expect(html).toContain('1,4');
  });

  it.each([[true], [false]])('mes, avance y valor de la cuota (capitán: %s)', (isAdmin) => {
    const base = { isAdmin, quotaAmount: 5000, selectedYear: 2026, prevMonth: nada, nextMonth: nada, setEditingQuota: nada, quotaInput: '5000', setQuotaInput: nada, handleSaveQuota: nada };
    const html = renderToString(<ResumenMes {...base} payments={cuotas} selectedMonth={5} editingQuota={false} />);
    expect(html).toContain('Mayo');
    expect(html).toContain('1 de 3 jugadores al día');
    expect(html.includes('Valor de la cuota')).toBe(isAdmin);
    expect(renderToString(<ResumenMes {...base} payments={cuotas} selectedMonth={1} editingQuota />)).toContain('Temporada libre');
    expect(renderToString(<ResumenMes {...base} payments={[]} selectedMonth={5} editingQuota={false} />)).toBeTruthy();
  });

  it('cuenta lo que falta por cobrar y arma iniciales', () => {
    // b abonó 2000 (le faltan 3000) y e no ha pagado (5000); a pagó y c, d están exentos.
    expect(pendientesDelMes(cuotas, 5000)).toEqual({ cantidad: 2, monto: 8000 });
    expect(iniciales('Matías Bravo Soto')).toBe('MB');
    expect(iniciales('  ')).toBe('?');
  });

  it.each([[true], [false]])('pestaña de cuotas (capitán: %s)', (isAdmin) => {
    for (const lista of [cuotas, []]) {
      const html = renderToString(
        <PestanaCuotas
          isAdmin={isAdmin} payments={[...lista]} filteredPayments={[...lista]} quotaAmount={5000}
          customAmounts={{ b: 1000 }} setCustomAmounts={nada} paymentMethods={{ b: 'Efectivo' }} setPaymentMethods={nada}
          search="" setSearch={nada} statusFilter="todos" setStatusFilter={nada} selectedMonth={5} selectedYear={2026}
          handleSetExempt={nada} handleUnsetExempt={nada} handleCancelPayment={nada} handlePaymentToggle={nada}
        />,
      );
      if (lista.length > 0) {
        expect(html).toContain('Tanque');
        expect(html).toContain('Abonó');
        expect(html.includes('Registrar pago de')).toBe(isAdmin); // botón «Cobrar» solo para el capitán
      } else {
        expect(html).toContain('Todavía no hay jugadores');
      }
    }
  });

  it('pestaña de morosidad con y sin deudores', () => {
    const props = { copiedAll: false, setCopiedAll: nada, copiedPlayer: null, setCopiedPlayer: nada, now: new Date(2026, 4, 15) };
    expect(renderToString(<PestanaMorosidad {...props} morosos={morosos} />)).toContain('Jugador b');
    expect(renderToString(<PestanaMorosidad {...props} morosos={[]} />)).toBeTruthy();
    expect(renderToString(<PestanaMorosidad {...props} morosos={morosos} copiedAll copiedPlayer="b" />)).toBeTruthy();
  });

  it.each([[true], [false]])('pestañas de ingresos y gastos (capitán: %s)', (isAdmin) => {
    for (const [lista, abierto] of [[movimientos, false], [movimientos, true], [[], false]] as const) {
      const ingresos = renderToString(
        <PestanaIngresos isAdmin={isAdmin} cashIncomes={[...lista]} totalCashIncomes={30000} showIncomeForm={abierto} setShowIncomeForm={nada}
          incomeData={formulario} setIncomeData={nada} handleAddIncome={nada} handleDeleteIncome={nada} />,
      );
      const gastos = renderToString(
        <PestanaGastos isAdmin={isAdmin} expenses={[...lista]} showExpenseForm={abierto} setShowExpenseForm={nada}
          expenseData={formulario} setExpenseData={nada} handleAddExpense={nada} handleDeleteExpense={nada} />,
      );
      if (lista.length > 0) {
        expect(ingresos).toContain('Arriendo cancha');
        expect(gastos).toContain('Arriendo cancha');
      }
    }
  });
});
