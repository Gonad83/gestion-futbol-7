import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { MENSUAL, flowGet, tokenDe } from '../_shared/flow.ts';

// Flow avisa aquí cada cobro de una suscripción mensual (urlCallback del plan,
// ver flow-suscripcion). Del aviso solo se usa el token: el cobro se consulta a
// Flow con nuestra firma. Si está pagado, queda en flow_payments (una fila por
// cobro, aunque Flow repita el aviso) y aplicar_pago_flow extiende el plan un mes.
// Se publica sin verificación de JWT: lo llama Flow.

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método no permitido', { status: 405 });
  try {
    const token = await tokenDe(req);
    if (!token) return new Response('falta token', { status: 400 });

    const pago = await flowGet('payment/getStatus', { token });
    console.log('flow-suscripcion-cobro:', JSON.stringify({ status: pago.status, commerceOrder: pago.commerceOrder, flowOrder: pago.flowOrder, amount: pago.amount }));
    if (pago.status !== 2) return new Response('OK', { status: 200 }); // pendiente o rechazado: Flow reintenta y vuelve a avisar

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const pagador = String(pago.payer ?? '').trim().toLowerCase();
    const { data: sus } = pagador
      ? await db.from('flow_suscripciones').select('email, tier').eq('estado', 'activa').ilike('email', pagador)
          .order('created_at', { ascending: false }).limit(1).maybeSingle()
      : { data: null };

    const monto = Number(pago.amount) || 0;
    const tier: 'pro' | 'elite' = sus?.tier ?? (monto >= MENSUAL.elite.monto ? 'elite' : 'pro');
    if (pago.currency !== 'CLP' || monto < MENSUAL[tier].monto) {
      console.error(`flow-suscripcion-cobro: monto ${monto} ${pago.currency} no cubre ${tier}`);
      return new Response('OK', { status: 200 });
    }
    const email = sus?.email ?? pagador;
    if (!email) throw new Error('El cobro no trae correo');

    const { error } = await db.from('flow_payments').upsert({
      token,
      commerce_order: pago.commerceOrder ?? null,
      flow_order: pago.flowOrder ?? null,
      amount: monto,
      payer_email: email,
      plan: 'monthly',
      tier,
      status: 'paid',
      paid_at: pago.paymentData?.date ? new Date(pago.paymentData.date.replace(' ', 'T') + '-03:00').toISOString() : new Date().toISOString(),
    }, { onConflict: 'token' });
    if (error) throw new Error(error.message);

    const { error: errPlan } = await db.rpc('aplicar_pago_flow', { p_token: token });
    if (errPlan) console.error('aplicar_pago_flow:', errPlan.message);
    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('flow-suscripcion-cobro:', err instanceof Error ? err.message : err);
    return new Response('error', { status: 500 });
  }
});
