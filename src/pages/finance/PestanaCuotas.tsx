import type { Dispatch, SetStateAction } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Check, X, Search } from 'lucide-react';
import type { FilaCuota, FiltroEstado } from '../../lib/api/finanzas';
import { MONTHS, clp } from '../../lib/formato';

interface Props {
  isAdmin: boolean;
  payments: FilaCuota[];
  quotaAmount: number;
  customAmounts: Record<string, number>;
  setCustomAmounts: Dispatch<SetStateAction<Record<string, number>>>;
  paymentMethods: Record<string, string>;
  setPaymentMethods: Dispatch<SetStateAction<Record<string, string>>>;
  editingQuota: boolean;
  setEditingQuota: Dispatch<SetStateAction<boolean>>;
  quotaInput: string;
  setQuotaInput: Dispatch<SetStateAction<string>>;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  statusFilter: FiltroEstado;
  setStatusFilter: Dispatch<SetStateAction<FiltroEstado>>;
  selectedMonth: number;
  selectedYear: number;
  filteredPayments: FilaCuota[];
  prevMonth: () => void;
  nextMonth: () => void;
  handleSaveQuota: () => void;
  handleSetExempt: (fila: FilaCuota) => void;
  handleUnsetExempt: (fila: FilaCuota) => void;
  handleCancelPayment: (fila: FilaCuota) => void;
  handlePaymentToggle: (fila: FilaCuota) => void;
}

export function PestanaCuotas({ isAdmin, payments, quotaAmount, customAmounts, setCustomAmounts, paymentMethods, setPaymentMethods, editingQuota, setEditingQuota, quotaInput, setQuotaInput, search, setSearch, statusFilter, setStatusFilter, selectedMonth, selectedYear, filteredPayments, prevMonth, nextMonth, handleSaveQuota, handleSetExempt, handleUnsetExempt, handleCancelPayment, handlePaymentToggle }: Props) {
  return (
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
                <span><span className="text-red-400 font-bold">{payments.filter(p => p.status !== 'Pagado' && p.status !== 'Exento').length}</span> pendientes</span>
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
                      p.isExempt
                        ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        : selectedMonth <= 2
                          ? 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                          : p.status === 'Pagado'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : p.amount > 0
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {p.isExempt ? 'No aplica' : selectedMonth <= 2 ? 'Sin Cuota' : (p.status === 'Pendiente' && p.amount > 0 ? 'Abonado' : p.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {p.isExempt ? (
                      <span className="text-slate-400 text-xs italic">—</span>
                    ) : p.notified_at ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-emerald-400">✅ Enviado</span>
                        <span className="text-[11px] text-slate-400">{new Date(p.notified_at).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-xs">No enviado</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {p.isExempt ? (
                      <span className="text-slate-600">—</span>
                    ) : isAdmin && p.status !== 'Pagado' ? (
                      <div className="flex flex-col items-end gap-1">
                        <input
                          type="number"
                          className="w-28 bg-slate-800 border border-glass-border rounded-lg px-2 py-1 text-right text-white text-sm focus:outline-none focus:border-soccer-green"
                          value={customAmounts[p.player_id] !== undefined ? customAmounts[p.player_id] : (quotaAmount - p.amount)}
                          onChange={e => setCustomAmounts(prev => ({ ...prev, [p.player_id]: Number(e.target.value) }))}
                        />
                        {p.amount > 0 && (
                          <span className="text-[11px] text-blue-400 font-semibold">
                            Abonado: {clp(p.amount)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <span>{clp(p.amount)}</span>
                        {p.status === 'Pagado' && p.payment_method && (
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{
                            background: p.payment_method === 'Efectivo' ? 'rgba(68,243,169,0.1)' : p.payment_method === 'Flow' ? 'rgba(154,203,255,0.1)' : 'rgba(255,208,139,0.1)',
                            color: p.payment_method === 'Efectivo' ? '#44f3a9' : p.payment_method === 'Link de Pago' ? '#9acbff' : '#ffd08b',
                            border: `1px solid ${p.payment_method === 'Efectivo' ? 'rgba(68,243,169,0.25)' : p.payment_method === 'Link de Pago' ? 'rgba(154,203,255,0.25)' : 'rgba(255,208,139,0.25)'}`,
                          }}>
                            {p.payment_method === 'Efectivo' ? '💵' : p.payment_method === 'Link de Pago' ? '💳' : '🏦'} {p.payment_method}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {/* Quitar exención manual */}
                        {p.isManualExempt && (
                          <button
                            onClick={() => handleUnsetExempt(p)}
                            className="text-[11px] font-bold px-2 py-1.5 rounded transition-colors border border-slate-500/30 text-slate-400 hover:bg-slate-500/10"
                            title="Quitar exención"
                          >
                            Quitar
                          </button>
                        )}
                        {!p.isExempt && (
                          <>
                            {p.amount > 0 && (
                              <button
                                onClick={() => handleCancelPayment(p)}
                                className="text-[11px] font-bold px-2 py-1.5 rounded transition-colors border border-red-500/30 text-red-500 hover:bg-red-500/10"
                                title="Anular pago"
                              >
                                Anular
                              </button>
                            )}
                            {p.status !== 'Pagado' && selectedMonth > 2 && (
                              <>
                                <button
                                  onClick={() => handleSetExempt(p)}
                                  className="text-[11px] font-bold px-2 py-1.5 rounded-lg transition-all whitespace-nowrap"
                                  style={{ background: 'rgba(148,163,184,0.08)', color: 'rgba(148,163,184,0.6)', border: '1px solid rgba(148,163,184,0.15)' }}
                                  title="Marcar como no aplica este mes"
                                >
                                  No aplica
                                </button>
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={paymentMethods[p.player_id] || 'Transferencia'}
                                    onChange={e => setPaymentMethods(prev => ({ ...prev, [p.player_id]: e.target.value }))}
                                    className="text-[11px] font-bold rounded-lg px-1.5 py-1.5 border focus:outline-none"
                                    style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                                  >
                                    <option value="Transferencia">🏦 Transferencia</option>
                                    <option value="Efectivo">💵 Efectivo</option>
                                    <option value="Link de Pago">💳 Link de Pago</option>
                                  </select>
                                  <button
                                    onClick={() => handlePaymentToggle(p)}
                                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-soccer-green/50 text-soccer-green hover:bg-soccer-green/10 bg-soccer-green/5 transition-all whitespace-nowrap"
                                  >
                                    Pagar
                                  </button>
                                </div>
                              </>
                            )}
                          </>
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
  );
}
