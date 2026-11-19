import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Mercado Pago avisa aquí cuando cambia un pago. Se publica sin verificación de
// JWT (Mercado Pago no manda uno): no se confía en nada del aviso salvo el id,
// y el pago se consulta a Mercado Pago con nuestra llave.
//
// Lo que se vende por Mercado Pago es el plan de MiClubPro (ver
// create-mp-preference), no la cuota de un jugador. Antes este aviso anotaba
// el pago como cuota "Pagado" del jugador con ese correo y nunca activaba el
// plan. Ahora queda en flow_payments, igual que un pago de Flow, y se aplica
// con la misma función: una sola vez por pago, aunque el aviso se repita.

const PRECIOS: Record<string, Record<string, number>> = {
  pro: { monthly: 9990, annual: 95880 },
  elite: { monthly: 19990, annual: 191880 },
};

// external_reference = «clubpro_{pro|elite}_{monthly|annual}_{fecha}»
function leerReferencia(ref: string): { tier: 'pro' | 'elite'; plan: 'monthly' | 'annual' } | null {
  const partes = /^clubpro_(pro|elite)_(monthly|annual)_\d+$/.exec(ref);
  return partes ? { tier: partes[1] as 'pro' | 'elite', plan: partes[2] as 'monthly' | 'annual' } : null;
}

const listo = (cuerpo: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method !== 'POST') return listo({ error: 'Método no permitido' }, 405);

  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const tipo = body?.type ?? url.searchParams.get('type') ?? url.searchParams.get('topic');
    const paymentId = String(body?.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '');

    if (tipo !== 'payment') return listo({ received: true, skipped: true });
    if (!/^\d+$/.test(paymentId)) return listo({ error: 'Falta el id del pago' }, 400);

    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
    if (!MP_ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN no configurado');

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });
    if (!mpRes.ok) throw new Error(`Mercado Pago respondió ${mpRes.status}`);
    const pago = await mpRes.json();

    if (pago.status !== 'approved') return listo({ received: true, status: pago.status });

    const compra = leerReferencia(String(pago.external_reference ?? ''));
    if (!compra) return listo({ received: true, skipped: 'no es un plan de MiClubPro' });

    const monto = Number(pago.transaction_amount) || 0;
    if (pago.currency_id !== 'CLP' || monto < PRECIOS[compra.tier][compra.plan]) {
      console.error(`Pago ${paymentId}: monto ${monto} ${pago.currency_id} no cubre ${compra.tier}/${compra.plan}`);
      return listo({ received: true, skipped: 'monto insuficiente' });
    }

    const correo = String(pago.metadata?.email || pago.payer?.email || '').trim().toLowerCase();
    if (!correo) throw new Error('El pago no trae correo');

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = `mp_${paymentId}`;

    // El token es único: si Mercado Pago repite el aviso, se actualiza la misma fila.
    const { error } = await db.from('flow_payments').upsert({
      token,
      commerce_order: String(pago.external_reference),
      amount: monto,
      payer_email: correo,
      plan: compra.plan,
      tier: compra.tier,
      status: 'paid',
      paid_at: pago.date_approved ?? new Date().toISOString(),
    }, { onConflict: 'token' });
    if (error) throw new Error(error.message);

    // Si el capitán ya tiene equipo, activa o extiende su plan; si no, lo toma
    // register_new_captain cuando se registre con ese correo.
    const { error: errPlan } = await db.rpc('aplicar_pago_flow', { p_token: token });
    if (errPlan) console.error('aplicar_pago_flow:', errPlan.message);

    return listo({ received: true });
  } catch (err) {
    console.error('mp-webhook:', err instanceof Error ? err.message : err);
    return listo({ error: 'error' }, 500);
  }
});
