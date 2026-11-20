/**
 * Avisos automáticos diarios.
 *
 * pg_cron la llama todos los días a las 12:00 UTC (job auto-reminder-daily)
 * con el header x-cron-token; sin ese token no hace nada. Cada aviso respeta
 * el interruptor que el capitán dejó en Ajustes (tabla team_settings):
 *
 *   aviso_partidos → partido en las próximas 24 h: correo a quien todavía no
 *                    dice si va, con botones para sumarse a la lista o bajarse.
 *   aviso_eventos  → evento social (asado, junta) en las próximas 24 h: "¿te sumas?".
 *   aviso_cumples  → saludo del equipo a cada jugador el día de su cumpleaños.
 *
 * Partidos y eventos se avisan una sola vez (matches.auto_reminder_sent_at);
 * los cumpleaños, una vez por jugador y año (tabla saludos_cumple).
 *
 * Envía directo por Resend: send-email solo acepta al admin del equipo con su
 * sesión.
 *
 * Opciones del cuerpo:
 *   simular: true → no envía nada, devuelve a quién le escribiría.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SITIO = 'https://miclubpro.cl';
const ZONA = 'America/Santiago';

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

const escapar = (valor: unknown) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Una imagen solo si su dirección es https. */
function urlDeImagen(link: unknown) {
  try {
    const url = new URL(String(link ?? ''));
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function fechaDelPartido(fecha: string): string {
  const texto = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    timeZone: ZONA,
  }).format(new Date(fecha));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Año, mes y día de hoy vistos desde Chile. */
function hoyEnChile(fecha: Date) {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(fecha);
  const dato = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  return { year: dato('year'), month: dato('month'), day: dato('day') };
}

const esBisiesto = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** ¿Hoy es su cumpleaños? Quien nació un 29 de febrero lo celebra el 28 en años no bisiestos. */
function cumpleHoy(nacimiento: string, hoy: { year: number; month: number; day: number }) {
  const [, m, d] = nacimiento.split('-').map(Number);
  if (m === 2 && d === 29 && !esBisiesto(hoy.year)) return hoy.month === 2 && hoy.day === 28;
  return m === hoy.month && d === hoy.day;
}

const remitenteDe = (equipo: string) => `${equipo.replace(/[<>"\r\n]/g, '').slice(0, 60)} <noreply@miclubpro.cl>`;

/* ── Plantillas ──────────────────────────────────────────────────────────── */

function plantillaPartido(d: { jugador: string; equipo: string; fecha: string; lugar: string; voy: string; noVoy: string }) {
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
    <p><strong style="color:#fff">${escapar(d.equipo)}</strong> juega pronto y todavía no sabemos si vas. Súmate a la lista o avisa que no puedes:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="50%" style="padding-right:6px"><a href="${escapar(d.voy)}" class="btn btn-yes">✅ Confirmo</a></td>
      <td width="50%" style="padding-left:6px"><a href="${escapar(d.noVoy)}" class="btn btn-no">❌ No voy</a></td>
    </tr></table>
  </div>
  <div class="footer"><p>© ${escapar(d.equipo)} · miclubpro.cl</p></div>
</div>
</body></html>`;
}

function plantillaEvento(d: { jugador: string; equipo: string; titulo: string; fecha: string; lugar: string; voy: string; noVoy: string }) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#10141a;font-family:'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#10141a;"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1c2026;border-radius:20px;overflow:hidden;">
  <tr><td align="center" style="padding:36px 32px;background:#1f1633;background-image:linear-gradient(135deg,#2a1a4a 0%,#1a1230 100%);">
    <p style="margin:0 0 6px;color:#c4b5fd;font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">Es mañana</p>
    <p style="margin:0;color:#fff;font-size:26px;font-weight:900;">🎉 ${escapar(d.titulo)}</p>
    <p style="margin:12px 0 0;color:#fff;font-size:17px;font-weight:700;">${escapar(d.fecha)}</p>
    ${d.lugar ? `<p style="margin:6px 0 0;color:rgba(255,255,255,0.5);font-size:13px;">📍 ${escapar(d.lugar)}</p>` : ''}
  </td></tr>
  <tr><td style="padding:28px 32px;">
    <p style="margin:0 0 14px;color:rgba(255,255,255,0.75);font-size:15px;line-height:1.6;">Hola <strong style="color:#fff">${escapar(d.jugador)}</strong>,</p>
    <p style="margin:0 0 22px;color:rgba(255,255,255,0.75);font-size:15px;line-height:1.6;">Mañana es el evento de <strong style="color:#fff">${escapar(d.equipo)}</strong> y todavía no sabemos si vienes. ¿Te sumas?</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="50%" style="padding-right:6px"><a href="${escapar(d.voy)}" style="display:block;text-align:center;padding:14px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;background:#a78bfa;color:#1a1033;">🙌 Me sumo</a></td>
      <td width="50%" style="padding-left:6px"><a href="${escapar(d.noVoy)}" style="display:block;text-align:center;padding:14px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;background:rgba(248,113,113,0.12);color:#f87171;border:1px solid rgba(248,113,113,0.3);">No puedo</a></td>
    </tr></table>
  </td></tr>
  <tr><td align="center" style="padding:16px 32px;background:#0a0e14;color:rgba(255,255,255,0.3);font-size:11px;">© ${escapar(d.equipo)} · miclubpro.cl</td></tr>
</table></td></tr></table>
</body></html>`;
}

function plantillaCumple(d: { jugador: string; equipo: string; logo: string }) {
  const escudo = d.logo
    ? `<img src="${escapar(d.logo)}" width="72" height="72" alt="Escudo de ${escapar(d.equipo)}" style="display:block;margin:0 auto 18px;width:72px;height:72px;border-radius:18px;border:0;">`
    : '';
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#10141a;font-family:'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#10141a;"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1c2026;border-radius:24px;overflow:hidden;">
  <tr><td style="height:4px;font-size:0;line-height:4px;background:#f472b6;background-image:linear-gradient(90deg,#f472b6,#ffd08b,#44f3a9);">&nbsp;</td></tr>
  <tr><td align="center" style="padding:40px 32px 30px;background:#181c22;background-image:radial-gradient(circle at 50% 0%,rgba(244,114,182,0.22),rgba(24,28,34,0) 70%);">
    ${escudo}
    <p style="margin:0;font-size:52px;line-height:1;">🎂</p>
    <p style="margin:18px 0 0;color:#fff;font-size:28px;font-weight:900;">¡Feliz cumpleaños, ${escapar(d.jugador)}!</p>
  </td></tr>
  <tr><td style="padding:26px 32px 32px;">
    <p style="margin:0 0 14px;color:rgba(255,255,255,0.75);font-size:16px;line-height:1.6;text-align:center;">Todo <strong style="color:#fff">${escapar(d.equipo)}</strong> te saluda en tu día. Que lo pases increíble y que este año vengan muchos goles. ⚽🎉</p>
    <a href="${SITIO}/dashboard" style="display:block;margin-top:22px;padding:15px;border-radius:14px;background:#44f3a9;background-image:linear-gradient(135deg,#44f3a9,#00d68f);color:#003822;font-size:15px;font-weight:800;text-decoration:none;text-align:center;">Abrir MiClubPro</a>
  </td></tr>
  <tr><td align="center" style="padding:16px 32px;background:#0a0e14;color:rgba(255,255,255,0.3);font-size:11px;">© ${escapar(d.equipo)} · miclubpro.cl</td></tr>
</table></td></tr></table>
</body></html>`;
}

async function enviarLote(correos: unknown[]) {
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(correos),
  });
  return res.ok ? '' : (await res.text()).slice(0, 300);
}

/* ── Handler ─────────────────────────────────────────────────────────────── */

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

    const { data: equipos, error: errEquipos } = await db.from('team_settings')
      .select('id, team_name, logo_url, aviso_partidos, aviso_eventos, aviso_cumples');
    if (errEquipos) throw errEquipos;
    const equipoPorId = new Map((equipos ?? []).map((e) => [e.id, e]));

    /* Partidos y eventos sociales de las próximas 24 horas */
    const ahora = new Date();
    const en24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    const { data: partidos, error: errPartidos } = await db.from('matches')
      .select('id, date, location, team_id, event_type, description')
      .eq('status', 'Programado')
      .gte('date', ahora.toISOString())
      .lte('date', en24h.toISOString())
      .is('auto_reminder_sent_at', null);
    if (errPartidos) throw errPartidos;

    const resumen: unknown[] = [];
    let enviados = 0;

    for (const partido of partidos ?? []) {
      const equipo = equipoPorId.get(partido.team_id);
      const social = partido.event_type === 'Recreacional';
      // Interruptor apagado: no se avisa (y tampoco se marca, por si lo vuelven a prender).
      if (!equipo || (social ? equipo.aviso_eventos === false : equipo.aviso_partidos === false)) {
        resumen.push({ partido: partido.id, social, omitido: 'Aviso apagado en Ajustes' });
        continue;
      }

      const [{ data: respuestas, error: errResp }, { data: jugadores, error: errJug }] = await Promise.all([
        // Quien dijo "Tal vez" sí recibe el recordatorio: todavía no decide.
        db.from('attendance').select('player_id').eq('match_id', partido.id).in('status', ['Voy', 'No voy', 'Espera']),
        db.from('players').select('id, name, email, notify').eq('team_id', partido.team_id).eq('status', 'Activo').not('email', 'is', null),
      ]);
      if (errResp) throw errResp;
      if (errJug) throw errJug;

      // Quien ya respondió no necesita recordatorio.
      const respondieron = new Set((respuestas ?? []).map((r) => r.player_id));
      const pendientes = (jugadores ?? []).filter((j) => j.notify !== false && j.email && !respondieron.has(j.id));
      const nombreEquipo = String(equipo.team_name || 'MiClubPro');
      const fecha = fechaDelPartido(partido.date);
      const titulo = String(partido.description || '').trim() || 'Evento del equipo';

      if (simular) {
        resumen.push({ partido: partido.id, social, fecha, destinatarios: pendientes.map((j) => j.name) });
        continue;
      }

      if (pendientes.length > 0) {
        // Cada enlace lleva la clave de ese jugador en ese partido (ver confirm-attendance).
        const { data: claves, error: errClaves } = await db.rpc('tokens_asistencia_interno', { p_match: partido.id });
        if (errClaves) throw errClaves;
        const clave = new Map((claves ?? []).map((c: { player_id: string; token: string }) => [c.player_id, c.token]));
        const enlace = (jugador: string, estado: string) =>
          `${SITIO}/confirmar?${new URLSearchParams({ player_id: jugador, match_id: partido.id, status: estado, t: clave.get(jugador) ?? '' })}`;
        const error = await enviarLote(pendientes.map((j) => {
          const datos = { jugador: j.name, equipo: nombreEquipo, fecha, lugar: partido.location || '', voy: enlace(j.id, 'Voy'), noVoy: enlace(j.id, 'No voy') };
          return {
            from: remitenteDe(nombreEquipo),
            to: j.email,
            subject: (social ? `🎉 ¿Te sumas? ${titulo} — ${fecha}` : `⚽ ¿Vas al partido? — ${fecha}`).replace(/[\r\n]+/g, ' '),
            html: social ? plantillaEvento({ ...datos, titulo }) : plantillaPartido({ ...datos, lugar: datos.lugar || 'Por confirmar' }),
          };
        }));
        if (error) {
          // No se marca como enviado: queda visible el error y se puede reintentar.
          resumen.push({ partido: partido.id, fecha, error });
          continue;
        }
        enviados += pendientes.length;
      }

      await db.from('matches').update({ auto_reminder_sent_at: ahora.toISOString() }).eq('id', partido.id);
      resumen.push({ partido: partido.id, social, fecha, enviados: pendientes.length });
    }

    /* Cumpleaños de hoy */
    const hoy = hoyEnChile(ahora);
    const equiposConCumples = (equipos ?? []).filter((e) => e.aviso_cumples !== false).map((e) => e.id);
    const cumples: unknown[] = [];
    if (equiposConCumples.length > 0) {
      const { data: jugadores, error: errCumple } = await db.from('players')
        .select('id, name, nickname, email, notify, birth_date, team_id')
        .in('team_id', equiposConCumples).in('status', ['Activo', 'Lesionado'])
        .not('birth_date', 'is', null).not('email', 'is', null);
      if (errCumple) throw errCumple;

      for (const j of (jugadores ?? []).filter((x) => x.notify !== false && cumpleHoy(String(x.birth_date), hoy))) {
        const equipo = equipoPorId.get(j.team_id);
        const nombreEquipo = String(equipo?.team_name || 'MiClubPro');
        const nombre = String(j.nickname || j.name || '').trim() || 'crack';
        if (simular) { cumples.push({ jugador: j.name, equipo: nombreEquipo }); continue; }

        // Reservar el saludo del año: si ya existe, ya se mandó.
        const { error: yaSaludado } = await db.from('saludos_cumple').insert({ player_id: j.id, year: hoy.year });
        if (yaSaludado) continue;

        const error = await enviarLote([{
          from: remitenteDe(nombreEquipo),
          to: j.email,
          subject: `🎂 ¡Feliz cumpleaños, ${nombre}! — ${nombreEquipo}`.replace(/[\r\n]+/g, ' '),
          html: plantillaCumple({ jugador: nombre, equipo: nombreEquipo, logo: urlDeImagen(equipo?.logo_url) }),
        }]);
        if (error) {
          await db.from('saludos_cumple').delete().match({ player_id: j.id, year: hoy.year });
          cumples.push({ jugador: j.name, error });
          continue;
        }
        enviados += 1;
        cumples.push({ jugador: j.name, enviado: true });
      }
    }

    return json({ ok: true, simular, partidos: resumen, cumpleanos: cumples, correos_enviados: enviados });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
