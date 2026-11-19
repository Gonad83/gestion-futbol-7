/**
 * Datos del panel de inicio.
 *
 * Todo lo que el Dashboard le pide o le guarda a Supabase vive aquí, separado
 * de cómo se dibuja. Las cuentas (morosos, ranking, votos) son funciones puras:
 * reciben datos y devuelven datos, así se pueden probar sin base de datos.
 */
import { supabase, withTimeout } from '../supabase';
import type { TitularGuardado } from '../../pages/dashboard/titular';
import { totalRecibido, type FilaDinero } from '../cuotas';
import { hoyLocal } from '../formato';
import { rankingGoleadores, type Goleador } from './resultado';
import { CUOTA_POR_DEFECTO, morososDeCaja } from './finanzas';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface JugadorDash {
  id: string;
  name: string;
  nickname: string | null;
  status: string;
  photo_url: string | null;
  user_id: string | null;
  position: string | null;
  match_role: string | null;
  /** Estrellas y sub-estrellas (1-7), para armar el equipo titular. */
  secondary_position?: string | null;
  rating?: number | null;
  vision?: number | null;
  ataque?: number | null;
  defensa?: number | null;
  /** Ingreso al equipo: desde ese mes se le cobra la cuota. */
  created_at?: string | null;
}

export interface PagoDash {
  player_id: string;
  month: number;
  year: number;
  amount: number | string | null;
  status: string;
  es_deuda?: boolean | null;
}

export interface Moroso extends JugadorDash {
  pendingPayments: PagoDash[];
}

export interface JugadorConAsistencia extends JugadorDash {
  attendanceStatus: EstadoAsistencia;
}

export type EstadoAsistencia = 'Voy' | 'No voy' | 'Pendiente';

export interface PartidoDash {
  id: string;
  date: string;
  location?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [campo: string]: any;
}

export interface Invitado {
  id: string;
  name: string;
}

export interface TopPlayer {
  id: string;
  count: number;
  name: string;
  nickname: string;
  photo_url: string;
}

export interface GanadorMvp {
  player_id: string;
  player_name: string;
  player_photo_url: string | null;
  vote_count: number;
  week_date: string;
  created_at: string;
}

export interface AjustesEquipoDash {
  team_name: string;
  logo_url: string;
  join_code: string;
  payment_link: string;
  payment_button_enabled: boolean;
  banner_url: string;
  /** Equipo titular que el capitán dejó armado a mano; sin él, se arma solo. */
  titular?: TitularGuardado | null;
}

export interface DashboardStats {
  nextMatch: PartidoDash | null;
  confirmedCount: number;
  declinedCount: number;
  /** Quiénes dijeron "No voy" al próximo partido (no entran al equipo titular). */
  declinedIds: string[];
  pendingCount: number;
  morosos: Moroso[];
  balance: number;
  activePlayers: number;
  totalPlayers: number;
  topParticipations: TopPlayer[];
  totalMatchesPlayed: number;
  topMvp: TopPlayer[];
  allPlayers: JugadorDash[];
  votingIsOpen: boolean;
  openVoteMatchId: string | null;
  openVoteMatchDate: string | null;
  lastMvpWinner: GanadorMvp | null;
  mvpWinHistory: TopPlayer[];
  mvpHistory: GanadorMvp[];
  /** Goleadores de los últimos 12 meses, con los resultados cargados. */
  goleadores: Goleador[];
}

export interface DatosDashboard {
  /** null si no se pudo leer la configuración del equipo. */
  teamSettings: AjustesEquipoDash | null;
  stats: DashboardStats;
  myPlayer: JugadorDash | null;
  myConfirmStatus: EstadoAsistencia;
  confirmedPlayers: JugadorDash[];
  guests: Invitado[];
}

export const STATS_VACIAS: DashboardStats = {
  nextMatch: null,
  confirmedCount: 0,
  declinedCount: 0,
  declinedIds: [],
  pendingCount: 0,
  morosos: [],
  balance: 0,
  activePlayers: 0,
  totalPlayers: 0,
  topParticipations: [],
  totalMatchesPlayed: 0,
  topMvp: [],
  allPlayers: [],
  votingIsOpen: false,
  openVoteMatchId: null,
  openVoteMatchDate: null,
  lastMvpWinner: null,
  mvpWinHistory: [],
  mvpHistory: [],
  goleadores: [],
};

