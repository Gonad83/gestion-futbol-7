import { Scale, Info } from 'lucide-react';
import { FichaJugador } from './FichaJugador';
import { getAvg, hexCamiseta, posicionVertical, type Equipo, type JugadorMM, type SeleccionCambio } from '../../lib/matchmaking';

const nombreCorto = (nombre: string) => {
  const limpio = nombre.replace(/\s*\(I\)\s*$/i, '').trim();
  const partes = limpio.split(/\s+/);
  return partes.length > 1 ? `${partes[0][0]}. ${partes[partes.length - 1]}` : limpio;
};

/**
 * Alto de las láminas de un equipo: lo que deja el espacio entre sus líneas
 * (cada equipo ocupa un 33% del alto de la cancha) y el ancho de su línea más poblada.
 * Se mide con las dos formaciones para que ambos equipos queden del mismo tamaño.
 */
function altoLamina(...formaciones: string[]): string {
  const medidas = formaciones.flatMap((formacion) => {
    const lineas = [1, ...formacion.split('-').map(Number)];
    const entreLineas = lineas.length > 1 ? 33 / (lineas.length - 1) : 33;
    const porAncho = (100 / (Math.max(...lineas) + 1)) * 0.92 * (4 / 3);
    return [`${(entreLineas * 0.95).toFixed(2)}cqh`, `${porAncho.toFixed(2)}cqw`];
  });
  return `min(${medidas.join(', ')}, 16cqh)`;
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
  // La banca guarda su posición en el equipo: tocar a un suplente y luego a un titular los cambia.
  const banca = (equipo: JugadorMM[], formacion: string) =>
    equipo.map((jugador, index) => ({ jugador, index })).filter(({ index }) => posicionVertical(index, 'A', formacion) === null);
  const bancaA = banca(teamA, formationA);
  const bancaB = banca(teamB, formationB);
  const fichas = (equipo: JugadorMM[], team: Equipo, formacion: string, color: string) => {
    const alto = altoLamina(formationA, formationB);
    return equipo.map((p, i) => {
      const pos = posicionVertical(i, team, formacion);
      if (!pos) return null;
      const elegido = swapSelection?.team === team && swapSelection?.index === i;
      return (
        <div key={p.id} className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500" style={{ ...pos, zIndex: elegido ? 2 : 1 }}>
          <FichaJugador jugador={p} color={color} arquero={i === 0} alto={alto} orden={i} elegido={elegido}
            onClick={canEdit ? () => handleSwap(team, i) : undefined} />
        </div>
      );
    });
  };

  const diferencia = Math.abs(Number(getAvg(teamA)) - Number(getAvg(teamB))).toFixed(1);

  return (
    <div className="space-y-3">
      {canEdit && (
        <p className="flex items-center justify-center gap-1.5 text-xs" style={{ color: swapSelection ? '#ffd08b' : 'rgba(255,255,255,0.55)' }} aria-live="polite">
          <Info size={13} /> {swapSelection ? 'Toca otro jugador (en la cancha o la banca) para intercambiarlos' : 'Toca dos jugadores para cambiarlos de lugar, también los de la banca'}
        </p>
      )}

      {/* Más alta que ancha para que las láminas de los dos equipos quepan sin encimarse. */}
      <div className="relative w-full aspect-[9/16] rounded-[20px] overflow-hidden"
        style={{
          containerType: 'size',
          background: 'radial-gradient(ellipse 80% 40% at 50% 50%, rgba(68,243,169,0.12), transparent 70%), repeating-linear-gradient(180deg, #14553c 0 6.25%, #0f4530 6.25% 12.5%)',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.08)',
        }}>
        {/* Líneas de la cancha */}
        <div className="absolute inset-3 rounded-xl border-2 border-white/25 pointer-events-none" />
        <div className="absolute left-3 right-3 top-1/2 h-0.5 -translate-y-1/2 bg-white/25 pointer-events-none" />
        <div className="absolute left-1/2 top-1/2 w-[28%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25 pointer-events-none" />
        <div className="absolute left-1/2 top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 pointer-events-none" />
        <div className="absolute left-1/2 top-3 w-[56%] h-[11%] -translate-x-1/2 border-2 border-t-0 border-white/25 pointer-events-none" />
        <div className="absolute left-1/2 top-3 w-[26%] h-[4.5%] -translate-x-1/2 border-2 border-t-0 border-white/25 pointer-events-none" />
        <div className="absolute left-1/2 bottom-3 w-[56%] h-[11%] -translate-x-1/2 border-2 border-b-0 border-white/25 pointer-events-none" />
        <div className="absolute left-1/2 bottom-3 w-[26%] h-[4.5%] -translate-x-1/2 border-2 border-b-0 border-white/25 pointer-events-none" />

        {fichas(teamB, 'B', formationB, colorB)}
        {fichas(teamA, 'A', formationA, colorA)}
      </div>

      {(bancaA.length > 0 || bancaB.length > 0) && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {([['A', bancaA, colorA], ['B', bancaB, colorB]] as const).map(([t, lista, c]) => (
            <div key={t} className="p-2.5 rounded-xl" style={{ background: '#181c22' }}>
              <p className="font-bold mb-1.5" style={{ color: hexCamiseta(c) }}>Banca {t}</p>
              {lista.length === 0 ? <p className="text-white/50">—</p> : (
                <ul className="flex flex-wrap gap-1.5">
                  {lista.map(({ jugador, index }) => {
                    const elegido = swapSelection?.team === t && swapSelection?.index === index;
                    return (
                      <li key={jugador.id}>
                        {canEdit ? (
                          <button type="button" onClick={() => handleSwap(t, index)} aria-pressed={elegido}
                            aria-label={`${jugador.name}, suplente del equipo ${t}${elegido ? ', elegido para cambiar' : ''}`}
                            className="min-h-[44px] px-3 rounded-full font-semibold cursor-pointer transition-colors"
                            style={elegido
                              ? { background: '#ffd08b', color: '#2b1d05' }
                              : { background: '#262a31', color: 'rgba(255,255,255,0.85)', border: `1px solid ${hexCamiseta(c)}55` }}>
                            {nombreCorto(jugador.name)}
                          </button>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-full text-white/75" style={{ background: '#262a31' }}>{nombreCorto(jugador.name)}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
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
