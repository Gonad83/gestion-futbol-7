import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/* ── Plantillas ─────────────────────────────────────────── */

function templateWelcome(data: { playerName: string; teamName: string; joinCode: string }) {
  return {
    subject: `¡Bienvenido a ${data.teamName}! 🎉`,
    html: `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>body{margin:0;padding:0;background:#10141a;font-family:'Helvetica Neue',Arial,sans-serif;}
.wrap{max-width:520px;margin:40px auto;background:#1c2026;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);}
.hero{background:linear-gradient(135deg,#053d2e 0%,#0a2a1f 100%);padding:40px 32px 32px;text-align:center;}
.hero h1{color:#44f3a9;font-size:28px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;}
.hero p{color:rgba(255,255,255,0.5);font-size:13px;margin:0;}
.body{padding:32px;}
.body p{color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 16px;}
.code-box{background:#0a0e14;border:1px solid rgba(68,243,169,0.3);border-radius:12px;padding:20px;text-align:center;margin:24px 0;}
.code-box span{color:#44f3a9;font-size:28px;font-weight:900;letter-spacing:6px;}
.footer{padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;}
.footer p{color:rgba(255,255,255,0.2);font-size:11px;margin:0;}
</style></head><body>
<div class="wrap">
  <div class="hero">
    <h1>⚽ ${data.teamName}</h1>
    <p>Plataforma de gestión deportiva</p>
  </div>
  <div class="body">
    <p>Hola <strong style="color:#fff">${data.playerName}</strong>,</p>
    <p>¡Ya eres parte del equipo! Tu cuenta ha sido creada exitosamente en <strong style="color:#44f3a9">miclubpro.cl</strong>.</p>
    <p>Desde la plataforma podrás confirmar asistencia a partidos, ver tu perfil, votar por el MVP y mucho más.</p>
    <div class="code-box">
      <p style="color:rgba(255,255,255,0.4);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px">Código de equipo</p>
      <span>${data.joinCode}</span>
    </div>
    <p style="color:rgba(255,255,255,0.4);font-size:13px;">Ingresa a <a href="https://miclubpro.cl" style="color:#44f3a9;">miclubpro.cl</a> con tu email para acceder.</p>
  </div>
  <div class="footer"><p>© ${data.teamName} · miclubpro.cl</p></div>
</div>
</body></html>`,
  };
}

function templateMatchReminder(data: { playerName: string; teamName: string; date: string; location: string; confirmUrl: string; declineUrl: string }) {
  return {
    subject: `⚽ ¿Vas al partido? — ${data.date}`,
    html: `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>body{margin:0;padding:0;background:#10141a;font-family:'Helvetica Neue',Arial,sans-serif;}
.wrap{max-width:520px;margin:40px auto;background:#1c2026;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);}
.hero{background:linear-gradient(135deg,#0a1628 0%,#0e1e3a 100%);padding:36px 32px;text-align:center;}
.hero h1{color:#9acbff;font-size:22px;font-weight:900;margin:0 0 6px;}
.hero .date{color:#fff;font-size:30px;font-weight:900;margin:12px 0 4px;}
.hero .loc{color:rgba(255,255,255,0.45);font-size:13px;}
.body{padding:28px 32px;}
.body p{color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 20px;}
.btn-row{display:flex;gap:12px;margin-top:24px;}
.btn{flex:1;text-align:center;padding:14px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;display:block;}
.btn-yes{background:#44f3a9;color:#003822;}
.btn-no{background:rgba(248,113,113,0.12);color:#f87171;border:1px solid rgba(248,113,113,0.3);}
.footer{padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;}
.footer p{color:rgba(255,255,255,0.2);font-size:11px;margin:0;}
</style></head><body>
<div class="wrap">
  <div class="hero">
    <h1>📅 Próximo Partido</h1>
    <div class="date">${data.date}</div>
    <div class="loc">📍 ${data.location}</div>
  </div>
  <div class="body">
    <p>Hola <strong style="color:#fff">${data.playerName}</strong>,</p>
    <p>El <strong style="color:#fff">${data.teamName}</strong> tiene partido próximamente. Por favor confirma tu asistencia:</p>
    <div class="btn-row">
      <a href="${data.confirmUrl}" class="btn btn-yes">✅ Voy</a>
      <a href="${data.declineUrl}" class="btn btn-no">❌ No voy</a>
    </div>
  </div>
  <div class="footer"><p>© ${data.teamName} · miclubpro.cl</p></div>
</div>
</body></html>`,
  };
}

