/**
 * Números de la temporada a partir de lo que ya guarda la app: asistencia,
 * equipos armados, resultados, goles y MVP. Sin consultas: solo cálculo, para
 * poder probarlo.
 *
 *  - confiabilidad: cuánto responde un jugador y cuántas veces se baja a última hora.
 *  - sugerenciasNivel: a quién subirle o bajarle el nivel según cómo le va a su equipo.
 *  - resumenTemporada: el "wrapped" del año de un jugador.
 */

export interface PartidoT { id: string; date: string; goles_a: number | null; goles_b: number | null }
export interface AsistenciaT { match_id: string; player_id: string; status: string; updated_at: string | null }
export interface ArmadoT { match_id: string; a: string[]; b: string[] }
export interface StatT { match_id: string; player_id: string; equipo: string | null; goles: number; asistencias: number }
export interface MvpT { match_id: string; player_id: string }
export interface JugadorT { id: string; name: string; nickname?: string | null; rating?: number | null; created_at?: string | null; status?: string | null }

/** Partidos deportivos ya jugados, en cualquier orden; el resto también en bruto. */
export interface DatosTemporada {
  partidos: PartidoT[];
  asistencia: AsistenciaT[];
  armados: ArmadoT[];
  stats: StatT[];
  mvps: MvpT[];
  jugadores: JugadorT[];
}

type Resultado = 'G' | 'E' | 'P';

const HORA = 60 * 60 * 1000;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const porFecha = (a: PartidoT, b: PartidoT) => a.date.localeCompare(b.date);

/** Índices para no recorrer todo en cada pregunta. */
function indices(d: DatosTemporada) {
  const asistencia = new Map<string, AsistenciaT>();
  for (const a of d.asistencia) asistencia.set(`${a.match_id}|${a.player_id}`, a);
  const lado = new Map<string, 'A' | 'B'>();
  for (const e of d.armados) {
    e.a.forEach((id) => lado.set(`${e.match_id}|${id}`, 'A'));
    e.b.forEach((id) => lado.set(`${e.match_id}|${id}`, 'B'));
  }
  // Lo anotado en la planilla del resultado manda sobre el armado.
  const stat = new Map<string, StatT>();
  for (const s of d.stats) {
    stat.set(`${s.match_id}|${s.player_id}`, s);
    if (s.equipo === 'A' || s.equipo === 'B') lado.set(`${s.match_id}|${s.player_id}`, s.equipo);
  }
  return { asistencia, lado, stat };
}

function resultadoPara(p: PartidoT, lado: 'A' | 'B' | undefined): Resultado | null {
  if (!lado || p.goles_a === null || p.goles_b === null) return null;
  const propios = lado === 'A' ? p.goles_a : p.goles_b;
  const rivales = lado === 'A' ? p.goles_b : p.goles_a;
  return propios > rivales ? 'G' : propios < rivales ? 'P' : 'E';
}

/** Partidos desde que el jugador entró al equipo (el día de alta cuenta). */
function partidosDesdeAlta(partidos: PartidoT[], j: JugadorT) {
  const alta = j.created_at ? j.created_at.slice(0, 10) : '';
  return partidos.filter((p) => p.date.slice(0, 10) >= alta).sort(porFecha);
}

// ── Confiabilidad ──────────────────────────────────────────────────────────

export interface Confiabilidad {
  puntaje: number;            // 0-100
  nivel: 'alta' | 'media' | 'baja';
  partidos: number;           // partidos considerados
  respondidas: number;        // respondió Voy / No voy / Tal vez
  ultimaHora: number;         // "No voy" marcado en las 24 h antes del partido
}

/**
 * De los últimos `ultimos` partidos desde que entró: qué parte respondió, menos
 * 10 puntos por cada baja de última hora. Con menos de 3 partidos no hay índice.
 */
export function confiabilidad(d: DatosTemporada, jugador: JugadorT, ultimos = 10): Confiabilidad | null {
  const { asistencia } = indices(d);
  const lista = partidosDesdeAlta(d.partidos, jugador).slice(-ultimos);
  if (lista.length < 3) return null;
  let respondidas = 0;
  let ultimaHora = 0;
  for (const p of lista) {
    const a = asistencia.get(`${p.id}|${jugador.id}`);
    if (!a || a.status === 'Pendiente') continue;
    respondidas++;
    if (a.status === 'No voy' && a.updated_at) {
      const antes = new Date(p.date).getTime() - new Date(a.updated_at).getTime();
      if (antes >= 0 && antes < 24 * HORA) ultimaHora++;
    }
  }
  const puntaje = Math.max(0, Math.min(100, Math.round((100 * respondidas) / lista.length) - 10 * ultimaHora));
  return { puntaje, nivel: puntaje >= 85 ? 'alta' : puntaje >= 60 ? 'media' : 'baja', partidos: lista.length, respondidas, ultimaHora };
}

/** Confiabilidad de todo el plantel, por id. */
export function confiabilidadPlantel(d: DatosTemporada): Map<string, Confiabilidad> {
  const salida = new Map<string, Confiabilidad>();
  for (const j of d.jugadores) {
    const c = confiabilidad(d, j);
    if (c) salida.set(j.id, c);
  }
  return salida;
}

// ── Nivel según resultados ─────────────────────────────────────────────────

