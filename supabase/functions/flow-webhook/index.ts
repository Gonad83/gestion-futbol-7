import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Flow llama aquí al confirmarse un pago. Se publica sin verificación de JWT (Flow no manda uno):
// la comprobación real es preguntarle a Flow, con nuestra firma, el estado del token recibido.

const FLOW_API_URL = 'https://www.flow.cl/api';

async function signParams(params: Record<string, string>, secretKey: string): Promise<string> {
  const sorted = Object.keys(params).sort().map(k => `${k}${params[k]}`).join('');
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(sorted));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// La orden se llama «clubpro_{pro|elite}_{mensual|anual}_{fecha}» (ver create-flow-preference).
// En la base, plan es el ciclo de cobro (monthly / annual) y tier es lo comprado (pro / elite).
export function leerOrden(orden: string): { plan: 'monthly' | 'annual'; tier: 'pro' | 'elite' | null } {
  const partes = /^clubpro_(pro|elite)_(mensual|anual)_/.exec(orden);
  if (partes) return { plan: partes[2] === 'anual' ? 'annual' : 'monthly', tier: partes[1] as 'pro' | 'elite' };
  return { plan: orden.includes('annual') ? 'annual' : 'monthly', tier: null };
}

serve(async (req) => {
  try {
    const formData = await req.formData();
    const token = formData.get('token') as string;
    if (!token) return new Response('missing token', { status: 400 });

    const FLOW_API_KEY = Deno.env.get('FLOW_API_KEY')!;
    const FLOW_SECRET_KEY = Deno.env.get('FLOW_SECRET_KEY')!;

    const params: Record<string, string> = { apiKey: FLOW_API_KEY, token };
    params['s'] = await signParams(params, FLOW_SECRET_KEY);

    const res = await fetch(`${FLOW_API_URL}/payment/getStatus?${new URLSearchParams(params)}`);
    const payment = await res.json();

    if (payment.status === 2) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { plan, tier } = leerOrden(payment.commerceOrder ?? '');
      const fila = {
        token,
        commerce_order: payment.commerceOrder,
        flow_order: payment.flowOrder,
        amount: payment.amount,
        payer_email: payment.payerEmail,
        plan,
        status: 'paid',
        paid_at: new Date().toISOString(),
      };

      // Flow puede repetir el aviso: el token es único, así que se actualiza la misma fila.
      let { error } = await supabase.from('flow_payments').upsert({ ...fila, tier }, { onConflict: 'token' });
      if (error) {
        // La columna tier llega con la migración 20261116_plan_tier; sin ella se guarda el pago igual.
        ({ error } = await supabase.from('flow_payments').upsert(fila, { onConflict: 'token' }));
      }
      if (error) throw new Error(error.message);

      // Si el capitán ya tenía cuenta, o se registró antes de que llegara este aviso, activa su plan.
      const { error: errPlan } = await supabase.rpc('aplicar_pago_flow', { p_email: payment.payerEmail, p_plan: plan, p_tier: tier });
      if (errPlan) console.error('aplicar_pago_flow:', errPlan.message);
    }

    return new Response('OK', { status: 200 });
  } catch (err: any) {
    console.error('flow-webhook error:', err.message);
    return new Response('error', { status: 500 });
  }
});
