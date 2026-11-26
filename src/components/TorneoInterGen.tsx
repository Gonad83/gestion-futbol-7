import { CalendarDays, Clock, MapPin, Trophy, Users, Coffee, PartyPopper } from 'lucide-react';
import { NOSOTROS, PROGRAMAS, type Partido } from '../lib/programaInterGen';

/** Pestaña Torneo: grupos, calendario y los partidos de Real Ebolo resaltados. */

const ORO = '#ffd08b';
const PLATA = '#9acbff';
const VERDE = '#44f3a9';

const esNuestro = (p?: Partido) => !!p && (p.local === NOSOTROS || p.visita === NOSOTROS);

export default function TorneoInterGen({ year }: { year: number }) {
  const programa = PROGRAMAS[year];
  if (!programa) return null;

  // Nuestros partidos de grupo, con el día, la hora y la cancha.
  const nuestros = programa.dias.flatMap(dia =>
    dia.bloques.flatMap(b => {
      if ('pausa' in b) return [];
      return ([[b.cancha1, 1], [b.cancha2, 2]] as const)
        .filter(([p]) => esNuestro(p))
        .map(([p, cancha]) => ({
          dia: dia.titulo,
          hora: b.hora,
          cancha,
          codigo: p!.codigo,
          rival: p!.local === NOSOTROS ? p!.visita! : p!.local!,
        }));
    }),
  );

  const nuestroGrupo = programa.grupos.find(gr => gr.equipos.some(e => e.nombre === NOSOTROS));

  return (
    <div className="space-y-6">
      {/* Nuestros partidos */}
      <section className="rounded-3xl p-5 md:p-6"
        style={{ background: 'linear-gradient(135deg, rgba(68,243,169,0.14) 0%, rgba(28,32,38,0.9) 70%)' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-soccer-green">{NOSOTROS}{nuestroGrupo ? ` · ${nuestroGrupo.nombre}` : ''}</p>
            <h2 className="font-headline font-bold text-xl text-white">Nuestros partidos</h2>
          </div>
          <p className="text-xs text-white/60 flex items-center gap-1.5"><Clock size={13} /> {programa.minutos} minutos por partido</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {nuestros.map(n => (
            <div key={n.codigo} className="rounded-2xl p-4" style={{ background: '#0a0e14' }}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-soccer-green">{n.dia.split(' de ')[0]}</p>
              <p className="font-headline font-black text-2xl text-white mt-1">{n.hora.split('–')[0]}</p>
              <p className="text-sm text-white mt-2">vs <span className="font-bold">{n.rival}</span></p>
              <p className="text-[11px] text-white/50 mt-1 flex items-center gap-1"><MapPin size={11} /> Cancha {n.cancha} · {n.codigo}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/50 mt-3">El sábado en la tarde se juegan las copas: el rival depende de cómo terminemos el grupo.</p>
      </section>

      {/* Grupos */}
      <section>
        <h2 className="font-headline font-bold text-xl text-white mb-3 flex items-center gap-2">
          <Users size={18} className="text-soccer-green" /> Grupos
        </h2>
        <div className="grid md:grid-cols-3 gap-3">
          {programa.grupos.map(grupo => {
            const esNuestroGrupo = grupo === nuestroGrupo;
            return (
              <div key={grupo.nombre} className="rounded-3xl overflow-hidden"
                style={{ background: '#181c22', boxShadow: esNuestroGrupo ? `inset 0 0 0 1.5px rgba(68,243,169,0.45)` : undefined }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#0a0e14' }}>
                  <h3 className="font-headline font-bold text-white">{grupo.nombre}</h3>
                  {esNuestroGrupo && <span className="text-[10px] font-bold uppercase tracking-wider text-soccer-green">Nuestro grupo</span>}
                </div>
                {grupo.equipos.map((e, i) => {
                  const yo = e.nombre === NOSOTROS;
                  return (
                    <div key={e.nombre} className="flex items-center gap-3 px-4 py-3"
                      style={yo ? { background: 'rgba(68,243,169,0.12)' } : i % 2 ? { background: '#1c2026' } : undefined}>
                      <span className="w-5 text-xs font-bold text-white/50">{i + 1}</span>
                      <span className={`flex-1 text-sm truncate ${yo ? 'font-bold text-soccer-green' : 'text-white'}`}>{e.nombre}</span>
                      <span className="text-[11px] text-white/50">Gen. {e.generacion}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>

      {/* Calendario */}
      <section>
        <div className="flex items-end justify-between gap-3 flex-wrap mb-3">
          <h2 className="font-headline font-bold text-xl text-white flex items-center gap-2">
            <CalendarDays size={18} className="text-soccer-green" /> Calendario
          </h2>
          <div className="flex items-center gap-3 text-[11px] text-white/60">
            <Leyenda color={VERDE} texto="Nuestros partidos" />
            <Leyenda color={ORO} texto="Copa Oro" />
            <Leyenda color={PLATA} texto="Copa Plata" />
          </div>
        </div>

        <div className="grid xl:grid-cols-2 gap-4 items-start">
          {programa.dias.map(dia => (
            <div key={dia.titulo} className="rounded-3xl overflow-hidden" style={{ background: '#181c22' }}>
              <div className="px-4 py-3 flex items-center justify-between gap-2" style={{ background: '#0a0e14' }}>
                <h3 className="font-headline font-bold text-white">{dia.titulo}</h3>
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: ORO }}>{dia.resumen}</span>
              </div>
              <div className="p-2 space-y-2">
                {dia.bloques.map(b => (
                  'pausa' in b ? (
                    <div key={b.hora} className="rounded-2xl px-3 py-3 flex items-center gap-3"
                      style={{ background: b.fiesta ? 'rgba(255,208,139,0.12)' : 'rgba(255,255,255,0.04)' }}>
                      <span className="w-[92px] shrink-0 text-xs font-bold text-white/70">{b.hora}</span>
                      {b.fiesta ? <PartyPopper size={15} style={{ color: ORO }} /> : <Coffee size={15} className="text-white/50" />}
                      <span className="text-sm font-semibold" style={{ color: b.fiesta ? ORO : 'rgba(255,255,255,0.7)' }}>{b.pausa}</span>
                      {b.nota && <span className="text-[11px] text-white/50 ml-auto">{b.nota}</span>}
                    </div>
                  ) : (
                    <div key={b.hora} className="rounded-2xl p-2" style={{ background: '#1c2026' }}>
                      <p className="px-1 pb-1.5 text-xs font-bold text-white/70">{b.hora}</p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {b.cancha1 && <CeldaPartido partido={b.cancha1} cancha={1} />}
                        {b.cancha2 && <CeldaPartido partido={b.cancha2} cancha={2} />}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Formato */}
      <section className="grid md:grid-cols-2 gap-3">
        {programa.formato.map(f => (
          <div key={f.titulo} className="rounded-2xl p-4" style={{ background: '#1c2026' }}>
            <p className="font-headline font-bold flex items-center gap-2" style={{ color: f.copa === 'oro' ? ORO : PLATA }}>
              <Trophy size={16} /> {f.titulo}
            </p>
            <p className="text-sm text-white/70 mt-1">{f.texto}</p>
          </div>
        ))}
      </section>

      {/* Reglas de clasificación y cruces */}
      <section>
        <h2 className="font-headline font-bold text-xl text-white mb-3 flex items-center gap-2">
          <Trophy size={18} style={{ color: ORO }} /> Clasificación y cruces
        </h2>
        <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(255,208,139,0.1)', boxShadow: `inset 3px 0 0 ${ORO}` }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: ORO }}>Regla central</p>
          <p className="text-sm font-semibold text-white mt-1">{programa.reglaCentral}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {programa.reglas.map((r, i) => (
            <div key={r.titulo} className={`rounded-2xl p-4 ${i === programa.reglas.length - 1 && i % 2 === 0 ? 'md:col-span-2' : ''}`} style={{ background: '#181c22' }}>
              <p className="font-headline font-bold text-white flex items-center gap-2">
                <span className="text-xs font-black" style={{ color: ORO }}>{String(i + 1).padStart(2, '0')}</span>{r.titulo}
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-white/70">
                {r.puntos.map(p => <li key={p}>{p}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Leyenda({ color, texto }: { color: string; texto: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />{texto}
    </span>
  );
}

function CeldaPartido({ partido, cancha }: { partido: Partido; cancha: number }) {
  const nuestro = esNuestro(partido);
  const color = nuestro ? VERDE : partido.copa === 'oro' ? ORO : partido.copa === 'plata' ? PLATA : null;
  const nombre = (equipo: string) => (
    <span className={equipo === NOSOTROS ? 'font-bold text-soccer-green' : 'text-white'}>{equipo}</span>
  );

  return (
    <div className="rounded-xl px-3 py-2.5"
      style={{
        background: nuestro ? 'rgba(68,243,169,0.14)' : '#0a0e14',
        boxShadow: nuestro ? 'inset 0 0 0 1.5px rgba(68,243,169,0.55)' : color ? `inset 3px 0 0 ${color}` : undefined,
      }}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: color || 'rgba(255,255,255,0.5)' }}>
          Cancha {cancha} · {partido.codigo}
        </span>
        {nuestro && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: VERDE, color: '#003822' }}>
            Nosotros
          </span>
        )}
      </div>
      {partido.texto ? (
        <p className="text-sm font-semibold text-white">{partido.texto}</p>
      ) : (
        <p className="text-sm leading-snug">
          {nombre(partido.local!)} <span className="text-white/50">vs</span> {nombre(partido.visita!)}
        </p>
      )}
    </div>
  );
}
