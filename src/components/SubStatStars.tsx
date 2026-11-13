import { Star } from 'lucide-react';
import { SUB_STATS, MAX_STARS, subStat } from '../lib/playerStats';

/** Muestra las 3 sub-estrellas (Forma, Técnica, Visión) de un jugador. */
export default function SubStatStars({ player, size = 9, compact = false }: { player: any; size?: number; compact?: boolean }) {
  return (
    <div className="space-y-1">
      {SUB_STATS.map(s => {
        const value = subStat(player, s.key);
        return (
          <div key={s.key} className="flex items-center gap-1.5" title={`${s.label}: ${value}/${MAX_STARS}`}>
            <span className={`${compact ? 'w-7' : 'w-14'} text-[9px] font-bold uppercase tracking-wider text-white/35`}>
              {compact ? s.short : s.label}
            </span>
            <div className="flex gap-0.5">
              {Array.from({ length: MAX_STARS }, (_, i) => (
                <Star key={i} size={size} className={i < value ? 'fill-current' : ''}
                  style={{ color: i < value ? '#ffd08b' : 'rgba(255,255,255,0.1)' }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
