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
    const { plan, cycle, amount, planLabel, origin, payer } = await req.json();

    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
    if (!MP_ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN no configurado en Supabase');

    const isAnnual = cycle === 'anual';
    const successUrl = `${origin}/register-captain?plan=${plan}&cycle=${cycle}&status=approved&email=${encodeURIComponent(payer?.email || '')}&name=${encodeURIComponent(payer?.name || '')}&team=${encodeURIComponent(payer?.teamName || '')}`;

    let url: string;

    if (isAnnual) {
      // Pago único anual
      const preference = {
        items: [{
          title: planLabel || `Club Pro — Plan ${plan} Anual`,
          quantity: 1,
          unit_price: amount,
          currency_id: 'CLP',
        }],
        payer: { email: payer?.email || '' },
        external_reference: `clubpro_${plan}_annual_${Date.now()}`,
        back_urls: {
          success: successUrl,
          failure: `${origin}/checkout?plan=${plan}&cycle=${cycle}`,
          pending: `${origin}/checkout?plan=${plan}&cycle=${cycle}`,
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
      // Suscripción mensual recurrente
      const subscription = {
        reason: planLabel || `Club Pro — Plan ${plan} Mensual`,
        external_reference: `clubpro_${plan}_monthly_${Date.now()}`,
        payer_email: payer?.email || '',
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: amount,
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
