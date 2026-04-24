import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { action, type, data } = await req.json();

    // Solo procesamos eventos de tipo 'payment'
    if (type !== 'payment') {
      return new Response(JSON.stringify({ received: true }), { headers: CORS });
    }

    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
    const paymentId = data.id;

    // Consultar detalles del pago en Mercado Pago
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });

    if (!res.ok) {
      throw new Error('Error al consultar pago en Mercado Pago');
    }

    const payment = await res.json();
    const { status, status_detail, metadata, external_reference } = payment;

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Loggear el evento para auditoría
    await supabase.from('mercadopago_events').insert({
      payment_id: paymentId,
      status: status,
      status_detail: status_detail,
      metadata: metadata,
      raw_data: payment
    });

    // 2. Si el pago es aprobado, actualizar el plan o marcar como pagado
    if (status === 'approved') {
      console.log(`Pago aprobado para: ${metadata.payer_email}`);
      
      // Aquí podrías actualizar el plan del equipo directamente si ya existe
      // O simplemente dejar que RegisterCaptain lo verifique al leer mercadopago_events
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Webhook error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
