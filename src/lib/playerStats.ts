// Las estrellas de un jugador se componen de 5 sub-estrellas (1-7).
// `rating` es el promedio redondeado y es lo que usa el resto de la app.

export const SUB_STATS = [
  { key: 'forma', label: 'Forma', short: 'FOR' },
  { key: 'tecnica', label: 'Técnica', short: 'TÉC' },
  { key: 'vision', label: 'Visión', short: 'VIS' },
  { key: 'ataque', label: 'Ataque', short: 'ATA' },
  { key: 'defensa', label: 'Defensa', short: 'DEF' },
] as const;

export type SubStatKey = typeof SUB_STATS[number]['key'];

export const MAX_STARS = 7;

/** Valor de una sub-estrella; si el jugador aún no la tiene, usa su rating. */
export function subStat(player: any, key: SubStatKey): number {
  return player?.[key] ?? player?.rating ?? 0;
}

export function ratingFromSubStats(values: Record<SubStatKey, number>): number {
  const avg = SUB_STATS.reduce((sum, s) => sum + values[s.key], 0) / SUB_STATS.length;
  return Math.min(MAX_STARS, Math.max(1, Math.round(avg)));
}
