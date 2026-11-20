/** Trae de una vez todo lo que necesitan los cálculos de src/lib/temporada.ts. */
import { supabase } from '../supabase';
import type { DatosTemporada } from '../temporada';

const LOTE = 100; // ids por consulta: .in() con cientos de ids alarga demasiado la URL

async function porLotes<T>(ids: string[], consulta: (lote: string[]) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const salida: T[] = [];
  for (let i = 0; i < ids.length; i += LOTE) {
    const { data, error } = await consulta(ids.slice(i, i + LOTE));
    if (error) throw new Error(error.message);
    salida.push(...(data ?? []));
  }
  return salida;
}

/** Partidos deportivos ya jugados desde `desde` (ISO), con todo lo asociado. */
export async function cargarTemporada(teamId: number, desde: string): Promise<DatosTemporada> {
  const [partidosRes, jugadoresRes] = await Promise.all([
    supabase.from('matches').select('id, date, goles_a, goles_b')
      .eq('team_id', teamId).eq('event_type', 'Deportivo').neq('status', 'Cancelado')
      .gte('date', desde).lt('date', new Date().toISOString()).order('date'),
    supabase.from('players').select('id, name, nickname, rating, created_at, status').eq('team_id', teamId),
  ]);
  if (partidosRes.error) throw new Error(partidosRes.error.message);
  if (jugadoresRes.error) throw new Error(jugadoresRes.error.message);
  const partidos = partidosRes.data ?? [];
  const ids = partidos.map((p) => p.id);

  const [asistencia, equipos, stats, mvps] = await Promise.all([
    porLotes(ids, (l) => supabase.from('attendance').select('match_id, player_id, status, updated_at').in('match_id', l)),
    porLotes(ids, (l) => supabase.from('generated_teams').select('match_id, team_a, team_b').in('match_id', l)),
    porLotes(ids, (l) => supabase.from('match_player_stats').select('match_id, player_id, equipo, goles, asistencias').in('match_id', l)),
    porLotes(ids, (l) => supabase.from('mvp_winners').select('match_id, player_id').in('match_id', l)),
  ]);

  type Ficha = { id?: string; isGuest?: boolean };
  const soloIds = (lista: unknown) => (Array.isArray(lista) ? (lista as Ficha[]) : []).filter((j) => j?.id && !j.isGuest).map((j) => j.id!);

  return {
    partidos,
    jugadores: jugadoresRes.data ?? [],
    asistencia,
    armados: equipos.map((e: { match_id: string; team_a: unknown; team_b: unknown }) => ({ match_id: e.match_id, a: soloIds(e.team_a), b: soloIds(e.team_b) })),
    stats,
    mvps: mvps.filter((m: { player_id: string | null }) => m.player_id) as { match_id: string; player_id: string }[],
  };
}
