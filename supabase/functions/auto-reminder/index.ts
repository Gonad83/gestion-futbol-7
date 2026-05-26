import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_URL = Deno.env.get('APP_URL') || 'https://miclubpro.cl';

function formatMatchDate(dateStr: string): string {
  const date = new Date(dateStr);
  const str = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Santiago',
  }).format(date);
  return str.charAt(0).toUpperCase() + str.slice(1);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Matches in the next 24 hours that haven't had auto-reminder sent yet
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: matches, error: matchesError } = await supabaseAdmin
      .from('matches')
      .select('id, date, location, team_id')
      .eq('status', 'Programado')
      .gte('date', now.toISOString())
      .lte('date', in24h.toISOString())
      .is('auto_reminder_sent_at', null);

    if (matchesError) throw matchesError;

    if (!matches || matches.length === 0) {
      return new Response(JSON.stringify({
        ok: true,
        message: 'Sin partidos próximos que requieran recordatorio.',
        matches_processed: 0,
        emails_sent: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let totalSent = 0;

    for (const match of matches) {
      // Players who already confirmed
      const { data: attendances } = await supabaseAdmin
        .from('attendance')
        .select('player_id')
        .eq('match_id', match.id)
        .eq('status', 'Voy');

      const confirmedIds = new Set((attendances || []).map((a: any) => a.player_id));

      // Active players with email who haven't confirmed
      const { data: players } = await supabaseAdmin
        .from('players')
        .select('id, name, email')
        .eq('team_id', match.team_id)
        .eq('status', 'Activo')
        .eq('notify', true)
        .not('email', 'is', null);

      const pending = (players || []).filter((p: any) => !confirmedIds.has(p.id));
      if (pending.length === 0) {
        await supabaseAdmin.from('matches').update({ auto_reminder_sent_at: now.toISOString() }).eq('id', match.id);
        continue;
      }

      // Team name
      const { data: teamSettings } = await supabaseAdmin
        .from('team_settings')
        .select('team_name')
        .eq('id', match.team_id)
        .single();

      const dateLabel = formatMatchDate(match.date);

      for (const player of pending) {
        const confirmUrl = `${APP_URL}/confirmar?player_id=${player.id}&match_id=${match.id}&status=Voy`;
        const declineUrl = `${APP_URL}/confirmar?player_id=${player.id}&match_id=${match.id}&status=No%20voy`;

        const { error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
          body: {
            type: 'match_reminder',
            to: player.email,
            data: {
              playerName: player.name,
              teamName: teamSettings?.team_name || 'MiClubPro',
              date: dateLabel,
              location: match.location || 'Por confirmar',
              confirmUrl,
              declineUrl,
            },
          },
        });

        if (!emailError) totalSent++;
      }

      // Mark as sent so cron doesn't re-send
      await supabaseAdmin
        .from('matches')
        .update({ auto_reminder_sent_at: now.toISOString() })
        .eq('id', match.id);
    }

    return new Response(JSON.stringify({
      ok: true,
      matches_processed: matches.length,
      emails_sent: totalSent,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
