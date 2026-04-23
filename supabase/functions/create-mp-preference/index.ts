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

    const MP_ACCESS_TOKEN =
      Deno.env.get('MP_ACCESS_TOKEN') ??
      'TEST-6527202079057619-042210-3d512487cde4bfa91dc8ce2e2458f80d-438929329';

    const isAnnual = plan === 'annual';

    const preference = {
      items: [
        {
          id: isAnnual ? 'eboloapp-anual' : 'eboloapp-mensual',
          title: isAnnual ? 'Club Pro — Plan Anual' : 'Club Pro — Plan Mensual',
          description: isAnnual
            ? `Gestión de equipo de Fútbol 7 · ${payer?.teamName || ''} · 12 meses · 40% off`
            : `Gestión de equipo de Fútbol 7 · ${payer?.teamName || ''} · Mensual`,
          quantity: 1,
          currency_id: 'CLP',
          unit_price: isAnnual ? 21528 : 2990,
        },
      ],
      payer: payer?.email ? {
        name: payer.name,
        email: payer.email,
      } : undefined,
      metadata: {
        team_name: payer?.teamName,
        payer_name: payer?.name,
        payer_email: payer?.email,
        plan,
      },
      back_urls: {
        success: `${origin}/register-captain?plan=${plan}&status=approved&email=${encodeURIComponent(payer?.email || '')}&name=${encodeURIComponent(payer?.name || '')}&team=${encodeURIComponent(payer?.teamName || '')}`,
        failure: `${origin}/landing`,
        pending: `${origin}/landing`,
      },
      auto_return: 'approved',
      statement_descriptor: 'CLUBPRO',
    };

    const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preference),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Error creating preference');
    }

    // Use sandbox_init_point for test mode, init_point for production
    const url = data.sandbox_init_point || data.init_point;

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
