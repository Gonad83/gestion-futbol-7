

interface Props {
  balance: number;
  mesesRespaldo: number;
  tasaMora: number;
}

export function IndicadoresCaja({ balance, mesesRespaldo, tasaMora }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
      <div className="rounded-2xl p-6" style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-400 font-black tracking-[0.15em] text-[11px] uppercase">Meses de Respaldo</h3>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{
            background: mesesRespaldo >= 3 ? 'rgba(68,243,169,0.12)' : mesesRespaldo >= 1 ? 'rgba(255,208,139,0.12)' : 'rgba(248,113,113,0.12)',
            color: mesesRespaldo >= 3 ? '#44f3a9' : mesesRespaldo >= 1 ? '#ffd08b' : '#f87171',
          }}>
            {mesesRespaldo >= 3 ? '✓ Saludable' : mesesRespaldo >= 1 ? '⚠ Ajustado' : balance <= 0 ? '✗ Crítico' : 'Sin datos'}
          </span>
        </div>
        <p className="text-4xl font-black tracking-tighter text-white">{mesesRespaldo > 0 ? mesesRespaldo.toFixed(1) : '—'}</p>
        <p className="text-[11px] text-slate-400 mt-2">meses que cubre el saldo actual</p>
        <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{
            width: `${Math.min(100, (Math.max(0, mesesRespaldo) / 6) * 100)}%`,
            background: mesesRespaldo >= 3 ? '#44f3a9' : mesesRespaldo >= 1 ? '#ffd08b' : '#f87171',
          }} />
        </div>
      </div>

      <div className="rounded-2xl p-6" style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-slate-400 font-black tracking-[0.15em] text-[11px] uppercase">Tasa de Morosidad</h3>
          {tasaMora > 15 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
              ⚠ Alerta
            </span>
          )}
        </div>
        <p className="text-4xl font-black tracking-tighter text-white">{tasaMora}%</p>
        <p className="text-[11px] text-slate-400 mt-2">jugadores con cuota pendiente este mes</p>
        <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{
            width: `${Math.min(100, tasaMora)}%`,
            background: tasaMora > 15 ? '#f87171' : tasaMora > 5 ? '#ffd08b' : '#44f3a9',
          }} />
        </div>
      </div>
    </div>
  );
}