export interface SugerenciaNivel {
  jugador: JugadorT;
  actual: number;
  sugerido: number;
  ganados: number;
  empatados: number;
  perdidos: number;
}

/**
 * Con al menos `minimo` partidos con resultado en los últimos 15: si su equipo
 * gana 70% o más (empate vale medio), sugiere subirle un punto; si gana 30% o
 * menos, bajarle uno. Escala 1 a 7. Es solo una sugerencia para el capitán.
 */
export function sugerenciasNivel(d: DatosTemporada, minimo = 5): SugerenciaNivel[] {
  const { lado } = indices(d);
  const conResultado = d.partidos.filter((p) => p.goles_a !== null && p.goles_b !== null).sort(porFecha);
  const salida: SugerenciaNivel[] = [];
  for (const j of d.jugadores) {
    if (j.status && j.status !== 'Activo') continue;
    const actual = Number(j.rating) || 0;
    if (actual < 1) continue;
    const jugados = conResultado
      .map((p) => resultadoPara(p, lado.get(`${p.id}|${j.id}`)))
      .filter((r): r is Resultado => r !== null)
      .slice(-15);
    if (jugados.length < minimo) continue;
    const ganados = jugados.filter((r) => r === 'G').length;
    const empatados = jugados.filter((r) => r === 'E').length;
    const perdidos = jugados.length - ganados - empatados;
    const rendimiento = (ganados + empatados / 2) / jugados.length;
    const sugerido = rendimiento >= 0.7 ? Math.min(7, actual + 1) : rendimiento <= 0.3 ? Math.max(1, actual - 1) : actual;
    if (sugerido !== actual) salida.push({ jugador: j, actual, sugerido, ganados, empatados, perdidos });
  }
  return salida.sort((a, b) => (b.sugerido - b.actual) - (a.sugerido - a.actual) || a.jugador.name.localeCompare(b.jugador.name, 'es'));
}

// ── Wrapped de la temporada ────────────────────────────────────────────────

export interface ResumenTemporada {
  anio: number;
  partidosEquipo: number;     // partidos del equipo en el año desde que entró
  jugados: number;
  asistenciaPct: number;
  goles: number;
  asistencias: number;
  mvps: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  mejorRacha: number;         // partidos seguidos jugados
  mesTop: string | null;      // mes con más partidos jugados
  socio: { nombre: string; veces: number } | null; // con quién más compartió equipo
}

const jugo = (a: AsistenciaT | undefined, enPlanilla: boolean) => enPlanilla || a?.status === 'Voy';

export function resumenTemporada(d: DatosTemporada, jugador: JugadorT, anio: number): ResumenTemporada {
  const { asistencia, lado, stat } = indices(d);
  const delAnio = partidosDesdeAlta(d.partidos, jugador).filter((p) => new Date(p.date).getFullYear() === anio);
  const mvpsPorPartido = new Set(d.mvps.filter((m) => m.player_id === jugador.id).map((m) => m.match_id));

  let jugados = 0, goles = 0, asistencias = 0, mvps = 0, ganados = 0, empatados = 0, perdidos = 0;
  let racha = 0, mejorRacha = 0;
  const porMes = new Array(12).fill(0) as number[];
  const juntos = new Map<string, number>();
  const ladosPorPartido = new Map<string, ArmadoT>(d.armados.map((e) => [e.match_id, e]));

  for (const p of delAnio) {
    const clave = `${p.id}|${jugador.id}`;
    const s = stat.get(clave);
    if (!jugo(asistencia.get(clave), !!s)) { racha = 0; continue; }
    jugados++;
    racha++;
    mejorRacha = Math.max(mejorRacha, racha);
    porMes[new Date(p.date).getMonth()]++;
    goles += s?.goles ?? 0;
    asistencias += s?.asistencias ?? 0;
    if (mvpsPorPartido.has(p.id)) mvps++;
    const miLado = lado.get(clave);
    const r = resultadoPara(p, miLado);
    if (r === 'G') ganados++;
    else if (r === 'E') empatados++;
    else if (r === 'P') perdidos++;
    const armado = ladosPorPartido.get(p.id);
    if (armado && miLado) {
      for (const otro of miLado === 'A' ? armado.a : armado.b) {
        if (otro !== jugador.id) juntos.set(otro, (juntos.get(otro) ?? 0) + 1);
      }
    }
  }

  const max = Math.max(...porMes);
  const nombres = new Map(d.jugadores.map((j) => [j.id, j.nickname || j.name]));
  let socio: ResumenTemporada['socio'] = null;
  for (const [id, veces] of juntos) {
    const nombre = nombres.get(id);
    if (!nombre) continue; // invitados u otros sin ficha
    if (!socio || veces > socio.veces || (veces === socio.veces && nombre.localeCompare(socio.nombre, 'es') < 0)) socio = { nombre, veces };
  }

  return {
    anio,
    partidosEquipo: delAnio.length,
    jugados,
    asistenciaPct: delAnio.length ? Math.round((100 * jugados) / delAnio.length) : 0,
    goles, asistencias, mvps, ganados, empatados, perdidos, mejorRacha,
    mesTop: max > 0 ? MESES[porMes.indexOf(max)] : null,
    socio: socio && socio.veces >= 2 ? socio : null,
  };
}
