import { useMemo, useState } from 'react';
import { Info, RotateCcw, Shield, Star } from 'lucide-react';
import type { DashboardStats, JugadorDash } from '../../lib/api/dashboard';
import { Lamina } from '../../components/Lamina';
import { JERSEY_COLORS, formacionesDe } from '../../lib/matchmaking';
import { armarTitular, intercambiarPuestos, LINEAS, type Puesto, type TitularGuardado } from './titular';


const NOMBRE_LINEA = { Portero: 'Portero', Defensa: 'Defensa', Medio: 'Medio', Delantero: 'Delantero' } as const;

const SIGLA_LINEA = { Portero: 'POR', Defensa: 'DEF', Medio: 'MED', Delantero: 'DEL' } as const;

const nombreCorto = (nombre: string) => {
  const partes = nombre.trim().split(/\s+/);
  return partes.length > 1 ? `${partes[0][0]}. ${partes[partes.length - 1]}` : nombre.trim();
};
/** Lo que cabe al pie de la lámina: el apodo, o si no el apellido. */
const rotulo = (j: JugadorDash) => j.nickname?.trim() || j.name.trim().split(/\s+/).pop() || j.name;
const siglaPosicion = (posicion: string | null) => (posicion ? posicion.trim().slice(0, 3).toUpperCase() : '—');

function Ficha({ puesto, color, elegido, orden, onClick }: { puesto: Puesto<JugadorDash>; color: string; elegido: boolean; orden: number; onClick?: () => void }) {
  const { jugador: j, linea, fueraDePuesto } = puesto;
  return (
    <Lamina nombre={j.name} rotulo={rotulo(j)} foto={j.photo_url} estrellas={j.rating} puesto={SIGLA_LINEA[linea]}
      color={color} fueraDePuesto={fueraDePuesto} elegido={elegido}
      alto="min(21cqh, 30cqw)" orden={orden} onClick={onClick}
      ariaLabel={`${NOMBRE_LINEA[linea]}: ${j.name}${fueraDePuesto ? ' (fuera de su puesto)' : ''}${elegido ? ', elegido para cambiar' : ''}`}
      title={`${j.name} · ${j.position || 'Sin posición'}${fueraDePuesto ? ' (fuera de su puesto)' : ''}`} />
  );
}

interface Props {
  stats: DashboardStats;
  /** Lo que el capitán dejó armado a mano (formación y puestos); null si nunca lo tocó. */
  guardado: TitularGuardado | null;
  puedeEditar: boolean;
  onGuardar: (titular: TitularGuardado) => void;
}

/**
 * El siete ideal para los amistosos, dibujado en la cancha. Se arma solo con
 * los mejores por estrellas en su puesto; el capitán puede tocar dos jugadores
 * para rotarlos o meter a uno de la banca, y eso queda guardado para todos.
 */
