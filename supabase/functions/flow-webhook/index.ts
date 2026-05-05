import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FLOW_API_URL = 'https://www.flow.cl/api';

async function signParams(params: Record<string, string>, secretKey: string): Promise<string> {
  const sorted = Object.keys(params).sort().map(k => `${k}${params[k]}`).join('');
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(sorted));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
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

      const plan = (payment.commerceOrder ?? '').includes('annual') ? 'annual' : 'monthly';

      await supabase.from('flow_payments').upsert({
        token,
        commerce_order: payment.commerceOrder,
        flow_order: payment.flowOrder,
        amount: payment.amount,
        payer_email: payment.payerEmail,
        plan,
        status: 'paid',
        paid_at: new Date().toISOString(),
      });
    }

    return new Response('OK', { status: 200 });
  } catch (err: any) {
    console.error('flow-webhook error:', err.message);
    return new Response('error', { status: 500 });
  }
});
