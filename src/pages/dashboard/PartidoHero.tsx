import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, XCircle, MapPin, ChevronRight, Copy, Users } from 'lucide-react';
import { differenceInCalendarDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DashboardStats, JugadorDash, Invitado } from '../../lib/api/dashboard';

interface Props {
  stats: DashboardStats;
  /** El jugador que mira; null si no está en la plantilla (no tiene Voy / No voy). */
  myPlayer: JugadorDash | null;
  myConfirmStatus: string;
  confirmingMyStatus: boolean;
  handleMyConfirm: (estado: 'Voy' | 'No voy') => void;
  confirmedPlayers: JugadorDash[];
  guestsDash: Invitado[];
  isMatchmaker: boolean;
  openAttendanceModal: () => void;
  copyForWhatsApp: () => void;
  copied: boolean;
  ahora?: Date;
}

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function cuantoFalta(fecha: Date, ahora: Date) {
  const dias = differenceInCalendarDays(fecha, ahora);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return `Faltan ${dias} días`;
}

/**
 * Lo primero que se ve en el Inicio: cuándo y dónde es el próximo partido,
 * cuántos van y, para el jugador, sus botones Voy / No voy.
 */
export function PartidoHero({ stats, myPlayer, myConfirmStatus, confirmingMyStatus, handleMyConfirm, confirmedPlayers, guestsDash, isMatchmaker, openAttendanceModal, copyForWhatsApp, copied, ahora = new Date() }: Props) {
  const partido = stats.nextMatch;

  if (!partido) {
    return (
      <section className="rounded-[20px] p-6 text-center" style={{ background: '#181c22', border: '1px dashed rgba(255,255,255,0.1)' }}>
        <CalendarDays size={36} className="mx-auto text-white/20 mb-3" />
        <h2 className="font-headline text-lg font-bold text-white">Sin partidos próximos</h2>
        <p className="text-sm text-white/55 mt-1 mb-5">Cuando se agende un partido, aquí verás quiénes van.</p>
        {isMatchmaker && <Link to="/calendar" className="btn-primary inline-flex text-sm px-6 py-3">Agendar partido</Link>}
      </section>
    );
  }

  const fecha = new Date(partido.date);
  const recreacional = partido.event_type === 'Recreacional';
  const van = confirmedPlayers.length + guestsDash.length;
  const total = Math.max(stats.activePlayers, van, 1);
  const caras = [...confirmedPlayers.map(p => ({ id: p.id, nombre: p.name, foto: p.photo_url })), ...guestsDash.map(g => ({ id: g.id, nombre: g.name, foto: null }))];

  return (
    <section aria-label={recreacional ? 'Próximo evento' : 'Próximo partido'} className="rounded-[20px] p-5 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #1c2026 0%, #181c22 60%)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 0 40px -14px rgba(68,243,169,0.25)' }}>
      <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(68,243,169,0.1), transparent 70%)' }} />

      <div className="flex items-center justify-between gap-2 relative">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/60">{recreacional ? 'Próximo evento' : 'Próximo partido'}</p>
        <span className="px-3 py-1 rounded-full text-xs font-bold text-soccer-green" style={{ background: 'rgba(68,243,169,0.12)' }}>
          {cuantoFalta(fecha, ahora)}
        </span>
      </div>
      <h2 className="font-headline text-[26px] leading-tight font-black text-white tracking-tight mt-2">
        {mayuscula(format(fecha, "EEEE d MMM '·' HH:mm", { locale: es }))}
      </h2>
      {partido.location && (
        <p className="flex items-center gap-1.5 text-sm text-white/65 mt-1"><MapPin size={14} className="text-soccer-green shrink-0" /> {partido.location}</p>
      )}

      <div className="mt-4 p-3.5 rounded-2xl" style={{ background: 'rgba(10,14,20,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-white/80"><span className="font-headline font-bold text-white text-base tabular-nums">{van}</span> de {total} confirmados</p>
          {caras.length > 0 && (
            <div className="flex -space-x-2" aria-hidden="true">
              {caras.slice(0, 4).map(c => (
                <span key={c.id} className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold text-white/80"
                  style={{ background: '#31353c', border: '2px solid #10141a' }}>
                  {c.foto ? <img src={c.foto} alt="" className="w-full h-full object-cover" /> : c.nombre.charAt(0).toUpperCase()}
                </span>
              ))}
              {caras.length > 4 && (
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: '#262a31', border: '2px solid #10141a' }}>+{caras.length - 4}</span>
              )}
            </div>
          )}
        </div>
        <div className="h-2 mt-2.5 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.07)' }}
          role="img" aria-label={`${stats.confirmedCount} van, ${stats.declinedCount} no van, ${stats.pendingCount} sin responder`}>
          <span className="h-full bg-soccer-green" style={{ width: `${Math.min(100, (van / total) * 100)}%` }} />
          <span className="h-full bg-red-400/50" style={{ width: `${Math.min(100, (stats.declinedCount / total) * 100)}%` }} />
        </div>
        <p className="text-xs text-white/50 mt-2 tabular-nums">{stats.declinedCount} no van · {stats.pendingCount} sin responder</p>
      </div>

      {myPlayer && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button type="button" onClick={() => handleMyConfirm('Voy')} disabled={confirmingMyStatus} aria-pressed={myConfirmStatus === 'Voy'}
            className="h-14 rounded-full flex items-center justify-center gap-2 font-headline font-bold text-lg transition-all cursor-pointer disabled:opacity-60"
            style={myConfirmStatus === 'Voy'
              ? { background: 'linear-gradient(135deg, #44f3a9, #00d68f)', color: '#003822', boxShadow: '0 8px 24px -8px rgba(68,243,169,0.6)' }
              : { background: 'rgba(68,243,169,0.08)', color: '#44f3a9', border: '1.5px solid rgba(68,243,169,0.35)' }}>
            <CheckCircle2 size={20} /> Confirmo
          </button>
          <button type="button" onClick={() => handleMyConfirm('No voy')} disabled={confirmingMyStatus} aria-pressed={myConfirmStatus === 'No voy'}
            className="h-14 rounded-full flex items-center justify-center gap-2 font-headline font-bold text-lg transition-all cursor-pointer disabled:opacity-60"
            style={myConfirmStatus === 'No voy'
              ? { background: '#f87171', color: '#2b1418' }
              : { background: '#262a31', color: 'rgba(255,255,255,0.8)', border: '1.5px solid #31353c' }}>
            <XCircle size={20} /> No voy
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-1 mt-4 pt-3 border-t border-white/[0.07] text-sm font-semibold whitespace-nowrap">
        {isMatchmaker ? (
          <button type="button" onClick={openAttendanceModal} className="flex items-center gap-1 text-[#9acbff] hover:text-white py-2 cursor-pointer">
            Asistencia <ChevronRight size={15} />
          </button>
        ) : (
          <Link to="/calendar" className="flex items-center gap-1 text-[#9acbff] hover:text-white py-2">Calendario <ChevronRight size={15} /></Link>
        )}
        {isMatchmaker && !recreacional && (
          <Link to="/matchmaking" className="flex items-center gap-1 text-[#9acbff] hover:text-white py-2"><Users size={14} /> Armar</Link>
        )}
        <button type="button" onClick={copyForWhatsApp} aria-label="Copiar la lista para WhatsApp" className="flex items-center gap-1.5 py-2 cursor-pointer"
          style={{ color: copied ? '#44f3a9' : '#9acbff' }}>
          <Copy size={14} /> {copied ? '¡Copiado!' : 'WhatsApp'}
        </button>
      </div>
    </section>
  );
}
