import { Scale, Info } from 'lucide-react';
import { getAvg, hexCamiseta, posicionVertical, type Equipo, type JugadorMM, type SeleccionCambio } from '../../lib/matchmaking';

const nombreCorto = (nombre: string) => {
  const limpio = nombre.replace(/\s*\(I\)\s*$/i, '').trim();
  const partes = limpio.split(/\s+/);
  return partes.length > 1 ? `${partes[0][0]}. ${partes[partes.length - 1]}` : limpio;
};

interface FichaProps {
  jugador: JugadorMM;
  color: string;
  arquero: boolean;
  elegido: boolean;
  onClick?: () => void;
}

function Ficha({ jugador, color, arquero, elegido, onClick }: FichaProps) {
  const anillo = arquero ? '#ffd08b' : color;
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      aria-label={`${jugador.name}${elegido ? ', elegido para cambiar' : ''}`} aria-pressed={elegido}
      className="flex flex-col items-center gap-0.5 w-16 enabled:cursor-pointer">
      <span className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white transition-transform"
        style={{
          background: '#10141a', border: `2.5px solid ${anillo}`,
          boxShadow: elegido ? '0 0 0 4px rgba(255,208,139,0.35), 0 0 18px rgba(255,208,139,0.6)' : '0 4px 10px rgba(0,0,0,0.5)',
          transform: elegido ? 'scale(1.12)' : undefined,
        }}>
        {jugador.photo_url
          ? <img src={jugador.photo_url} alt="" className="w-full h-full object-cover" />
          : jugador.name.replace(/\s*\(I\)\s*$/i, '').trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')}
      </span>
      <span className="max-w-full truncate px-1 rounded text-[11px] font-semibold leading-tight"
        style={elegido ? { background: '#ffd08b', color: '#2b1d00' } : { color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
        {nombreCorto(jugador.name)}
      </span>
    </button>
  );
}

interface Props {
  teamA: JugadorMM[];
  teamB: JugadorMM[];
  formationA: string;
  formationB: string;
  colorA: string;
  colorB: string;
  swapSelection: SeleccionCambio | null;
  canEdit: boolean;
  handleSwap: (team: Equipo, index: number) => void;
}

/**
 * Cancha vertical para el celular (la horizontal no cabe: 14 cartas en 343 px
 * de ancho quedaban encimadas). B arriba, A abajo; tocar dos fichas las cambia.
 */
export function CanchaMovil({ teamA, teamB, formationA, formationB, colorA, colorB, swapSelection, canEdit, handleSwap }: Props) {
  const banca = (equipo: JugadorMM[], formacion: string) => equipo.filter((_, i) => posicionVertical(i, 'A', formacion) === null);
  const bancaA = banca(teamA, formationA);
  const bancaB = banca(teamB, formationB);
  const fichas = (equipo: JugadorMM[], team: Equipo, formacion: string, color: string) =>
    equipo.map((p, i) => {
      const pos = posicionVertical(i, team, formacion);
      if (!pos) return null;
      return (
        <div key={p.id} className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500" style={pos}>
          <Ficha jugador={p} color={color} arquero={i === 0} onClick={canEdit ? () => handleSwap(team, i) : undefined}
            elegido={swapSelection?.team === team && swapSelection?.index === i} />
        </div>
      );
    });

  const diferencia = Math.abs(Number(getAvg(teamA)) - Number(getAvg(teamB))).toFixed(1);

  return (
    <div className="space-y-3">
      {canEdit && (
        <p className="flex items-center justify-center gap-1.5 text-xs" style={{ color: swapSelection ? '#ffd08b' : 'rgba(255,255,255,0.55)' }} aria-live="polite">
          <Info size={13} /> {swapSelection ? 'Toca otro jugador para intercambiarlos' : 'Toca dos jugadores para cambiarlos de lugar'}
        </p>
      )}

      <div className="relative w-full aspect-[3/4] rounded-[20px] overflow-hidden"
        style={{ background: 'repeating-linear-gradient(180deg, #0f3d2c 0 12.5%, #0d3627 12.5% 25%)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Líneas de la cancha */}
        <div className="absolute inset-3 rounded-xl border border-white/20 pointer-events-none" />
        <div className="absolute left-3 right-3 top-1/2 h-px bg-white/20 pointer-events-none" />
        <div className="absolute left-1/2 top-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 pointer-events-none" />
        <div className="absolute left-1/2 top-3 w-32 h-14 -translate-x-1/2 border border-t-0 border-white/20 pointer-events-none" />
        <div className="absolute left-1/2 bottom-3 w-32 h-14 -translate-x-1/2 border border-b-0 border-white/20 pointer-events-none" />

        {fichas(teamB, 'B', formationB, hexCamiseta(colorB))}
        {fichas(teamA, 'A', formationA, hexCamiseta(colorA))}
      </div>

      {(bancaA.length > 0 || bancaB.length > 0) && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {([['A', bancaA, colorA], ['B', bancaB, colorB]] as const).map(([t, lista, c]) => (
            <div key={t} className="p-2.5 rounded-xl" style={{ background: '#181c22' }}>
              <p className="font-bold mb-1" style={{ color: hexCamiseta(c) }}>Banca {t}</p>
              <p className="text-white/70 leading-snug">{lista.length ? lista.map(p => nombreCorto(p.name)).join(', ') : '—'}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 p-3 rounded-2xl" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="flex items-center gap-1.5 font-headline font-bold text-white text-sm">
          <i className="w-2.5 h-2.5 rounded-full" style={{ background: hexCamiseta(colorA) }} /> A <span className="text-[#ffd08b] tabular-nums">★ {getAvg(teamA)}</span>
        </span>
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-white/70 tabular-nums" style={{ background: '#262a31' }}>
          <Scale size={13} /> Dif. {diferencia}
        </span>
        <span className="flex items-center gap-1.5 font-headline font-bold text-white text-sm">
          <span className="text-[#ffd08b] tabular-nums">★ {getAvg(teamB)}</span> B <i className="w-2.5 h-2.5 rounded-full" style={{ background: hexCamiseta(colorB) }} />
        </span>
      </div>
    </div>
  );
}
