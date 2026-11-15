import { Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardStats } from '../../lib/api/dashboard';

interface Props {
  stats: DashboardStats;
}

export function TarjetaPlantilla({ stats }: Props) {
  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9' }}>
            <Users size={16} />
          </div>
          <h2 className="font-headline font-bold text-white">Plantilla</h2>
        </div>
        <Link to="/players" className="text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: '#44f3a9' }}>
          Ver equipo <ArrowRight size={13} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="rounded-2xl p-6 text-center" style={{ background: '#0a0e14', border: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="font-headline text-5xl font-black text-white mb-2" style={{ letterSpacing: '-0.02em' }}>{stats.activePlayers}</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: '#44f3a9' }}>Activos</p>
        </div>
        <div className="rounded-2xl p-6 text-center" style={{ background: '#0a0e14', border: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="font-headline text-5xl font-black text-white mb-2" style={{ letterSpacing: '-0.02em' }}>{stats.totalPlayers}</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/50">Registrados</p>
        </div>
      </div>

      <p className="text-xs text-white/50 text-center pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        Inactivos y lesionados no aparecen en cobros ni matchmaking.
      </p>
    </div>
  );
}
