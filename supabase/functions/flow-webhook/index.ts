import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { hmac } from 'https://deno.land/x/hmac@v2.0.1/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FLOW_API_URL = 'https://www.flow.cl/api';

function signParams(params: Record<string, string>, secretKey: string): string {
  const sorted = Object.keys(params).sort().map(k => `${k}${params[k]}`).join('');
  return hmac('sha256', secretKey, sorted, 'utf8', 'hex') as string;
}

serve(async (req) => {
  try {
    const formData = await req.formData();
    const token = formData.get('token') as string;
    if (!token) return new Response('missing token', { status: 400 });

    const FLOW_API_KEY = Deno.env.get('FLOW_API_KEY')!;
    const FLOW_SECRET_KEY = Deno.env.get('FLOW_SECRET_KEY')!;

    const params: Record<string, string> = { apiKey: FLOW_API_KEY, token };
    params['s'] = signParams(params, FLOW_SECRET_KEY);

    const res = await fetch(`${FLOW_API_URL}/payment/getStatus?${new URLSearchParams(params)}`);
    const payment = await res.json();

    if (payment.status === 2) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const ref: string = payment.commerceOrder ?? '';
      const plan = ref.includes('annual') ? 'annual' : 'monthly';

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
