import type { Dispatch, SetStateAction, SyntheticEvent } from 'react';
import { TrendingDown, Plus, Trash2 } from 'lucide-react';
import type { Movimiento } from '../../lib/api/finanzas';
import { clp } from '../../lib/formato';

interface Props {
  isAdmin: boolean;
  expenses: Movimiento[];
  showExpenseForm: boolean;
  setShowExpenseForm: Dispatch<SetStateAction<boolean>>;
  expenseData: { concept: string; amount: string; date: string };
  setExpenseData: Dispatch<SetStateAction<{ concept: string; amount: string; date: string }>>;
  handleAddExpense: (e: SyntheticEvent) => void;
  handleDeleteExpense: (id: string) => void;
}

export function PestanaGastos({ isAdmin, expenses, showExpenseForm, setShowExpenseForm, expenseData, setExpenseData, handleAddExpense, handleDeleteExpense }: Props) {
  return (
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
  );
}