// ── Cuentas (sin base de datos) ──────────────────────────────────────────────

/**
 * Jugadores activos con cuotas pendientes hasta el mes de `hoy`. Usa la misma
 * cuenta que Caja (todos los meses desde su ingreso que no están pagados ni
 * exentos; enero y febrero no se cobran), así el Inicio y Caja dicen lo mismo.
 */
export function calcularMorosos(activos: JugadorDash[], pagos: PagoDash[], quota: number = CUOTA_POR_DEFECTO, hoy: Date = new Date()): Moroso[] {
  const porId = new Map(activos.map((j) => [j.id, j]));
  const deCaja = morososDeCaja(
    activos.map((j) => ({ id: j.id, name: j.name, nickname: j.nickname, status: j.status, created_at: j.created_at ?? null })),
    pagos,
    quota,
    hoy,
  );
  return deCaja.map((m) => ({
    ...porId.get(m.id)!,
    pendingPayments: m.pendingMonths.map((mes) => ({ player_id: m.id, month: mes.month, year: mes.year, amount: quota, status: 'Pendiente' })),
  }));
}

/** Cuenta votos por jugador y los ordena de más a menos. */
export function contarVotos(votos: { voted_player_id: string | null }[]): [string, number][] {
  const counts: Record<string, number> = {};
  votos.forEach((v) => {
    if (v.voted_player_id) counts[v.voted_player_id] = (counts[v.voted_player_id] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

/** La votación de un partido cierra el domingo de esa semana a las 23:59. */
export function cierreDeVotacion(fechaPartido: Date): Date {
  const matchDay = fechaPartido.getDay(); // 0 = domingo
  const daysUntilSunday = matchDay === 0 ? 0 : 7 - matchDay;
  const cierre = new Date(fechaPartido);
  cierre.setDate(fechaPartido.getDate() + daysUntilSunday);
  cierre.setHours(23, 59, 59, 999);
  return cierre;
}

/** Todo el plantel ordenado por partidos a los que fue, y cuántos partidos distintos hubo. */
export function rankingParticipaciones(
  jugadores: JugadorDash[],
  asistencias: { player_id: string | null; match_id: string | null }[],
): { ranking: TopPlayer[]; totalPartidos: number } {
  const counts: Record<string, number> = {};
  const partidos = new Set<string>();
  asistencias.forEach((a) => {
    if (a.player_id) counts[a.player_id] = (counts[a.player_id] || 0) + 1;
    if (a.match_id) partidos.add(a.match_id);
  });
  const ranking = jugadores
    .map((p) => ({ id: p.id, count: counts[p.id] || 0, name: p.name || '?', nickname: p.nickname || '', photo_url: p.photo_url || '' }))
    .sort((a, b) => b.count - a.count);
  return { ranking, totalPartidos: partidos.size };
}

/** Quiénes han ganado más veces el MVP (los cinco primeros). */
export function rankingMvp(ganadores: GanadorMvp[]): TopPlayer[] {
  const wins: Record<string, { name: string; photo: string; count: number }> = {};
  ganadores.forEach((w) => {
    if (!wins[w.player_id]) wins[w.player_id] = { name: w.player_name, photo: w.player_photo_url || '', count: 0 };
    wins[w.player_id].count++;
  });
  return Object.entries(wins)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([id, v]) => ({ id, count: v.count, name: v.name, nickname: '', photo_url: v.photo }));
}

/** Une el plantel activo con lo que respondió cada uno para un partido. */
export function unirAsistencia(
  jugadores: JugadorDash[],
  asistencias: { player_id: string; status: string }[],
): JugadorConAsistencia[] {
  const statusMap: Record<string, string> = {};
  asistencias.forEach((a) => {
    statusMap[a.player_id] = a.status;
  });
  return jugadores
    .filter((p) => p.status === 'Activo')
    .map((p) => ({ ...p, attendanceStatus: (statusMap[p.id] || 'Pendiente') as EstadoAsistencia }));
}

/** Valida lo guardado en team_settings.titular; cualquier otra cosa cuenta como "sin armar". */
export function leerTitular(valor: unknown): TitularGuardado | null {
  const t = valor as Partial<TitularGuardado> | null;
  if (!t || typeof t.formacion !== 'string' || !Array.isArray(t.puestos)) return null;
  return {
    formacion: t.formacion,
    puestos: t.puestos.map((id) => (typeof id === 'string' ? id : null)),
    ...(typeof t.color === 'string' ? { color: t.color } : {}),
  };
}

const suma = (filas: { amount: number | string | null }[]) => filas.reduce((acc, f) => acc + Number(f.amount), 0);

// ── Lecturas ─────────────────────────────────────────────────────────────────

/** Ejecuta una consulta con tiempo límite y devuelve sus filas (vacío si no hay o falló). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function filas<T = any>(consulta: PromiseLike<{ data: any; error?: { message: string } | null }>, ms: number): Promise<T[]> {
  // Si la consulta falla se avisa: antes se devolvía una lista vacía y la
  // pantalla mostraba ceros como si fueran datos reales.
  const { data, error } = await withTimeout(Promise.resolve(consulta), ms);
  if (error) throw new Error(error.message);
  return (data as T[] | null) || [];
}

export async function asistenciaDelPartido(matchId: string) {
  const { data } = await supabase.from('attendance').select('player_id, status').eq('match_id', matchId);
  return (data || []) as { player_id: string; status: string }[];
}

export async function invitadosDelPartido(matchId: string) {
  const { data } = await supabase.from('match_guests').select('id, name').eq('match_id', matchId);
  return (data || []) as Invitado[];
}

export async function votosDelPartido(matchId: string) {
  const { data } = await supabase.from('match_mvp_votes').select('voted_player_id').eq('match_id', matchId);
  return (data || []) as { voted_player_id: string | null }[];
}

/** Carga todo lo que muestra el panel de inicio de un equipo. */
export async function cargarDashboard(teamId: number): Promise<DatosDashboard> {
  // 1. Equipo y plantel (los ids de jugadores filtran las consultas siguientes).
  const [settingsRes, allPlayers] = await Promise.all([
    supabase.from('team_settings').select('*').eq('id', teamId).maybeSingle(),
    filas<JugadorDash>(
      supabase.from('players').select('id, name, nickname, status, photo_url, user_id, position, match_role, secondary_position, rating, vision, ataque, defensa, created_at').eq('team_id', teamId),
      8000,
    ),
  ]);
  const s = settingsRes.data;
  const teamSettings: AjustesEquipoDash | null = s
    ? {
        team_name: s.team_name,
        logo_url: s.logo_url || '',
        join_code: s.join_code || '',
        payment_link: s.payment_link || '',
        payment_button_enabled: s.payment_button_enabled || false,
        banner_url: s.banner_url || '',
        titular: leerTitular(s.titular),
      }
    : null;

  const activos = allPlayers.filter((p) => p.status === 'Activo');
  const playerIds = allPlayers.map((p) => p.id);
  const sinJugadores = playerIds.length === 0;

  const { data: { user } } = await supabase.auth.getUser();
  const myPlayer = allPlayers.find((p) => p.user_id === user?.id) || null;

  // 2. El resto en paralelo, siempre filtrado por el equipo.
  const ahora = new Date().toISOString();
  const [proximos, pagos, pagados, gastos, ingresos, asistencias] = await Promise.all([
    filas<PartidoDash>(
      supabase.from('matches').select('*').eq('team_id', teamId).eq('status', 'Programado').gte('date', ahora)
        .order('date', { ascending: true }).limit(1),
      20000,
    ),
    sinJugadores ? [] : filas<PagoDash>(supabase.from('payments').select('player_id, month, year, amount, status, es_deuda').in('player_id', playerIds), 8000),
    sinJugadores ? [] : filas<FilaDinero>(supabase.from('payments').select('amount, status, es_deuda').in('status', ['Pagado', 'Pendiente', 'Atrasado']).in('player_id', playerIds), 15000),
    filas<{ amount: number }>(supabase.from('expenses').select('amount').eq('team_id', teamId), 15000),
    filas<{ amount: number }>(supabase.from('cash_incomes').select('amount').eq('team_id', teamId), 15000),
    sinJugadores
      ? []
      : filas<{ player_id: string; match_id: string }>(
          supabase.from('attendance').select('player_id, match_id').eq('status', 'Voy').in('player_id', playerIds),
          8000,
        ),
  ]);

  // 3. Próximo partido: quién va, quién no y los invitados.
  const nextMatch = proximos[0] || null;
  let confirmedCount = 0;
  let declinedCount = 0;
  let declinedIds: string[] = [];
  let confirmedPlayers: JugadorDash[] = [];
  let guests: Invitado[] = [];
  let myConfirmStatus: EstadoAsistencia = 'Pendiente';

  if (nextMatch) {
    const [respuestas, invitados] = await Promise.all([
      filas<{ player_id: string; status: string }>(supabase.from('attendance').select('player_id, status').eq('match_id', nextMatch.id), 15000),
      filas<Invitado>(supabase.from('match_guests').select('id, name').eq('match_id', nextMatch.id), 8000),
    ]);
    const van = respuestas.filter((a) => a.status === 'Voy');
    confirmedCount = van.length;
    declinedIds = respuestas.filter((a) => a.status === 'No voy').map((a) => a.player_id);
    declinedCount = declinedIds.length;
    const idsQueVan = new Set(van.map((a) => a.player_id));
    confirmedPlayers = allPlayers.filter((p) => idsQueVan.has(p.id));
    guests = invitados;
    if (myPlayer) {
      const mia = respuestas.find((a) => a.player_id === myPlayer.id);
      myConfirmStatus = (mia?.status as EstadoAsistencia) || 'Pendiente';
    }
  }

  const { ranking: topParticipations, totalPartidos: totalMatchesPlayed } = rankingParticipaciones(allPlayers, asistencias);
  const [mvp, goleadores] = await Promise.all([cargarMvp(teamId, allPlayers), cargarGoleadores(teamId, allPlayers)]);

  return {
    teamSettings,
    myPlayer,
    myConfirmStatus,
    confirmedPlayers,
    guests,
    stats: {
      nextMatch,
      confirmedCount,
      declinedCount,
      declinedIds,
      pendingCount: nextMatch ? Math.max(0, activos.length - confirmedCount - declinedCount) : 0,
      morosos: calcularMorosos(activos, pagos, Number(s?.quota_amount ?? CUOTA_POR_DEFECTO)),
      // Igual que en Caja: meses pagados y abonos, más ingresos, menos gastos.
      balance: totalRecibido(pagados) + suma(ingresos) - suma(gastos),
      activePlayers: activos.length,
      totalPlayers: allPlayers.length,
      topParticipations,
      totalMatchesPlayed,
      allPlayers,
      ...mvp,
      goleadores,
    },
  };
}

type DatosMvp = Pick<
  DashboardStats,
  'topMvp' | 'votingIsOpen' | 'openVoteMatchId' | 'openVoteMatchDate' | 'lastMvpWinner' | 'mvpWinHistory' | 'mvpHistory'
>;

/**
 * Votación del último partido deportivo (de los últimos 7 días) e historial de
 * ganadores. Si la votación ya cerró y nadie guardó al ganador, lo guarda.
 */
/** Goleadores del equipo en los últimos 12 meses. Si falla, el Inicio se muestra igual, sin la tarjeta llena. */
async function cargarGoleadores(teamId: number, allPlayers: JugadorDash[]): Promise<Goleador[]> {
  const haceUnAno = new Date();
  haceUnAno.setFullYear(haceUnAno.getFullYear() - 1);
  const { data, error } = await supabase.from('match_player_stats')
    .select('player_id, equipo, goles, asistencias, matches!inner(team_id, date)')
    .eq('matches.team_id', teamId).gte('matches.date', haceUnAno.toISOString());
  if (error) { console.error('goleadores:', error.message); return []; }
  return rankingGoleadores((data ?? []) as { player_id: string; equipo: string | null; goles: number; asistencias: number }[], allPlayers);
}

async function cargarMvp(teamId: number, allPlayers: JugadorDash[]): Promise<DatosMvp> {
  const mvp: DatosMvp = {
    topMvp: [],
    votingIsOpen: false,
    openVoteMatchId: null,
    openVoteMatchDate: null,
    lastMvpWinner: null,
    mvpWinHistory: [],
    mvpHistory: [],
  };

  try {
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);
    const [ultimo] = await filas<{ id: string; date: string }>(
      supabase.from('matches').select('id, date').eq('team_id', teamId).eq('event_type', 'Deportivo')
        .lt('date', new Date().toISOString()).gt('date', hace7Dias.toISOString())
        .order('date', { ascending: false }).limit(1),
      5000,
    );

    if (ultimo) {
      if (new Date() <= cierreDeVotacion(new Date(ultimo.date))) {
        mvp.votingIsOpen = true;
        mvp.openVoteMatchId = ultimo.id;
        mvp.openVoteMatchDate = ultimo.date;
        const votos = await filas<{ voted_player_id: string | null }>(
          supabase.from('match_mvp_votes').select('voted_player_id').eq('match_id', ultimo.id),
          5000,
        );
        mvp.topMvp = contarVotos(votos)
          .slice(0, 3)
          .map(([id, count]) => {
            const p = allPlayers.find((pl) => pl.id === id);
            return { id, count, name: p?.name || '?', nickname: p?.nickname || '', photo_url: p?.photo_url || '' };
          });
      }
      // Al cerrar, el ganador lo guarda la base (cerrar_votaciones_mvp, cada hora),
      // aunque nadie abra la app.
    }

    const { data: ganadores, error } = await withTimeout(
      Promise.resolve(
        supabase.from('mvp_winners')
          .select('player_id, player_name, player_photo_url, vote_count, week_date, created_at')
          .order('week_date', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false }),
      ),
      5000,
    );
    if (!error && ganadores && ganadores.length > 0) {
      mvp.lastMvpWinner = ganadores[0];
      mvp.mvpHistory = ganadores;
      mvp.mvpWinHistory = rankingMvp(ganadores);
    }
  } catch {
    // Si la parte de MVP falla, el resto del panel se muestra igual.
  }

  return mvp;
}

// ── Escrituras ───────────────────────────────────────────────────────────────

export function agregarInvitado(matchId: string, name: string) {
  return supabase.from('match_guests').insert({ match_id: matchId, name }).select('id, name').single();
}

export async function quitarInvitado(guestId: string) {
  await supabase.from('match_guests').delete().eq('id', guestId);
}

/** Guarda la respuesta de un jugador para un partido; "Pendiente" borra la que hubiera. */
export async function guardarAsistencia(matchId: string, playerId: string, estado: EstadoAsistencia) {
  const { data: existente, error: errLeer } = await supabase.from('attendance').select('id').eq('match_id', matchId).eq('player_id', playerId).maybeSingle();
  if (errLeer) throw new Error(errLeer.message);
  const { error } = estado === 'Pendiente'
    ? (existente ? await supabase.from('attendance').delete().eq('id', existente.id) : { error: null })
    : existente
      ? await supabase.from('attendance').update({ status: estado }).eq('id', existente.id)
      : await supabase.from('attendance').insert({ match_id: matchId, player_id: playerId, status: estado });
  if (error) throw new Error(error.message);
}

/** Guarda el equipo titular armado a mano para que lo vea todo el equipo (solo el capitán puede). */
export function guardarTitular(teamId: number, titular: TitularGuardado) {
  return supabase.from('team_settings').update({ titular }).eq('id', teamId);
}

export function guardarGanadorMvp(matchId: string, jugador: JugadorDash, votos: number) {
  return supabase.from('mvp_winners').insert({
    match_id: matchId,
    player_id: jugador.id,
    player_name: jugador.name,
    player_photo_url: jugador.photo_url || null,
    vote_count: votos,
    week_date: hoyLocal(),
  });
}
