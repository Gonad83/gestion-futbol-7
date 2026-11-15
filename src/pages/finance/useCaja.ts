import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { aviso, confirmar } from '../../lib/avisos';
import { MONTHS, clp } from '../../lib/formato';
import { aCsv, csvDeCaja, htmlDeCaja, type PestanaCaja } from '../../lib/reportesCaja';
import {
  CUOTA_POR_DEFECTO,
  agregarMovimiento,
  cargarCaja,
  dejarPendiente,
  eliminarMovimiento,
  filtrarCuotas,
  guardarCuota,
  marcarExento,
  registrarPago,
  resumenDeCaja,
  type FilaCuota,
  type FiltroEstado,
  type MorosoCaja,
  type Movimiento,
} from '../../lib/api/finanzas';

const mensajeDe = (e: unknown) => (e as { message?: string } | null)?.message;

/**
 * Estado y acciones de Caja. La pantalla solo dibuja lo que este hook entrega;
 * las consultas y cuentas están en lib/api/finanzas.
 */
export function useCaja(teamId: number | null, isAdmin: boolean) {
  const [payments, setPayments] = useState<FilaCuota[]>([]);
  const [allPaidAmount, setAllPaidAmount] = useState(0);
  const [expenses, setExpenses] = useState<Movimiento[]>([]);
  const [cashIncomes, setCashIncomes] = useState<Movimiento[]>([]);
  const [quotaAmount, setQuotaAmount] = useState(CUOTA_POR_DEFECTO);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PestanaCaja>('cuotas');
  const [morosos, setMorosos] = useState<MorosoCaja[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedPlayer, setCopiedPlayer] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseData, setExpenseData] = useState({ concept: '', amount: '', date: today });
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [incomeData, setIncomeData] = useState({ concept: '', amount: '', date: today });
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});
  const [paymentMethods, setPaymentMethods] = useState<Record<string, string>>({});

  const [editingQuota, setEditingQuota] = useState(false);
  const [quotaInput, setQuotaInput] = useState('');
  const [settingsId, setSettingsId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FiltroEstado>('todos');
  const [quotaFilter, setQuotaFilter] = useState<'mes' | 'total'>('mes');

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const fetchData = useCallback(async () => {
    if (!teamId) return;
    try {
      setLoading(true);
      const datos = await cargarCaja(teamId, selectedMonth, selectedYear, isAdmin);
      setQuotaAmount(datos.quota);
      setSettingsId(datos.settingsId);
      setMorosos(datos.morosos);
      setPayments(datos.payments);
      setAllPaidAmount(datos.allPaidAmount);
      setExpenses(datos.expenses);
      setCashIncomes(datos.cashIncomes);
    } catch (e) {
      console.error('Error fetching finance data:', e);
    } finally {
      setLoading(false);
    }
  }, [teamId, selectedMonth, selectedYear, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resumen = resumenDeCaja({ payments, morosos, allPaidAmount, expenses, cashIncomes });
  const filteredPayments = filtrarCuotas(payments, search, statusFilter);

  const prevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
  };

  const handleSaveQuota = async () => {
    const val = parseFloat(quotaInput);
    if (isNaN(val) || val <= 0) return;
    const { error } = await guardarCuota(settingsId, val);
    if (error) { aviso.error('Error al guardar: ' + error.message); return; }
    setQuotaAmount(val);
    setEditingQuota(false);
  };

  const handleSetExempt = async (player: FilaCuota) => {
    if (!isAdmin) return;
    try {
      await marcarExento(player, selectedMonth, selectedYear);
      await fetchData();
    } catch (e) { aviso.error(`Error: ${mensajeDe(e)}`); }
  };

  const handleUnsetExempt = async (player: FilaCuota) => {
    if (!isAdmin) return;
    try {
      if (player.payment_id) await dejarPendiente(player.payment_id);
      await fetchData();
    } catch (e) { aviso.error(`Error: ${mensajeDe(e)}`); }
  };

  const handleCancelPayment = async (player: FilaCuota) => {
    if (!isAdmin) return;
    if (!(await confirmar(`¿Anular todos los pagos de ${player.name} para ${MONTHS[selectedMonth - 1]} ${selectedYear}?`))) return;
    try {
      if (player.payment_id) {
        const { error } = await dejarPendiente(player.payment_id);
        if (error) throw error;
      }
      await fetchData();
    } catch (e) { aviso.error(`Error: ${mensajeDe(e)}`); }
  };

  const handlePaymentToggle = async (player: FilaCuota) => {
    if (!isAdmin) return;

    const remainingDebtForCurrentMonth = Math.max(0, quotaAmount - Number(player.amount || 0));
    const amount = customAmounts[player.player_id] !== undefined ? customAmounts[player.player_id] : remainingDebtForCurrentMonth;
    const method = paymentMethods[player.player_id] || 'Transferencia';

    if (amount <= 0) return;

    const oldest = morosos.find((m) => m.id === player.player_id)?.pendingMonths?.[0];
    const oldestIsEarlier = !!oldest && (oldest.year < selectedYear || (oldest.year === selectedYear && oldest.month < selectedMonth));
    const confirmMessage = oldest && oldestIsEarlier
      ? `${player.name} debe meses anteriores. El pago de ${clp(amount)} se aplicará primero a ${MONTHS[oldest.month - 1]} ${oldest.year} y el saldo pasa a los meses siguientes. ¿Continuar?`
      : `¿Abonar o pagar ${clp(amount)} a nombre de ${player.name}? Se aplica primero al mes pendiente más antiguo y el saldo pasa a los meses siguientes.`;

    if ((oldestIsEarlier || amount !== remainingDebtForCurrentMonth) && !(await confirmar(confirmMessage))) return;

    try {
      await registrarPago(player, quotaAmount, amount, method);

      setCustomAmounts((prev) => { const next = { ...prev }; delete next[player.player_id]; return next; });
      setPaymentMethods((prev) => { const next = { ...prev }; delete next[player.player_id]; return next; });

      await fetchData();
    } catch (e) {
      aviso.error(`Error al registrar pago: ${mensajeDe(e) || e}`);
    }
  };

  const handleAddExpense = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const { error } = await agregarMovimiento('expenses', teamId, expenseData);
    if (error) { aviso.error('Error: ' + error.message); return; }
    setExpenseData({ concept: '', amount: '', date: today });
    setShowExpenseForm(false);
    await fetchData();
  };

  const handleAddIncome = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const { error } = await agregarMovimiento('cash_incomes', teamId, incomeData);
    if (error) { aviso.error('Error: ' + error.message); return; }
    setIncomeData({ concept: '', amount: '', date: today });
    setShowIncomeForm(false);
    await fetchData();
  };

  const handleDeleteIncome = async (id: string) => {
    if (!isAdmin || !teamId) return;
    if (!(await confirmar('¿Eliminar este ingreso?'))) return;
    const { error } = await eliminarMovimiento('cash_incomes', teamId, id);
    if (error) { aviso.error('Error: ' + error.message); return; }
    await fetchData();
  };

  const handleDeleteExpense = async (id: string) => {
    if (!isAdmin || !teamId) return;
    if (!(await confirmar('¿Eliminar este gasto?'))) return;
    const { error } = await eliminarMovimiento('expenses', teamId, id);
    if (error) { aviso.error('Error: ' + error.message); return; }
    await fetchData();
  };

  const datosReporte = () => ({
    pestana: activeTab, month: selectedMonth, year: selectedYear, payments, cashIncomes, expenses,
    totalCashIncomes: resumen.totalCashIncomes, totalExpenses: resumen.totalExpenses,
  });

  const exportToPDF = () => {
    const win = window.open('', '_blank');
    if (win) { win.document.write(htmlDeCaja(datosReporte())); win.document.close(); }
  };

  const exportToCSV = () => {
    const { nombre, filas } = csvDeCaja(datosReporte());
    // El primer carácter (BOM) hace que Excel lea bien los acentos.
    const blob = new Blob(['﻿' + aCsv(filas)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombre}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    ...resumen,
    payments, expenses, cashIncomes, allPaidAmount, quotaAmount, loading, morosos, filteredPayments,
    activeTab, setActiveTab, copiedAll, setCopiedAll, copiedPlayer, setCopiedPlayer,
    showExpenseForm, setShowExpenseForm, expenseData, setExpenseData,
    showIncomeForm, setShowIncomeForm, incomeData, setIncomeData,
    customAmounts, setCustomAmounts, paymentMethods, setPaymentMethods,
    editingQuota, setEditingQuota, quotaInput, setQuotaInput,
    search, setSearch, statusFilter, setStatusFilter, quotaFilter, setQuotaFilter,
    selectedMonth, selectedYear, prevMonth, nextMonth,
    handleSaveQuota, handleSetExempt, handleUnsetExempt, handleCancelPayment, handlePaymentToggle,
    handleAddExpense, handleAddIncome, handleDeleteIncome, handleDeleteExpense, exportToPDF, exportToCSV,
  };
}
