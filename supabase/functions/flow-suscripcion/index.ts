import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ErrorFlow, MENSUAL, ORIGENES, SITIO, flowGet, flowPost, planFlowId } from '../_shared/flow.ts';

// Empieza la suscripción mensual con Flow (la llama la página de pago).
//   1. Se asegura de que exista en Flow el plan mensual (Pro o Elite) al precio de hoy.
//   2. Crea el cliente en Flow con el correo del capitán.
//   3. Devuelve la página de Flow donde el capitán inscribe su tarjeta.
// Al terminar, Flow vuelve a flow-suscripcion-retorno, que crea la suscripción.
// El monto lo fija el servidor; lo que mande el navegador como precio se ignora.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const json = (cuerpo: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function asegurarPlan(tier: 'pro' | 'elite', urlBase: string): Promise<string> {
  const planId = planFlowId(tier);
  try {
    await flowGet('plans/get', { planId });
    return planId;
  } catch (err) {
    if (!(err instanceof ErrorFlow)) throw err;
  }
  await flowPost('plans/create', {
    planId,
    name: MENSUAL[tier].nombre,
    currency: 'CLP',
    amount: String(MENSUAL[tier].monto),
    interval: '3', // mensual
    interval_count: '1',
    urlCallback: `${urlBase}/functions/v1/flow-suscripcion-cobro`,
  });
  return planId;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    const { plan, origin, payer } = await req.json();
    if (plan !== 'pro' && plan !== 'elite') return json({ error: 'Plan no válido' }, 400);
    const email = String(payer?.email ?? '').trim().toLowerCase();
    const nombre = String(payer?.name ?? '').trim().slice(0, 80);
    const equipo = String(payer?.teamName ?? '').trim().slice(0, 80);
    if (!CORREO.test(email) || !nombre) return json({ error: 'Revisa tu nombre y correo.' }, 400);
    const origen = ORIGENES.has(String(origin)) ? String(origin) : SITIO;

    const urlBase = Deno.env.get('SUPABASE_URL')!;
    const db = createClient(urlBase, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const planFlow = await asegurarPlan(plan, urlBase);
    const cliente = await flowPost('customer/create', { name: nombre, email, externalId: `mcp_${crypto.randomUUID()}` });

    const { data: fila, error } = await db.from('flow_suscripciones').insert({
      email, nombre, equipo, tier: plan, plan_flow: planFlow, customer_id: cliente.customerId, origen,
    }).select('id').single();
    if (error) throw new Error(error.message);

    const registro = await flowPost('customer/register', {
      customerId: cliente.customerId,
      url_return: `${urlBase}/functions/v1/flow-suscripcion-retorno?id=${fila.id}`,
    });
    return json({ url: `${registro.url}?token=${registro.token}` });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.error('flow-suscripcion:', mensaje);
    return json({ error: /email/i.test(mensaje) ? 'Flow no aceptó ese correo. Revisa que esté bien escrito.' : 'No se pudo iniciar la suscripción con Flow.' }, 500);
  }
});
