import { Users, DollarSign, CalendarDays, ArrowRight, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DashboardStats } from '../../lib/api/dashboard';
import { getMatchTimeLabel } from './util';

interface Props {
  stats: DashboardStats;
}

export function FilaKpi({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        {
          label: 'Jugadores Activos',
          value: stats.activePlayers,
          sub: `${stats.totalPlayers} registrados`,
          icon: <Users size={18} />,
          color: '#44f3a9',
          link: '/players'
        },
        {
          label: stats.nextMatch?.event_type === 'Recreacional' ? 'Próximo Evento' : 'Próximo Partido',
          value: stats.nextMatch ? format(new Date(stats.nextMatch.date), 'dd MMM', { locale: es }) : 'Por programar',
          sub: stats.nextMatch ? getMatchTimeLabel(stats.nextMatch.date) : 'Sin partidos próximos',
          icon: <CalendarDays size={18} />,
          color: '#9acbff',
          link: '/calendar'
        },
        {
          label: 'Confirmados',
          value: stats.confirmedCount,
          sub: stats.nextMatch 
            ? (stats.nextMatch.event_type === 'Recreacional' ? 'para el próximo evento' : 'para el próximo partido')
            : 'Sin partido programado',
          icon: <Trophy size={18} />,
          color: '#ffd08b',
          link: stats.nextMatch?.event_type === 'Recreacional' ? '/calendar' : '/matchmaking'
        },
        {
          label: 'Saldo de Caja',
          value: `$${Math.round(stats.balance).toLocaleString('es-CL')}`,
          sub: stats.balance >= 0 ? 'Balance positivo' : 'Balance negativo',
          icon: <DollarSign size={18} />,
          color: stats.balance >= 0 ? '#44f3a9' : '#f87171',
          link: '/finance'
        },
      ].map((kpi) => (
        <Link key={kpi.label} to={kpi.link} className="group block">
          <div
            className="rounded-2xl p-5 h-full transition-all duration-300 group-hover:translate-y-[-2px]"
            style={{
              background: '#1c2026',
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${kpi.color}18`, color: kpi.color }}
              >
                {kpi.icon}
              </div>
              <ArrowRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
            </div>
            <p className="font-headline text-3xl font-black text-white tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>
              {kpi.value}
            </p>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/50 mb-0.5">{kpi.label}</p>
            <p className="text-xs text-white/50">{kpi.sub}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