function templateNewMatch(data: { playerName: string; teamName: string; date: string; location: string; confirmUrl: string; declineUrl: string }) {
  return {
    subject: `⚽ ¡Nuevo partido programado! — ${data.date}`,
    html: `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>body{margin:0;padding:0;background:#10141a;font-family:'Helvetica Neue',Arial,sans-serif;}
.wrap{max-width:520px;margin:40px auto;background:#1c2026;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);}
.hero{background:linear-gradient(135deg,#053d2e 0%,#0a2a1f 100%);padding:36px 32px;text-align:center;}
.hero h1{color:#44f3a9;font-size:22px;font-weight:900;margin:0 0 6px;}
.hero .date{color:#fff;font-size:30px;font-weight:900;margin:12px 0 4px;}
.hero .loc{color:rgba(255,255,255,0.45);font-size:13px;}
.body{padding:28px 32px;}
.body p{color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 20px;}
.btn-row{display:flex;gap:12px;margin-top:24px;}
.btn{flex:1;text-align:center;padding:14px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;display:block;}
.btn-yes{background:#44f3a9;color:#003822;}
.btn-no{background:rgba(248,113,113,0.12);color:#f87171;border:1px solid rgba(248,113,113,0.3);}
.footer{padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;}
.footer p{color:rgba(255,255,255,0.2);font-size:11px;margin:0;}
</style></head><body>
<div class="wrap">
  <div class="hero">
    <h1>⚽ Nuevo Partido</h1>
    <div class="date">${data.date}</div>
    <div class="loc">📍 ${data.location || 'Por confirmar'}</div>
  </div>
  <div class="body">
    <p>Hola <strong style="color:#fff">${data.playerName}</strong>,</p>
    <p>Se ha programado un nuevo partido para <strong style="color:#fff">${data.teamName}</strong>. ¿Vas a jugar?</p>
    <div class="btn-row">
      <a href="${data.confirmUrl}" class="btn btn-yes">✅ Voy</a>
      <a href="${data.declineUrl}" class="btn btn-no">❌ No voy</a>
    </div>
  </div>
  <div class="footer"><p>© ${data.teamName} · miclubpro.cl</p></div>
</div>
</body></html>`,
  };
}

function templatePaymentReminder(data: { playerName: string; teamName: string; months: string[]; totalDebt: string; paymentLink?: string }) {
  const monthList = data.months.map(m => `<li style="margin:4px 0;color:rgba(255,255,255,0.6);">📅 ${m}</li>`).join('');
  return {
    subject: `⚠️ Tienes cuotas pendientes — ${data.teamName}`,
    html: `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>body{margin:0;padding:0;background:#10141a;font-family:'Helvetica Neue',Arial,sans-serif;}
.wrap{max-width:520px;margin:40px auto;background:#1c2026;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);}
.hero{background:linear-gradient(135deg,#1a0a0a 0%,#2a0e0e 100%);padding:32px;text-align:center;}
.hero h1{color:#f87171;font-size:22px;font-weight:900;margin:0;}
.body{padding:28px 32px;}
.body p{color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 16px;}
.debt-box{background:#0a0e14;border:1px solid rgba(248,113,113,0.2);border-radius:12px;padding:20px;margin:20px 0;}
.debt-box ul{margin:0 0 16px;padding-left:20px;}
.total{color:#f87171;font-size:24px;font-weight:900;text-align:center;margin:12px 0 0;}
.btn{display:block;text-align:center;padding:14px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;background:#44f3a9;color:#003822;margin-top:24px;}
.footer{padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;}
.footer p{color:rgba(255,255,255,0.2);font-size:11px;margin:0;}
</style></head><body>
<div class="wrap">
  <div class="hero"><h1>⚠️ Cuotas Pendientes</h1></div>
  <div class="body">
    <p>Hola <strong style="color:#fff">${data.playerName}</strong>,</p>
    <p>Tienes <strong style="color:#f87171">${data.months.length} cuota${data.months.length > 1 ? 's' : ''} pendiente${data.months.length > 1 ? 's' : ''}</strong> en <strong style="color:#fff">${data.teamName}</strong>:</p>
    <div class="debt-box">
      <ul>${monthList}</ul>
      <div class="total">${data.totalDebt}</div>
    </div>
    ${data.paymentLink ? `<a href="${data.paymentLink}" class="btn">💳 Pagar ahora</a>` : ''}
    <p style="font-size:13px;color:rgba(255,255,255,0.35);margin-top:16px;">Si ya realizaste el pago, ignora este mensaje.</p>
  </div>
  <div class="footer"><p>© ${data.teamName} · miclubpro.cl</p></div>
</div>
</body></html>`,
  };
}

