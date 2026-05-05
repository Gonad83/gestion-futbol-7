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

    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
    if (!MP_ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN secret not configured in Supabase');

    const isAnnual = plan === 'annual';
    const successUrl = `${origin}/register-captain?plan=${plan}&status=approved&email=${encodeURIComponent(payer?.email || '')}&name=${encodeURIComponent(payer?.name || '')}&team=${encodeURIComponent(payer?.teamName || '')}`;

    let url: string;

    if (isAnnual) {
      // Plan anual → pago único (preference)
      const preference = {
        items: [{
          title: 'Club Pro — Plan Anual',
          quantity: 1,
          unit_price: 29940,
          currency_id: 'CLP',
        }],
        payer: { email: payer?.email || '' },
        external_reference: `clubpro_annual_${Date.now()}`,
        back_urls: {
          success: successUrl,
          failure: `${origin}/checkout?plan=annual`,
          pending: `${origin}/checkout?plan=annual`,
        },
        auto_return: 'approved',
      };

      const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(preference),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || JSON.stringify(data));
      url = data.init_point;

    } else {
      // Plan mensual → suscripción recurrente
      const subscription = {
        reason: 'Club Pro — Plan Mensual',
        external_reference: `clubpro_monthly_${Date.now()}`,
        payer_email: payer?.email || '',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 4990,
          currency_id: 'CLP',
        },
        free_trial: { frequency: 1, frequency_type: 'months' },
        back_url: successUrl,
        status: 'pending',
      };

      const res = await fetch('https://api.mercadopago.com/preapproval', {
        method: 'POST',
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || JSON.stringify(data));
      url = data.init_point;
    }

    return new Response(JSON.stringify({ url }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
