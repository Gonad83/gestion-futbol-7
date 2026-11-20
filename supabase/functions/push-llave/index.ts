import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { llavesVapid } from '../_shared/push.ts';

// Entrega la llave pública VAPID: el celular la necesita para suscribirse a
// las notificaciones. Es pública por diseño; la privada nunca sale del servidor.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { public_key } = await llavesVapid(db);
    return new Response(JSON.stringify({ publicKey: public_key }), {
      headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (err) {
    console.error('push-llave:', err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: 'No disponible' }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
