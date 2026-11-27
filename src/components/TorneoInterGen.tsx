import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, MapPin, Trophy, Users, Coffee, PartyPopper, Pencil, Trash2, ClipboardList } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { aviso, confirmar } from '../lib/avisos';
import ConvocatoriaInterGen from './ConvocatoriaInterGen';
import { contarConvocatoria, type Convocado, type EstadoConvocatoria, type JugadorPlantel } from '../lib/convocatoria';
import {
  NOSOTROS, PROGRAMAS, calcularTorneo, ganadorDe,
  type Cruce, type FilaTabla, type Partido, type Resultado,
} from '../lib/programaInterGen';

/**
 * Pestaña Torneo: tablas de los grupos, calendario y copas. Los capitanes y
 * subcapitanes ingresan los resultados; las tablas y los cruces se arman solos.
 * Los partidos de Real Ebolo van resaltados.
 */

const ORO = '#ffd08b';
const PLATA = '#9acbff';
const VERDE = '#44f3a9';

const CAMPOS = 'match_code, home_goals, away_goals, home_yellows, away_yellows, penalty_winner';

type Props = {
  year: number; teamId: number; puedeEditar: boolean;
  /** Con la edición creada: los inscritos marcan a qué partidos van. */
  convocatoria?: { edicionId: string; plantel: JugadorPlantel[]; miJugadorId: string | null };
};

