/**
 * Reglas del armado de equipos: reparto parejo, formaciones, posiciones en la
 * cancha y los textos que se comparten. Son funciones puras: no tocan la base
 * de datos ni la pantalla, así que se pueden probar solas.
 */
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface JugadorMM {
  id: string;
  name: string;
  rating: number;
  position?: string | null;
  photo_url?: string | null;
  nickname?: string | null;
  /** Invitado de un partido (no es parte del plantel). */
  isGuest?: boolean;
  /** false = no quiere recibir avisos. */
  notify?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [campo: string]: any;
}

export interface PartidoMM {
  id: string;
  date: string;
  status?: string;
  location?: string | null;
  has_saved_teams?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [campo: string]: any;
}

export type Equipo = 'A' | 'B';
export interface SeleccionCambio { team: Equipo; index: number }
export interface Formacion { name: string; value: string }

export const FORMATIONS: Record<'5vs5' | '6vs6' | '7vs7' | '11vs11', Formacion[]> = {
  '5vs5': [
    { name: 'El Rombo', value: '1-2-1' },
    { name: 'El Cuadrado', value: '2-0-2' },
    { name: 'La Pirámide', value: '2-1-1' },
    { name: 'Invertida', value: '1-1-2' },
  ],
  '6vs6': [
    { name: 'El Muro', value: '3-1-1' },
    { name: 'Diamante', value: '2-2-1' },
    { name: 'Árbol Navidad', value: '2-1-2' },
    { name: 'La Flecha', value: '1-2-2' },
  ],
  '7vs7': [
    { name: 'Estándar', value: '3-2-1' },
    { name: 'Dinámico', value: '2-3-1' },
    { name: 'Doble Punta', value: '3-1-2' },
    { name: 'Catenaccio', value: '4-1-1' },
  ],
  '11vs11': [
    { name: 'Clásico', value: '4-4-2' },
    { name: 'Ofensivo', value: '4-3-3' },
    { name: 'Equilibrado', value: '4-2-3-1' },
    { name: 'Tres Centrales', value: '3-5-2' },
  ],
};

export const JERSEY_COLORS = [
  { name: 'Negro', value: 'black', class: 'bg-slate-900 border-white/20' },
  { name: 'Blanco', value: 'white', class: 'bg-white border-slate-300' },
  { name: 'Azul', value: 'blue', class: 'bg-blue-600' },
  { name: 'Verde', value: 'emerald', class: 'bg-emerald-600' },
  { name: 'Amarillo', value: 'yellow', class: 'bg-yellow-500' },
  { name: 'Rojo', value: 'red', class: 'bg-red-600' },
  { name: 'Lila', value: 'purple', class: 'bg-purple-600' },
  { name: 'Celeste', value: 'lightblue', class: 'bg-sky-400' },
];

/** Color de cada camiseta en hexadecimal (anillos de las fichas, bordes de las tarjetas). */
const HEX_CAMISETA: Record<string, string> = {
  black: '#64748b', white: '#f1f5f9', blue: '#3b82f6', emerald: '#10b981',
  yellow: '#eab308', red: '#ef4444', purple: '#a855f7', lightblue: '#38bdf8',
};
export const hexCamiseta = (color: string) => HEX_CAMISETA[color] ?? '#9acbff';

const JERSEY_EMOJI: Record<string, string> = {
  black: '⬛', white: '⬜', blue: '🟦', emerald: '🟩', yellow: '🟨', red: '🟥', purple: '🟪', lightblue: '🔵',
};

export const FREE_GUEST_LIMIT = 4;
export const FREE_PLAYER_LIMIT = 10;
/** Con menos confirmados no se pueden armar dos equipos. */
export const MINIMO_PARA_ARMAR = 10;

const nombreDeColor = (color: string) => JERSEY_COLORS.find((c) => c.value === color)?.name || color;
export const sinMarcaDeInvitado =(nombre: string) => nombre.replace(/\s*\(I\)\s*$/i, '').trim();

/** Un invitado se reconoce por su marca o por el "(I)" al final del nombre. */
export const esInvitado = (p: JugadorMM) => Boolean(p.isGuest || p.name?.includes('(I)'));

/** Los invitados agregados a mano después de armar aún no existen en la base. */
export const esInvitadoTemporal = (id: unknown) => typeof id === 'string' && id.startsWith('guest-');

/** Deja el nombre de un invitado terminado en " (I)", una sola vez. */
export function nombreDeInvitado(nombre: string): string {
  const limpio = nombre.trim();
  if (limpio.toLowerCase().endsWith('(i)')) return limpio;
  return `${limpio} (I)`.replace(' (I) (I)', ' (I)');
}

/** Un partido se puede editar si sigue programado y aún no se juega. */
export const esPartidoPorJugar = (match: PartidoMM | undefined, ahora = Date.now()) =>
  match?.status === 'Programado' && new Date(match.date).getTime() >= ahora;

