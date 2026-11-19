import { Goal } from 'lucide-react';
import type { Goleador } from '../../lib/api/resultado';
import { RANK_COLORS } from './util';

/**
 * Goleadores de la temporada, con los resultados que carga el capitán en cada
 * partido. Sin resultados cargados todavía, explica cómo empezar.
 */
export function TarjetaGoleadores({ goleadores, puedeCargar }: { goleadores: Goleador[]; puedeCargar: boolean }) {
  return (
    <div className="glass-card relative overflow-hidden flex flex-col">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9' }}>
          <Goal size={16} />
        </div>
        <h2 className="font-headline font-bold text-white">Goleadores</h2>
      </div>

      {goleadores.length === 0 ? (
        <div className="text-center py-6 px-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.15)', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <p className="text-white/50 text-sm">
            {puedeCargar
              ? 'Abre un partido ya jugado en Calendario y toca "Cargar resultado" para anotar marcador y goles.'
              : 'Aparecen cuando el capitán carga los resultados de los partidos.'}
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {goleadores.map((g, i) => {
            const color = RANK_COLORS[i] ?? 'rgba(255,255,255,0.25)';
            return (
              <li key={g.id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl" style={{ background: i === 0 ? 'rgba(68,243,169,0.05)' : 'rgba(0,0,0,0.12)' }}>
                <span className="font-headline font-black text-sm w-5 text-center" style={{ color: i < 3 ? color : 'rgba(255,255,255,0.3)' }}>{i + 1}</span>
                <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{ background: '#31353c' }}>
                  {g.photo_url
                    ? <img src={g.photo_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-[11px] font-black text-white/50">{g.name.charAt(0)}</span>}
                </div>
                <span className="flex-1 min-w-0 text-sm font-semibold text-white truncate">{g.nickname || g.name}</span>
                <span className="text-sm font-black text-white tabular-nums" aria-label={`${g.goles} goles`}>⚽ {g.goles}</span>
                <span className="text-xs text-white/50 tabular-nums w-10 text-right" aria-label={`${g.asistencias} asistencias`}>🅰️ {g.asistencias}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
