import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { player_id, match_id, status } = await req.json();

    if (!player_id || !match_id || !status) {
      return new Response(JSON.stringify({ error: 'Parámetros faltantes' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['Voy', 'No voy'].includes(status)) {
      return new Response(JSON.stringify({ error: 'Estado inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const [{ data: player }, { data: match }] = await Promise.all([
      supabaseAdmin.from('players').select('id, name').eq('id', player_id).single(),
      supabaseAdmin.from('matches').select('id, date, location').eq('id', match_id).single(),
    ]);

    if (!player || !match) {
      return new Response(JSON.stringify({ error: 'Jugador o partido no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: upsertError } = await supabaseAdmin
      .from('attendance')
      .upsert({ match_id, player_id, status }, { onConflict: 'match_id,player_id' });

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({
      ok: true,
      player_name: player.name,
      match_date: match.date,
      match_location: match.location,
      status,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
