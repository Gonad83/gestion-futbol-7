import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Avisa por correo a quien entró al partido desde la lista de espera. La llama
// la base (promover_lista_espera, vía pg_net) cada vez que sube a alguien; manda
// todos los avisos pendientes de la tabla avisos_lista_espera. Solo la base
// conoce el token (cron_tokens 'lista-espera').

const SITIO = 'https://miclubpro.cl';
const ZONA = 'America/Santiago';

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

const escapar = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function fechaDelPartido(fecha: string): string {
  const t = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: ZONA })
    .format(new Date(fecha));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function plantilla(d: { jugador: string; equipo: string; fecha: string; lugar: string; noVoy: string }) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#10141a;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:520px;margin:40px auto;background:#1c2026;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);">
  <div style="background:linear-gradient(135deg,#053d2e 0%,#0a2a1f 100%);padding:32px;text-align:center;">
    <div style="font-size:40px;">🎉</div>
    <h1 style="color:#44f3a9;font-size:22px;font-weight:900;margin:8px 0 0;">¡Se liberó un cupo, juegas!</h1>
  </div>
  <div style="padding:28px 32px;">
    <p style="color:rgba(255,255,255,0.75);font-size:15px;line-height:1.6;margin:0 0 16px;">Hola <strong style="color:#fff">${escapar(d.jugador)}</strong>, estabas en la lista de espera y alguien se bajó: ya estás en la lista de <strong style="color:#44f3a9">${escapar(d.equipo)}</strong>.</p>
    <p style="color:#fff;font-size:15px;margin:0 0 4px;">📅 ${escapar(d.fecha)}</p>
    <p style="color:#fff;font-size:15px;margin:0 0 20px;">📍 ${escapar(d.lugar || 'Por confirmar')}</p>
    <a href="${escapar(SITIO)}/dashboard" style="display:block;text-align:center;padding:14px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;background:#44f3a9;color:#003822;">Ver el partido</a>
    <p style="font-size:13px;color:rgba(255,255,255,0.45);margin:18px 0 0;text-align:center;">¿Ya no puedes? <a href="${escapar(d.noVoy)}" style="color:#f87171;">Avisa que no vas</a> para que entre el siguiente.</p>
  </div>
</div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const token = req.headers.get('x-cron-token') ?? '';
  const { data: valido } = await db.from('cron_tokens').select('nombre').eq('nombre', 'lista-espera').eq('token', token).maybeSingle();
  if (!token || !valido) return json({ error: 'No autorizado' }, 401);

  const { data: pendientes, error } = await db.from('avisos_lista_espera')
    .select('id, match_id, player_id').is('enviado_at', null).order('id').limit(50);
  if (error) return json({ error: error.message }, 500);

  let enviados = 0;
  for (const aviso of pendientes ?? []) {
    try {
      const [{ data: jugador }, { data: partido }, { data: asistencia }] = await Promise.all([
        db.from('players').select('name, email, notify').eq('id', aviso.player_id).maybeSingle(),
        db.from('matches').select('date, location, team_id, status').eq('id', aviso.match_id).maybeSingle(),
        db.from('attendance').select('status').eq('match_id', aviso.match_id).eq('player_id', aviso.player_id).maybeSingle(),
      ]);
      // Si ya no corresponde (se bajó otra vez, el partido pasó o no quiere correos), se marca sin enviar.
      const vigente = jugador?.email && jugador.notify !== false && partido && partido.status === 'Programado'
        && new Date(partido.date) > new Date() && asistencia?.status === 'Voy';
      if (!vigente) {
        await db.from('avisos_lista_espera').update({ enviado_at: new Date().toISOString(), error: 'no corresponde' }).eq('id', aviso.id);
        continue;
      }

      const [{ data: equipo }, { data: clave }] = await Promise.all([
        db.from('team_settings').select('team_name').eq('id', partido.team_id).maybeSingle(),
        db.rpc('token_asistencia_interno', { p_player: aviso.player_id, p_match: aviso.match_id }),
      ]);
      const nombreEquipo = String(equipo?.team_name || 'MiClubPro');
      const noVoy = `${SITIO}/confirmar?${new URLSearchParams({ player_id: aviso.player_id, match_id: aviso.match_id, status: 'No voy', t: String(clave ?? '') })}`;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${nombreEquipo.replace(/[<>"\r\n]/g, '').slice(0, 60)} <noreply@miclubpro.cl>`,
          to: jugador.email,
          subject: `🎉 Se liberó un cupo: juegas el ${fechaDelPartido(partido.date)}`.replace(/[\r\n]+/g, ' '),
          html: plantilla({ jugador: jugador.name, equipo: nombreEquipo, fecha: fechaDelPartido(partido.date), lugar: partido.location ?? '', noVoy }),
        }),
      });
      if (!res.ok) {
        const detalle = await res.json().catch(() => ({}));
        await db.from('avisos_lista_espera').update({ error: String(detalle?.message ?? res.status).slice(0, 200) }).eq('id', aviso.id);
        continue;
      }
      await db.from('avisos_lista_espera').update({ enviado_at: new Date().toISOString(), error: null }).eq('id', aviso.id);
      enviados++;
    } catch (err) {
      await db.from('avisos_lista_espera').update({ error: String(err instanceof Error ? err.message : err).slice(0, 200) }).eq('id', aviso.id);
    }
  }
  return json({ enviados, revisados: pendientes?.length ?? 0 });
});
