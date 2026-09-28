import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// "Olvidé mi contraseña".
//
// Antes lo mandaba el correo propio de Supabase, que sin un servidor de
// correo configurado solo llega a unos pocos destinatarios y con un límite
// de un par de correos por hora: la mayoría de los jugadores nunca recibía
// el link. Ahora el link se genera aquí y sale por Resend, el mismo servicio
// que ya manda las citaciones.
//
// El link apunta a miclubpro.cl/reset-password con el token en la consulta;
// esa pantalla lo canjea con verifyOtp. Canjearlo también confirma el correo,
// así que sirve a quien nunca recibió el correo de confirmación.
//
// Responde lo mismo exista o no la cuenta, para no revelar quién está
// registrado, y limita los pedidos para que nadie llene el buzón de otro.

const SITIO = 'https://miclubpro.cl';
const MAX_POR_CORREO_POR_HORA = 3;
const MAX_TOTAL_POR_HORA = 60;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const escapar = (valor: string) =>
  valor.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function correo(link: string, equipo: string, nombre: string) {
  const eq = escapar(equipo);
  const saludo = nombre ? `Hola <strong style="color:#fff">${escapar(nombre)}</strong>,` : 'Hola,';
  return {
    subject: `Restablecer contraseña — ${equipo}`,
    html: `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>body{margin:0;padding:0;background:#10141a;font-family:'Helvetica Neue',Arial,sans-serif;}
.wrap{max-width:520px;margin:40px auto;background:#1c2026;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.07);}
.hero{background:linear-gradient(135deg,#053d2e 0%,#0a2a1f 100%);padding:36px 32px;text-align:center;}
.hero h1{color:#44f3a9;font-size:22px;font-weight:900;margin:0;}
.body{padding:28px 32px;}
.body p{color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 16px;}
.btn{display:block;text-align:center;padding:14px;border-radius:12px;font-weight:900;font-size:15px;text-decoration:none;background:#44f3a9;color:#003822;margin-top:8px;}
.footer{padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;}
.footer p{color:rgba(255,255,255,0.2);font-size:11px;margin:0;}
</style></head><body>
<div class="wrap">
  <div class="hero"><h1>🔐 Restablecer contraseña</h1></div>
  <div class="body">
    <p>${saludo}</p>
    <p>Recibimos una solicitud para crear una nueva contraseña de tu cuenta en <strong style="color:#44f3a9">${eq}</strong>.</p>
    <a href="${escapar(link)}" class="btn">Crear nueva contraseña</a>
    <p style="font-size:13px;color:rgba(255,255,255,0.35);margin-top:20px;">El enlace sirve una sola vez y vence en 1 hora. Si no lo pediste tú, ignora este correo: tu contraseña sigue igual.</p>
  </div>
  <div class="footer"><p>© ${eq} · miclubpro.cl</p></div>
</div>
</body></html>`,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email } = await req.json();
    const destinatario = String(email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario) || destinatario.length > 200) {
      return json({ ok: false, error: 'Escribe un correo válido' }, 400);
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const haceUnaHora = new Date(Date.now() - 60 * 60_000).toISOString();

    const [{ count: delCorreo }, { count: total }] = await Promise.all([
      admin.from('password_reset_requests').select('id', { count: 'exact', head: true })
        .eq('email', destinatario).gte('created_at', haceUnaHora),
      admin.from('password_reset_requests').select('id', { count: 'exact', head: true })
        .gte('created_at', haceUnaHora),
    ]);
    // Pasado el límite se responde "listo" igual: quien insiste no aprende nada
    // y el buzón del jugador no se llena.
    if ((delCorreo ?? 0) >= MAX_POR_CORREO_POR_HORA || (total ?? 0) >= MAX_TOTAL_POR_HORA) {
      return json({ ok: true });
    }
    await admin.from('password_reset_requests').insert({ email: destinatario });

    const { data: enlace, error: errEnlace } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: destinatario,
    });
    // Sin cuenta con ese correo: misma respuesta que si existiera.
    if (errEnlace || !enlace?.properties?.hashed_token) return json({ ok: true });

    const link = `${SITIO}/reset-password?token_hash=${encodeURIComponent(enlace.properties.hashed_token)}&type=recovery`;

    const { data: jugador } = await admin.from('players').select('name, team_id')
      .ilike('email', destinatario.replace(/[\\%_]/g, c => `\\${c}`)).maybeSingle();
    let equipo = 'MiClubPro';
    if (jugador?.team_id) {
      const { data: t } = await admin.from('team_settings').select('team_name').eq('id', jugador.team_id).maybeSingle();
      if (t?.team_name) equipo = t.team_name;
    }

    const { subject, html } = correo(link, equipo, jugador?.name ?? '');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${equipo.replace(/[<>"\r\n]/g, '').slice(0, 60)} <noreply@miclubpro.cl>`,
        to: destinatario,
        subject: subject.replace(/[\r\n]+/g, ' '),
        html,
      }),
    });
    if (!res.ok) {
      const detalle = await res.json().catch(() => ({}));
      console.error('request-password-reset: Resend', res.status, detalle?.message);
      return json({ ok: false, error: 'No pudimos enviar el correo. Intenta de nuevo en unos minutos.' }, 502);
    }

    return json({ ok: true });
  } catch (err: any) {
    console.error('request-password-reset:', err?.message);
    return json({ ok: false, error: 'No pudimos enviar el correo. Intenta de nuevo en unos minutos.' }, 500);
  }
});
