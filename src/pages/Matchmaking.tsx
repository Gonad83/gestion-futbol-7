import { RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMatchmaking } from './matchmaking/useMatchmaking';
import { EncabezadoPartido } from './matchmaking/EncabezadoPartido';
import { SinPartido } from './matchmaking/SinPartido';
import { BarraControles } from './matchmaking/BarraControles';
import { Convocados } from './matchmaking/Convocados';
import { Pizarra } from './matchmaking/Pizarra';
import { ModalInvitado } from './matchmaking/ModalInvitado';

/**
 * Matchmaking. Aquí solo se arma la pantalla: los datos y acciones vienen de
 * useMatchmaking y cada bloque se dibuja en su propio archivo en ./matchmaking.
 * Antes de armar equipos se ve la lista de convocados; después, la pizarra.
 */
export default function Matchmaking() {
  const { isMatchmaker: canManage, teamId } = useAuth();
  const m = useMatchmaking(teamId, canManage);

  if (m.loading && !m.selectedMatch) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="animate-spin text-soccer-green" size={40} />
        <p className="text-slate-400 font-medium animate-pulse tracking-wide">Cargando pizarra táctica...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-36 md:pb-20 fade-in">
      <EncabezadoPartido {...m} />

      {!m.selectedMatch ? (
        <SinPartido />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <BarraControles {...m} />
          {!m.teamsGenerated ? <Convocados {...m} /> : <Pizarra {...m} />}
        </div>
      )}

      {m.showGuestModal && <ModalInvitado {...m} showGuestModal={m.showGuestModal} />}
    </div>
  );
}
