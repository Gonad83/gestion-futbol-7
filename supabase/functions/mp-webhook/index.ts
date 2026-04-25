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
    const body = await req.json();
    const { type, data } = body;

    // Only process payment events
    if (type !== 'payment') {
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const paymentId = data?.id;
    if (!paymentId) throw new Error('Missing payment id in webhook payload');

    // Fetch payment details from Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });
    if (!mpRes.ok) throw new Error(`MP API error: ${mpRes.status}`);

    const payment = await mpRes.json();
    const { status, status_detail, payer, transaction_amount, date_approved, metadata } = payment;

    // Log every event for audit
    await supabase.from('mercadopago_events').insert({
      payment_id: String(paymentId),
      status,
      status_detail,
      metadata: metadata ?? null,
      raw_data: payment,
    });

    // Only record approved payments
    if (status !== 'approved') {
      return new Response(JSON.stringify({ received: true, status }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const payerEmail = payer?.email;
    if (!payerEmail) throw new Error('No payer email in payment data');

    // Find the player by email
    const { data: player } = await supabase
      .from('players')
      .select('id')
      .ilike('email', payerEmail)
      .maybeSingle();

    if (!player) {
      // No matching player — log but don't fail
      console.log(`Pago aprobado de ${payerEmail} pero no se encontró jugador con ese email`);
      return new Response(JSON.stringify({ received: true, warning: 'player_not_found', email: payerEmail }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Determine month/year from the payment approval date
    const approvedDate = date_approved ? new Date(date_approved) : new Date();
    const month = approvedDate.getUTCMonth() + 1;
    const year = approvedDate.getUTCFullYear();
    const amount = Number(transaction_amount) || 0;

    // Check for existing payment record this player/month/year
    const { data: existing } = await supabase
      .from('payments')
      .select('id, status')
      .eq('player_id', player.id)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();

    if (existing) {
      if (existing.status !== 'Pagado') {
        await supabase
          .from('payments')
          .update({ status: 'Pagado', amount })
          .eq('id', existing.id);
      }
    } else {
      await supabase.from('payments').insert({
        player_id: player.id,
        month,
        year,
        amount,
        status: 'Pagado',
      });
    }

    return new Response(JSON.stringify({ success: true, player_id: player.id, month, year, amount }), {
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
