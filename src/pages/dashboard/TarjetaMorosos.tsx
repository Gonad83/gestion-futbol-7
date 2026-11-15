import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DashboardStats } from '../../lib/api/dashboard';

interface Props {
  stats: DashboardStats;
  isAdmin: boolean;
}

export function TarjetaMorosos({ stats, isAdmin }: Props) {
  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>
            <AlertTriangle size={16} />
          </div>
          <h2 className="font-headline font-bold text-white">Cuotas Atrasadas</h2>
        </div>
        <span
          className="text-[11px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider"
          style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
        >
          {stats.morosos.length} jugadores
        </span>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-[260px] custom-scrollbar pr-1">
        {stats.morosos.length === 0 ? (
          <div className="text-center py-10 rounded-xl" style={{ background: 'rgba(68,243,169,0.04)', border: '1px dashed rgba(68,243,169,0.15)' }}>
            <p className="text-soccer-green font-semibold text-sm">¡Todos al día este mes!</p>
          </div>
        ) : (
          stats.morosos.map(player => (
            <div
              key={player.id}
              className="flex justify-between items-center p-3 rounded-xl transition-colors hover:bg-white/3"
              style={{ background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.1)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs text-white font-bold"
                  style={{ background: '#31353c', border: '1px solid rgba(248,113,113,0.25)' }}
                >
                  {player.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm leading-tight">{player.name}</p>
                  <p className="text-[11px] text-red-400/80 capitalize mt-0.5">
                    {player.pendingPayments.map((p) => format(new Date(p.year, p.month - 1), 'MMM yyyy', { locale: es })).join(', ')}
                  </p>
                </div>
              </div>
              {isAdmin && (
                <Link
                  to="/finance"
                  className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                >
                  Cobrar
                </Link>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
