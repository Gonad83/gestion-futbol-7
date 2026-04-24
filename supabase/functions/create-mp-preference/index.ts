import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { plan, origin, payer } = await req.json();

    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ??
      'TEST-6527202079057619-042210-3d512487cde4bfa91dc8ce2e2458f80d-438929329';

    const isAnnual = plan === 'annual';
    const isHttps = origin.startsWith('https://');
    const backUrl = isHttps
      ? `${origin}/register-captain?plan=${plan}&status=approved&email=${encodeURIComponent(payer?.email || '')}&name=${encodeURIComponent(payer?.name || '')}&team=${encodeURIComponent(payer?.teamName || '')}`
      : `https://wmcycxnydunfjnirmjuy.supabase.co`;

    const subscription = {
      reason: isAnnual ? 'Club Pro — Plan Anual' : 'Club Pro — Plan Mensual',
      external_reference: `clubpro_${plan}_${Date.now()}`,
      payer_email: payer?.email || '',
      auto_recurring: {
        frequency: isAnnual ? 12 : 1,
        frequency_type: 'months',
        transaction_amount: isAnnual ? 21528 : 2990,
        currency_id: 'CLP',
      },
      free_trial: {
        frequency: 1,
        frequency_type: 'months',
      },
      back_url: backUrl,
      status: 'pending',
    };

    const res = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || JSON.stringify(data));

    return new Response(JSON.stringify({ url: data.init_point }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
