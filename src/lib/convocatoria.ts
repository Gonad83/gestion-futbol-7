/** Convocatoria por partido del Inter Generaciones: quién va, quién avisó que no puede y quién no llegó. */

/** 'no_va' = avisó que no puede; 'no_llego' = había confirmado y no llegó al partido. */
export type EstadoConvocatoria = 'va' | 'no_va' | 'no_llego';
export type Convocado = { edition_id: string; match_code: string; player_id: string; status: EstadoConvocatoria };
export type JugadorPlantel = { id: string; name: string; photo_url: string | null };

/** Confirmados, los que avisaron, los que no llegaron y los que faltan por responder. */
export function contarConvocatoria(plantel: JugadorPlantel[], respuestas: Map<string, EstadoConvocatoria>) {
  let van = 0;
  let noVan = 0;
  let noLlegaron = 0;
  for (const j of plantel) {
    const r = respuestas.get(j.id);
    if (r === 'va') van++;
    else if (r === 'no_va') noVan++;
    else if (r === 'no_llego') noLlegaron++;
  }
  return { van, noVan, noLlegaron, sinResponder: plantel.length - van - noVan - noLlegaron };
}

/** Texto de la convocatoria para pegar en WhatsApp. */
export function textoConvocatoria(titulo: string, cuando: string, plantel: JugadorPlantel[], respuestas: Map<string, EstadoConvocatoria>) {
  const con = (estado: EstadoConvocatoria) => plantel.filter(j => respuestas.get(j.id) === estado);
  const van = con('va');
  const noVan = con('no_va');
  const noLlegaron = con('no_llego');
  const faltan = plantel.filter(j => !respuestas.has(j.id));
  const lineas = [`⚽ *${titulo}*`, `🗓️ ${cuando}`, '', `✅ *Confirmados (${van.length})*`, ...van.map((j, i) => `${i + 1}. ${j.name}`)];
  if (noVan.length) lineas.push('', `❌ *Avisaron que no pueden (${noVan.length})*`, ...noVan.map(j => `- ${j.name}`));
  if (noLlegaron.length) lineas.push('', `🚫 *No llegaron (${noLlegaron.length})*`, ...noLlegaron.map(j => `- ${j.name}`));
  if (faltan.length) lineas.push('', `❓ *Sin responder (${faltan.length})*`, ...faltan.map(j => `- ${j.name}`));
  return lineas.join('\n');
}
