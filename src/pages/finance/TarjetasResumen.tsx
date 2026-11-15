import type { Dispatch, SetStateAction } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import type { FilaCuota } from '../../lib/api/finanzas';
import { MONTHS, clp } from '../../lib/formato';

interface Props {
  payments: FilaCuota[];
  quotaFilter: 'mes' | 'total';
  setQuotaFilter: Dispatch<SetStateAction<'mes' | 'total'>>;
  selectedMonth: number;
  totalExpenses: number;
  balance: number;
  monthlyIncome: number;
  allPaidAmount: number;
}

export function TarjetasResumen({ payments, quotaFilter, setQuotaFilter, selectedMonth, totalExpenses, balance, monthlyIncome, allPaidAmount }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      <div className="glass-card p-8 border-l-4 border-l-soccer-green group hover:scale-[1.02]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-soccer-green/5 rounded-full blur-3xl -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
        <div className="flex items-center justify-between mb-4 relative z-10">
          <h3 className="text-slate-400 font-black tracking-[0.15em] text-[11px] uppercase">Caja Actual</h3>
          <div className="bg-soccer-green/10 p-2 rounded-xl border border-soccer-green/20 group-hover:bg-soccer-green/20 transition-colors">
            <DollarSign className="text-soccer-green" size={24} />
          </div>
        </div>
        <p className={`text-4xl font-black tracking-tighter relative z-10 transition-colors ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>
          {clp(balance)}
        </p>
        <p className="text-[11px] text-slate-400 mt-2 relative z-10">Cuotas pagadas + ingresos − gastos</p>
        <div className="mt-3 h-1 w-12 bg-soccer-green/30 rounded-full"></div>
      </div>

      <div className="glass-card p-8 border-l-4 border-l-emerald-500 group hover:scale-[1.02]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-3xl -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-slate-400 font-black tracking-[0.15em] text-[11px] uppercase">
              {quotaFilter === 'total' ? 'Total Cuotas Pagadas' : `Cuotas — ${MONTHS[selectedMonth - 1]}`}
            </h3>
            <div className="flex rounded-lg overflow-hidden border border-white/10 text-[11px] font-bold p-0.5 bg-black/20 w-fit">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setQuotaFilter('mes'); }}
                className={`px-2.5 py-0.5 rounded transition-all duration-200 ${quotaFilter === 'mes' ? 'bg-emerald-500 text-[#003822] shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                Mes
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setQuotaFilter('total'); }}
                className={`px-2.5 py-0.5 rounded transition-all duration-200 ${quotaFilter === 'total' ? 'bg-emerald-500 text-[#003822] shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                Total
              </button>
            </div>
          </div>
          <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
            <TrendingUp className="text-emerald-500" size={24} />
          </div>
        </div>
        <p className="text-4xl font-black tracking-tighter text-white relative z-10">
          {quotaFilter === 'total' ? clp(allPaidAmount) : clp(monthlyIncome)}
        </p>
        <p className="text-[11px] text-slate-400 mt-2 relative z-10">
          {quotaFilter === 'total'
            ? 'Monto total recaudado en el historial de cuotas'
            : selectedMonth <= 2
              ? 'Mes sin cobros asignados'
              : `${payments.filter(p => p.status === 'Pagado').length}/${payments.filter(p => !p.isExempt).length} jugadores al día`}
        </p>
        <div className="mt-3 h-1 w-12 bg-emerald-500/30 rounded-full"></div>
      </div>

      <div className="glass-card p-8 border-l-4 border-l-red-500 group hover:scale-[1.02]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-3xl -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
        <div className="flex items-center justify-between mb-4 relative z-10">
          <h3 className="text-slate-400 font-black tracking-[0.15em] text-[11px] uppercase">Gastos (Historial)</h3>
          <div className="bg-red-500/10 p-2 rounded-xl border border-red-500/20 group-hover:bg-red-500/20 transition-colors">
            <TrendingDown className="text-red-500" size={24} />
          </div>
        </div>
        <p className="text-4xl font-black tracking-tighter text-white relative z-10">{clp(totalExpenses)}</p>
        <div className="mt-4 h-1 w-12 bg-red-500/30 rounded-full"></div>
      </div>
    </div>
  );
}
