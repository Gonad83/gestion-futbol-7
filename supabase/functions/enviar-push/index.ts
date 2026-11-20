import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { llavesVapid, webpush } from '../_shared/push.ts';

// Manda notificaciones push a los celulares de los jugadores. La llaman la base
// (partido nuevo, cupo liberado, vía pg_net) y auto-reminder (recordatorio),
// siempre con el token 'push' de cron_tokens.
//
//   { tipo: 'partido_nuevo', match_id }                 → todo el equipo
//   { tipo: 'cupo_liberado', match_id, player_ids }     → quienes entraron
//   { tipo: 'recordatorio',  match_id, player_ids }     → quienes no respondieron
//   { tipo: 'refuerzo', match_id, solicitud_id }        → el refuerzo de otro equipo al que le piden jugar
//   { tipo: 'refuerzo_respuesta', match_id, solicitud_id } → capitán y subcapitanes del partido
//   { tipo: 'prueba', endpoint, p256dh, auth }          → una suscripción suelta (diagnóstico)

const ZONA = 'America/Santiago';
const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

function fecha(f: string) {
  const t = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: ZONA }).format(new Date(f));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

type Aviso = { title: string; body: string; url: string; tag: string };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const token = req.headers.get('x-cron-token') ?? '';
  const { data: valido } = await db.from('cron_tokens').select('nombre').eq('nombre', 'push').eq('token', token).maybeSingle();
  if (!token || !valido) return json({ error: 'No autorizado' }, 401);

  try {
    const cuerpo = await req.json().catch(() => ({}));
    const llaves = await llavesVapid(db);
    webpush.setVapidDetails('https://miclubpro.cl', llaves.public_key, llaves.private_key);

    // Diagnóstico: probar el cifrado y el envío contra una suscripción dada.
    if (cuerpo.tipo === 'prueba') {
      try {
        const r = await webpush.sendNotification(
          { endpoint: String(cuerpo.endpoint), keys: { p256dh: String(cuerpo.p256dh), auth: String(cuerpo.auth) } },
          JSON.stringify({ title: 'MiClubPro', body: 'Notificación de prueba', url: '/dashboard', tag: 'prueba' }),
        );
        return json({ ok: true, status: r.statusCode });
      } catch (e) {
        const err = e as { statusCode?: number; message?: string };
        return json({ ok: false, status: err?.statusCode ?? null, error: String(err?.message ?? e).slice(0, 200) });
      }
    }

    const { data: partido } = await db.from('matches')
      .select('id, date, location, team_id, event_type, description, status').eq('id', cuerpo.match_id).maybeSingle();
    if (!partido || partido.status !== 'Programado' || new Date(partido.date) < new Date()) return json({ enviados: 0, motivo: 'sin partido vigente' });

    const social = partido.event_type === 'Recreacional';
    const cuando = fecha(partido.date);
    const lugar = partido.location ? ` · ${partido.location}` : '';
    let aviso: Aviso;
    let jugadores: string[] = [];
    // Equipo de quienes reciben: el del partido, salvo el refuerzo, que es de otro equipo.
    let equipoDestino: number = partido.team_id;

    if (cuerpo.tipo === 'partido_nuevo') {
      aviso = social
        ? { title: `🎉 ${String(partido.description || 'Nuevo evento').slice(0, 60)}`, body: `${cuando}${lugar}. ¿Te sumas?`, url: '/dashboard', tag: `partido-${partido.id}` }
        : { title: '⚽ Nuevo partido', body: `${cuando}${lugar}. ¿Vas?`, url: '/dashboard', tag: `partido-${partido.id}` };
      const { data } = await db.from('players').select('id').eq('team_id', partido.team_id).eq('status', 'Activo').neq('notify', false);
      jugadores = (data ?? []).map((j: { id: string }) => j.id);
    } else if (cuerpo.tipo === 'cupo_liberado') {
      aviso = { title: '🎉 Se liberó un cupo: juegas', body: `${cuando}${lugar}. Si ya no puedes, avisa para que entre otro.`, url: '/dashboard', tag: `cupo-${partido.id}` };
      jugadores = Array.isArray(cuerpo.player_ids) ? cuerpo.player_ids.map(String) : [];
    } else if (cuerpo.tipo === 'recordatorio') {
      aviso = social
        ? { title: '🎉 ¿Te sumas?', body: `${cuando}${lugar}. Todavía no respondes.`, url: '/dashboard', tag: `recordatorio-${partido.id}` }
        : { title: '⚽ ¿Vas al partido?', body: `${cuando}${lugar}. Todavía no respondes.`, url: '/dashboard', tag: `recordatorio-${partido.id}` };
      jugadores = Array.isArray(cuerpo.player_ids) ? cuerpo.player_ids.map(String) : [];
    } else if (cuerpo.tipo === 'refuerzo' || cuerpo.tipo === 'refuerzo_respuesta') {
      const { data: sol } = await db.from('solicitudes_refuerzo')
        .select('id, estado, player_id, players!inner(name, nickname, team_id)')
        .eq('id', cuerpo.solicitud_id).eq('match_id', partido.id).maybeSingle();
      if (!sol) return json({ enviados: 0, motivo: 'sin pedido' });
      const refuerzo = sol.players as unknown as { name: string; nickname: string | null; team_id: number };
      if (cuerpo.tipo === 'refuerzo') {
        if (sol.estado !== 'Pendiente') return json({ enviados: 0, motivo: 'ya respondido' });
        const { data: equipo } = await db.from('team_settings').select('team_name').eq('id', partido.team_id).maybeSingle();
        aviso = { title: `🤝 ${String(equipo?.team_name || 'Un equipo').slice(0, 40)} te pide de refuerzo`, body: `${cuando}${lugar}. ¿Juegas?`, url: '/profile#refuerzos', tag: `refuerzo-${sol.id}` };
        jugadores = [sol.player_id];
        equipoDestino = refuerzo.team_id;
      } else {
        const nombre = refuerzo.nickname || refuerzo.name;
        aviso = sol.estado === 'Aceptada'
          ? { title: `✅ ${nombre} juega de refuerzo`, body: `${cuando}${lugar}. Ya está en la lista como invitado.`, url: '/dashboard', tag: `refuerzo-${sol.id}` }
          : { title: `${nombre} no puede jugar`, body: `${cuando}${lugar}. Busca otro refuerzo.`, url: '/dashboard', tag: `refuerzo-${sol.id}` };
        const { data } = await db.from('players').select('id').eq('team_id', partido.team_id).in('match_role', ['captain', 'subcaptain']);
        jugadores = (data ?? []).map((j: { id: string }) => j.id);
      }
    } else {
      return json({ error: 'Tipo desconocido' }, 400);
    }
    if (jugadores.length === 0) return json({ enviados: 0 });

    // Solo jugadores del equipo del partido, aunque la lista venga de otro lado.
    const { data: subs } = await db.from('push_suscripciones')
      .select('id, endpoint, p256dh, auth, players!inner(team_id, notify)')
      .in('player_id', jugadores.slice(0, 500)).eq('players.team_id', equipoDestino);

    let enviados = 0;
    const vencidas: number[] = [];
    await Promise.all((subs ?? []).map(async (s: { id: number; endpoint: string; p256dh: string; auth: string; players: { notify: boolean | null } }) => {
      if (s.players?.notify === false) return;
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(aviso), { TTL: 60 * 60 * 24 });
        enviados++;
      } catch (e) {
        const codigo = (e as { statusCode?: number })?.statusCode;
        // 404/410: el celular desinstaló la app o revocó el permiso.
        if (codigo === 404 || codigo === 410) vencidas.push(s.id);
        else console.error('enviar-push:', codigo, String((e as Error)?.message ?? e).slice(0, 200));
      }
    }));
    if (vencidas.length > 0) await db.from('push_suscripciones').delete().in('id', vencidas);
    if (enviados > 0) {
      await db.from('push_suscripciones').update({ ultimo_uso: new Date().toISOString() })
        .in('id', (subs ?? []).map((s: { id: number }) => s.id).filter((id: number) => !vencidas.includes(id)));
    }
    return json({ enviados, vencidas: vencidas.length });
  } catch (err) {
    console.error('enviar-push:', err instanceof Error ? err.message : err);
    return json({ error: 'error' }, 500);
  }
});
