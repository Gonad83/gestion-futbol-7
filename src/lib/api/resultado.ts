/**
 * Resultado de un partido interno: marcador entre los dos equipos armados (A y
 * B) y la planilla de goles y asistencias de cada jugador.
 */
import { supabase } from '../supabase';

export type Lado = 'A' | 'B' | null;

export interface FilaPlanilla {
  player_id: string;
  name: string;
  nickname: string | null;
  photo_url: string | null;
  equipo: Lado;
  goles: number;
  asistencias: number;
}

export interface Resultado {
  golesA: number | null;
  golesB: number | null;
  colorA: string | null;
  colorB: string | null;
  filas: FilaPlanilla[];
}

interface JugadorBase { id: string; name: string; nickname?: string | null; photo_url?: string | null; isGuest?: boolean }
interface Estadistica { player_id: string; equipo: string | null; goles: number; asistencias: number }

/**
 * Arma la planilla: quienes estuvieron en los equipos armados, quienes
 * confirmaron "Voy" y quienes ya tienen goles anotados, sin repetir. El lado de
 * cada uno sale de lo ya guardado o, si no, del equipo en que lo armaron.
 * Los invitados no tienen ficha y quedan fuera.
 */
export function armarPlanilla(
  equipoA: JugadorBase[],
  equipoB: JugadorBase[],
  confirmados: JugadorBase[],
  guardadas: Estadistica[],
  jugadores: Map<string, JugadorBase>,
): FilaPlanilla[] {
  const lado = new Map<string, Lado>();
  equipoA.filter((j) => !j.isGuest).forEach((j) => lado.set(j.id, 'A'));
  equipoB.filter((j) => !j.isGuest).forEach((j) => lado.set(j.id, 'B'));
  const porId = new Map(guardadas.map((s) => [s.player_id, s]));

  const ids = new Set<string>([...lado.keys(), ...confirmados.map((j) => j.id), ...porId.keys()]);
  const filas: FilaPlanilla[] = [];
  for (const id of ids) {
    const j = jugadores.get(id);
    if (!j) continue;
    const s = porId.get(id);
    filas.push({
      player_id: id,
      name: j.name,
      nickname: j.nickname ?? null,
      photo_url: j.photo_url ?? null,
      equipo: ((s?.equipo as Lado) ?? lado.get(id) ?? null),
      goles: s?.goles ?? 0,
      asistencias: s?.asistencias ?? 0,
    });
  }
  const orden = { A: 0, B: 1 } as const;
  return filas.sort((a, b) =>
    (a.equipo ? orden[a.equipo] : 2) - (b.equipo ? orden[b.equipo] : 2) || a.name.localeCompare(b.name, 'es'));
}

/** Si la planilla no cuadra con el marcador, explica por qué (o null si cuadra). */
export function avisoDescuadre(golesA: number, golesB: number, filas: FilaPlanilla[]): string | null {
  const suma = (l: 'A' | 'B') => filas.filter((f) => f.equipo === l).reduce((s, f) => s + f.goles, 0);
  const a = suma('A');
  const b = suma('B');
  if (a > golesA || b > golesB) return `La planilla tiene más goles que el marcador (${a}-${b} contra ${golesA}-${golesB}).`;
  return null;
}

export async function cargarResultado(matchId: string, teamId: number): Promise<Resultado> {
  const [partido, armados, asistencia, stats, plantel] = await Promise.all([
    supabase.from('matches').select('goles_a, goles_b').eq('id', matchId).maybeSingle(),
    supabase.from('generated_teams').select('team_a, team_b, metadata').eq('match_id', matchId).maybeSingle(),
    supabase.from('attendance').select('player_id').eq('match_id', matchId).eq('status', 'Voy'),
    supabase.from('match_player_stats').select('player_id, equipo, goles, asistencias').eq('match_id', matchId),
    supabase.from('players').select('id, name, nickname, photo_url').eq('team_id', teamId),
  ]);
  const error = partido.error ?? armados.error ?? asistencia.error ?? stats.error ?? plantel.error;
  if (error) throw new Error(error.message);

  const jugadores = new Map<string, JugadorBase>((plantel.data ?? []).map((j) => [j.id, j]));
  const confirmados = (asistencia.data ?? []).map((a) => jugadores.get(a.player_id)).filter((j): j is JugadorBase => !!j);
  const gt = armados.data as { team_a?: JugadorBase[]; team_b?: JugadorBase[]; metadata?: { colorA?: string; colorB?: string } } | null;

  return {
    golesA: partido.data?.goles_a ?? null,
    golesB: partido.data?.goles_b ?? null,
    colorA: gt?.metadata?.colorA ?? null,
    colorB: gt?.metadata?.colorB ?? null,
    filas: armarPlanilla(gt?.team_a ?? [], gt?.team_b ?? [], confirmados, (stats.data ?? []) as Estadistica[], jugadores),
  };
}

export async function guardarResultado(matchId: string, golesA: number, golesB: number, filas: FilaPlanilla[]) {
  const { error } = await supabase.rpc('guardar_resultado', {
    p_match: matchId,
    p_goles_a: golesA,
    p_goles_b: golesB,
    p_jugadores: filas.map((f) => ({ player_id: f.player_id, equipo: f.equipo ?? '', goles: f.goles, asistencias: f.asistencias })),
  });
  if (error) throw new Error(error.message);
}

export interface Goleador { id: string; name: string; nickname: string | null; photo_url: string | null; goles: number; asistencias: number; partidos: number }

/** Ranking de goleadores: más goles, luego más asistencias, luego menos partidos. */
export function rankingGoleadores(stats: Estadistica[], jugadores: JugadorBase[], max = 5): Goleador[] {
  const porId = new Map(jugadores.map((j) => [j.id, j]));
  const suma = new Map<string, Goleador>();
  for (const s of stats) {
    const j = porId.get(s.player_id);
    if (!j) continue;
    const g = suma.get(s.player_id) ?? { id: j.id, name: j.name, nickname: j.nickname ?? null, photo_url: j.photo_url ?? null, goles: 0, asistencias: 0, partidos: 0 };
    g.goles += s.goles;
    g.asistencias += s.asistencias;
    g.partidos += 1;
    suma.set(s.player_id, g);
  }
  return [...suma.values()]
    .filter((g) => g.goles > 0 || g.asistencias > 0)
    .sort((a, b) => b.goles - a.goles || b.asistencias - a.asistencias || a.partidos - b.partidos || a.name.localeCompare(b.name, 'es'))
    .slice(0, max);
}
