import { useState } from 'react';
import { Star, ChevronDown } from 'lucide-react';
import { SUB_STATS, MAX_STARS, subStat } from '../lib/playerStats';

function StarRow({ value, size, dim = 0.1 }: { value: number; size: number; dim?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: MAX_STARS }, (_, i) => (
        <Star key={i} size={size} className={i < value ? 'fill-current' : ''}
          style={{ color: i < value ? '#ffd08b' : `rgba(255,255,255,${dim})` }} />
      ))}
    </div>
  );
}

/**
 * Muestra el resumen (promedio) de las estrellas de un jugador.
 * Al pinchar se despliega el detalle: Forma, Técnica, Visión, Ataque y Defensa.
 */
export default function SubStatStars({ player, size = 9, compact = false }: { player: any; size?: number; compact?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="flex items-center gap-1 rounded-md transition-opacity hover:opacity-80"
        title={open ? 'Ocultar detalle' : 'Ver detalle de estrellas'}
        aria-expanded={open}
      >
        <StarRow value={player?.rating ?? 0} size={size + 2} dim={0.12} />
        <ChevronDown size={size + 1} className="text-white/30 transition-transform" style={{ transform: open ? 'rotate(180deg)' : undefined }} />
      </button>

      {open && (
        <div className="mt-2 space-y-1 fade-in">
          {SUB_STATS.map(s => {
            const value = subStat(player, s.key);
            return (
              <div key={s.key} className="flex items-center gap-1.5" title={`${s.label}: ${value}/${MAX_STARS}`}>
                <span className={`${compact ? 'w-7' : 'w-14'} text-left text-[9px] font-bold uppercase tracking-wider text-white/35`}>
                  {compact ? s.short : s.label}
                </span>
                <StarRow value={value} size={size} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
