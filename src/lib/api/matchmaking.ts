/**
 * Datos de Matchmaking: lo que la pantalla le pide o le guarda a Supabase.
 * Las reglas del armado de equipos están en lib/matchmaking.
 */
import { planVigente } from '../plan';
import { supabase, withTimeout } from '../supabase';
import type { JugadorMM, PartidoMM } from '../matchmaking';

export interface AjustesEquipoMM {
  team_name: string;
  logo_url: string;
  plan: string;
}

export interface EquiposGuardados {
  team_a: JugadorMM[] | null;
  team_b: JugadorMM[] | null;
  metadata?: { formationA?: string; formationB?: string; colorA?: string; colorB?: string } | null;
}

export interface Convocatoria {
  confirmados: JugadorMM[];
  bajas: JugadorMM[];
  activos: JugadorMM[];
  guardados: EquiposGuardados | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function filas<T = any>(consulta: PromiseLike<{ data: any; error?: { message: string } | null }>, ms = 10000): Promise<T[]> {
  // Si la consulta falla se avisa: antes se devolvía una lista vacía y la
  // pantalla mostraba ceros como si fueran datos reales.
  const { data, error } = await withTimeout(Promise.resolve(consulta), ms);
  if (error) throw new Error(error.message);
  return (data as T[] | null) || [];
}

const comoInvitado = (g: JugadorMM): JugadorMM => ({ ...g, isGuest: true, photo_url: null, nickname: null });

/** Partidos para armar: los de las próximas 3 semanas y los últimos 3 jugados (sin eventos recreacionales). */
export async function cargarPartidos(teamId: number): Promise<{ teamSettings: AjustesEquipoMM | null; proximos: PartidoMM[]; jugados: PartidoMM[] }> {
  const { data: s } = await supabase.from('team_settings').select('*').eq('id', teamId).maybeSingle();
  const teamSettings = s ? { team_name: s.team_name, logo_url: s.logo_url || '', plan: planVigente(s.plan, s.plan_expires_at) } : null;

  const ahora = new Date().toISOString();
  const enTresSemanas = new Date();
  enTresSemanas.setDate(enTresSemanas.getDate() + 21);

  const proximos = await filas<PartidoMM>(
    supabase.from('matches').select('*').eq('team_id', teamId)
      .eq('status', 'Programado').neq('event_type', 'Recreacional')
      .gte('date', ahora).lte('date', enTresSemanas.toISOString())
      .order('date', { ascending: true }),
  );
  const jugados = await filas<PartidoMM>(
    supabase.from('matches').select('*').eq('team_id', teamId)
      .neq('event_type', 'Recreacional').lt('date', ahora)
      .order('date', { ascending: false }).limit(3),
  );

  // Marca cuáles ya tienen equipos guardados.
  const ids = [...proximos, ...jugados].map((m) => m.id);
  const guardados = ids.length > 0 ? await filas<{ match_id: string }>(supabase.from('generated_teams').select('match_id').in('match_id', ids)) : [];
  const conEquipos = new Set(guardados.map((r) => r.match_id));
  const marcar = (m: PartidoMM) => ({ ...m, has_saved_teams: conEquipos.has(m.id) });

  return { teamSettings, proximos: proximos.map(marcar), jugados: jugados.map(marcar) };
}

/** Quiénes van (plantel e invitados), quiénes no, el plantel activo y los equipos ya guardados de un partido. */
export async function cargarConvocatoria(matchId: string, teamId: number | null): Promise<Convocatoria> {
  const respuestas = (estado: string) =>
    filas<{ player: JugadorMM }>(supabase.from('attendance').select('*, player:players(*)').eq('match_id', matchId).eq('status', estado));

  const van = await respuestas('Voy');
  const noVan = await respuestas('No voy');
  const invitados = await filas<JugadorMM>(supabase.from('match_guests').select('*').eq('match_id', matchId));
  const activos = await filas<JugadorMM>(supabase.from('players').select('*').eq('team_id', teamId).eq('status', 'Activo'));
  const { data: guardados } = await supabase.from('generated_teams').select('*').eq('match_id', matchId).maybeSingle();

  return {
    confirmados: [...van.map((d) => d.player), ...invitados.map(comoInvitado)],
    bajas: noVan.map((d) => d.player),
    activos,
    guardados: guardados ?? null,
  };
}

/** Marca a un jugador del plantel como "Voy" para el partido. */
export function confirmarJugador(matchId: string, playerId: string) {
  return supabase.from('attendance').upsert([{ match_id: matchId, player_id: playerId, status: 'Voy' }], { onConflict: 'match_id,player_id' });
}

export function quitarAsistencia(matchId: string, playerId: string) {
  return supabase.from('attendance').delete().eq('match_id', matchId).eq('player_id', playerId);
}

export async function crearInvitado(matchId: string, name: string, rating: number) {
  const { data, error } = await supabase.from('match_guests').insert([{ match_id: matchId, name, rating, position: 'Invitado' }]).select().single();
  return { invitado: data ? comoInvitado(data) : null, error };
}

export function borrarInvitado(guestId: string) {
  return supabase.from('match_guests').delete().eq('id', guestId);
}

export function renombrarInvitado(guestId: string, name: string) {
  return supabase.from('match_guests').update({ name }).eq('id', guestId);
}

/** Guarda los equipos del partido (actualiza si ya había, crea si no). */
export async function guardarEquipos(matchId: string, equipos: Required<Pick<EquiposGuardados, 'team_a' | 'team_b' | 'metadata'>>) {
  const { data: existente, error: errLeer } = await supabase.from('generated_teams').select('id').eq('match_id', matchId).maybeSingle();
  if (errLeer) throw new Error(errLeer.message);
  const { error } = existente
    ? await supabase.from('generated_teams').update(equipos).eq('id', existente.id)
    : await supabase.from('generated_teams').insert([{ match_id: matchId, ...equipos }]);
  if (error) throw new Error(error.message);
}