export function TarjetaTitular({ stats, guardado, puedeEditar, onGuardar }: Props) {
  const [elegido, setElegido] = useState<string | null>(null);
  // Las formaciones dependen del formato del próximo partido (en 5vs5, cuatro jugadores de campo).
  const FORMACIONES = formacionesDe(stats.nextMatch?.match_type);
  const formacion = FORMACIONES.some((f) => f.value === guardado?.formacion) ? guardado!.formacion : FORMACIONES[0].value;
  const fijos = guardado?.puestos;
  const color = JERSEY_COLORS.some((c) => c.value === guardado?.color) ? guardado!.color! : 'emerald';
  const aMano = Boolean(fijos?.some(Boolean));

  const titular = useMemo(() => {
    const partidos = Object.fromEntries(stats.topParticipations.map((p) => [p.id, p.count]));
    const noVan = new Set(stats.declinedIds);
    return armarTitular(stats.allPlayers.filter((j) => !noVan.has(j.id)), formacion, partidos, fijos);
  }, [stats.allPlayers, stats.topParticipations, stats.declinedIds, formacion, fijos]);
  const bajas = stats.allPlayers.filter((j) => j.status === 'Activo' && stats.declinedIds.includes(j.id));

  const filas = LINEAS.map((l) => titular.lineas[l]).filter((f) => f.length > 0);
  if (filas.length === 0) return null;

  const enBanca = (id: string) => titular.banca.some((j) => j.id === id);
  const tocar = (id: string) => {
    if (!elegido || (enBanca(elegido) && enBanca(id))) return setElegido(id);
    if (elegido !== id) onGuardar({ formacion, puestos: intercambiarPuestos(titular, formacion, elegido, id), color });
    setElegido(null);
  };

  return (
    <section className="glass-card relative overflow-hidden" aria-label="Equipo titular">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9' }}>
          <Shield size={16} />
        </div>
        <div className="min-w-0">
          <h2 className="font-headline font-bold text-white leading-tight">Equipo titular</h2>
          <p className="text-[11px] text-white/50">
            {aMano ? 'Armado por el capitán' : stats.nextMatch ? 'Los mejores disponibles para el próximo partido' : 'Los mejores por estrellas en su puesto'}
          </p>
        </div>
        <span className="ml-auto flex items-center gap-1 text-sm font-headline font-black tabular-nums shrink-0" style={{ color: '#ffd08b' }}>
          <Star size={13} fill="#ffd08b" strokeWidth={0} /> {titular.promedio}
        </span>
      </div>

      {puedeEditar ? (
        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto" role="group" aria-label="Formación">
          {FORMACIONES.map((f) => {
            const activa = f.value === formacion;
            return (
              <button key={f.value} type="button" aria-pressed={activa} title={f.name}
                onClick={() => { if (!activa) onGuardar({ formacion: f.value, puestos: fijos ?? [], color }); }}
                className="shrink-0 h-9 px-3 rounded-full text-xs font-bold tabular-nums transition-colors"
                style={activa ? { background: 'rgba(68,243,169,0.15)', color: '#44f3a9' } : { background: '#262a31', color: 'rgba(255,255,255,0.6)' }}>
                {f.value}
              </button>
            );
          })}
          {aMano && (
            <button type="button" onClick={() => { setElegido(null); onGuardar({ formacion, puestos: [], color }); }}
              className="shrink-0 ml-auto h-9 px-3 rounded-full flex items-center gap-1.5 text-xs font-bold text-[#9acbff]" style={{ background: 'rgba(154,203,255,0.1)' }}>
              <RotateCcw size={13} /> Automático
            </button>
          )}
        </div>
      ) : (
        <p className="mb-3 text-xs font-bold tabular-nums text-white/60">Formación {formacion}</p>
      )}

      {puedeEditar && (
        <div className="flex flex-wrap items-center gap-1 mb-3" role="group" aria-label="Color de las láminas">
          <span className="text-xs text-white/55 mr-1">Color</span>
          {JERSEY_COLORS.map((c) => (
            <button key={c.value} type="button" title={c.name} aria-label={c.name} aria-pressed={color === c.value}
              onClick={() => { if (color !== c.value) onGuardar({ formacion, puestos: fijos ?? [], color: c.value }); }}
              className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
              style={{ border: color === c.value ? '2px solid #fff' : '2px solid transparent' }}>
              <span className={`w-6 h-6 rounded-full border ${c.class}`} />
            </button>
          ))}
        </div>
      )}

      {puedeEditar && (
        <p className="flex items-center gap-1.5 mb-2 text-xs" style={{ color: elegido ? '#ffd08b' : 'rgba(255,255,255,0.55)' }} aria-live="polite">
          <Info size={13} className="shrink-0" /> {elegido ? 'Toca otro jugador para intercambiarlos' : 'Toca dos jugadores para cambiarlos de puesto o sacar a uno de la banca'}
        </p>
      )}

      {/* Media cancha vista desde el arco propio; el tamaño de las láminas sale del de la cancha. */}
      <div className="relative w-full aspect-[3/4] sm:aspect-[5/4] rounded-[20px] overflow-hidden"
        style={{
          containerType: 'size',
          background: 'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(68,243,169,0.16), transparent 70%), repeating-linear-gradient(180deg, #14553c 0 12.5%, #0f4530 12.5% 25%)',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.55)',
        }}>
        <div className="absolute inset-3 rounded-xl border-2 border-white/25 pointer-events-none" />
        <div className="absolute left-1/2 top-3 w-[30%] aspect-[2/1] -translate-x-1/2 rounded-b-full border-2 border-t-0 border-white/25 pointer-events-none" />
        <div className="absolute left-1/2 top-3 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 pointer-events-none" />
        <div className="absolute left-1/2 bottom-3 w-[56%] h-[19%] -translate-x-1/2 border-2 border-b-0 border-white/25 pointer-events-none" />
        <div className="absolute left-1/2 bottom-3 w-[26%] h-[8%] -translate-x-1/2 border-2 border-b-0 border-white/25 pointer-events-none" />
        <div className="absolute left-3 bottom-3 w-4 h-4 border-t-2 border-r-2 border-white/25 rounded-tr-full pointer-events-none" />
        <div className="absolute right-3 bottom-3 w-4 h-4 border-t-2 border-l-2 border-white/25 rounded-tl-full pointer-events-none" />

        {filas.map((fila, i) => {
          const top = filas.length > 1 ? 86 - (i / (filas.length - 1)) * 71 : 50;
          const antes = filas.slice(0, i).reduce((n, f) => n + f.length, 0);
          // Con cuatro en línea (4-1-1) se abren hasta las bandas para no encimarse.
          return fila.map((puesto, k) => (
            <div key={puesto.jugador.id} className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
              style={{ top: `${top}%`, left: `${fila.length >= 4 ? 13 + (k * 74) / (fila.length - 1) : (100 / (fila.length + 1)) * (k + 1)}%`, zIndex: elegido === puesto.jugador.id ? 2 : 1 }}>
              <Ficha puesto={puesto} color={color} orden={antes + k} elegido={elegido === puesto.jugador.id} onClick={puedeEditar ? () => tocar(puesto.jugador.id) : undefined} />
            </div>
          ));
        })}
      </div>

      {titular.banca.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold text-white/80 mb-2">Banca ({titular.banca.length})</p>
          <div className="flex flex-wrap gap-2">
            {titular.banca.map((j, i) => {
              const sel = elegido === j.id;
              return (
                <Lamina key={j.id} nombre={j.name} rotulo={rotulo(j)} foto={j.photo_url} estrellas={j.rating} puesto={siglaPosicion(j.position)}
                  color={color} elegido={sel} alto="68px" orden={i} onClick={puedeEditar ? () => tocar(j.id) : undefined}
                  ariaLabel={`Banca: ${j.name}${sel ? ', elegido para cambiar' : ''}`} title={`${j.name} · ${j.position || 'Sin posición'}`} />
              );
            })}
          </div>
        </div>
      )}
      {bajas.length > 0 && (
        <p className="mt-2.5 text-xs text-white/45 leading-snug">
          <span className="font-bold text-red-300/80">No van ({bajas.length}):</span>{' '}
          {bajas.map((j) => nombreCorto(j.name)).join(', ')}
        </p>
      )}
    </section>
  );
}
