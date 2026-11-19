import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { flowGet, flowPost } from '../_shared/flow.ts';

// El dueño del equipo ve su suscripción mensual de Flow y la puede cancelar
// desde Ajustes. La llama la app con la sesión del capitán.
//   { accion: 'estado' }   → si tiene suscripción activa, de qué plan y cuándo es el próximo cobro.
//   { accion: 'cancelar' } → Flow deja de cobrar al terminar el período pagado; el plan sigue
//                            hasta su vencimiento (plan_expires_at) y después vuelve a gratis.
// Solo el dueño del equipo (quien pagó, con el correo de su cuenta) la ve y la cancela.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (cuerpo: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const sesion = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await sesion.auth.getUser();
    if (!user?.email) return json({ error: 'Inicia sesión de nuevo.' }, 401);

    const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: equipo } = await db.from('team_settings').select('id, plan_expires_at').eq('owner_id', user.id).maybeSingle();
    if (!equipo) return json({ error: 'Solo el dueño del equipo administra la suscripción.' }, 403);

    const { data: sus } = await db.from('flow_suscripciones')
      .select('id, tier, subscription_id, created_at')
      .eq('estado', 'activa').ilike('email', user.email).not('subscription_id', 'is', null)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();

    const { accion } = await req.json().catch(() => ({}));
    if (!sus) return json({ activa: false, vence: equipo.plan_expires_at });

    if (accion === 'cancelar') {
      await flowPost('subscription/cancel', { subscriptionId: sus.subscription_id, at_period_end: '1' });
      await db.from('flow_suscripciones')
        .update({ estado: 'cancelada', detalle: 'cancelada por el capitán desde Ajustes', updated_at: new Date().toISOString() })
        .eq('id', sus.id);
      return json({ activa: false, cancelada: true, vence: equipo.plan_expires_at });
    }

    // Solo informativo: si Flow no responde, igual se muestra la suscripción.
    const detalle = await flowGet('subscription/get', { subscriptionId: sus.subscription_id }).catch(() => null);
    return json({
      activa: true,
      tier: sus.tier,
      desde: sus.created_at,
      proximoCobro: detalle?.next_invoice_date ?? null,
      vence: equipo.plan_expires_at,
    });
  } catch (err) {
    console.error('flow-suscripcion-gestionar:', err instanceof Error ? err.message : err);
    return json({ error: 'No se pudo hablar con Flow. Inténtalo de nuevo en un rato.' }, 500);
  }
});