/** Formaciones disponibles según cuántos confirmados hay. */
export function formacionesPara(totalConfirmados: number): Formacion[] {
  if (totalConfirmados >= 18) return FORMATIONS['11vs11'];
  if (totalConfirmados >= 14) return FORMATIONS['7vs7'];
  if (totalConfirmados >= 12) return FORMATIONS['6vs6'];
  return FORMATIONS['5vs5'];
}

const esArquero = (p: JugadorMM) => {
  const pos = p.position?.toLowerCase();
  return Boolean(pos?.includes('por') || pos?.includes('arq'));
};

/**
 * Reparte a los confirmados en dos equipos parejos.
 * Los arqueros se alternan primero; el resto va de a pares, del mejor al peor:
 * si un equipo va más de 1 punto arriba, el mejor del par va al otro; si están
 * parejos, se sortea. `azar` permite fijar el sorteo en las pruebas.
 */
export function armarEquipos(confirmados: JugadorMM[], azar: () => number = Math.random): { teamA: JugadorMM[]; teamB: JugadorMM[] } {
  const porRating = (a: JugadorMM, b: JugadorMM) => b.rating - a.rating;
  const arqueros = confirmados.filter(esArquero).sort(porRating);
  const resto = confirmados.filter((p) => !esArquero(p)).sort(porRating);
  const teamA: JugadorMM[] = [];
  const teamB: JugadorMM[] = [];
  let sumA = 0;
  let sumB = 0;
  const aA = (p: JugadorMM) => { teamA.push(p); sumA += p.rating; };
  const aB = (p: JugadorMM) => { teamB.push(p); sumB += p.rating; };

  arqueros.forEach((gk, i) => (i % 2 === 0 ? aA(gk) : aB(gk)));
  for (let i = 0; i < resto.length; i += 2) {
    const mejor = resto[i];
    const otro = resto[i + 1];
    if (otro) {
      if (sumA > sumB + 1) { aB(mejor); aA(otro); }
      else if (sumB > sumA + 1) { aA(mejor); aB(otro); }
      else if (azar() > 0.5) { aA(mejor); aB(otro); }
      else { aB(mejor); aA(otro); }
    } else if (sumA > sumB) aB(mejor);
    else aA(mejor);
  }
  return { teamA, teamB };
}

/** Intercambia dos jugadores (del mismo equipo o de equipos distintos) sin modificar las listas originales. */
export function intercambiar(teamA: JugadorMM[], teamB: JugadorMM[], uno: SeleccionCambio, otro: SeleccionCambio) {
  const nA = [...teamA];
  const nB = [...teamB];
  const p1 = uno.team === 'A' ? nA[uno.index] : nB[uno.index];
  const p2 = otro.team === 'A' ? nA[otro.index] : nB[otro.index];
  if (uno.team === 'A') nA[uno.index] = p2; else nB[uno.index] = p2;
  if (otro.team === 'A') nA[otro.index] = p1; else nB[otro.index] = p1;
  return { teamA: nA, teamB: nB };
}

/**
 * Dónde va cada jugador en la pizarra. El primero es el arquero y luego se
 * llenan las líneas de la formación; los que sobran van a la banca, abajo.
 */
export function getPosition(index: number, team: Equipo, _count: number, formation: string) {
  const lines = [1, ...formation.split('-').map(Number)];
  const enCancha = lines.reduce((a, b) => a + b, 0);
  if (index >= enCancha) {
    const bi = index - enCancha;
    return { left: team === 'A' ? `${15 + bi * 12}%` : `${85 - bi * 12}%`, bottom: '2%', transform: 'translateX(-50%) scale(0.75)', zIndex: 5 };
  }
  let acumulado = 0;
  let linea = 0;
  let enLinea = 0;
  for (let i = 0; i < lines.length; i++) {
    if (index < acumulado + lines[i]) { linea = i; enLinea = index - acumulado; break; }
    acumulado += lines[i];
  }
  const xBase = team === 'A' ? (linea / lines.length) * 44 + 5 : 95 - (linea / lines.length) * 44;
  const espacio = 90 / (lines[linea] + 1);
  return { left: `${xBase}%`, top: `${5 + espacio * (enLinea + 1)}%`, zIndex: 10 + linea };
}

/**
 * Posición en la cancha VERTICAL del celular: el equipo B arriba, el A abajo y
 * los arqueros en los extremos. Usa las mismas líneas que getPosition, pero cada
 * equipo se queda en su mitad con un espacio libre al medio para que las fichas
 * de ambos equipos no se encimen. Devuelve null para los que van a la banca.
 */
