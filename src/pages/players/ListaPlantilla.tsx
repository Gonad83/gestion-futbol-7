import { Star, ChevronRight, ShieldCheck } from 'lucide-react';
import type { Confiabilidad } from '../../lib/temporada';
import { GRUPOS, colorAsistencia, grupoDe, iniciales, type JugadorPlantilla } from './plantilla';

/** Anillo con el porcentaje de asistencia del año. */
export function AnilloAsistencia({ porcentaje }: { porcentaje: number }) {
  const r = 18;
  const largo = 2 * Math.PI * r;
  const color = colorAsistencia(porcentaje);
  return (
    <span className="relative w-12 h-12 shrink-0 flex items-center justify-center" role="img" aria-label={`Asistencia ${porcentaje}%`}>
      <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90 absolute inset-0" aria-hidden="true">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={largo} strokeDashoffset={largo * (1 - Math.min(100, Math.max(0, porcentaje)) / 100)} />
      </svg>
      <span className="relative text-[11px] font-bold tabular-nums text-white">{porcentaje}%</span>
    </span>
  );
}

/** Resumen arriba de la lista: activos, lesionados y asistencia promedio. */
export function ResumenPlantilla({ jugadores }: { jugadores: JugadorPlantilla[] }) {
  const activos = jugadores.filter(j => j.status === 'Activo').length;
  const lesionados = jugadores.filter(j => j.status === 'Lesionado').length;
  const promedio = jugadores.length ? Math.round(jugadores.reduce((s, j) => s + j.participationPct, 0) / jugadores.length) : 0;
  const celda = 'flex flex-col items-center gap-1 py-3';
  return (
    <section aria-label="Resumen de la plantilla" className="grid grid-cols-3 rounded-[20px] divide-x divide-white/[0.07]"
      style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className={celda}>
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">Activos</span>
        <span className="font-headline font-black text-2xl tabular-nums text-soccer-green">{activos}</span>
      </div>
      <div className={celda}>
        <span className="text-[11px] font-bold uppercase tracking-wider text-red-300/90">Lesionados</span>
        <span className="font-headline font-black text-2xl tabular-nums text-red-300">{lesionados}</span>
      </div>
      <div className={celda}>
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">Asist. prom.</span>
        <span className="font-headline font-black text-2xl tabular-nums text-[#9acbff]">{promedio}%</span>
      </div>
    </section>
  );
}

interface FilaProps {
  jugador: JugadorPlantilla;
  isAdmin: boolean;
  enRiesgo: boolean;
  confiab?: Confiabilidad;
  onAbrir: (j: JugadorPlantilla) => void;
  onFoto: (url: string) => void;
}

const COLOR_CONFIAB = { alta: '#44f3a9', media: '#ffd08b', baja: '#fb923c' } as const;
const TEXTO_CONFIAB = { alta: 'Confiable', media: 'Regular', baja: 'Poco confiable' } as const;

/** Qué tanto responde y cuántas veces se bajó a última hora (solo lo ve el capitán). */
export function ChipConfiabilidad({ c }: { c: Confiabilidad }) {
  const detalle = `Respondió ${c.respondidas} de los últimos ${c.partidos} partidos` +
    (c.ultimaHora ? ` y se bajó ${c.ultimaHora === 1 ? '1 vez' : `${c.ultimaHora} veces`} a última hora` : '');
  return (
    <span title={detalle} aria-label={`${TEXTO_CONFIAB[c.nivel]}, ${c.puntaje} de 100. ${detalle}`}
      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold tabular-nums"
      style={{ color: COLOR_CONFIAB[c.nivel], background: 'rgba(255,255,255,0.05)' }}>
      <ShieldCheck size={11} aria-hidden="true" /> {TEXTO_CONFIAB[c.nivel]} {c.puntaje}
    </span>
  );
}

