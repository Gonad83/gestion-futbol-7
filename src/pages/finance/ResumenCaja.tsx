import type { Dispatch, SetStateAction } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { MONTHS, clp } from '../../lib/formato';

interface Props {
  quotaFilter: 'mes' | 'total';
  setQuotaFilter: Dispatch<SetStateAction<'mes' | 'total'>>;
  selectedMonth: number;
  totalExpenses: number;
  balance: number;
  monthlyIncome: number;
  allPaidAmount: number;
  mesesRespaldo: number;
}

const colorRespaldo = (meses: number) => (meses >= 3 ? '#44f3a9' : meses >= 1 ? '#ffd08b' : '#f87171');

/**
 * Una sola tarjeta con lo que importa de la caja: el saldo y, debajo, cuotas,
 * gastos y meses de respaldo. Antes eran cinco tarjetas grandes que ocupaban
 * toda la pantalla del celular antes de llegar a la lista de cuotas.
 */
export function ResumenCaja({ quotaFilter, setQuotaFilter, selectedMonth, totalExpenses, balance, monthlyIncome, allPaidAmount, mesesRespaldo }: Props) {
  const mesCorto = MONTHS[selectedMonth - 1].slice(0, 3).toLowerCase();
  return (
    <section aria-label="Resumen de la caja" className="rounded-[20px] p-5 mb-4 relative overflow-hidden"
      style={{ background: '#1c2026', boxShadow: '0 0 40px -12px rgba(68,243,169,0.18)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(68,243,169,0.12), transparent 70%)' }} />

      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/60">Caja actual</p>
      <p className={`font-headline text-[40px] leading-tight font-black tracking-tight tabular-nums ${balance >= 0 ? 'text-white' : 'text-red-400'}`}>
        {clp(balance)}
      </p>
      <p className="text-xs text-white/55">Cuotas + ingresos − gastos</p>

      <div className="grid grid-cols-3 mt-4 pt-4 border-t border-white/[0.07]">
        <button
          type="button"
          onClick={() => setQuotaFilter(f => (f === 'mes' ? 'total' : 'mes'))}
          className="text-left pr-2 cursor-pointer group min-w-0"
          title="Cambiar entre el mes y el total histórico"
        >
          <span className="flex items-center gap-1 text-[11px] font-semibold text-white/60 group-hover:text-white/80">
            {quotaFilter === 'mes' ? `Cuotas ${mesCorto}.` : 'Cuotas total'} <ArrowLeftRight size={10} aria-hidden="true" />
          </span>
          <span className="block font-headline font-bold text-lg sm:text-xl tabular-nums text-soccer-green truncate">
            {clp(quotaFilter === 'mes' ? monthlyIncome : allPaidAmount)}
          </span>
        </button>
        <div className="px-2 border-l border-white/[0.07] min-w-0">
          <span className="block text-[11px] font-semibold text-white/60">Gastos</span>
          <span className="block font-headline font-bold text-lg sm:text-xl tabular-nums text-red-400 truncate">{clp(totalExpenses)}</span>
        </div>
        <div className="pl-2 border-l border-white/[0.07] min-w-0">
          <span className="block text-[11px] font-semibold text-white/60">Respaldo</span>
          <span className="block font-headline font-bold text-lg sm:text-xl tabular-nums truncate" style={{ color: colorRespaldo(mesesRespaldo) }}>
            {mesesRespaldo > 0 ? `${mesesRespaldo.toFixed(1).replace('.', ',')} m` : '—'}
          </span>
        </div>
      </div>
    </section>
  );
}
