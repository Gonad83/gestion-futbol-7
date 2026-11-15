import { Trophy, Star, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DashboardStats } from '../../lib/api/dashboard';
import { RANK_COLORS } from './util';

interface Props {
  stats: DashboardStats;
  isAdmin: boolean;
  copiedVote: boolean;
  shareVoteWhatsApp: () => void;
  closeVoting: () => void;
  notifyVoting: () => void;
}

export function TarjetaMvp({ stats, isAdmin, copiedVote, shareVoteWhatsApp, closeVoting, notifyVoting }: Props) {
  return (
    <div className="lg:col-span-2 glass-card relative overflow-hidden flex flex-col">
      <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.05) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,215,0,0.1)', color: '#ffd700' }}>
            <Star size={16} />
          </div>
          <h2 className="font-headline font-bold text-white">Mejor Jugador</h2>
        </div>
        {stats.votingIsOpen && (
          <span className="text-[11px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse" style={{ background: 'rgba(68,243,169,0.15)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.3)' }}>
            ● Votación Abierta
          </span>
        )}
      </div>

      {stats.votingIsOpen ? (
        <div className="flex-1 flex flex-col gap-3">
          {/* Match date identifier */}
          {stats.openVoteMatchDate && (
            <p className="text-[11px] text-white/50 text-center uppercase tracking-widest">
              Partido · {format(new Date(stats.openVoteMatchDate), "d 'de' MMMM yyyy", { locale: es })}
            </p>
          )}
          {stats.topMvp.length > 0 ? (
            <>
              {/* Leader — big card */}
              <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)' }}>
                <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: '#31353c', border: '2px solid rgba(255,215,0,0.4)' }}>
                  {stats.topMvp[0].photo_url
                    ? <img src={stats.topMvp[0].photo_url} alt={stats.topMvp[0].name} className="w-full h-full object-cover" />
                    : <span className="text-xl font-black" style={{ color: 'rgba(255,255,255,0.3)' }}>{stats.topMvp[0].name.charAt(0)}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: '#ffd700' }}>🏆 Líder actual</p>
                  <p className="font-headline font-black text-white text-lg leading-tight truncate">{stats.topMvp[0].name}</p>
                  {stats.topMvp[0].nickname && <p className="text-[11px] text-white/50">"{stats.topMvp[0].nickname}"</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-headline font-black text-2xl leading-none" style={{ color: '#ffd700' }}>{stats.topMvp[0].count}</p>
                  <p className="text-[11px] text-white/50 uppercase">votos</p>
                </div>
              </div>
              {/* 2nd and 3rd — smaller cards */}
              {stats.topMvp.length > 1 && (
                <div className="flex gap-2">
                  {stats.topMvp.slice(1, 3).map((p, i) => (
                    <div key={p.id} className="flex-1 flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${i === 0 ? 'rgba(192,192,192,0.2)' : 'rgba(205,127,50,0.2)'}` }}>
                      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-sm font-black" style={{ background: '#31353c', color: 'rgba(255,255,255,0.3)', border: `1.5px solid ${i === 0 ? '#c0c0c0' : '#cd7f32'}` }}>
                        {p.photo_url ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" /> : p.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider leading-none mb-0.5" style={{ color: i === 0 ? '#c0c0c0' : '#cd7f32' }}>{i === 0 ? '2°' : '3°'}</p>
                        <p className="text-xs font-bold text-white truncate">{p.name}</p>
                      </div>
                      <p className="font-headline font-black text-sm flex-shrink-0" style={{ color: i === 0 ? '#c0c0c0' : '#cd7f32' }}>{p.count}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 rounded-xl" style={{ background: 'rgba(0,0,0,0.15)', border: '1px dashed rgba(255,255,255,0.08)' }}>
              <Star size={28} className="mb-2" style={{ color: 'rgba(255,215,0,0.25)' }} />
              <p className="text-white/30 text-sm">Sé el primero en votar</p>
            </div>
          )}
          <div className="flex gap-2">
            <Link
              to={`/vote${stats.openVoteMatchId ? `?match_id=${stats.openVoteMatchId}` : ''}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-sm transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #ffd700, #ffb800)', color: '#000', boxShadow: '0 4px 20px rgba(255,215,0,0.25)' }}
            >
              <Star size={16} />
              ¡Votar ahora!
            </Link>
            <button
              onClick={shareVoteWhatsApp}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm border transition-all ${copiedVote ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'}`}
            >
              <Share2 size={16} />
              {copiedVote ? '¡Copiado!' : 'WhatsApp'}
            </button>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={closeVoting}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Cerrar y guardar MVP
              </button>
              <button
                onClick={notifyVoting}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: 'rgba(68,243,169,0.08)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.15)' }}
              >
                Notificar votación
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-3">
          {stats.lastMvpWinner ? (
            <>
              {/* Foto grande del jugador de la semana */}
              <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(255,180,0,0.04) 100%)', border: '1px solid rgba(255,215,0,0.2)' }}>
                <div className="flex items-center gap-4 p-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: '#31353c', border: '2px solid #ffd700', boxShadow: '0 0 20px rgba(255,215,0,0.2)' }}>
                      {stats.lastMvpWinner.player_photo_url
                        ? <img src={stats.lastMvpWinner.player_photo_url} alt={stats.lastMvpWinner.player_name} className="w-full h-full object-cover" />
                        : <span className="text-3xl font-black" style={{ color: 'rgba(255,255,255,0.3)' }}>{stats.lastMvpWinner.player_name.charAt(0)}</span>
                      }
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-sm" style={{ background: '#ffd700' }}>🏆</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-widest mb-0.5" style={{ color: '#ffd700' }}>Jugador de la semana</p>
                    <p className="font-headline font-black text-white text-xl leading-tight truncate">{stats.lastMvpWinner.player_name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Star size={10} fill="#ffd700" style={{ color: '#ffd700' }} />
                      <span className="text-[11px] font-bold" style={{ color: '#ffd700' }}>{stats.lastMvpWinner.vote_count} votos</span>
                      {stats.lastMvpWinner.week_date && (
                        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          · {format(new Date(stats.lastMvpWinner.week_date), "d MMM", { locale: es })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Historial por partido */}
              {stats.mvpHistory.length > 0 && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Historial por partido</p>
                  <div className="space-y-1.5 overflow-y-auto max-h-[200px] custom-scrollbar pr-1">
                    {stats.mvpHistory.map((w, i) => (
                      <div key={w.created_at || i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl" style={{ background: i === 0 ? 'rgba(255,215,0,0.06)' : 'rgba(0,0,0,0.15)', border: i === 0 ? '1px solid rgba(255,215,0,0.12)' : '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-black" style={{ background: '#31353c', color: 'rgba(255,255,255,0.5)', border: i === 0 ? '1.5px solid rgba(255,215,0,0.4)' : 'none' }}>
                          {w.player_photo_url ? <img src={w.player_photo_url} alt={w.player_name} className="w-full h-full object-cover" /> : w.player_name?.charAt(0)}
                        </div>
                        <p className="flex-1 text-sm text-white font-semibold truncate">{w.player_name}</p>
                        {w.week_date && (
                          <span className="text-[11px] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {format(new Date(w.week_date + 'T12:00:00'), "d MMM yy", { locale: es })}
                          </span>
                        )}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Star size={9} fill="#ffd700" style={{ color: '#ffd700' }} />
                          <span className="text-xs font-black" style={{ color: '#ffd700' }}>{w.vote_count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ranking total de MVPs */}
              {stats.mvpWinHistory.length > 1 && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Más veces MVP</p>
                  <div className="space-y-1.5">
                    {stats.mvpWinHistory.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl" style={{ background: i === 0 ? 'rgba(255,215,0,0.06)' : 'rgba(0,0,0,0.15)', border: i === 0 ? '1px solid rgba(255,215,0,0.12)' : '1px solid transparent' }}>
                        <span className="text-sm font-black w-5 text-center" style={{ color: RANK_COLORS[i] ?? 'rgba(255,255,255,0.2)' }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                        </span>
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-black" style={{ background: '#31353c', color: 'rgba(255,255,255,0.5)', border: i === 0 ? '1.5px solid rgba(255,215,0,0.4)' : 'none' }}>
                          {p.photo_url ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" /> : p.name.charAt(0)}
                        </div>
                        <p className="flex-1 text-sm text-white font-semibold truncate">{p.name}</p>
                        <div className="flex items-center gap-1">
                          <Trophy size={10} style={{ color: RANK_COLORS[i] ?? 'rgba(255,255,255,0.2)' }} />
                          <span className="text-xs font-black" style={{ color: RANK_COLORS[i] ?? 'rgba(255,255,255,0.2)' }}>{p.count}x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-8 rounded-xl" style={{ background: 'rgba(0,0,0,0.15)', border: '1px dashed rgba(255,255,255,0.08)' }}>
              <Trophy size={32} className="mb-3" style={{ color: 'rgba(255,215,0,0.2)' }} />
              <p className="text-white/30 text-sm text-center">Sin MVPs registrados aún.</p>
              <p className="text-white/50 text-xs text-center mt-1">La votación cierra cada domingo a las 23:59.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