/** Una fila por jugador. El capitán la toca para editar; los demás, para ver la foto. */
export function FilaJugador({ jugador: j, isAdmin, enRiesgo, confiab, onAbrir, onFoto }: FilaProps) {
  const accion = isAdmin ? () => onAbrir(j) : j.photo_url ? () => onFoto(j.photo_url!) : undefined;
  return (
    <li>
      <button type="button" onClick={accion} disabled={!accion}
        aria-label={isAdmin ? `Editar a ${j.name}` : j.name}
        className="w-full flex items-center gap-3 p-3 rounded-2xl text-left min-h-[72px] enabled:cursor-pointer enabled:hover:bg-[#1c2026] transition-colors"
        style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="w-12 h-12 shrink-0 rounded-full overflow-hidden flex items-center justify-center font-headline font-bold text-sm text-white/70"
          style={{ background: '#262a31', border: '2px solid rgba(255,255,255,0.06)' }}>
          {j.photo_url ? <img src={j.photo_url} alt="" className="w-full h-full object-cover object-top" loading="lazy" /> : iniciales(j.name)}
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-baseline gap-2 min-w-0">
            <span className="font-headline font-bold text-white truncate shrink-0 max-w-full">{j.name}</span>
            {j.nickname && <span className="text-xs italic text-white/45 truncate min-w-0">"{j.nickname}"</span>}
          </span>
          <span className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-soccer-green truncate max-w-[9rem]">{j.position || 'Sin posición'}</span>
            {j.status === 'Lesionado' ? (
              <span className="px-1.5 py-0.5 rounded-md text-[11px] font-bold text-red-300" style={{ background: 'rgba(248,113,113,0.15)' }}>Lesionado</span>
            ) : enRiesgo ? (
              <span className="px-1.5 py-0.5 rounded-md text-[11px] font-bold text-orange-300" style={{ background: 'rgba(251,146,60,0.15)' }}>Riesgo deserción</span>
            ) : j.rating ? (
              <span className="flex items-center gap-px" role="img" aria-label={`Nivel ${j.rating} de 7`}>
                {Array.from({ length: 7 }, (_, i) => (
                  <Star key={i} size={11} aria-hidden="true"
                    fill={i < Number(j.rating) ? '#ffd08b' : 'transparent'}
                    color={i < Number(j.rating) ? '#ffd08b' : 'rgba(255,255,255,0.25)'} strokeWidth={i < Number(j.rating) ? 0 : 1.5} />
                ))}
              </span>
            ) : null}
            {confiab && <ChipConfiabilidad c={confiab} />}
          </span>
        </span>
        <AnilloAsistencia porcentaje={j.participationPct} />
        {isAdmin && <ChevronRight size={16} className="text-white/25 -ml-1 shrink-0" aria-hidden="true" />}
      </button>
    </li>
  );
}

interface ListaProps {
  jugadores: JugadorPlantilla[];
  isAdmin: boolean;
  totalPartidos: number;
  /** Índice de confiabilidad por jugador; solo se pasa al capitán. */
  confiabilidad?: Map<string, Confiabilidad>;
  onAbrir: (j: JugadorPlantilla) => void;
  onFoto: (url: string) => void;
}

/** Lista agrupada por posición: arqueros, defensas, medios, delanteros. */
export function ListaPlantilla({ jugadores, isAdmin, totalPartidos, confiabilidad, onAbrir, onFoto }: ListaProps) {
  return (
    <div className="space-y-6">
      {GRUPOS.map(g => {
        const delGrupo = jugadores.filter(j => grupoDe(j.position) === g.id);
        if (delGrupo.length === 0) return null;
        return (
          <section key={g.id} aria-label={g.plural}>
            <div className="flex items-baseline justify-between mb-2 px-1">
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[#9acbff]">{g.plural}</h2>
              <span className="text-xs text-white/50">{delGrupo.length} {delGrupo.length === 1 ? 'jugador' : 'jugadores'}</span>
            </div>
            <ul className="space-y-2">
              {delGrupo.map(j => (
                <FilaJugador key={j.id} jugador={j} isAdmin={isAdmin} onAbrir={onAbrir} onFoto={onFoto} confiab={confiabilidad?.get(j.id)}
                  enRiesgo={isAdmin && j.participationPct < 25 && totalPartidos >= 4} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