export default function TorneoInterGen({ year, teamId, puedeEditar, convocatoria }: Props) {
  const programa = PROGRAMAS[year];
  const [resultados, setResultados] = useState<Map<string, Resultado>>(new Map());
  const [editando, setEditando] = useState<string | null>(null);
  const [convocados, setConvocados] = useState<Convocado[]>([]);
  const [convocatoriaAbierta, setConvocatoriaAbierta] = useState<string | null>(null);
  const cerrarConvocatoria = useCallback(() => setConvocatoriaAbierta(null), []);
  const edicionId = convocatoria?.edicionId;

  useEffect(() => {
    if (!edicionId) return;
    let vigente = true;
    (async () => {
      const { data, error } = await supabase.from('intergen_callups')
        .select('edition_id, match_code, player_id, status').eq('edition_id', edicionId);
      if (!vigente) return;
      if (error) { aviso.error('No se pudo cargar la convocatoria'); return; }
      setConvocados((data as Convocado[]) || []);
    })();
    return () => { vigente = false; };
  }, [edicionId]);

  /** Respuestas por partido: código → (jugador → va / no va). */
  const respuestasPorPartido = useMemo(() => {
    const mapa = new Map<string, Map<string, EstadoConvocatoria>>();
    for (const c of convocados) {
      if (c.edition_id !== edicionId) continue; // quedó de otra edición mientras carga la nueva
      if (!mapa.has(c.match_code)) mapa.set(c.match_code, new Map());
      mapa.get(c.match_code)!.set(c.player_id, c.status);
    }
    return mapa;
  }, [convocados, edicionId]);

  const marcarConvocatoria = async (codigo: string, jugadorId: string, estado: EstadoConvocatoria | null) => {
    if (!edicionId) return;
    const antes = convocados;
    const sinEl = antes.filter(c => !(c.match_code === codigo && c.player_id === jugadorId));
    setConvocados(estado ? [...sinEl, { edition_id: edicionId, match_code: codigo, player_id: jugadorId, status: estado }] : sinEl);
    const { error } = estado
      ? await supabase.from('intergen_callups').upsert(
          { edition_id: edicionId, match_code: codigo, player_id: jugadorId, status: estado, updated_at: new Date().toISOString() },
          { onConflict: 'edition_id,match_code,player_id' })
      : await supabase.from('intergen_callups').delete()
          .eq('edition_id', edicionId).eq('match_code', codigo).eq('player_id', jugadorId);
    if (error) { aviso.error('No se pudo guardar la convocatoria'); setConvocados(antes); }
  };

  useEffect(() => {
    let vigente = true;
    (async () => {
      const { data, error } = await supabase.from('intergen_results').select(CAMPOS).eq('team_id', teamId).eq('year', year);
      if (!vigente) return;
      if (error) { aviso.error('No se pudieron cargar los resultados'); return; }
      setResultados(new Map(((data as Resultado[]) || []).map(r => [r.match_code, r])));
    })();
    return () => { vigente = false; };
  }, [teamId, year]);

  const torneo = useMemo(() => (programa ? calcularTorneo(programa, resultados) : null), [programa, resultados]);
  if (!programa || !torneo) return null;

  /** Equipos de un partido: los de grupo vienen del programa; los de copa, de los cruces. */
  const equipos = (p: Partido): Cruce => (p.local ? { local: p.local, visita: p.visita } : torneo.cruces[p.codigo] ?? {});
  const esNuestro = (p?: Partido) => {
    if (!p) return false;
    const e = equipos(p);
    return e.local === NOSOTROS || e.visita === NOSOTROS;
  };

  const guardar = async (r: Resultado) => {
    const { data, error } = await supabase.from('intergen_results')
      .upsert({ ...r, team_id: teamId, year, updated_at: new Date().toISOString() }, { onConflict: 'team_id,year,match_code' })
      .select(CAMPOS).single();
    if (error) { aviso.error('No se pudo guardar: ' + error.message); return; }
    setResultados(prev => new Map(prev).set(r.match_code, data as Resultado));
    setEditando(null);
  };

  const borrar = async (codigo: string) => {
    if (!(await confirmar('¿Borrar este resultado?'))) return;
    const { error } = await supabase.from('intergen_results').delete().eq('team_id', teamId).eq('year', year).eq('match_code', codigo);
    if (error) { aviso.error('No se pudo borrar: ' + error.message); return; }
    setResultados(prev => { const n = new Map(prev); n.delete(codigo); return n; });
    setEditando(null);
  };

  // Nuestros partidos, con el día, la hora y la cancha (los de copa aparecen al conocerse el cruce).
  const nuestros = programa.dias.flatMap(dia =>
    dia.bloques.flatMap(b => {
      if ('pausa' in b) return [];
      return ([[b.cancha1, 1], [b.cancha2, 2]] as const)
        .filter(([p]) => esNuestro(p))
        .map(([p, cancha]) => {
          const e = equipos(p!);
          const r = resultados.get(p!.codigo);
          const ganador = r ? ganadorDe(e, r) : undefined;
          return {
            dia: dia.titulo, hora: b.hora, cancha, partido: p!, equipos: e, resultado: r, ganador,
            estado: !r ? null : ganador === NOSOTROS ? 'Ganamos' : ganador ? 'Perdimos' : 'Empate',
          };
        });
    }),
  );

  const abierta = nuestros.find(n => n.partido.codigo === convocatoriaAbierta);

  const nuestroGrupo = programa.grupos.find(gr => gr.equipos.some(e => e.nombre === NOSOTROS));

  // Partidos de copa por código, con su día, hora y cancha, para armar los cuadros.
  const deCopa = new Map<string, { partido: Partido; cuando: string }>();
  for (const dia of programa.dias) {
    for (const b of dia.bloques) {
      if ('pausa' in b) continue;
      for (const [p, cancha] of [[b.cancha1, 1], [b.cancha2, 2]] as const) {
        if (p?.copa) deCopa.set(p.codigo, { partido: p, cuando: `${dia.titulo.slice(0, 3)} ${b.hora.split('–')[0]} · C${cancha}` });
      }
    }
  }
  const celdaCopa = (codigo: string) => {
    const c = deCopa.get(codigo);
    if (!c) return null;
    return (
      <CeldaPartido key={codigo} partido={c.partido} cancha={0}
        titulo={`${codigo.startsWith('F') ? 'Final' : codigo} · ${c.cuando}`}
        equipos={equipos(c.partido)} resultado={resultados.get(codigo)} puedeEditar={puedeEditar}
        editando={editando === `copa:${codigo}`} onEditar={abrir => setEditando(abrir ? `copa:${codigo}` : null)}
        onGuardar={guardar} onBorrar={() => borrar(codigo)} />
    );
  };
  const campeon = (codigo: string) => ganadorDe(torneo.cruces[codigo], resultados.get(codigo));
  const faltan = torneo.totalGrupos - torneo.jugadosGrupos;
  const enOro = new Set(torneo.rankingOro.map(f => f.equipo));
  const enPlata = new Set(torneo.rankingPlata.map(f => f.equipo));

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
          <div className="flex items-center gap-2 flex-wrap text-xs text-white/70">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(10,14,20,0.6)' }}>
              <CalendarDays size={13} className="text-soccer-green" /> {programa.fechas}
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(10,14,20,0.6)' }}>
              <Clock size={13} className="text-soccer-green" /> {programa.minutos} min por partido
            </span>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {nuestros.map(n => (
            <div key={n.partido.codigo} className="rounded-2xl p-4 relative overflow-hidden"
              style={{ background: 'radial-gradient(120% 90% at 50% 0%, rgba(68,243,169,0.10) 0%, #0a0e14 60%)' }}>
              <div className="flex items-center justify-between gap-2 mb-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-soccer-green">{n.dia.split(' de ')[0]} · {n.hora.split('–')[0]}</p>
                {n.estado && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={n.estado === 'Ganamos' ? { background: VERDE, color: '#003822' }
                      : n.estado === 'Perdimos' ? { background: 'rgba(248,113,113,0.15)', color: '#f87171' }
                      : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}>
                    {n.estado}
                  </span>
                )}
              </div>
              <Duelo equipos={n.equipos} resultado={n.resultado} ganador={n.ganador} color={VERDE} grande
                penales={!!n.resultado && !!n.partido.copa && n.resultado.home_goals === n.resultado.away_goals && !!n.resultado.penalty_winner} />
              <p className="text-[11px] text-white/50 mt-4 flex items-center justify-center gap-1">
                <MapPin size={11} /> Cancha {n.cancha} · {n.partido.codigo.startsWith('F') ? n.partido.texto : n.partido.codigo}
              </p>
              {convocatoria && (() => {
                const respuestas = respuestasPorPartido.get(n.partido.codigo);
                const { van, noVan } = contarConvocatoria(convocatoria.plantel, respuestas ?? new Map());
                const inscrito = convocatoria.plantel.some(j => j.id === convocatoria.miJugadorId);
                const faltaYo = inscrito && !n.resultado && !respuestas?.has(convocatoria.miJugadorId!);
                return (
                  <button onClick={() => setConvocatoriaAbierta(n.partido.codigo)}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 active:scale-95"
                    style={faltaYo
                      ? { background: 'linear-gradient(135deg,#44f3a9,#00d68f)', color: '#003822' }
                      : { background: 'rgba(68,243,169,0.12)', color: VERDE }}>
                    <ClipboardList size={16} />
                    {faltaYo ? '¿Vas? Responde la convocatoria' : `Convocatoria · ${van === 1 ? '1 va' : `${van} van`}${noVan ? ` · ${noVan === 1 ? '1 no asiste' : `${noVan} no asisten`}` : ''}`}
                  </button>
                );
              })()}
            </div>
          ))}
        </div>
        {!torneo.gruposCompletos && (
          <p className="text-xs text-white/50 mt-3">El sábado en la tarde se juegan las copas: el rival depende de cómo terminemos el grupo.</p>
        )}
      </section>

      {/* Tablas de los grupos */}
      <section>
        <div className="flex items-end justify-between gap-3 flex-wrap mb-3">
          <h2 className="font-headline font-bold text-xl text-white flex items-center gap-2">
            <Users size={18} className="text-soccer-green" /> Grupos
          </h2>
          <p className="text-[11px] text-white/60">
            {torneo.gruposCompletos
              ? 'Fase de grupos cerrada'
              : `${torneo.jugadosGrupos} de ${torneo.totalGrupos} partidos con resultado`}
          </p>
        </div>
        <div className="grid lg:grid-cols-3 gap-3">
          {torneo.tablas.map(tabla => {
            const esNuestroGrupo = tabla.nombre === nuestroGrupo?.nombre;
            return (
              <div key={tabla.nombre} className="rounded-3xl overflow-hidden"
                style={{ background: '#181c22', boxShadow: esNuestroGrupo ? 'inset 0 0 0 1.5px rgba(68,243,169,0.45)' : undefined }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#0a0e14' }}>
                  <h3 className="font-headline font-bold text-white flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-base"
                      style={esNuestroGrupo ? { background: VERDE, color: '#003822' } : { background: '#262a31', color: '#fff' }}>
                      {tabla.nombre.split(' ').pop()}
                    </span>
                    {tabla.nombre}
                  </h3>
                  {esNuestroGrupo && <span className="text-[10px] font-bold uppercase tracking-wider text-soccer-green">Nuestro grupo</span>}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                      <th className="pl-4 py-2 text-left font-bold">Equipo</th>
                      <th className="px-1.5 py-2 font-bold" title="Partidos jugados">PJ</th>
                      <th className="px-1.5 py-2 font-bold" title="Goles a favor y en contra">Goles</th>
                      <th className="px-1.5 py-2 font-bold" title="Diferencia de goles">DG</th>
                      <th className="pl-1.5 pr-4 py-2 font-bold" title="Puntos">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabla.filas.map((f, i) => <FilaGrupo key={f.equipo} f={f} i={i} copa={enOro.has(f.equipo) ? 'oro' : enPlata.has(f.equipo) ? 'plata' : null} />)}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-[11px] text-white/60 mt-3">
          <Leyenda color={ORO} texto="1.º y 2.º: Copa Oro" />
          <Leyenda color="rgba(255,255,255,0.5)" texto="3.º: los dos mejores a Oro, el otro a Plata" />
          <Leyenda color={PLATA} texto="4.º: Copa Plata" />
        </div>
      </section>

      {/* Copas */}
      <section>
        <h2 className="font-headline font-bold text-xl text-white mb-3 flex items-center gap-2">
          <Trophy size={18} style={{ color: ORO }} /> Copas
        </h2>
        <div className="grid xl:grid-cols-5 gap-3 mb-3 items-start">
          <CuadroCopa titulo="Copa Oro" color={ORO} campeon={campeon('FO')} className="xl:col-span-3"
            fases={[['Cuartos de final', ['Q1', 'Q2', 'Q3', 'Q4']], ['Semifinales', ['S1', 'S2']], ['Final', ['FO']]]}
            celda={celdaCopa} />
          <CuadroCopa titulo="Copa Plata" color={PLATA} campeon={campeon('FP')} className="xl:col-span-2"
            fases={[['Semifinales', ['SP1', 'SP2']], ['Final', ['FP']]]}
            celda={celdaCopa} />
        </div>
        {torneo.gruposCompletos ? (
          <div className="grid md:grid-cols-3 gap-3">
            <Ranking titulo="Copa Oro · ranking" color={ORO} filas={torneo.rankingOro} prefijo="" className="md:col-span-2" dosColumnas />
            <Ranking titulo="Copa Plata" color={PLATA} filas={torneo.rankingPlata} prefijo="Plata " />
          </div>
        ) : (
          <div className="rounded-2xl p-4 text-sm text-white/70" style={{ background: '#181c22' }}>
            Los equipos de cada cruce se completan solos cuando estén los {torneo.totalGrupos} resultados de la fase de grupos.
            {' '}<span className="text-white font-semibold">{faltan === 1 ? 'Falta 1 partido.' : `Faltan ${faltan} partidos.`}</span>
          </div>
        )}
      </section>

      {/* Calendario */}
      <section>
        <div className="flex items-end justify-between gap-3 flex-wrap mb-3">
          <div>
            <h2 className="font-headline font-bold text-xl text-white flex items-center gap-2">
              <CalendarDays size={18} className="text-soccer-green" /> Calendario
            </h2>
            {puedeEditar && <p className="text-xs text-white/60 mt-1">Toca el lápiz de un partido para ingresar o corregir su resultado.</p>}
          </div>
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
                      <p className="px-1 pb-2 pt-0.5 text-xs font-bold text-white/80 flex items-center gap-1.5">
                        <Clock size={12} className="text-soccer-green" /> {b.hora}
                      </p>
                      <div className="grid sm:grid-cols-2 gap-2 items-start">
                        {([[b.cancha1, 1], [b.cancha2, 2]] as const).map(([p, cancha]) => p && (
                          <CeldaPartido key={p.codigo} partido={p} cancha={cancha} equipos={equipos(p)}
                            resultado={resultados.get(p.codigo)} puedeEditar={puedeEditar}
                            editando={editando === `cal:${p.codigo}`} onEditar={abrir => setEditando(abrir ? `cal:${p.codigo}` : null)}
                            onGuardar={guardar} onBorrar={() => borrar(p.codigo)} />
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {convocatoria && abierta && (
        <ConvocatoriaInterGen
          titulo={`${abierta.equipos.local} vs ${abierta.equipos.visita}`}
          cuando={`${abierta.dia} · ${abierta.hora.split('–')[0]} · Cancha ${abierta.cancha}`}
          plantel={convocatoria.plantel}
          respuestas={respuestasPorPartido.get(abierta.partido.codigo) ?? SIN_RESPUESTAS}
          miJugadorId={convocatoria.miJugadorId} puedeEditar={puedeEditar}
          onMarcar={(jugadorId, estado) => marcarConvocatoria(abierta.partido.codigo, jugadorId, estado)}
          onCerrar={cerrarConvocatoria} />
      )}
    </div>
  );
}

const SIN_RESPUESTAS = new Map<string, EstadoConvocatoria>();

function FilaGrupo({ f, i, copa }: { f: FilaTabla; i: number; copa: 'oro' | 'plata' | null }) {
  const yo = f.equipo === NOSOTROS;
  return (
    <tr style={yo ? { background: 'rgba(68,243,169,0.12)' } : i % 2 === 0 ? { background: '#1c2026' } : undefined}>
      <td className="pl-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-black shrink-0"
            style={i < 2 ? { background: 'rgba(255,208,139,0.18)', color: ORO }
              : i === 3 ? { background: 'rgba(154,203,255,0.18)', color: PLATA }
              : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
            {i + 1}
          </span>
          <div className="min-w-0">
            <p className={`truncate ${yo ? 'font-bold text-soccer-green' : 'text-white'}`}>{f.equipo}</p>
            <p className="text-[10px] text-white/50">
              Gen. {f.generacion}
              {copa && <span className="font-bold" style={{ color: copa === 'oro' ? ORO : PLATA }}> · Copa {copa === 'oro' ? 'Oro' : 'Plata'}</span>}
            </p>
          </div>
        </div>
      </td>
      <td className="px-1.5 text-center text-white/70 tabular-nums">{f.pj}</td>
      <td className="px-1.5 text-center text-white/70 tabular-nums whitespace-nowrap">{f.gf}:{f.gc}</td>
      <td className="px-1.5 text-center text-white/70 tabular-nums">{f.dg > 0 ? `+${f.dg}` : f.dg}</td>
      <td className="pl-1.5 pr-4 text-center font-headline font-black text-white tabular-nums">{f.pts}</td>
    </tr>
  );
}

function Ranking({ titulo, color, filas, prefijo, className = '', dosColumnas }: {
  titulo: string; color: string; filas: FilaTabla[]; prefijo: string; className?: string; dosColumnas?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-4 ${className}`} style={{ background: '#181c22', boxShadow: `inset 3px 0 0 ${color}` }}>
      <p className="font-headline font-bold mb-2" style={{ color }}>{titulo}</p>
      <ol className={`text-sm ${dosColumnas ? 'sm:grid sm:grid-rows-4 sm:grid-flow-col sm:gap-x-6' : ''}`}>
        {filas.map((f, i) => (
          <li key={f.equipo} className="flex items-center gap-2 py-1">
            <span className="w-14 shrink-0 text-xs font-bold text-white/50">{prefijo}{i + 1}{prefijo ? '' : '.º'}</span>
            <span className={`flex-1 truncate ${f.equipo === NOSOTROS ? 'font-bold text-soccer-green' : 'text-white'}`}>{f.equipo}</span>
            <span className="text-[11px] text-white/50 whitespace-nowrap">{f.puesto}.º {f.grupo} · {f.pts} pts</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CuadroCopa({ titulo, color, campeon, fases, celda, className = '' }: {
  titulo: string; color: string; campeon?: string; className?: string;
  fases: [string, string[]][]; celda: (codigo: string) => React.ReactNode;
}) {
  return (
    <div className={`rounded-3xl overflow-hidden ${className}`} style={{ background: '#181c22' }}>
      <div className="px-4 py-3 flex items-center justify-between gap-2 flex-wrap" style={{ background: '#0a0e14' }}>
        <h3 className="font-headline font-bold flex items-center gap-2" style={{ color }}><Trophy size={16} /> {titulo}</h3>
        {campeon && (
          <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: color, color: '#10141a' }}>
            Campeón: {campeon}
          </span>
        )}
      </div>
      <div className="p-2 grid gap-2 items-start" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(210px, 1fr))` }}>
        {fases.map(([nombre, codigos]) => (
          <div key={nombre} className="rounded-2xl p-2 space-y-2" style={{ background: '#1c2026' }}>
            <p className="px-1 text-xs font-bold text-white/70">{nombre}</p>
            {codigos.map(celda)}
          </div>
        ))}
      </div>
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

/** Escudo con las iniciales del equipo. */
function Escudo({ equipo, size }: { equipo?: string; size: number }) {
  const palabras = (equipo ?? '').replace(/[^\p{L}\p{N} ]/gu, '').split(' ').filter(Boolean);
  const iniciales = !equipo ? '?' : (palabras.length > 1 ? palabras[0][0] + palabras[1][0] : palabras[0].slice(0, 2)).toUpperCase();
  const yo = equipo === NOSOTROS;
  return (
    <span aria-hidden className="rounded-full flex items-center justify-center font-headline font-black shrink-0"
      style={{
        width: size, height: size, fontSize: size * 0.36,
        background: yo ? 'linear-gradient(135deg, #44f3a9, #00d68f)' : equipo ? '#262a31' : 'rgba(255,255,255,0.05)',
        color: yo ? '#003822' : equipo ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
        boxShadow: yo ? '0 0 16px rgba(68,243,169,0.35)' : undefined,
      }}>
      {iniciales}
    </span>
  );
}

/** Los dos equipos frente a frente: "VS" antes de jugarse, el marcador después. */
function Duelo({ equipos, pendiente, resultado, ganador, penales, color, grande }: {
  equipos: Cruce; pendiente?: [string, string]; resultado?: Resultado; ganador?: string;
  penales?: boolean; color?: string; grande?: boolean;
}) {
  const lado = (equipo: string | undefined, i: 0 | 1) => (
    <div className={`flex flex-col items-center gap-1.5 min-w-0 text-center ${ganador && ganador !== equipo ? 'opacity-55' : ''}`}>
      <Escudo equipo={equipo} size={grande ? 46 : 32} />
      <span className={`w-full leading-tight break-words ${grande ? 'text-sm' : 'text-xs'} ${
        equipo === NOSOTROS ? 'font-bold text-soccer-green' : equipo ? 'font-semibold text-white' : 'text-white/50'}`}>
        {equipo ?? pendiente?.[i] ?? 'Por definir'}
      </span>
    </div>
  );
  return (
    <div className="grid items-center gap-2" style={{ gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)' }}>
      {lado(equipos.local, 0)}
      <div className="flex flex-col items-center gap-0.5">
        {resultado ? (
          <span className={`font-headline font-black text-white tabular-nums whitespace-nowrap ${grande ? 'text-3xl' : 'text-xl'}`}>
            {resultado.home_goals}<span className="text-white/35 mx-1">–</span>{resultado.away_goals}
          </span>
        ) : (
          <span className={`font-headline font-black italic rounded-lg ${grande ? 'text-base px-2.5 py-1' : 'text-[11px] px-2 py-1'}`}
            style={{ background: '#262a31', color: color ?? 'rgba(255,255,255,0.75)', transform: 'skewX(-6deg)' }}>
            VS
          </span>
        )}
        {penales && <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">Penales</span>}
      </div>
      {lado(equipos.visita, 1)}
    </div>
  );
}

function CeldaPartido({ partido, cancha, titulo, equipos, resultado, puedeEditar, editando, onEditar, onGuardar, onBorrar }: {
  partido: Partido; cancha: number; titulo?: string; equipos: Cruce; resultado?: Resultado; puedeEditar: boolean;
  editando: boolean; onEditar: (abrir: boolean) => void; onGuardar: (r: Resultado) => Promise<void>; onBorrar: () => void;
}) {
  const definido = !!equipos.local && !!equipos.visita;
  const nuestro = equipos.local === NOSOTROS || equipos.visita === NOSOTROS;
  const color = nuestro ? VERDE : partido.copa === 'oro' ? ORO : partido.copa === 'plata' ? PLATA : null;
  const ganador = resultado ? ganadorDe(equipos, resultado) : undefined;
  const penales = !!resultado && !!partido.copa && resultado.home_goals === resultado.away_goals && !!resultado.penalty_winner;

  return (
    <div className="rounded-xl px-3 py-2.5"
      style={{
        background: nuestro ? 'linear-gradient(160deg, rgba(68,243,169,0.20) 0%, rgba(68,243,169,0.07) 100%)' : '#0a0e14',
        boxShadow: nuestro ? 'inset 0 0 0 1.5px rgba(68,243,169,0.55)' : color ? `inset 3px 0 0 ${color}` : undefined,
      }}>
      <div className="flex items-center justify-between gap-2 mb-1 min-h-[22px]">
        <span className="text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: color || 'rgba(255,255,255,0.5)' }}>
          {titulo ?? <>Cancha {cancha} · {
            // Con los equipos ya definidos sobra "1.º vs 8.º": el rival pudo reasignarse.
            partido.codigo.startsWith('F') ? partido.texto
              : partido.texto && !definido ? `${partido.codigo} · ${partido.texto}`
              : partido.codigo
          }</>}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {nuestro && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: VERDE, color: '#003822' }}>
              Nosotros
            </span>
          )}
          {puedeEditar && definido && !editando && (
            <button onClick={() => onEditar(true)} title={resultado ? 'Corregir resultado' : 'Ingresar resultado'}
              aria-label={resultado ? 'Corregir resultado' : 'Ingresar resultado'}
              className="p-1 rounded-md text-white/60 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <Pencil size={13} />
            </button>
          )}
        </span>
      </div>

      {editando && definido ? (
        <EditorResultado partido={partido} equipos={equipos} resultado={resultado}
          onCancelar={() => onEditar(false)} onGuardar={onGuardar} onBorrar={onBorrar} />
      ) : (
        <div className="pt-1.5 pb-1">
          <Duelo equipos={equipos} pendiente={partido.pendiente} resultado={resultado} ganador={ganador} penales={penales}
            color={color ?? undefined} />
        </div>
      )}
    </div>
  );
}

function EditorResultado({ partido, equipos, resultado, onCancelar, onGuardar, onBorrar }: {
  partido: Partido; equipos: Cruce; resultado?: Resultado;
  onCancelar: () => void; onGuardar: (r: Resultado) => Promise<void>; onBorrar: () => void;
}) {
  const [gl, setGl] = useState(resultado ? String(resultado.home_goals) : '');
  const [gv, setGv] = useState(resultado ? String(resultado.away_goals) : '');
  const [al, setAl] = useState(String(resultado?.home_yellows ?? 0));
  const [av, setAv] = useState(String(resultado?.away_yellows ?? 0));
  const [penales, setPenales] = useState<Resultado['penalty_winner']>(resultado?.penalty_winner ?? null);
  const [guardando, setGuardando] = useState(false);

  const esCopa = !!partido.copa;
  const num = (v: string) => (/^\d{1,2}$/.test(v) ? Number(v) : null);
  const golesL = num(gl);
  const golesV = num(gv);
  const empateCopa = esCopa && golesL !== null && golesL === golesV;
  const listo = golesL !== null && golesV !== null && (!empateCopa || !!penales);

  const guardar = async () => {
    if (!listo) return;
    setGuardando(true);
    await onGuardar({
      match_code: partido.codigo,
      home_goals: golesL!, away_goals: golesV!,
      home_yellows: esCopa ? 0 : num(al) ?? 0,
      away_yellows: esCopa ? 0 : num(av) ?? 0,
      penalty_winner: empateCopa ? penales : null,
    });
    setGuardando(false);
  };

  const campo = (valor: string, cambiar: (v: string) => void, etiqueta: string) => (
    <input inputMode="numeric" value={valor} aria-label={etiqueta} placeholder="–"
      onChange={e => cambiar(e.target.value.replace(/\D/g, '').slice(0, 2))}
      className="w-11 h-9 rounded-lg text-center font-headline font-black text-white outline-none focus:ring-2 focus:ring-soccer-green"
      style={{ background: '#262a31' }} />
  );

  const fila = (equipo: string, goles: string, setGoles: (v: string) => void, amar: string, setAmar: (v: string) => void) => (
    <div className="flex items-center gap-2">
      <span className={`flex-1 min-w-0 truncate text-sm ${equipo === NOSOTROS ? 'font-bold text-soccer-green' : 'text-white'}`}>{equipo}</span>
      {campo(goles, setGoles, `Goles de ${equipo}`)}
      {!esCopa && campo(amar, setAmar, `Amarillas de ${equipo}`)}
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex justify-end gap-2 text-[10px] font-bold uppercase tracking-wider text-white/50">
        <span className="w-11 text-center">Goles</span>
        {!esCopa && <span className="w-11 text-center" title="Tarjetas amarillas: desempatan el ranking">Amar.</span>}
      </div>
      {fila(equipos.local!, gl, setGl, al, setAl)}
      {fila(equipos.visita!, gv, setGv, av, setAv)}

      {empateCopa && (
        <div>
          <p className="text-[11px] text-white/60 mb-1">Empate: ¿quién ganó por penales?</p>
          <div className="grid grid-cols-2 gap-1.5">
            {([['local', equipos.local!], ['visita', equipos.visita!]] as const).map(([lado, nombre]) => (
              <button key={lado} onClick={() => setPenales(lado)}
                className="px-2 py-1.5 rounded-lg text-xs font-bold truncate"
                style={penales === lado ? { background: VERDE, color: '#003822' } : { background: '#262a31', color: 'rgba(255,255,255,0.8)' }}>
                {nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        {resultado && (
          <button onClick={onBorrar} title="Borrar resultado" aria-label="Borrar resultado" className="p-1.5 text-red-400/80 hover:text-red-400">
            <Trash2 size={15} />
          </button>
        )}
        <button onClick={onCancelar} className="ml-auto px-3 py-1.5 rounded-lg text-xs text-white/70 hover:text-white">Cancelar</button>
        <button onClick={guardar} disabled={!listo || guardando} className="btn-primary px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
