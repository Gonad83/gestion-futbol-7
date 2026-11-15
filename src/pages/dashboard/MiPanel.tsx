import { CheckCircle2, XCircle, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DashboardStats, JugadorDash } from '../../lib/api/dashboard';

interface Props {
  stats: DashboardStats;
  myPlayer: JugadorDash;
  myConfirmStatus: string;
  confirmingMyStatus: boolean;
  handleMyConfirm: (estado: 'Voy' | 'No voy') => void;
}

export function MiPanel({ stats, myPlayer, myConfirmStatus, confirmingMyStatus, handleMyConfirm }: Props) {
  const myParticipationCount = stats.topParticipations.find(p => p.id === myPlayer.id)?.count ?? 0;
  const myPendingPayments = stats.morosos.find(p => p.id === myPlayer.id)?.pendingPayments ?? [];
  const attendancePct = stats.totalMatchesPlayed > 0 ? Math.round((myParticipationCount / stats.totalMatchesPlayed) * 100) : 0;
  return (
    <div className="glass-card">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9' }}>
          <User size={16} />
        </div>
        <h2 className="font-headline font-bold text-white">Tu Panel</h2>
      </div>

      <div className="flex flex-wrap gap-5 items-center">
        {/* Avatar + info */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: '#31353c', border: '2px solid rgba(68,243,169,0.3)' }}>
            {myPlayer.photo_url
              ? <img src={myPlayer.photo_url} alt={myPlayer.name} className="w-full h-full object-cover" />
              : <span className="text-lg font-black" style={{ color: 'rgba(255,255,255,0.3)' }}>{myPlayer.name.charAt(0)}</span>
            }
          </div>
          <div>
            <p className="font-bold text-white leading-tight">{myPlayer.name}</p>
            <p className="text-xs text-white/50">{myPlayer.position || 'Jugador'}</p>
            {myPlayer.match_role && (
              <span className="text-[11px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md mt-0.5 inline-block" style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9' }}>
                {myPlayer.match_role}
              </span>
            )}
          </div>
        </div>

        <div className="hidden sm:block w-px h-10 self-center" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Participaciones */}
        <div className="text-center">
          <p className="font-headline font-black text-2xl text-white" style={{ letterSpacing: '-0.02em' }}>{attendancePct}%</p>
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">Asistencia</p>
          <p className="text-[11px] font-bold mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {myParticipationCount}/{stats.totalMatchesPlayed}
          </p>
        </div>

        <div className="hidden sm:block w-px h-10 self-center" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Próximo partido — confirmación rápida */}
        {stats.nextMatch && (
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">
              {stats.nextMatch.event_type === 'Recreacional' ? 'Próximo evento' : 'Próximo partido'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleMyConfirm('Voy')}
                disabled={confirmingMyStatus}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-60 hover:brightness-110"
                style={myConfirmStatus === 'Voy'
                  ? { background: '#44f3a9', color: '#003822' }
                  : { background: 'rgba(68,243,169,0.1)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}
              >
                <CheckCircle2 size={12} /> Voy
              </button>
              <button
                onClick={() => handleMyConfirm('No voy')}
                disabled={confirmingMyStatus}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-60 hover:brightness-110"
                style={myConfirmStatus === 'No voy'
                  ? { background: '#ef4444', color: 'white' }
                  : { background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
              >
                <XCircle size={12} /> No voy
              </button>
            </div>
          </div>
        )}

        <div className="hidden sm:block w-px h-10 self-center" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Cuotas */}
        <div className="text-center">
          {myPendingPayments.length === 0 ? (
            <>
              <p className="font-headline font-black text-lg" style={{ color: '#44f3a9' }}>Al día ✓</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">Cuotas</p>
            </>
          ) : (
            <>
              <p className="font-headline font-black text-lg" style={{ color: '#f87171' }}>
                {myPendingPayments.length} mes{myPendingPayments.length > 1 ? 'es' : ''}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#f87171' }}>Pendiente</p>
              <p className="text-[11px] text-white/50 mt-0.5 capitalize">
                {myPendingPayments.slice(0, 3).map((p) => format(new Date(p.year, p.month - 1), 'MMM', { locale: es })).join(', ')}
                {myPendingPayments.length > 3 ? '…' : ''}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
