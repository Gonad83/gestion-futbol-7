import type { Dispatch, SetStateAction } from 'react';
import type { MorosoCaja } from '../../lib/api/finanzas';
import { MONTHS, clp } from '../../lib/formato';

interface Props {
  morosos: MorosoCaja[];
  copiedAll: boolean;
  setCopiedAll: Dispatch<SetStateAction<boolean>>;
  copiedPlayer: string | null;
  setCopiedPlayer: Dispatch<SetStateAction<string | null>>;
  now: Date;
}

export function PestanaMorosidad({ morosos, copiedAll, setCopiedAll, copiedPlayer, setCopiedPlayer, now }: Props) {
  return (
    <div className="fade-in space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
          <p className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#f87171' }}>Morosos</p>
          <p className="text-3xl font-black text-white">{morosos.length}</p>
          <p className="text-xs text-slate-400 mt-1">jugadores con cuotas pendientes</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
          <p className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: '#f87171' }}>Deuda Total</p>
          <p className="text-3xl font-black text-white">{clp(morosos.reduce((acc, p) => acc + p.totalDebt, 0))}</p>
          <p className="text-xs text-slate-400 mt-1">monto adeudado al equipo</p>
        </div>
      </div>

      {morosos.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'rgba(68,243,169,0.04)', border: '1px dashed rgba(68,243,169,0.2)' }}>
          <p className="text-soccer-green font-bold text-lg mb-1">¡Todos al día!</p>
          <p className="text-slate-500 text-sm">No hay jugadores con cuotas pendientes.</p>
        </div>
      ) : (
        <>
          {/* Copy all button */}
          <button
            onClick={() => {
              const lines = morosos.map((p, i) =>
                `${i + 1}. ${p.name}${p.nickname ? ` "${p.nickname}"` : ''} — ${p.pendingMonths.length} mes${p.pendingMonths.length > 1 ? 'es' : ''} (${clp(p.totalDebt)}${p.abonado > 0 ? `, ya abonó ${clp(p.abonado)}` : ''})\n   ${p.pendingMonths.map((m) => `${MONTHS[m.month - 1]} ${m.year}`).join(', ')}`
              ).join('\n\n');
              const total = morosos.reduce((acc, p) => acc + p.totalDebt, 0);
              const msg = `⚠️ *Cuotas pendientes*\n\n${lines}\n\n💰 *Total adeudado: ${clp(total)}*`;
              navigator.clipboard.writeText(msg);
              setCopiedAll(true);
              setTimeout(() => setCopiedAll(false), 2500);
            }}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={{ background: copiedAll ? 'rgba(68,243,169,0.15)' : 'rgba(255,255,255,0.05)', color: copiedAll ? '#44f3a9' : 'rgba(255,255,255,0.5)', border: `1px solid ${copiedAll ? 'rgba(68,243,169,0.3)' : 'rgba(255,255,255,0.1)'}` }}
          >
            {copiedAll ? '✅ ¡Copiado para WhatsApp!' : '📋 Copiar lista para WhatsApp'}
          </button>

          {/* Player list */}
          <div className="space-y-3">
            {morosos.map((p, i) => {
              const curM = now.getMonth() + 1;
              const curY = now.getFullYear();
              const oldest = p.pendingMonths[0];
              const monthsAgo = oldest ? (curY - oldest.year) * 12 + (curM - oldest.month) : 0;
              const agingColor = monthsAgo === 0 ? '#44f3a9' : monthsAgo <= 2 ? '#ffd08b' : '#f87171';
              const agingLabel = monthsAgo === 0 ? 'Reciente' : monthsAgo <= 2 ? `${monthsAgo}m atraso` : `${monthsAgo}m atraso`;
              return (
              <div key={p.id} className="rounded-2xl p-4" style={{ background: i === 0 ? 'rgba(248,113,113,0.07)' : 'rgba(0,0,0,0.15)', border: `1px solid ${i === 0 ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1.5px solid rgba(248,113,113,0.3)' }}>
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white text-sm">{p.name}{p.nickname && <span className="text-slate-400 font-normal ml-1 text-xs">"{p.nickname}"</span>}</p>
                        <span className="text-[11px] font-black px-1.5 py-0.5 rounded-full" style={{ background: `${agingColor}18`, color: agingColor, border: `1px solid ${agingColor}40` }}>{agingLabel}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.pendingMonths.map((m) => (
                          <span key={`${m.year}-${m.month}`} className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                            {MONTHS[m.month - 1].slice(0, 3)} {m.year}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-black text-white text-sm">{clp(p.totalDebt)}</p>
                      {p.abonado > 0 && <p className="text-[11px] font-bold text-soccer-green">abonó {clp(p.abonado)}</p>}
                    </div>
                    <button
                      onClick={() => {
                        const months = p.pendingMonths.map((m) => `• ${MONTHS[m.month - 1]} ${m.year}`).join('\n');
                        const msg = `Hola ${p.name.split(' ')[0]}! 👋\nTienes ${p.pendingMonths.length} cuota${p.pendingMonths.length > 1 ? 's' : ''} pendiente${p.pendingMonths.length > 1 ? 's' : ''}:\n${months}\n\n${p.abonado > 0 ? `✅ Ya abonaste: ${clp(p.abonado)}\n` : ''}💰 ${p.abonado > 0 ? 'Saldo' : 'Total'}: ${clp(p.totalDebt)}${p.pendingMonths.length > 1 ? '\n\nNo tienes que pagar todo de una vez: puedes ir abonando.' : ''}`;
                        navigator.clipboard.writeText(msg);
                        setCopiedPlayer(p.id);
                        setTimeout(() => setCopiedPlayer(null), 2500);
                      }}
                      className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                      style={{ background: copiedPlayer === p.id ? 'rgba(68,243,169,0.15)' : 'rgba(255,255,255,0.05)', color: copiedPlayer === p.id ? '#44f3a9' : 'rgba(255,255,255,0.4)', border: `1px solid ${copiedPlayer === p.id ? 'rgba(68,243,169,0.3)' : 'rgba(255,255,255,0.08)'}` }}
                    >
                      {copiedPlayer === p.id ? '✅ Copiado' : '📋 WhatsApp'}
                    </button>
                  </div>
                </div>
              </div>
            ); })}
          </div>
        </>
      )}
    </div>
  );
}