/* ── Quién puede mandar qué ─────────────────────────────── */

// Antes cualquiera podía llamar esta función con cualquier destinatario y
// cualquier contenido: servía para mandar correos falsos ("restablece tu
// contraseña" con un link trampa) desde el dominio del club. Ahora solo el
// admin de un equipo escribe, solo a jugadores de ese equipo, y los links
// siempre apuntan a miclubpro.cl.

const SITIO = 'https://miclubpro.cl';
const HOSTS_DE_PAGO = ['mercadopago.cl', 'mercadopago.com', 'mpago.la', 'mpago.li', 'flow.cl'];

const escapar = (valor: unknown) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Conserva la ruta y la consulta del link, pero siempre en miclubpro.cl. */
function aLaApp(link: unknown) {
  try {
    const url = new URL(String(link ?? ''), SITIO);
    return escapar(`${SITIO}${url.pathname}${url.search}`);
  } catch {
    return escapar(SITIO);
  }
}

/** Un link de pago solo si es https y de Mercado Pago o Flow. */
function linkDePago(link: unknown) {
  try {
    const url = new URL(String(link ?? ''));
    const permitido = url.protocol === 'https:'
      && HOSTS_DE_PAGO.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`));
    return permitido ? escapar(url.toString()) : '';
  } catch {
    return '';
  }
}

function json(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

/* ── Handler ────────────────────────────────────────────── */

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return json({ error: 'Inicia sesión para enviar correos' }, 401);

    const { type, to, data = {} } = await req.json();
    const destinatario = String(to ?? '').trim().toLowerCase();
    if (!destinatario) return json({ error: 'Falta el destinatario' }, 400);

    // El correo es único por jugador (sin distinguir mayúsculas).
    const { data: jugadorPorCorreo } = await supabaseAdmin.from('players').select('team_id')
      .ilike('email', destinatario.replace(/[\\%_]/g, c => `\\${c}`)).maybeSingle();
    if (!jugadorPorCorreo?.team_id) return json({ error: 'Ese correo no es de un jugador del equipo' }, 403);

    const { data: equipo } = await supabaseAdmin
      .from('team_settings').select('team_name, owner_id').eq('id', jugadorPorCorreo.team_id).single();
    let esAdmin = equipo?.owner_id === user.id;
    if (!esAdmin) {
      const { data: adminJugador } = await supabaseAdmin.from('players').select('id')
        .eq('team_id', jugadorPorCorreo.team_id).eq('user_id', user.id).eq('is_admin', true).maybeSingle();
      esAdmin = Boolean(adminJugador);
    }
    if (!esAdmin) return json({ error: 'Solo el admin del equipo puede enviar correos' }, 403);

    const nombreEquipo = String(equipo?.team_name || 'MiClubPro');
    const limpio = {
      teamName: escapar(nombreEquipo),
      playerName: escapar(data.playerName),
      joinCode: escapar(data.joinCode),
      date: escapar(data.date),
      location: escapar(data.location),
      totalDebt: escapar(data.totalDebt),
      months: Array.isArray(data.months) ? data.months.map(escapar) : [],
      confirmUrl: aLaApp(data.confirmUrl),
      declineUrl: aLaApp(data.declineUrl),
      paymentLink: linkDePago(data.paymentLink),
    };

    let template: { subject: string; html: string };
    switch (type) {
      case 'welcome':          template = templateWelcome(limpio);         break;
      case 'new_match':        template = templateNewMatch(limpio);        break;
      case 'match_reminder':   template = templateMatchReminder(limpio);   break;
      case 'payment_reminder': template = templatePaymentReminder(limpio); break;
      default: return json({ error: 'Tipo de email desconocido' }, 400);
    }

    // El asunto va en texto plano: sin escapar HTML, pero sin saltos de línea.
    const asunto = template.subject
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[\r\n]+/g, ' ');
    const remitente = `${nombreEquipo.replace(/[<>"\r\n]/g, '').slice(0, 60)} <noreply@miclubpro.cl>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: remitente, to: destinatario, subject: asunto, html: template.html }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'Error Resend');

    return json({ ok: true, id: result.id });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
