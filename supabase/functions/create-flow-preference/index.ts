import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// El precio lo fija el servidor: lo que mande el navegador como monto se ignora.
// Debe coincidir con PLAN_INFO en src/pages/Checkout.tsx y con la portada.
const PLANES: Record<string, Record<string, { monto: number; titulo: string }>> = {
  pro: {
    mensual: { monto: 9990, titulo: 'MiClubPro: Plan Pro Mensual' },
    anual: { monto: 95880, titulo: 'MiClubPro: Plan Pro Anual' },
  },
  elite: {
    mensual: { monto: 19990, titulo: 'MiClubPro: Plan Elite Mensual' },
    anual: { monto: 191880, titulo: 'MiClubPro: Plan Elite Anual' },
  },
};

const FLOW_API_URL = 'https://www.flow.cl/api';

async function signParams(params: Record<string, string>, secretKey: string): Promise<string> {
  const sorted = Object.keys(params).sort().map(k => `${k}${params[k]}`).join('');
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(sorted));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { plan, cycle, origin, payer } = await req.json();
    const elegido = PLANES[String(plan)]?.[String(cycle)];
    if (!elegido) {
      return new Response(JSON.stringify({ error: 'Plan no válido' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    const amount = elegido.monto;
    const planLabel = elegido.titulo;

    const FLOW_API_KEY = Deno.env.get('FLOW_API_KEY');
    const FLOW_SECRET_KEY = Deno.env.get('FLOW_SECRET_KEY');
    if (!FLOW_API_KEY || !FLOW_SECRET_KEY) throw new Error('FLOW_API_KEY / FLOW_SECRET_KEY no configurados en Supabase');

    const commerceOrder = `clubpro_${plan}_${cycle}_${Date.now()}`;
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

    const params: Record<string, string> = {
      apiKey: FLOW_API_KEY,
      commerceOrder,
      subject: planLabel,
      currency: 'CLP',
      amount: String(amount),
      email: payer?.email || '',
      urlConfirmation: `${supabaseUrl}/functions/v1/flow-webhook`,
      // Flow vuelve con un POST y el sitio estático no lo acepta: pasa por flow-return, que redirige con GET.
      urlReturn: `${supabaseUrl}/functions/v1/flow-return?${new URLSearchParams({ o: String(origin ?? ''), plan: String(plan), cycle: String(cycle), email: payer?.email || '', name: payer?.name || '', team: payer?.teamName || '' })}`,
      paymentMethod: '9',
    };

    params['s'] = await signParams(params, FLOW_SECRET_KEY);

    const res = await fetch(`${FLOW_API_URL}/payment/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });

    const data = await res.json();
    if (!res.ok || data.code) throw new Error(data.message || JSON.stringify(data));

    return new Response(JSON.stringify({ url: `${data.url}?token=${data.token}` }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
