import type { Dispatch, SetStateAction } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Check, X } from 'lucide-react';
import type { FilaCuota } from '../../lib/api/finanzas';
import { MONTHS, clp } from '../../lib/formato';
import { esMesSinCuota, pendientesDelMes } from './cuotasMes';

interface Props {
  isAdmin: boolean;
  payments: FilaCuota[];
  quotaAmount: number;
  selectedMonth: number;
  selectedYear: number;
  prevMonth: () => void;
  nextMonth: () => void;
  editingQuota: boolean;
  setEditingQuota: Dispatch<SetStateAction<boolean>>;
  quotaInput: string;
  setQuotaInput: Dispatch<SetStateAction<string>>;
  handleSaveQuota: () => void;
}

/** Mes elegido, avance de las cuotas (cuántos al día) y el valor de la cuota. */
export function ResumenMes({ isAdmin, payments, quotaAmount, selectedMonth, selectedYear, prevMonth, nextMonth, editingQuota, setEditingQuota, quotaInput, setQuotaInput, handleSaveQuota }: Props) {
  const cobrables = payments.filter(p => !p.isExempt);
  const alDia = cobrables.filter(p => p.status === 'Pagado').length;
  const { cantidad, monto } = pendientesDelMes(payments, quotaAmount);
  const sinCuota = esMesSinCuota(selectedMonth);
  const porcentaje = cobrables.length ? Math.round((alDia / cobrables.length) * 100) : 0;

  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center justify-center gap-2">
        <button type="button" onClick={prevMonth} aria-label="Mes anterior"
          className="w-11 h-11 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 cursor-pointer">
          <ChevronLeft size={18} />
        </button>
        <p className="min-w-[10rem] text-center px-4 py-2 rounded-full font-semibold text-white capitalize"
          style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.07)' }} aria-live="polite">
          {MONTHS[selectedMonth - 1]} {selectedYear}
        </p>
        <button type="button" onClick={nextMonth} aria-label="Mes siguiente"
          className="w-11 h-11 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 cursor-pointer">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="rounded-2xl p-4" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>
        {sinCuota ? (
          <p className="text-sm font-semibold text-white/60 text-center">Temporada libre de cuotas: este mes no se cobra.</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="font-headline font-bold text-white">
                {alDia} de {cobrables.length} al día <span className="text-xs font-semibold text-white/50 tabular-nums">({porcentaje}%)</span>
              </p>
              {cantidad > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tabular-nums"
                  style={{ background: 'rgba(248,113,113,0.12)', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.25)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />{cantidad} pendiente{cantidad === 1 ? '' : 's'} · {clp(monto)}
                </span>
              ) : cobrables.length > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold text-soccer-green" style={{ background: 'rgba(68,243,169,0.12)' }}>Todos al día</span>
              )}
            </div>
            <div className="flex gap-1 mt-3" role="img" aria-label={`${alDia} de ${cobrables.length} jugadores al día`}>
              {cobrables.length > 0
                ? cobrables.map((p, i) => (
                  <span key={p.player_id} className="h-2 flex-1 rounded-full"
                    style={{ background: i < alDia ? '#44f3a9' : 'rgba(248,113,113,0.35)' }} />
                ))
                : <span className="h-2 flex-1 rounded-full bg-white/10" />}
            </div>
          </>
        )}

        {isAdmin && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06] text-sm">
            <span className="text-white/60 font-semibold">Valor de la cuota</span>
            {editingQuota ? (
              <span className="flex items-center gap-1">
                <input type="number" inputMode="numeric" aria-label="Nuevo valor de la cuota" autoFocus
                  className="w-28 rounded-lg px-2 py-1.5 text-right text-white text-sm focus:outline-none focus:ring-2 focus:ring-soccer-green/60"
                  style={{ background: '#10141a', border: '1px solid rgba(255,255,255,0.12)' }}
                  value={quotaInput} onChange={e => setQuotaInput(e.target.value)} />
                <button type="button" onClick={handleSaveQuota} aria-label="Guardar cuota" className="w-9 h-9 flex items-center justify-center text-soccer-green cursor-pointer"><Check size={16} /></button>
                <button type="button" onClick={() => setEditingQuota(false)} aria-label="Cancelar" className="w-9 h-9 flex items-center justify-center text-white/50 cursor-pointer"><X size={16} /></button>
              </span>
            ) : (
              <button type="button" onClick={() => { setQuotaInput(String(quotaAmount)); setEditingQuota(true); }}
                className="flex items-center gap-2 font-bold text-white tabular-nums hover:text-soccer-green cursor-pointer py-1">
                {clp(quotaAmount)} <Pencil size={13} aria-label="Cambiar" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
