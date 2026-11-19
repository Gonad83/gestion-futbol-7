/**
 * Recordatorio automático de partidos.
 *
 * pg_cron la llama todos los días a las 12:00 UTC (job auto-reminder-daily)
 * con el header x-cron-token; sin ese token no hace nada. Para cada partido
 * programado en las próximas 24 horas escribe a los jugadores activos que
 * todavía no responden si van, una sola vez por partido
 * (matches.auto_reminder_sent_at).
 *
 * Envía directo por Resend: send-email solo acepta al admin del equipo con su
 * sesión, y el proyecto ya no acepta la llave antigua de servicio que usaba
 * el cron (por eso fallaba con 401).
 *
 * Opciones del cuerpo:
 *   simular: true → no envía nada, devuelve a quién le escribiría.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SITIO = 'https://miclubpro.cl';

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

const escapar = (valor: unknown) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function fechaDelPartido(fecha: string): string {
  const texto = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Santiago',
  }).format(new Date(fecha));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function plantilla(d: { jugador: string; equipo: string; fecha: string; lugar: string; voy: string; noVoy: string }) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>body{margin:0;padding:0;background:#10141a;font-family:'Helvetica Neue',Arial,sans-serif;}
.wrap{max-width:520px;margin:40px auto;background:#1c2026;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);}
.hero{background:linear-gradient(135deg,#0a1628 0%,#0e1e3a 100%);padding:36px 32px;text-align:center;}
.hero h1{color:#9acbff;font-size:22px;font-weight:900;margin:0 0 6px;}
.hero .date{color:#fff;font-size:30px;font-weight:900;margin:12px 0 4px;}
.hero .loc{color:rgba(255,255,255,0.45);font-size:13px;}
.body{padding:28px 32px;}
.body p{color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 20px;}
.btn{text-align:center;padding:14px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;display:block;}
.btn-yes{background:#44f3a9;color:#003822;}
.btn-no{background:rgba(248,113,113,0.12);color:#f87171;border:1px solid rgba(248,113,113,0.3);}
.footer{padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;}
.footer p{color:rgba(255,255,255,0.2);font-size:11px;margin:0;}
</style></head><body>
<div class="wrap">
  <div class="hero">
    <h1>📅 Próximo Partido</h1>
    <div class="date">${escapar(d.fecha)}</div>
    <div class="loc">📍 ${escapar(d.lugar)}</div>
  </div>
  <div class="body">
    <p>Hola <strong style="color:#fff">${escapar(d.jugador)}</strong>,</p>
    <p><strong style="color:#fff">${escapar(d.equipo)}</strong> juega pronto y todavía no sabemos si vas. Confirma tu asistencia:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="50%" style="padding-right:6px"><a href="${escapar(d.voy)}" class="btn btn-yes">✅ Voy</a></td>
      <td width="50%" style="padding-left:6px"><a href="${escapar(d.noVoy)}" class="btn btn-no">❌ No voy</a></td>
    </tr></table>
  </div>
  <div class="footer"><p>© ${escapar(d.equipo)} · miclubpro.cl</p></div>
</div>
</body></html>`;
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Solo pg_cron conoce el token (tabla cron_tokens, sin acceso desde la app).
    const token = req.headers.get('x-cron-token') ?? '';
    const { data: valido } = await db.from('cron_tokens').select('nombre').eq('nombre', 'auto-reminder').eq('token', token).maybeSingle();
    if (!token || !valido) return json({ error: 'No autorizado' }, 401);

    const cuerpo = await req.json().catch(() => ({}));
    const simular = cuerpo.simular === true;

    const ahora = new Date();
    const en24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    const { data: partidos, error: errPartidos } = await db.from('matches')
      .select('id, date, location, team_id')
      .eq('status', 'Programado')
      .gte('date', ahora.toISOString())
      .lte('date', en24h.toISOString())
      .is('auto_reminder_sent_at', null);
    if (errPartidos) throw errPartidos;

    const resumen: unknown[] = [];
    let enviados = 0;

    for (const partido of partidos ?? []) {
      const [{ data: respuestas, error: errResp }, { data: jugadores, error: errJug }, { data: equipo }] = await Promise.all([
        db.from('attendance').select('player_id').eq('match_id', partido.id),
        db.from('players').select('id, name, email, notify').eq('team_id', partido.team_id).eq('status', 'Activo').not('email', 'is', null),
        db.from('team_settings').select('team_name').eq('id', partido.team_id).maybeSingle(),
      ]);
      if (errResp) throw errResp;
      if (errJug) throw errJug;

      // Quien ya dijo "Voy" o "No voy" no necesita recordatorio.
      const respondieron = new Set((respuestas ?? []).map((r) => r.player_id));
      const pendientes = (jugadores ?? []).filter((j) => j.notify !== false && j.email && !respondieron.has(j.id));
      const nombreEquipo = String(equipo?.team_name || 'MiClubPro');
      const fecha = fechaDelPartido(partido.date);

      if (simular) {
        resumen.push({ partido: partido.id, fecha, destinatarios: pendientes.map((j) => j.name) });
        continue;
      }

      if (pendientes.length > 0) {
        const remitente = `${nombreEquipo.replace(/[<>"\r\n]/g, '').slice(0, 60)} <noreply@miclubpro.cl>`;
        const enlace = (jugador: string, estado: string) =>
          `${SITIO}/confirmar?player_id=${jugador}&match_id=${partido.id}&status=${encodeURIComponent(estado)}`;
        const res = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(pendientes.map((j) => ({
            from: remitente,
            to: j.email,
            subject: `⚽ ¿Vas al partido? — ${fecha}`,
            html: plantilla({
              jugador: j.name, equipo: nombreEquipo, fecha, lugar: partido.location || 'Por confirmar',
              voy: enlace(j.id, 'Voy'), noVoy: enlace(j.id, 'No voy'),
            }),
          }))),
        });
        if (!res.ok) {
          // No se marca como enviado: el cron de mañana no lo alcanzaría, pero
          // queda visible el error y se puede volver a llamar a mano.
          resumen.push({ partido: partido.id, fecha, error: (await res.text()).slice(0, 300) });
          continue;
        }
        enviados += pendientes.length;
      }

      await db.from('matches').update({ auto_reminder_sent_at: ahora.toISOString() }).eq('id', partido.id);
      resumen.push({ partido: partido.id, fecha, enviados: pendientes.length });
    }

    return json({ ok: true, simular, partidos: resumen, correos_enviados: enviados });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
