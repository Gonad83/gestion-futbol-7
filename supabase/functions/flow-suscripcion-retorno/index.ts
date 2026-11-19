import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ORIGENES, SITIO, flowGet, flowPost, tokenDe } from '../_shared/flow.ts';

// Flow vuelve aquí (POST con token) cuando el capitán termina de inscribir su
// tarjeta. Si quedó inscrita, se crea la suscripción mensual y Flow hace el
// primer cobro; el plan lo activa flow-suscripcion-cobro cuando Flow avisa que
// se pagó, nunca esta redirección. Se publica sin verificación de JWT: la abre
// el navegador del capitán desde Flow.

Deno.serve(async (req) => {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: fila } = /^[0-9a-f-]{36}$/.test(id)
    ? await db.from('flow_suscripciones').select('*').eq('id', id).maybeSingle()
    : { data: null };

  const origen = fila && ORIGENES.has(fila.origen) ? fila.origen : SITIO;
  const datos = new URLSearchParams({ plan: fila?.tier ?? 'pro', cycle: 'mensual' });
  if (fila?.email) datos.set('email', fila.email);
  if (fila?.nombre) datos.set('name', fila.nombre);
  if (fila?.equipo) datos.set('team', fila.equipo);
  const volverAlPago = (motivo: string) => {
    datos.set('pago', motivo);
    return new Response(null, { status: 303, headers: { Location: `${origen}/checkout?${datos}` } });
  };

  if (!fila) return volverAlPago('cancelado');
  const actualizar = (cambios: Record<string, unknown>) =>
    db.from('flow_suscripciones').update({ ...cambios, updated_at: new Date().toISOString() }).eq('id', fila.id);

  // Si Flow repite la vuelta, la suscripción ya existe: no se crea otra.
  if (fila.subscription_id) {
    datos.set('gateway', 'flow');
    datos.set('estado', 'pendiente');
    return new Response(null, { status: 303, headers: { Location: `${origen}/payment-success?${datos}` } });
  }

  try {
    const token = await tokenDe(req);
    if (!token) return volverAlPago('cancelado');

    const registro = await flowGet('customer/getRegisterStatus', { token });
    if (String(registro.status) !== '1' || registro.customerId !== fila.customer_id) {
      await actualizar({ estado: 'tarjeta_rechazada', detalle: `registro ${registro.status}` });
      return volverAlPago('rechazado');
    }

    const suscripcion = await flowPost('subscription/create', { planId: fila.plan_flow, customerId: fila.customer_id });
    await actualizar({ estado: 'activa', subscription_id: suscripcion.subscriptionId, detalle: null });

    datos.set('gateway', 'flow');
    datos.set('estado', 'pendiente'); // el primer cobro lo confirma Flow por su aviso
    return new Response(null, { status: 303, headers: { Location: `${origen}/payment-success?${datos}` } });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.error('flow-suscripcion-retorno:', mensaje);
    await actualizar({ estado: 'error', detalle: mensaje.slice(0, 300) });
    return volverAlPago('rechazado');
  }
});
