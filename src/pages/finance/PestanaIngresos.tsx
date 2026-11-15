import type { Dispatch, SetStateAction, SyntheticEvent } from 'react';
import { Plus, ArrowUpCircle, Trash2 } from 'lucide-react';
import type { Movimiento } from '../../lib/api/finanzas';
import { clp } from '../../lib/formato';

interface Props {
  isAdmin: boolean;
  cashIncomes: Movimiento[];
  showIncomeForm: boolean;
  setShowIncomeForm: Dispatch<SetStateAction<boolean>>;
  incomeData: { concept: string; amount: string; date: string };
  setIncomeData: Dispatch<SetStateAction<{ concept: string; amount: string; date: string }>>;
  totalCashIncomes: number;
  handleAddIncome: (e: SyntheticEvent) => void;
  handleDeleteIncome: (id: string) => void;
}

export function PestanaIngresos({ isAdmin, cashIncomes, showIncomeForm, setShowIncomeForm, incomeData, setIncomeData, totalCashIncomes, handleAddIncome, handleDeleteIncome }: Props) {
  return (
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
  );
}
