import { CalendarDays, ArrowRight, X, CheckCircle2, Copy, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DashboardStats, JugadorDash, Invitado } from '../../lib/api/dashboard';
import { getMatchTimeLabel } from './util';

interface Props {
  stats: DashboardStats;
  isMatchmaker: boolean;
  confirmedPlayers: JugadorDash[];
  guestsDash: Invitado[];
  guestInputDash: string;
  setGuestInputDash: (valor: string) => void;
  addingGuestDash: boolean;
  addGuestDash: () => void;
  removeGuestDash: (id: string) => void;
  openAttendanceModal: () => void;
  copyForWhatsApp: () => void;
  copied: boolean;
}

export function ProximoPartido({ stats, isMatchmaker, confirmedPlayers, guestsDash, guestInputDash, setGuestInputDash, addingGuestDash, addGuestDash, removeGuestDash, openAttendanceModal, copyForWhatsApp, copied }: Props) {
  return (
    <div className="lg:col-span-3 glass-card relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(68,243,169,0.06) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9' }}>
            <CalendarDays size={16} />
          </div>
          <h2 className="font-headline font-bold text-white">
            {stats.nextMatch?.event_type === 'Recreacional' ? 'Próximo Evento' : 'Próximo Partido'}
          </h2>
          {stats.nextMatch && (isToday(new Date(stats.nextMatch.date)) || isTomorrow(new Date(stats.nextMatch.date))) && (
            <span className="status-pulse ml-1">
              <span className="status-pulse-dot bg-soccer-green"></span>
              <span className="status-pulse-inner bg-soccer-green"></span>
            </span>
          )}
        </div>
        <Link to="/calendar" className="text-xs font-semibold flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: '#44f3a9' }}>
          Ver calendario <ArrowRight size={13} />
        </Link>
      </div>

      {stats.nextMatch ? (
        <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-stretch">
          <div
            className="flex flex-col items-center justify-center min-w-[130px] p-5 rounded-2xl"
            style={{ background: '#0a0e14', border: '1px solid rgba(68,243,169,0.15)' }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#44f3a9' }}>{getMatchTimeLabel(stats.nextMatch.date)}</p>
            <p className="font-headline text-4xl font-black text-white tracking-tight" style={{ letterSpacing: '-0.02em' }}>{format(new Date(stats.nextMatch.date), 'HH:mm')}</p>
            <p className="text-[11px] text-white/50 font-bold uppercase tracking-wider mt-1">{format(new Date(stats.nextMatch.date), 'dd MMM yyyy', { locale: es })}</p>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-4 w-full text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <span
                className="text-[11px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest text-center"
                style={stats.nextMatch.event_type === 'Recreacional'
                  ? { background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }
                  : { background: 'rgba(68,243,169,0.12)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }
                }
              >
                {stats.nextMatch.event_type === 'Recreacional' ? 'Recreacional' : (stats.nextMatch.match_type || '7vs7')}
              </span>
              <span className="text-white font-bold text-lg">{stats.nextMatch.location}</span>
            </div>

            <div className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Asistencia</span>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black" style={{ color: '#44f3a9' }}>{stats.confirmedCount} Voy</span>
                  <span className="text-[11px] font-black" style={{ color: '#f87171' }}>{stats.declinedCount} No Voy</span>
                  <span className="text-[11px] font-black" style={{ color: '#fbbf24' }}>{stats.pendingCount} Pendiente</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden flex">
                <div
                  className="h-full bg-soccer-green transition-all duration-1000"
                  style={{ width: `${Math.min((stats.confirmedCount / stats.activePlayers) * 100, 100)}%` }}
                />
                <div
                  className="h-full bg-red-400/50 transition-all duration-1000"
                  style={{ width: `${Math.min((stats.declinedCount / stats.activePlayers) * 100, 100)}%` }}
                />
                <div
                  className="h-full bg-amber-400/30 transition-all duration-1000"
                  style={{ width: `${Math.min((stats.pendingCount / stats.activePlayers) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-soccer-green" />
                  <span className="text-[11px] text-white/50">Confirmados</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-400/50" />
                  <span className="text-[11px] text-white/50">Bajas</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-400/30" />
                  <span className="text-[11px] text-white/50">Sin respuesta</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={openAttendanceModal}
                className="btn-primary py-2 px-5 text-sm flex items-center gap-2"
              >
                <CheckCircle2 size={15} />
                Confirmar Asistencia
              </button>
              {stats.nextMatch.event_type !== 'Recreacional' && (
                <Link to="/matchmaking" className="btn-secondary text-center py-2 text-sm">
                  Armar Equipos
                </Link>
              )}
              <button
                onClick={copyForWhatsApp}
                className={`flex items-center gap-2 py-2 px-4 text-sm rounded-xl font-semibold border transition-all ${copied ? 'bg-soccer-green/20 text-soccer-green border-soccer-green/40' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white'}`}
              >
                <Copy size={14} />
                {copied ? '¡Lista copiada!' : 'Copiar Lista'}
              </button>
            </div>

            {(confirmedPlayers.length > 0 || guestsDash.length > 0 || isMatchmaker) && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Confirmados ({confirmedPlayers.length + guestsDash.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {confirmedPlayers.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                      style={{ background: 'rgba(68,243,169,0.08)', border: '1px solid rgba(68,243,169,0.2)' }}>
                      <span className="text-[11px] font-black w-4 text-center flex-shrink-0" style={{ color: '#44f3a9' }}>{i + 1}</span>
                      <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: '#31353c' }}>
                        {p.photo_url
                          ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                          : <span className="text-[10px] font-black text-white/50">{p.name.charAt(0)}</span>}
                      </div>
                      <span className="text-[11px] font-semibold text-white">{p.name.split(' ')[0]}</span>
                    </div>
                  ))}
                  {guestsDash.map((g, i) => (
                    <div key={g.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                      style={{ background: 'rgba(154,203,255,0.08)', border: '1px solid rgba(154,203,255,0.2)' }}>
                      <span className="text-[11px] font-black w-4 text-center flex-shrink-0" style={{ color: '#9acbff' }}>{confirmedPlayers.length + i + 1}</span>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                        style={{ background: 'rgba(154,203,255,0.15)', color: '#9acbff' }}>
                        {g.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[11px] font-semibold" style={{ color: '#9acbff' }}>{g.name}</span>
                      {isMatchmaker && (
                        <button onClick={() => removeGuestDash(g.id)}
                          className="ml-0.5 hover:text-red-400 transition-colors"
                          style={{ color: 'rgba(255,255,255,0.25)' }}>
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {isMatchmaker && (
                  <div className="flex gap-2 mt-3">
                    <input
                      type="text"
                      placeholder="Agregar invitado..."
                      value={guestInputDash}
                      onChange={e => setGuestInputDash(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addGuestDash()}
                      className="flex-1 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(154,203,255,0.15)' }}
                    />
                    <button
                      onClick={addGuestDash}
                      disabled={!guestInputDash.trim() || addingGuestDash}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-40"
                      style={{ background: 'rgba(154,203,255,0.12)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.2)' }}
                    >
                      <UserPlus size={13} />
                      {addingGuestDash ? '...' : 'Invitar'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 rounded-2xl relative overflow-hidden" style={{ background: 'rgba(0,0,0,0.15)', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #44f3a9 0%, transparent 70%)' }} />
          <CalendarDays size={48} className="mx-auto text-white/10 mb-4" />
          <h3 className="font-headline text-xl font-bold text-white mb-2">Sin eventos próximos</h3>
          <p className="text-white/40 mb-6 text-sm max-w-xs mx-auto">No hay partidos o eventos recreacionales programados por ahora.</p>
          <Link to="/calendar" className="btn-primary inline-flex text-sm px-8">Programar Evento</Link>
        </div>
      )}
    </div>
  );
}
