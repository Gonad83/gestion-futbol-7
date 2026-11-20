import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Compara sin cortar en el primer carácter distinto. */
function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { player_id, match_id, status, t } = await req.json();

    if (!player_id || !match_id || !status || !t) {
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

    // El enlace del correo lleva una clave que la base calcula para este jugador
    // en este partido; sin ella cualquiera podría responder por otro. También
    // es null si el jugador y el partido no son del mismo equipo.
    const { data: esperado, error: errToken } = await supabaseAdmin
      .rpc('token_asistencia_interno', { p_player: player_id, p_match: match_id });
    if (errToken) throw errToken;
    if (!esperado || !iguales(String(esperado), String(t))) {
      return new Response(JSON.stringify({ error: 'Enlace no válido. Responde desde la app.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [{ data: player }, { data: match }] = await Promise.all([
      supabaseAdmin.from('players').select('id, name').eq('id', player_id).single(),
      supabaseAdmin.from('matches').select('id, date, location').eq('id', match_id).single(),
    ]);

    if (!player || !match) {
      return new Response(JSON.stringify({ error: 'Jugador o partido no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Si el partido tiene cupo y está lleno, la base deja "Voy" como "Espera".
    const { data: guardado, error: upsertError } = await supabaseAdmin
      .from('attendance')
      .upsert({ match_id, player_id, status }, { onConflict: 'match_id,player_id' })
      .select('status').single();

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({
      ok: true,
      player_name: player.name,
      match_date: match.date,
      match_location: match.location,
      status: guardado?.status ?? status,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
