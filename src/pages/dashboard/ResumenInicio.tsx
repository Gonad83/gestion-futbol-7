import { Link } from 'react-router-dom';
import { AlertTriangle, Wallet, UserX, TrendingUp, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AjustesEquipoDash, DashboardStats, JugadorDash } from '../../lib/api/dashboard';
import { clp } from '../../lib/formato';

/** Aviso rojo si el jugador que mira debe cuotas, con el botón de pago si el equipo lo tiene activo. */
export function AvisoCuota({ stats, myPlayer, teamSettings }: { stats: DashboardStats; myPlayer: JugadorDash | null; teamSettings: AjustesEquipoDash }) {
  if (!myPlayer) return null;
  const debe = stats.morosos.find(m => m.id === myPlayer.id)?.pendingPayments ?? [];
  if (debe.length === 0) return null;

  const meses = debe.slice(0, 3).map(p => format(new Date(p.year, p.month - 1), 'MMMM', { locale: es })).join(', ') + (debe.length > 3 ? '…' : '');
  const conPago = teamSettings.payment_button_enabled && !!teamSettings.payment_link;

  return (
    <section role="status" className="flex items-center gap-3 p-4 rounded-[20px]"
      style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', boxShadow: '0 0 16px rgba(248,113,113,0.12)' }}>
      <span className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-red-300" style={{ background: 'rgba(248,113,113,0.15)' }}>
        <AlertTriangle size={20} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/85 leading-snug">
          {debe.length === 1 ? 'Tu cuota de' : `Tienes ${debe.length} cuotas pendientes:`} {meses}{debe.length === 1 && ' está pendiente'}
        </p>
      </div>
      {conPago ? (
        <a href={teamSettings.payment_link} target="_blank" rel="noopener noreferrer"
          className="shrink-0 h-11 px-5 rounded-full flex items-center font-bold text-sm" style={{ background: '#fca5a5', color: '#2b1418' }}>
          Pagar
        </a>
      ) : (
        <Link to="/finance" className="shrink-0 h-11 px-4 rounded-full flex items-center font-bold text-sm text-red-200" style={{ border: '1px solid rgba(248,113,113,0.4)' }}>
          Ver
        </Link>
      )}
    </section>
  );
}

function Mosaico({ to, etiqueta, icono, children, color }: { to: string; etiqueta: string; icono: React.ReactNode; children: React.ReactNode; color?: string }) {
  return (
    <Link to={to} className="group block p-4 rounded-[20px] transition-colors hover:bg-[#1c2026]"
      style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>
      <span className="flex items-center justify-between text-sm font-semibold" style={{ color: color ?? 'rgba(255,255,255,0.65)' }}>
        {etiqueta} <span className="opacity-80">{icono}</span>
      </span>
      <span className="mt-2 flex items-end justify-between gap-1">
        {children}
        <ChevronRight size={16} className="text-white/30 group-hover:text-white/60 mb-1 shrink-0" />
      </span>
    </Link>
  );
}

/**
 * Dos mosaicos: la caja del equipo y, para el capitán, cuántos deben; para el
 * jugador, su porcentaje de asistencia.
 */
export function MosaicosInicio({ stats, isAdmin, myPlayer }: { stats: DashboardStats; isAdmin: boolean; myPlayer: JugadorDash | null }) {
  // Ojo: el amount de una cuota pendiente es lo que ya abonó, no lo que debe; por eso se cuentan meses, no plata.
  const mesesAdeudados = stats.morosos.reduce((s, m) => s + m.pendingPayments.length, 0);
  const misPartidos = myPlayer ? stats.topParticipations.find(p => p.id === myPlayer.id)?.count ?? 0 : 0;
  const asistencia = stats.totalMatchesPlayed > 0 ? Math.round((misPartidos / stats.totalMatchesPlayed) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Mosaico to="/finance" etiqueta="Caja actual" icono={<Wallet size={17} className="text-soccer-green" />}>
        <span className={`font-headline font-black text-2xl tabular-nums truncate ${stats.balance >= 0 ? 'text-white' : 'text-red-400'}`}>{clp(stats.balance)}</span>
      </Mosaico>
      {isAdmin || !myPlayer ? (
        <Mosaico to="/finance" etiqueta="Morosos" color="#fca5a5" icono={<UserX size={17} />}>
          <span className="min-w-0">
            <span className="font-headline font-black text-2xl tabular-nums text-red-300">{stats.morosos.length}</span>
            {mesesAdeudados > 0 && <span className="text-xs text-white/55 tabular-nums"> · {mesesAdeudados} {mesesAdeudados === 1 ? 'cuota' : 'cuotas'}</span>}
          </span>
        </Mosaico>
      ) : (
        <Mosaico to="/players" etiqueta="Tu asistencia" icono={<TrendingUp size={17} className="text-[#9acbff]" />}>
          <span className="min-w-0">
            <span className="font-headline font-black text-2xl tabular-nums text-white">{asistencia}%</span>
            <span className="text-xs text-white/55 tabular-nums"> · {misPartidos}/{stats.totalMatchesPlayed}</span>
          </span>
        </Mosaico>
      )}
    </div>
  );
}
