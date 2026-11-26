/** Convocatoria por partido del Inter Generaciones: quién va y quién no puede. */

export type EstadoConvocatoria = 'va' | 'no_va';
export type Convocado = { edition_id: string; match_code: string; player_id: string; status: EstadoConvocatoria };
export type JugadorPlantel = { id: string; name: string; photo_url: string | null };

/** Van, no pueden y sin responder de un partido. */
export function contarConvocatoria(plantel: JugadorPlantel[], respuestas: Map<string, EstadoConvocatoria>) {
  let van = 0;
  let noVan = 0;
  for (const j of plantel) {
    const r = respuestas.get(j.id);
    if (r === 'va') van++;
    else if (r === 'no_va') noVan++;
  }
  return { van, noVan, sinResponder: plantel.length - van - noVan };
}

/** Texto de la convocatoria para pegar en WhatsApp. */
export function textoConvocatoria(titulo: string, cuando: string, plantel: JugadorPlantel[], respuestas: Map<string, EstadoConvocatoria>) {
  const van = plantel.filter(j => respuestas.get(j.id) === 'va');
  const noVan = plantel.filter(j => respuestas.get(j.id) === 'no_va');
  const faltan = plantel.filter(j => !respuestas.has(j.id));
  const lineas = [`⚽ *${titulo}*`, `🗓️ ${cuando}`, '', `✅ *Van (${van.length})*`, ...van.map((j, i) => `${i + 1}. ${j.name}`)];
  if (noVan.length) lineas.push('', `❌ *No pueden (${noVan.length})*`, ...noVan.map(j => `- ${j.name}`));
  if (faltan.length) lineas.push('', `❓ *Sin responder (${faltan.length})*`, ...faltan.map(j => `- ${j.name}`));
  return lineas.join('\n');
}
