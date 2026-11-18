import { useMemo, useState } from 'react';
import { Shield, Star } from 'lucide-react';
import type { DashboardStats, JugadorDash } from '../../lib/api/dashboard';
import { FORMATIONS } from '../../lib/matchmaking';
import { armarTitular, LINEAS, type Puesto } from './titular';

const FORMACIONES = FORMATIONS['7vs7'];
const CLAVE = 'titular-formacion';

const formacionGuardada = () => {
  try {
    const f = typeof localStorage !== 'undefined' ? localStorage.getItem(CLAVE) : null;
    if (f && FORMACIONES.some((x) => x.value === f)) return f;
  } catch { /* sin almacenamiento: se usa la estándar */ }
  return FORMACIONES[0].value;
};

const nombreCorto = (nombre: string) => {
  const partes = nombre.trim().split(/\s+/);
  return partes.length > 1 ? `${partes[0][0]}. ${partes[partes.length - 1]}` : nombre.trim();
};
const iniciales = (nombre: string) => nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

function Ficha({ puesto }: { puesto: Puesto<JugadorDash> }) {
  const { jugador: j, linea, fueraDePuesto } = puesto;
  const anillo = linea === 'Portero' ? '#ffd08b' : '#44f3a9';
  return (
    <div className="flex flex-col items-center gap-0.5 w-[72px]"
      title={`${j.name} · ${j.position || 'Sin posición'}${fueraDePuesto ? ' (fuera de su puesto)' : ''}`}>
      <span className="relative">
        <span className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white"
          style={{ background: '#10141a', border: `2.5px ${fueraDePuesto ? 'dashed' : 'solid'} ${anillo}`, boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
          {j.photo_url ? <img src={j.photo_url} alt="" className="w-full h-full object-cover" /> : iniciales(j.name)}
        </span>
        {j.rating ? (
          <span className="absolute -bottom-1 -right-2 flex items-center gap-px px-1 rounded-full text-[10px] font-black tabular-nums"
            style={{ background: '#10141a', color: '#ffd08b', border: '1px solid rgba(255,208,139,0.35)' }}>
            <Star size={8} fill="#ffd08b" strokeWidth={0} />{j.rating}
          </span>
        ) : null}
      </span>
      <span className="max-w-full truncate text-[11px] font-semibold leading-tight text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
        {nombreCorto(j.name)}
      </span>
    </div>
  );
}

/**
 * El once (siete) ideal para los amistosos: los mejores por estrellas del
 * plantel activo, cada uno en su posición, dibujados en la cancha.
 */
export function TarjetaTitular({ stats }: { stats: DashboardStats }) {
  const [formacion, setFormacion] = useState(formacionGuardada);
  const titular = useMemo(() => {
    const partidos = Object.fromEntries(stats.topParticipations.map((p) => [p.id, p.count]));
    return armarTitular(stats.allPlayers, formacion, partidos);
  }, [stats.allPlayers, stats.topParticipations, formacion]);

  const filas = LINEAS.map((l) => titular.lineas[l]).filter((f) => f.length > 0);
  if (filas.length === 0) return null;

  const cambiar = (valor: string) => {
    setFormacion(valor);
    try { localStorage.setItem(CLAVE, valor); } catch { /* no pasa nada si no se guarda */ }
  };

  return (
    <section className="glass-card relative overflow-hidden" aria-label="Equipo titular">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9' }}>
          <Shield size={16} />
        </div>
        <div className="min-w-0">
          <h2 className="font-headline font-bold text-white leading-tight">Equipo titular</h2>
          <p className="text-[11px] text-white/50">Los mejores por estrellas en su puesto</p>
        </div>
        <span className="ml-auto flex items-center gap-1 text-sm font-headline font-black tabular-nums shrink-0" style={{ color: '#ffd08b' }}>
          <Star size={13} fill="#ffd08b" strokeWidth={0} /> {titular.promedio}
        </span>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto" role="group" aria-label="Formación">
        {FORMACIONES.map((f) => {
          const activa = f.value === formacion;
          return (
            <button key={f.value} type="button" onClick={() => cambiar(f.value)} aria-pressed={activa} title={f.name}
              className="shrink-0 h-8 px-3 rounded-full text-xs font-bold tabular-nums transition-colors"
              style={activa ? { background: 'rgba(68,243,169,0.15)', color: '#44f3a9' } : { background: '#262a31', color: 'rgba(255,255,255,0.6)' }}>
              {f.value}
            </button>
          );
        })}
      </div>

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
              <Ficha puesto={puesto} />
            </div>
          ));
        })}
      </div>

      {titular.banca.length > 0 && (
        <p className="mt-3 text-xs text-white/60 leading-snug">
          <span className="font-bold text-white/80">Banca ({titular.banca.length}):</span>{' '}
          {titular.banca.map((j) => nombreCorto(j.name)).join(', ')}
        </p>
      )}
    </section>
  );
}
