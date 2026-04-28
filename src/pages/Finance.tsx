import { useState, useEffect } from 'react';
import { supabase, withTimeout } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Calculator, TrendingUp, TrendingDown, DollarSign, Plus, ChevronLeft, ChevronRight, ArrowUpCircle, Pencil, Check, X, Search, Trash2 } from 'lucide-react';

const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function Finance() {
  const { isAdmin, teamId } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [allPaidAmount, setAllPaidAmount] = useState(0);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [cashIncomes, setCashIncomes] = useState<any[]>([]);
  const [quotaAmount, setQuotaAmount] = useState(8000);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cuotas' | 'ingresos' | 'gastos'>('cuotas');

  const today = new Date().toISOString().split('T')[0];
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseData, setExpenseData] = useState({ concept: '', amount: '', date: today });
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [incomeData, setIncomeData] = useState({ concept: '', amount: '', date: today });
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});

  const [editingQuota, setEditingQuota] = useState(false);
  const [quotaInput, setQuotaInput] = useState('');
  const [settingsId, setSettingsId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pagado' | 'pendiente'>('todos');

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  useEffect(() => { if (teamId) fetchData(); }, [selectedMonth, selectedYear, teamId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Phase 1: get team players first (need playerIds to filter payments)
      const { data: players } = (await withTimeout(
        supabase.from('players').select('id, name, nickname, status').eq('status', 'Activo').eq('team_id', teamId) as any,
        10000
      )) as any;
      const playerIds: string[] = (players || []).map((p: any) => p.id);
      const noPlayers = playerIds.length === 0;

      // Phase 2: everything else filtered by team
      const [payDataRes, allPaidRes, expDataRes, incomeDataRes, settingsDataRes] = await Promise.all([
        noPlayers
          ? Promise.resolve({ data: [] })
          : withTimeout(
              supabase.from('payments').select('*, player:players(name, nickname)')
                .eq('month', selectedMonth).eq('year', selectedYear).in('player_id', playerIds) as any,
              10000
            ),
        noPlayers
          ? Promise.resolve({ data: [] })
          : withTimeout(
              supabase.from('payments').select('amount').eq('status', 'Pagado').in('player_id', playerIds) as any,
              10000
            ),
        withTimeout(supabase.from('expenses').select('*').eq('team_id', teamId).order('date', { ascending: false }) as any, 10000),
        withTimeout(supabase.from('cash_incomes').select('*').eq('team_id', teamId).order('date', { ascending: false }) as any, 10000),
        withTimeout(supabase.from('team_settings').select('id, quota_amount').eq('id', teamId).single() as any, 10000),
      ]);
      const payData = (payDataRes as any).data || [];
      const allPaid = (allPaidRes as any).data || [];
      const expData = (expDataRes as any).data || [];
      const incomeData = (incomeDataRes as any).data || [];
      const settingsData = (settingsDataRes as any).data;

    const quota = Number(settingsData?.quota_amount ?? 8000);
    setQuotaAmount(quota);
    setSettingsId(settingsData?.id ?? null);

    let mergedPayments: any[] = [];
    if (players) {
      const safePayData = payData || [];
      mergedPayments = players.map((p: any) => {
        const playerPayments = safePayData.filter((py: any) => py.player_id === p.id);
        // Prioritize Pagado, else highest amount, else first
        playerPayments.sort((a: any, b: any) => {
          if (a.status === 'Pagado' && b.status !== 'Pagado') return -1;
          if (b.status === 'Pagado' && a.status !== 'Pagado') return 1;
          return Number(b.amount) - Number(a.amount);
        });
        
        const payment = playerPayments.length > 0 ? playerPayments[0] : undefined;
        
        // N8N Compatibility: n8n inserts Pendiente with amount=quotaAmount to represent the debt.
        // We want 'amount' to always represent the 'paid amount'.
        let actualPaidAmount = payment?.amount ?? 0;
        if ((payment?.status === 'Pendiente' || payment?.status === 'Atrasado') && actualPaidAmount >= quota) {
            actualPaidAmount = 0;
        }

        return {
          player_id: p.id,
          name: p.name,
          nickname: p.nickname,
          payment_id: payment?.id ?? null,
          amount: actualPaidAmount,
          status: payment?.status ?? 'Pendiente',
          notified_at: payment?.notified_at ?? null,
        };
      });
    }

    setPayments(mergedPayments);
    setAllPaidAmount(allPaid.reduce((acc: number, p: any) => acc + Number(p.amount), 0));
    setExpenses(expData);
    setCashIncomes(incomeData);
    } catch (e) {
      console.error('Error fetching finance data:', e);
    } finally {
      setLoading(false);
    }
  };

  const totalCashIncomes = cashIncomes.reduce((acc, i) => acc + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const balance = allPaidAmount + totalCashIncomes - totalExpenses;
  const monthlyIncome = payments.filter(p => p.status === 'Pagado').reduce((acc, p) => acc + Number(p.amount), 0);
  const filteredPayments = payments.filter(p => {
    const matchesSearch = !search.trim() || `${p.name} ${p.nickname ?? ''}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'todos'
      || (statusFilter === 'pagado' && p.status === 'Pagado')
      || (statusFilter === 'pendiente' && p.status !== 'Pagado');
    return matchesSearch && matchesStatus;
  });

  const prevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  const handleSaveQuota = async () => {
    const val = parseFloat(quotaInput);
    if (isNaN(val) || val <= 0) return;
    const { error } = settingsId
      ? await supabase.from('team_settings').update({ quota_amount: val, updated_at: new Date().toISOString() }).eq('id', settingsId)
      : await supabase.from('team_settings').insert([{ quota_amount: val }]);
    if (error) { alert('Error al guardar: ' + error.message); return; }
    setQuotaAmount(val);
    setEditingQuota(false);
  };

  const handleCancelPayment = async (player: any) => {
    if (!isAdmin) return;
    if (!confirm(`¿Anular todos los pagos de ${player.name} para ${MONTHS[selectedMonth-1]} ${selectedYear}?`)) return;
    try {
      if (player.payment_id) {
        const { error } = await supabase.from('payments').update({ status: 'Pendiente', amount: 0 }).eq('id', player.payment_id);
        if (error) throw error;
      }
      await fetchData();
    } catch (e: any) { alert(`Error: ${e?.message}`); }
  };

  const handlePaymentToggle = async (player: any) => {
    if (!isAdmin) return;

    const remainingDebtForCurrentMonth = Math.max(0, quotaAmount - Number(player.amount || 0));
    const amount = customAmounts[player.player_id] !== undefined ? customAmounts[player.player_id] : remainingDebtForCurrentMonth;
    
    if (amount <= 0) return;

    const confirmMessage = `¿Abonar o pagar ${clp(amount)} a nombre de ${player.name} a partir de ${MONTHS[selectedMonth-1]} ${selectedYear}?`;

    if (amount !== remainingDebtForCurrentMonth && !confirm(confirmMessage)) return;

    try {
      let remaining = amount;
      let offset = 0;
      
      while (remaining > 0) {
        const tYear = selectedYear + Math.floor((selectedMonth - 1 + offset) / 12);
        const tMonth = ((selectedMonth - 1 + offset) % 12) + 1;

        const { data: existingList } = await supabase
          .from('payments')
          .select('id, amount, status')
          .eq('player_id', player.player_id)
          .eq('month', tMonth)
          .eq('year', tYear);

        let existing: any = null;
        if (existingList && existingList.length > 0) {
          // Prioritize Pagado
          existing = existingList.find(r => r.status === 'Pagado');
          if (!existing) {
             existing = existingList[0];
          }
          // Clean up duplicates immediately
          if (existingList.length > 1) {
             const idsToDelete = existingList.filter(r => r.id !== existing.id).map(r => r.id);
             await supabase.from('payments').delete().in('id', idsToDelete);
          }
        }

        if (existing?.status === 'Pagado') {
          offset++;
          continue;
        }

        let currentlyPaid = existing ? Number(existing.amount) : 0;
        // Normalization for n8n compatibility inside the loop
        if ((existing?.status === 'Pendiente' || existing?.status === 'Atrasado') && currentlyPaid >= quotaAmount) {
          currentlyPaid = 0;
        }

        const owesForThisMonth = quotaAmount - currentlyPaid;
        
        const paymentForThisMonth = Math.min(remaining, owesForThisMonth);
        const newTotalPaid = currentlyPaid + paymentForThisMonth;
        const newStatus = newTotalPaid >= quotaAmount ? 'Pagado' : 'Pendiente';

        if (existing?.id) {
          const { error } = await supabase.from('payments')
            .update({ status: newStatus, amount: newTotalPaid })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('payments')
            .insert([{
              player_id: player.player_id,
              amount: newTotalPaid,
              month: tMonth,
              year: tYear,
              status: newStatus
            }]);
          if (error) throw error;
        }

        remaining -= paymentForThisMonth;
        offset++;
        
        if (offset > 24) break; 
      }
      
      setCustomAmounts(prev => {
        const next = { ...prev };
        delete next[player.player_id];
        return next;
      });

      await fetchData();
    } catch (e: any) {
      alert(`Error al registrar pago: ${e?.message || e}`);
    }
  };

  const handleAddExpense = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const { error } = await supabase.from('expenses').insert([{
      concept: expenseData.concept,
      amount: parseFloat(expenseData.amount),
      date: expenseData.date,
      team_id: teamId
    }]);
    if (error) { alert('Error: ' + error.message); return; }
    setExpenseData({ concept: '', amount: '', date: today });
    setShowExpenseForm(false);
    await fetchData();
  };

  const handleDeleteIncome = async (id: string) => {
    if (!confirm('¿Eliminar este ingreso?')) return;
    const { error } = await supabase.from('cash_incomes').delete().eq('id', id);
    if (error) { alert('Error: ' + error.message); return; }
    await fetchData();
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { alert('Error: ' + error.message); return; }
    await fetchData();
  };

  const handleAddIncome = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const { error } = await supabase.from('cash_incomes').insert([{
      concept: incomeData.concept,
      amount: parseFloat(incomeData.amount),
      date: incomeData.date,
      team_id: teamId
    }]);
    if (error) { alert('Error: ' + error.message); return; }
    setIncomeData({ concept: '', amount: '', date: today });
    setShowIncomeForm(false);
    await fetchData();
  };

  // Removed getMonthsForAmount

  return (
    <div className="fade-in pb-20 md:pb-0">
      <div className="flex justify-between items-end mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-soccer-green/70 mb-1">Finanzas</p>
          <h1 className="font-headline text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9' }}>
              <Calculator size={18} />
            </div>
            Caja
          </h1>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="glass-card p-8 border-l-4 border-l-soccer-green group hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-soccer-green/5 rounded-full blur-3xl -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-slate-500 font-black tracking-[0.15em] text-[10px] uppercase">Caja Actual</h3>
            <div className="bg-soccer-green/10 p-2 rounded-xl border border-soccer-green/20 group-hover:bg-soccer-green/20 transition-colors">
              <DollarSign className="text-soccer-green" size={24} />
            </div>
          </div>
          <p className={`text-4xl font-black tracking-tighter relative z-10 transition-colors ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>
            {clp(balance)}
          </p>
          <p className="text-[10px] text-slate-500 mt-2 relative z-10">Cuotas pagadas + ingresos − gastos</p>
          <div className="mt-3 h-1 w-12 bg-soccer-green/30 rounded-full"></div>
        </div>

        <div className="glass-card p-8 border-l-4 border-l-emerald-500 group hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-3xl -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-slate-500 font-black tracking-[0.15em] text-[10px] uppercase">Cuotas — {MONTHS[selectedMonth - 1]}</h3>
            <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
              <TrendingUp className="text-emerald-500" size={24} />
            </div>
          </div>
          <p className="text-4xl font-black tracking-tighter text-white relative z-10">{clp(monthlyIncome)}</p>
          <p className="text-[10px] text-slate-500 mt-2 relative z-10">
            {selectedMonth <= 2 ? 'Mes sin cobros asignados' : `${payments.filter(p => p.status === 'Pagado').length}/${payments.length} jugadores al día`}
          </p>
          <div className="mt-3 h-1 w-12 bg-emerald-500/30 rounded-full"></div>
        </div>

        <div className="glass-card p-8 border-l-4 border-l-red-500 group hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-3xl -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-slate-500 font-black tracking-[0.15em] text-[10px] uppercase">Gastos (Historial)</h3>
            <div className="bg-red-500/10 p-2 rounded-xl border border-red-500/20 group-hover:bg-red-500/20 transition-colors">
              <TrendingDown className="text-red-500" size={24} />
            </div>
          </div>
          <p className="text-4xl font-black tracking-tighter text-white relative z-10">{clp(totalExpenses)}</p>
          <div className="mt-4 h-1 w-12 bg-red-500/30 rounded-full"></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card overflow-hidden p-0">
        <div className="flex border-b border-glass-border">
          {(['cuotas', 'ingresos', 'gastos'] as const).map(tab => (
            <button
              key={tab}
              className={`flex-1 md:flex-none px-6 py-4 font-semibold text-sm transition-all ${activeTab === tab ? 'bg-soccer-green/10 text-soccer-green border-b-2 border-soccer-green' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'cuotas' ? 'Control de Cuotas' : tab === 'ingresos' ? 'Ingresos de Caja' : 'Registro de Gastos'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-soccer-green"></div>
            </div>
          ) : (
            <>
              {/* ── CUOTAS TAB ── */}
              {activeTab === 'cuotas' && (
                <div className="fade-in">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    {/* Month Navigator */}
                    <div className="flex items-center gap-3">
                      <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-slate-700/40 border border-glass-border text-slate-300 hover:bg-white/10 flex items-center justify-center transition-colors">
                        <ChevronLeft size={16} />
                      </button>
                      <div>
                        <h3 className="text-lg font-bold text-white capitalize">{MONTHS[selectedMonth - 1]} {selectedYear}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <span className="w-2 h-2 bg-soccer-green rounded-full animate-pulse"></span>
                          Los cobros se generan el día 1 de cada mes.
                        </p>
                      </div>
                      <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-slate-700/40 border border-glass-border text-slate-300 hover:bg-white/10 flex items-center justify-center transition-colors">
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Search */}
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Buscar jugador..."
                          className="pl-8 pr-3 py-2 bg-black/40 border border-glass-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-soccer-green/50 w-48"
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                        />
                      </div>
                      {/* Status filter */}
                      <div className="flex rounded-xl overflow-hidden border border-glass-border text-xs font-bold">
                        {(['todos', 'pagado', 'pendiente'] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={`px-3 py-2 transition-colors capitalize ${
                              statusFilter === f
                                ? f === 'pagado'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : f === 'pendiente'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-soccer-green/20 text-soccer-green'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {f === 'todos' ? 'Todos' : f === 'pagado' ? 'Pagado' : 'Pendiente'}
                          </button>
                        ))}
                      </div>
                      {/* Quota setting */}
                      {isAdmin && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-black/40 rounded-xl border border-glass-border">
                          <span className="text-xs text-slate-400 font-semibold">Cuota:</span>
                          {editingQuota ? (
                            <>
                              <input
                                type="number"
                                className="w-24 bg-slate-800 border border-soccer-green/50 rounded px-2 py-0.5 text-white text-sm focus:outline-none"
                                value={quotaInput}
                                onChange={e => setQuotaInput(e.target.value)}
                                autoFocus
                              />
                              <button onClick={handleSaveQuota} className="text-soccer-green hover:text-emerald-400 transition-colors"><Check size={14} /></button>
                              <button onClick={() => setEditingQuota(false)} className="text-slate-400 hover:text-red-400 transition-colors"><X size={14} /></button>
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-bold text-white">{clp(quotaAmount)}</span>
                              <button
                                onClick={() => { setQuotaInput(String(quotaAmount)); setEditingQuota(true); }}
                                className="text-slate-400 hover:text-soccer-green transition-colors"
                              >
                                <Pencil size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      <div className="text-sm px-4 py-2 bg-black/40 rounded-full border border-glass-border flex gap-4">
                        {selectedMonth <= 2 ? (
                          <span className="text-slate-400 font-bold italic">Temporada libre de cuotas</span>
                        ) : (
                          <>
                            <span><span className="text-emerald-400 font-bold">{payments.filter(p => p.status === 'Pagado').length}</span> al día</span>
                            <span className="w-px h-5 bg-glass-border"></span>
                            <span><span className="text-red-400 font-bold">{payments.filter(p => p.status !== 'Pagado').length}</span> pendientes</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-glass-border">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-black/40 text-xs uppercase font-semibold text-slate-400 border-b border-glass-border">
                        <tr>
                          <th className="px-5 py-4">Jugador</th>
                          <th className="px-5 py-4 text-center">Estado</th>
                          <th className="px-5 py-4 text-center">Notificado</th>
                          <th className="px-5 py-4 text-right">Monto</th>
                          {isAdmin && <th className="px-5 py-4 text-right">Acción</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-glass-border bg-black/20">
                        {filteredPayments.map(p => {
                          return (
                            <tr key={p.player_id} className="hover:bg-white/5 transition-colors">
                              <td className="px-5 py-4 font-medium text-white">
                                {p.name} {p.nickname && <span className="text-slate-500 font-normal">"{p.nickname}"</span>}
                              </td>
                              <td className="px-5 py-4 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                  selectedMonth <= 2
                                    ? 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                    : p.status === 'Pagado'
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : p.amount > 0
                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}>
                                  {selectedMonth <= 2 ? 'Sin Cuota' : (p.status === 'Pendiente' && p.amount > 0 ? 'Abonado' : p.status)}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-center">
                                {p.notified_at ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-emerald-400">✅ Enviado</span>
                                    <span className="text-[10px] text-slate-500">{new Date(p.notified_at).toLocaleDateString()}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-500 italic text-xs">No enviado</span>
                                )}
                              </td>
                              <td className="px-5 py-4 text-right font-medium">
                                {isAdmin && p.status !== 'Pagado' ? (
                                  <div className="flex flex-col items-end gap-1">
                                    <input
                                      type="number"
                                      className="w-28 bg-slate-800 border border-glass-border rounded-lg px-2 py-1 text-right text-white text-sm focus:outline-none focus:border-soccer-green"
                                      value={customAmounts[p.player_id] !== undefined ? customAmounts[p.player_id] : (quotaAmount - p.amount)}
                                      onChange={e => setCustomAmounts(prev => ({ ...prev, [p.player_id]: Number(e.target.value) }))}
                                    />
                                    {p.amount > 0 && (
                                      <span className="text-[10px] text-blue-400 font-semibold">
                                        Abonado: {clp(p.amount)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span>{clp(p.amount)}</span>
                                )}
                              </td>
                              {isAdmin && (
                                <td className="px-5 py-4 text-right">
                                  <div className="flex justify-end items-center gap-2">
                                    {p.amount > 0 && (
                                      <button
                                        onClick={() => handleCancelPayment(p)}
                                        className="text-[10px] font-bold px-2 py-1.5 rounded transition-colors border border-red-500/30 text-red-500 hover:bg-red-500/10"
                                        title="Anular pago"
                                      >
                                        Anular
                                      </button>
                                    )}
                                    {p.status !== 'Pagado' && selectedMonth > 2 && (
                                        <button
                                          onClick={() => handlePaymentToggle(p)}
                                          className="text-xs font-bold px-3 py-1.5 rounded-lg border border-soccer-green/50 text-soccer-green hover:bg-soccer-green/10 bg-soccer-green/5 transition-all whitespace-nowrap"
                                        >
                                          Abonar / Pagar
                                        </button>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── INGRESOS TAB ── */}
              {activeTab === 'ingresos' && (
                <div className="fade-in">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">Ingresos de Caja</h3>
                      <p className="text-xs text-slate-400 mt-1">Saldo inicial, transferencias, ventas, etc.</p>
                    </div>
                    {isAdmin && (
                      <button onClick={() => setShowIncomeForm(!showIncomeForm)} className="btn-primary py-2 px-4 flex items-center gap-2 text-sm">
                        <Plus size={16} /> Nuevo Ingreso
                      </button>
                    )}
                  </div>

                  {showIncomeForm && isAdmin && (
                    <form onSubmit={handleAddIncome} className="mb-8 bg-slate-800/40 p-5 rounded-xl border border-glass-border flex flex-col md:flex-row gap-4 items-end fade-in relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-soccer-green"></div>
                      <div className="flex-1 w-full">
                        <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Concepto</label>
                        <input type="text" required className="input-field bg-slate-900/80" placeholder="Ej. Saldo año 2025, Venta camisetas..." value={incomeData.concept} onChange={e => setIncomeData({ ...incomeData, concept: e.target.value })} />
                      </div>
                      <div className="w-full md:w-36">
                        <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Monto ($)</label>
                        <input type="number" step="1" required className="input-field bg-slate-900/80" placeholder="0" value={incomeData.amount} onChange={e => setIncomeData({ ...incomeData, amount: e.target.value })} />
                      </div>
                      <div className="w-full md:w-40">
                        <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Fecha</label>
                        <input type="date" required className="input-field [color-scheme:dark] bg-slate-900/80" value={incomeData.date} onChange={e => setIncomeData({ ...incomeData, date: e.target.value })} />
                      </div>
                      <button type="submit" className="btn-primary whitespace-nowrap w-full md:w-auto h-[42px]">Registrar</button>
                    </form>
                  )}

                  <div className="space-y-3">
                    {cashIncomes.length === 0 ? (
                      <div className="text-center p-12 bg-black/20 rounded-xl border border-glass-border border-dashed">
                        <ArrowUpCircle size={32} className="mx-auto text-slate-600 mb-3" />
                        <p className="text-slate-400">No hay ingresos registrados.</p>
                        {isAdmin && <p className="text-slate-500 text-sm mt-1">Agrega el saldo del año anterior u otros ingresos.</p>}
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center p-3 bg-soccer-green/5 rounded-xl border border-soccer-green/20 mb-4">
                          <span className="text-sm font-bold text-slate-300">Total ingresos manuales</span>
                          <span className="text-soccer-green font-black text-lg">{clp(totalCashIncomes)}</span>
                        </div>
                        {cashIncomes.map(income => (
                          <div key={income.id} className="flex justify-between items-center p-4 bg-black/30 rounded-xl border border-glass-border hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-soccer-green/10 border border-soccer-green/20 flex items-center justify-center text-soccer-green">
                                <ArrowUpCircle size={24} />
                              </div>
                              <div>
                                <p className="font-bold text-white text-lg">{income.concept}</p>
                                <p className="text-xs text-slate-400">{new Date(new Date(income.date).getTime() + new Date().getTimezoneOffset() * 60000).toLocaleDateString('es-CL')}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <p className="font-bold text-soccer-green text-xl tracking-tight">+{clp(income.amount)}</p>
                              {isAdmin && (
                                <button onClick={() => handleDeleteIncome(income.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1" title="Eliminar">
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── GASTOS TAB ── */}
              {activeTab === 'gastos' && (
                <div className="fade-in">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white">Historial de Gastos</h3>
                    {isAdmin && (
                      <button onClick={() => setShowExpenseForm(!showExpenseForm)} className="btn-primary py-2 px-4 flex items-center gap-2 text-sm">
                        <Plus size={16} /> Nuevo Gasto
                      </button>
                    )}
                  </div>

                  {showExpenseForm && isAdmin && (
                    <form onSubmit={handleAddExpense} className="mb-8 bg-slate-800/40 p-5 rounded-xl border border-glass-border flex flex-col md:flex-row gap-4 items-end fade-in relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-soccer-green"></div>
                      <div className="flex-1 w-full">
                        <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Concepto</label>
                        <input type="text" required className="input-field bg-slate-900/80" placeholder="Ej. Alquiler de Cancha" value={expenseData.concept} onChange={e => setExpenseData({ ...expenseData, concept: e.target.value })} />
                      </div>
                      <div className="w-full md:w-32">
                        <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Monto ($)</label>
                        <input type="number" step="0.01" required className="input-field bg-slate-900/80" placeholder="0.00" value={expenseData.amount} onChange={e => setExpenseData({ ...expenseData, amount: e.target.value })} />
                      </div>
                      <div className="w-full md:w-40">
                        <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">Fecha</label>
                        <input type="date" required className="input-field [color-scheme:dark] bg-slate-900/80" value={expenseData.date} onChange={e => setExpenseData({ ...expenseData, date: e.target.value })} />
                      </div>
                      <button type="submit" className="btn-primary whitespace-nowrap w-full md:w-auto h-[42px]">Registrar</button>
                    </form>
                  )}

                  <div className="space-y-3">
                    {expenses.length === 0 ? (
                      <div className="text-center p-12 bg-black/20 rounded-xl border border-glass-border border-dashed">
                        <TrendingDown size={32} className="mx-auto text-slate-600 mb-3" />
                        <p className="text-slate-400">No hay gastos registrados.</p>
                      </div>
                    ) : (
                      expenses.map(exp => (
                        <div key={exp.id} className="flex justify-between items-center p-4 bg-black/30 rounded-xl border border-glass-border hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                              <TrendingDown size={24} />
                            </div>
                            <div>
                              <p className="font-bold text-white text-lg">{exp.concept}</p>
                              <p className="text-xs text-slate-400">{new Date(new Date(exp.date).getTime() + new Date().getTimezoneOffset() * 60000).toLocaleDateString('es-CL')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="font-bold text-red-400 text-xl tracking-tight">-{clp(exp.amount)}</p>
                            {isAdmin && (
                              <button onClick={() => handleDeleteExpense(exp.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1" title="Eliminar">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
