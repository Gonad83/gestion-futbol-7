import { Medal, Trophy } from 'lucide-react';
import type { DashboardStats } from '../../lib/api/dashboard';
import { RANK_COLORS } from './util';

const MEDALLAS = ['Medalla de oro', 'Medalla de plata', 'Medalla de bronce'];

interface Props {
  stats: DashboardStats;
}

export function TarjetaParticipaciones({ stats }: Props) {
  return (
    <div className="glass-card relative overflow-hidden flex flex-col">
      <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,208,139,0.05) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,208,139,0.1)', color: '#ffd08b' }}>
          <Trophy size={16} />
        </div>
        <h2 className="font-headline font-bold text-white">Participaciones</h2>
        <span className="ml-auto text-[11px] font-bold text-white/50">{stats.topParticipations.length} jugadores</span>
      </div>

      {stats.topParticipations.length === 0 ? (
        <div className="text-center py-8 rounded-xl" style={{ background: 'rgba(0,0,0,0.15)', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <p className="text-white/30 text-sm">Sin datos aún.</p>
        </div>
      ) : (() => {
        const maxCount = stats.topParticipations[0]?.count || 1;
        return (
          <div className="overflow-y-auto custom-scrollbar space-y-2 pr-1" style={{ maxHeight: '320px' }}>
            {stats.topParticipations.map((player, i) => {
              const rankColor = RANK_COLORS[i] ?? 'rgba(255,255,255,0.25)';
              const barPct = maxCount > 0 ? (player.count / maxCount) * 100 : 0;
              return (
                <div key={player.id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl"
                  style={{
                    background: i === 0 ? 'rgba(255,215,0,0.05)' : 'rgba(0,0,0,0.12)',
                    border: `1px solid ${i < 3 ? rankColor + '22' : 'rgba(255,255,255,0.04)'}`,
                  }}>
                  {/* Rank */}
                  {i < 3 ? (
                    <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" role="img" aria-label={MEDALLAS[i]} title={MEDALLAS[i]}
                      style={{ color: rankColor, background: rankColor + '1f', boxShadow: `0 0 10px ${rankColor}33` }}>
                      <Medal size={16} strokeWidth={2.25} fill={rankColor + '55'} />
                    </span>
                  ) : (
                    <span className="font-headline font-black text-sm w-6 text-center flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      {i + 1}
                    </span>
                  )}
                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{ background: '#31353c', border: `1.5px solid ${i < 3 ? rankColor + '50' : 'rgba(255,255,255,0.08)'}` }}>
                    {player.photo_url
                      ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                      : <span className="text-[11px] font-black" style={{ color: 'rgba(255,255,255,0.5)' }}>{player.name.charAt(0)}</span>}
                  </div>
                  {/* Name + bar */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-xs truncate leading-tight">{player.name}</p>
                    <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barPct}%`,
                          background: i === 0
                            ? 'linear-gradient(90deg,#ffd700,#ffb300)'
                            : i === 1
                              ? 'linear-gradient(90deg,#c0c0c0,#9ca3af)'
                              : i === 2
                                ? 'linear-gradient(90deg,#cd7f32,#a0522d)'
                                : 'linear-gradient(90deg,#44f3a9,#00d68f)',
                        }} />
                    </div>
                  </div>
                  {/* Count */}
                  <span className="font-headline font-black text-sm flex-shrink-0 w-6 text-right"
                    style={{ color: i < 3 ? rankColor : 'rgba(255,255,255,0.5)' }}>
                    {player.count}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
