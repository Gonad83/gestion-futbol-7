import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({ supabase: {}, withTimeout: (p: Promise<unknown>) => p }));

import type { FilaCuota, MorosoCaja, Movimiento } from '../../lib/api/finanzas';
import { clp } from '../../lib/formato';
import { EncabezadoCaja } from './EncabezadoCaja';
import { IndicadoresCaja } from './IndicadoresCaja';
import { PestanaCuotas } from './PestanaCuotas';
import { PestanaGastos } from './PestanaGastos';
import { PestanaIngresos } from './PestanaIngresos';
import { PestanaMorosidad } from './PestanaMorosidad';
import { TarjetasResumen } from './TarjetasResumen';

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
    expect(renderToString(<EncabezadoCaja isAdmin exportToPDF={nada} exportToCSV={nada} />)).toContain('Exportar como PDF');
    expect(renderToString(<EncabezadoCaja isAdmin={false} exportToPDF={nada} exportToCSV={nada} />)).not.toContain('Exportar como PDF');
  });

  it.each([['mes' as const], ['total' as const]])('tarjetas de resumen (cuotas por %s) e indicadores', (quotaFilter) => {
    const html = renderToString(
      <TarjetasResumen payments={cuotas} quotaFilter={quotaFilter} setQuotaFilter={nada} selectedMonth={5} totalExpenses={30000} balance={-1500} monthlyIncome={5000} allPaidAmount={45000} />,
    );
    expect(html).toContain(clp(-1500));
    expect(renderToString(<IndicadoresCaja balance={120000} mesesRespaldo={2} tasaMora={33} />)).toContain('33');
    expect(renderToString(<IndicadoresCaja balance={0} mesesRespaldo={0} tasaMora={0} />)).toBeTruthy();
  });

  it.each([[true], [false]])('pestaña de cuotas (capitán: %s)', (isAdmin) => {
    for (const [lista, editingQuota] of [[cuotas, false], [cuotas, true], [[], false]] as const) {
      const html = renderToString(
        <PestanaCuotas
          isAdmin={isAdmin} payments={[...lista]} filteredPayments={[...lista]} quotaAmount={5000}
          customAmounts={{ b: 1000 }} setCustomAmounts={nada} paymentMethods={{ b: 'Efectivo' }} setPaymentMethods={nada}
          editingQuota={editingQuota} setEditingQuota={nada} quotaInput="5000" setQuotaInput={nada}
          search="" setSearch={nada} statusFilter="todos" setStatusFilter={nada} selectedMonth={5} selectedYear={2026}
          prevMonth={nada} nextMonth={nada} handleSaveQuota={nada} handleSetExempt={nada} handleUnsetExempt={nada}
          handleCancelPayment={nada} handlePaymentToggle={nada}
        />,
      );
      expect(html).toContain('Mayo');
      if (lista.length > 0) expect(html).toContain('Tanque');
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
