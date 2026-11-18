import { useMemo, useState } from 'react';
import { Info, RotateCcw, Shield, Star } from 'lucide-react';
import type { DashboardStats, JugadorDash } from '../../lib/api/dashboard';
import { FORMATIONS } from '../../lib/matchmaking';
import { armarTitular, intercambiarPuestos, LINEAS, type Puesto, type TitularGuardado } from './titular';

const FORMACIONES = FORMATIONS['7vs7'];
const NOMBRE_LINEA = { Portero: 'Portero', Defensa: 'Defensa', Medio: 'Medio', Delantero: 'Delantero' } as const;

const nombreCorto = (nombre: string) => {
  const partes = nombre.trim().split(/\s+/);
  return partes.length > 1 ? `${partes[0][0]}. ${partes[partes.length - 1]}` : nombre.trim();
};
const iniciales = (nombre: string) => nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

const BRILLO_ELEGIDO = '0 0 0 4px rgba(255,208,139,0.35), 0 0 18px rgba(255,208,139,0.6)';

function Ficha({ puesto, elegido, onClick }: { puesto: Puesto<JugadorDash>; elegido: boolean; onClick?: () => void }) {
  const { jugador: j, linea, fueraDePuesto } = puesto;
  const anillo = linea === 'Portero' ? '#ffd08b' : '#44f3a9';
  return (
    <button type="button" onClick={onClick} disabled={!onClick} aria-pressed={onClick ? elegido : undefined}
      aria-label={`${NOMBRE_LINEA[linea]}: ${j.name}${fueraDePuesto ? ' (fuera de su puesto)' : ''}${elegido ? ', elegido para cambiar' : ''}`}
      title={`${j.name} · ${j.position || 'Sin posición'}${fueraDePuesto ? ' (fuera de su puesto)' : ''}`}
      className="flex flex-col items-center gap-0.5 w-[72px] enabled:cursor-pointer">
      <span className="relative transition-transform" style={{ transform: elegido ? 'scale(1.12)' : undefined }}>
        <span className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white"
          style={{ background: '#10141a', border: `2.5px ${fueraDePuesto ? 'dashed' : 'solid'} ${anillo}`, boxShadow: elegido ? BRILLO_ELEGIDO : '0 4px 10px rgba(0,0,0,0.5)' }}>
          {j.photo_url ? <img src={j.photo_url} alt="" className="w-full h-full object-cover" /> : iniciales(j.name)}
        </span>
        {j.rating ? (
          <span className="absolute -bottom-1 -right-2 flex items-center gap-px px-1 rounded-full text-[10px] font-black tabular-nums"
            style={{ background: '#10141a', color: '#ffd08b', border: '1px solid rgba(255,208,139,0.35)' }}>
            <Star size={8} fill="#ffd08b" strokeWidth={0} />{j.rating}
          </span>
        ) : null}
      </span>
      <span className="max-w-full truncate px-1 rounded text-[11px] font-semibold leading-tight"
        style={elegido ? { background: '#ffd08b', color: '#2b1d00' } : { color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
        {nombreCorto(j.name)}
      </span>
    </button>
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
  const formacion = FORMACIONES.some((f) => f.value === guardado?.formacion) ? guardado!.formacion : FORMACIONES[0].value;
  const fijos = guardado?.puestos;
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
    if (elegido !== id) onGuardar({ formacion, puestos: intercambiarPuestos(titular, formacion, elegido, id) });
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
                onClick={() => { if (!activa) onGuardar({ formacion: f.value, puestos: fijos ?? [] }); }}
                className="shrink-0 h-9 px-3 rounded-full text-xs font-bold tabular-nums transition-colors"
                style={activa ? { background: 'rgba(68,243,169,0.15)', color: '#44f3a9' } : { background: '#262a31', color: 'rgba(255,255,255,0.6)' }}>
                {f.value}
              </button>
            );
          })}
          {aMano && (
            <button type="button" onClick={() => { setElegido(null); onGuardar({ formacion, puestos: [] }); }}
              className="shrink-0 ml-auto h-9 px-3 rounded-full flex items-center gap-1.5 text-xs font-bold text-[#9acbff]" style={{ background: 'rgba(154,203,255,0.1)' }}>
              <RotateCcw size={13} /> Automático
            </button>
          )}
        </div>
      ) : (
        <p className="mb-3 text-xs font-bold tabular-nums text-white/60">Formación {formacion}</p>
      )}

      {puedeEditar && (
        <p className="flex items-center gap-1.5 mb-2 text-xs" style={{ color: elegido ? '#ffd08b' : 'rgba(255,255,255,0.55)' }} aria-live="polite">
          <Info size={13} className="shrink-0" /> {elegido ? 'Toca otro jugador para intercambiarlos' : 'Toca dos jugadores para cambiarlos de puesto o sacar a uno de la banca'}
        </p>
      )}

      <div className="relative w-full aspect-[4/5] sm:aspect-[5/4] rounded-[20px] overflow-hidden"
        style={{ background: 'repeating-linear-gradient(180deg, #0f3d2c 0 12.5%, #0d3627 12.5% 25%)' }}>
        <div className="absolute inset-3 rounded-xl border border-white/20 pointer-events-none" />
        <div className="absolute left-1/2 top-3 w-24 h-12 -translate-x-1/2 rounded-b-full border border-t-0 border-white/20 pointer-events-none" />
        <div className="absolute left-1/2 bottom-3 w-32 h-12 -translate-x-1/2 border border-b-0 border-white/20 pointer-events-none" />

        {filas.map((fila, i) => {
          const top = filas.length > 1 ? 86 - (i / (filas.length - 1)) * 70 : 50;
          return fila.map((puesto, k) => (
            <div key={puesto.jugador.id} className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
              style={{ top: `${top}%`, left: `${(100 / (fila.length + 1)) * (k + 1)}%` }}>
              <Ficha puesto={puesto} elegido={elegido === puesto.jugador.id} onClick={puedeEditar ? () => tocar(puesto.jugador.id) : undefined} />
            </div>
          ));
        })}
      </div>

      {titular.banca.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-bold text-white/80 mb-1.5">Banca ({titular.banca.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {titular.banca.map((j) => {
              const sel = elegido === j.id;
              return (
                <button key={j.id} type="button" disabled={!puedeEditar} onClick={() => tocar(j.id)} aria-pressed={puedeEditar ? sel : undefined}
                  aria-label={`Banca: ${j.name}${sel ? ', elegido para cambiar' : ''}`} title={`${j.name} · ${j.position || 'Sin posición'}`}
                  className={`flex items-center gap-1 px-2.5 rounded-full text-xs font-semibold enabled:cursor-pointer ${puedeEditar ? 'h-9' : 'h-7'}`}
                  style={sel ? { background: '#ffd08b', color: '#2b1d00', boxShadow: BRILLO_ELEGIDO } : { background: '#262a31', color: 'rgba(255,255,255,0.8)' }}>
                  {nombreCorto(j.name)}
                  {j.rating ? <span className="flex items-center gap-px tabular-nums" style={{ color: sel ? '#2b1d00' : '#ffd08b' }}><Star size={9} fill="currentColor" strokeWidth={0} />{j.rating}</span> : null}
                </button>
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
