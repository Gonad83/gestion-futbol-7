import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { hmac } from 'https://deno.land/x/hmac@v2.0.1/mod.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FLOW_API_URL = 'https://www.flow.cl/api';

function signParams(params: Record<string, string>, secretKey: string): string {
  const sorted = Object.keys(params).sort().map(k => `${k}${params[k]}`).join('');
  return hmac('sha256', secretKey, sorted, 'utf8', 'hex') as string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { plan, origin, payer } = await req.json();

    const FLOW_API_KEY = Deno.env.get('FLOW_API_KEY');
    const FLOW_SECRET_KEY = Deno.env.get('FLOW_SECRET_KEY');
    if (!FLOW_API_KEY || !FLOW_SECRET_KEY) throw new Error('FLOW_API_KEY / FLOW_SECRET_KEY no configurados en Supabase');

    const isAnnual = plan === 'annual';
    const amount = isAnnual ? 29940 : 4990;
    const commerceOrder = `clubpro_${plan}_${Date.now()}`;
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

    const params: Record<string, string> = {
      apiKey: FLOW_API_KEY,
      commerceOrder,
      subject: isAnnual ? 'Club Pro — Plan Anual' : 'Club Pro — Plan Mensual',
      currency: 'CLP',
      amount: String(amount),
      email: payer?.email || '',
      urlConfirmation: `${supabaseUrl}/functions/v1/flow-webhook`,
      urlReturn: `${origin}/payment-success?gateway=flow&plan=${plan}&email=${encodeURIComponent(payer?.email || '')}&name=${encodeURIComponent(payer?.name || '')}&team=${encodeURIComponent(payer?.teamName || '')}`,
      paymentMethod: '9', // todos los medios disponibles
    };

    params['s'] = signParams(params, FLOW_SECRET_KEY);

    const body = new URLSearchParams(params);
    const res = await fetch(`${FLOW_API_URL}/payment/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await res.json();
    if (!res.ok || data.code) throw new Error(data.message || JSON.stringify(data));

    const paymentUrl = `${data.url}?token=${data.token}`;
    return new Response(JSON.stringify({ url: paymentUrl }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