export function posicionVertical(index: number, team: Equipo, formation: string): { left: string; top: string } | null {
  const lines = [1, ...formation.split('-').map(Number)];
  const enCancha = lines.reduce((a, b) => a + b, 0);
  if (index >= enCancha) return null;
  let acumulado = 0;
  let linea = 0;
  let enLinea = 0;
  for (let i = 0; i < lines.length; i++) {
    if (index < acumulado + lines[i]) { linea = i; enLinea = index - acumulado; break; }
    acumulado += lines[i];
  }
  // 0 en el arco propio, cerca de 1 en la línea más adelantada.
  const avance = lines.length > 1 ? linea / (lines.length - 1) : 0;
  const top = team === 'A' ? 91 - avance * 33 : 9 + avance * 33;
  const espacio = 100 / (lines[linea] + 1);
  return { left: `${espacio * (enLinea + 1)}%`, top: `${top}%` };
}

/** Rating promedio de un equipo con un decimal. */
export const getAvg = (team: JugadorMM[]) =>
  team.length === 0 ? '0.0' : (team.reduce((a, p) => a + (p.rating || 0), 0) / team.length).toFixed(1);

// ── Textos para compartir ────────────────────────────────────────────────────

interface DatosEquipos {
  teamA: JugadorMM[];
  teamB: JugadorMM[];
  colorA: string;
  colorB: string;
}

function encabezado(titulo: string, match: PartidoMM | undefined): string[] {
  const lines = [titulo];
  if (match) lines.push(`📅 ${format(new Date(match.date), 'EEEE dd/MM • HH:mm', { locale: es })}`);
  if (match?.location) lines.push(`📍 ${match.location}`);
  lines.push('');
  return lines;
}

/** Los dos equipos armados, listos para pegar en WhatsApp. */
export function textoEquipos(teamName: string, match: PartidoMM | undefined, d: DatosEquipos): string {
  const lines = encabezado(`⚽ *${teamName} — Equipos del partido*`, match);
  const bloque = (letra: Equipo, equipo: JugadorMM[], color: string) => {
    lines.push(`${JERSEY_EMOJI[color] || '⚽'} *EQUIPO ${letra} — Camiseta ${nombreDeColor(color)} (${equipo.length} jugadores):*`);
    equipo.forEach((p, i) => {
      const pos = p.isGuest ? 'Invitado' : (p.position || '');
      lines.push(`${i + 1}. ${sinMarcaDeInvitado(p.name)}${pos ? ` — ${pos}` : ''}`);
    });
    lines.push(`⭐ Rating prom: ${equipo.length ? getAvg(equipo) : '0'}`);
  };
  bloque('A', d.teamA, d.colorA);
  lines.push('');
  bloque('B', d.teamB, d.colorB);
  return lines.join('\n');
}

/** Quién va, quién no y quién no ha respondido, para pegar en WhatsApp. */
export function textoAsistencia(
  teamName: string,
  match: PartidoMM | undefined,
  confirmados: JugadorMM[],
  bajas: JugadorMM[],
  activos: JugadorMM[],
): string {
  const idsConfirmados = new Set(confirmados.map((p) => p.id));
  const sinRespuesta = activos.filter((p) => !idsConfirmados.has(p.id) && !bajas.find((d) => d.id === p.id));

  const lines = encabezado(`⚽ *${teamName}*`, match);
  lines.push(`✅ *Van (${confirmados.length}):*`);
  confirmados.forEach((p, i) => lines.push(`${i + 1}. ${sinMarcaDeInvitado(p.name)}${p.isGuest ? ' (Invitado)' : ''}`));
  if (bajas.length > 0) {
    lines.push('', `❌ *No van (${bajas.length}):*`);
    bajas.forEach((p) => lines.push(`• ${p.name}`));
  }
  if (sinRespuesta.length > 0) {
    lines.push('', `⏳ *Sin respuesta (${sinRespuesta.length}):*`);
    sinRespuesta.forEach((p) => lines.push(`• ${p.name}`));
  }
  lines.push('', `_Total activos: ${activos.length}_`);
  return lines.join('\n');
}

/** Lo que se le manda a n8n para avisar la lista final. No incluye a quien pidió no recibir avisos. */
export function datosListaFinal(match: PartidoMM | undefined, d: DatosEquipos & { formationA: string; formationB: string }) {
  const nombres = (equipo: JugadorMM[]) =>
    equipo
      .filter((p) => p.isGuest || p.notify !== false)
      .map((p) => `⚽ ${sinMarcaDeInvitado(p.name)}${p.isGuest ? ' (Invitado)' : ''}`)
      .join('\n');

  return {
    type: 'final_list',
    match_date: match ? format(new Date(match.date), 'dd/MM/yyyy HH:mm') : 'Próximo partido',
    match_location: match?.location || 'Cancha habitual',
    team_a_names: nombres(d.teamA),
    team_b_names: nombres(d.teamB),
    team_a_color: nombreDeColor(d.colorA),
    team_b_color: nombreDeColor(d.colorB),
    player_names_all: [...d.teamA, ...d.teamB].map((p) => p.name).join(','),
    raw_data: { teamA: d.teamA, teamB: d.teamB, formationA: d.formationA, formationB: d.formationB, colorA: d.colorA, colorB: d.colorB },
  };
}
