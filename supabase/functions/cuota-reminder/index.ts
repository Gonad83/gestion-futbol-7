/**
 * Recordatorios automáticos de cuota por correo.
 *
 *   tipo "inicio" → día 1 de cada mes: aviso de la cuota del mes a quien aún no la tiene pagada.
 *   tipo "mitad"  → día 15: recordatorio a quienes siguen con cuotas pendientes.
 *
 * La llama pg_cron (ver supabase/migrations/20261118c_recordatorios_cuota.sql)
 * con el header x-cron-token; sin ese token no hace nada. Enero y febrero no
 * tienen cuota. Cada equipo recibe cada aviso una sola vez por mes
 * (tabla recordatorios_cuota).
 *
 * Opciones del cuerpo:
 *   simular: true → no envía nada, devuelve a quién le escribiría.
 *   prueba:  true → envía un solo correo de muestra al dueño del equipo.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SITIO = 'https://miclubpro.cl';
const CUOTA_POR_DEFECTO = 8000;
const ZONA = 'America/Santiago';
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const HOSTS_DE_PAGO = ['mercadopago.cl', 'mercadopago.com', 'mpago.la', 'mpago.li', 'flow.cl'];

type Tipo = 'inicio' | 'mitad';
interface Mes { year: number; month: number }
interface Aviso { nombre: string; email: string; pendientes: Mes[]; total: number }

const escapar = (valor: unknown) =>
  String(valor ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

/** Año y mes de una fecha vistos desde Chile. */
function anioMes(fecha: Date): Mes {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: 'numeric' }).formatToParts(fecha);
  const dato = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  return { year: dato('year'), month: dato('month') };
}

function linkDePago(link: unknown) {
  try {
    const url = new URL(String(link ?? ''));
    const permitido = url.protocol === 'https:'
      && HOSTS_DE_PAGO.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
    return permitido ? url.toString() : '';
  } catch {
    return '';
  }
}

/** Mismo criterio que la pestaña Morosos de Caja: meses cobrables sin pagar desde el ingreso. */
function mesesPendientes(ingreso: string | null, pagos: { month: number; year: number; status: string }[], hoy: Mes): Mes[] {
  const cubiertos = new Set(pagos.filter((p) => p.status === 'Pagado' || p.status === 'Exento').map((p) => `${p.year}-${p.month}`));
  let { year: y, month: m } = ingreso ? anioMes(new Date(ingreso)) : hoy;
  const pendientes: Mes[] = [];
  while (y < hoy.year || (y === hoy.year && m <= hoy.month)) {
    if (m > 2 && !cubiertos.has(`${y}-${m}`)) pendientes.push({ year: y, month: m });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return pendientes;
}

/* ── Plantilla (colores y tipografías de la app) ─────────────────────────── */

function plantilla(tipo: Tipo, a: Aviso, equipo: string, cuota: number, hoy: Mes, pago: string) {
  const mesActual = MESES[hoy.month - 1];
  const anteriores = a.pendientes.filter((p) => !(p.year === hoy.year && p.month === hoy.month));
  const esInicio = tipo === 'inicio';
  const acento = esInicio ? '#44f3a9' : '#ffd08b';
  const cifra = esInicio ? cuota : a.total;
  const n = a.pendientes.length;

  const chip = (p: Mes, color: string, fondo: string) =>
    `<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 12px;border-radius:999px;background:${fondo};color:${color};font-size:12px;font-weight:700;">${MESES[p.month - 1].slice(0, 3)} ${p.year}</span>`;

  const titulo = esInicio ? `Cuota de ${mesActual}` : 'Tu cuota sigue pendiente';
  const etiqueta = esInicio ? `${mesActual} ${hoy.year}` : `Recordatorio · ${mesActual} ${hoy.year}`;
  const bajada = esInicio ? 'Cuota mensual' : (n === 1 ? '1 cuota pendiente' : `${n} cuotas pendientes`);

  const mensaje = esInicio
    ? `Empezó ${mesActual} y ya puedes pagar la cuota del mes. Con las cuotas al día pagamos la cancha y los gastos del equipo.`
    : `Vamos a mitad de mes y todavía no registramos tu pago. Ponerte al día nos ayuda a pagar la cancha y los gastos del equipo.`;

  const detalle = esInicio
    ? (anteriores.length === 0 ? '' : `
      <tr><td style="padding:0 32px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#262a31;border-radius:14px;">
          <tr><td style="padding:18px 20px;">
            <p style="margin:0 0 10px;color:#ffd08b;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">Además tienes ${anteriores.length === 1 ? '1 cuota anterior' : `${anteriores.length} cuotas anteriores`}</p>
            <div>${anteriores.map((p) => chip(p, '#ffd08b', 'rgba(255,208,139,0.12)')).join('')}</div>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.6);font-size:14px;">Total con ${mesActual}: <strong style="color:#ffffff;">${clp(a.total)}</strong></p>
          </td></tr>
        </table>
      </td></tr>`)
    : `
      <tr><td style="padding:0 32px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#262a31;border-radius:14px;">
          <tr><td style="padding:18px 20px;">
            <p style="margin:0 0 10px;color:rgba(255,255,255,0.45);font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">Meses pendientes</p>
            <div>${a.pendientes.map((p) => chip(p, '#fca5a5', 'rgba(248,113,113,0.14)')).join('')}</div>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.6);font-size:14px;">${n} × ${clp(cuota)} = <strong style="color:#ffffff;">${clp(a.total)}</strong></p>
          </td></tr>
        </table>
      </td></tr>`;

  const botonPrincipal = pago
    ? `<a href="${escapar(pago)}" style="display:block;padding:15px;border-radius:14px;background:#44f3a9;background-image:linear-gradient(135deg,#44f3a9,#00d68f);color:#003822;font-size:15px;font-weight:800;text-decoration:none;text-align:center;">Pagar ahora</a>`
    : `<a href="${SITIO}/profile" style="display:block;padding:15px;border-radius:14px;background:#44f3a9;background-image:linear-gradient(135deg,#44f3a9,#00d68f);color:#003822;font-size:15px;font-weight:800;text-decoration:none;text-align:center;">Subir mi comprobante</a>`;
  const botonSecundario = pago
    ? `<a href="${SITIO}/profile" style="display:block;margin-top:10px;padding:14px;border-radius:14px;background:#262a31;color:#9acbff;font-size:14px;font-weight:700;text-decoration:none;text-align:center;">Ya transferí: subir comprobante</a>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@700;900&family=Manrope:wght@400;700;800&display=swap" rel="stylesheet">
<title>${escapar(titulo)}</title></head>
<body style="margin:0;padding:0;background:#10141a;font-family:'Manrope','Helvetica Neue',Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapar(esInicio ? `${clp(cuota)} · ${equipo}` : `${bajada}: ${clp(a.total)} · ${equipo}`)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#10141a;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1c2026;border-radius:24px;overflow:hidden;">
    <tr><td style="padding:22px 32px;background:#0a0e14;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="color:#ffffff;font-family:'Lexend','Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:700;">${escapar(equipo)}</td>
        <td align="right" style="color:${acento};font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">${escapar(etiqueta)}</td>
      </tr></table>
    </td></tr>
    <tr><td align="center" style="padding:40px 32px 32px;background:#181c22;">
      <p style="margin:0 0 14px;color:rgba(255,255,255,0.5);font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">${escapar(bajada)}</p>
      <p style="margin:0;color:${acento};font-family:'Lexend','Helvetica Neue',Arial,sans-serif;font-size:52px;line-height:1;font-weight:900;letter-spacing:-1.5px;">${clp(cifra)}</p>
      <p style="margin:16px 0 0;color:#ffffff;font-family:'Lexend','Helvetica Neue',Arial,sans-serif;font-size:20px;font-weight:700;">${escapar(titulo)}</p>
    </td></tr>
    <tr><td style="padding:28px 32px 20px;">
      <p style="margin:0 0 12px;color:#ffffff;font-size:16px;font-weight:700;">Hola ${escapar(a.nombre)},</p>
      <p style="margin:0;color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;">${mensaje}</p>
    </td></tr>${detalle}
    <tr><td style="padding:16px 32px 8px;">${botonPrincipal}${botonSecundario}</td></tr>
    <tr><td style="padding:16px 32px 28px;">
      <p style="margin:0;color:rgba(255,255,255,0.4);font-size:13px;line-height:1.5;">Si ya pagaste, no hagas nada: el capitán lo registrará en la Caja.</p>
    </td></tr>
    <tr><td align="center" style="padding:18px 32px;background:#0a0e14;">
      <p style="margin:0;color:rgba(255,255,255,0.3);font-size:11px;">${escapar(equipo)} · <a href="${SITIO}" style="color:rgba(255,255,255,0.45);text-decoration:none;">miclubpro.cl</a></p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const asunto = esInicio
    ? `Cuota de ${mesActual}: ${clp(cuota)} — ${equipo}`
    : `Recordatorio: tienes ${bajada} (${clp(a.total)}) — ${equipo}`;
  return { asunto: asunto.replace(/[\r\n]+/g, ' '), html };
}

/* ── Handler ─────────────────────────────────────────────────────────────── */

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Solo pg_cron conoce el token (tabla cron_tokens, sin acceso desde la app).
    const token = req.headers.get('x-cron-token') ?? '';
    const { data: valido } = await db.from('cron_tokens').select('nombre').eq('nombre', 'cuota-reminder').eq('token', token).maybeSingle();
    if (!token || !valido) return json({ error: 'No autorizado' }, 401);

    const cuerpo = await req.json().catch(() => ({}));
    const tipo: Tipo = cuerpo.tipo === 'mitad' ? 'mitad' : 'inicio';
    const simular = cuerpo.simular === true;
    const prueba = cuerpo.prueba === true;

    const hoy = anioMes(new Date());
    if (hoy.month <= 2) return json({ ok: true, mensaje: 'Enero y febrero no tienen cuota.', enviados: 0 });

    const { data: equipos, error: errEquipos } = await db.from('team_settings')
      .select('id, team_name, owner_id, quota_amount, payment_link, payment_button_enabled');
    if (errEquipos) throw errEquipos;

    const resumen: unknown[] = [];

    for (const equipo of equipos ?? []) {
      const nombreEquipo = String(equipo.team_name || 'MiClubPro');
      const cuota = Number(equipo.quota_amount ?? CUOTA_POR_DEFECTO);
      if (!(cuota > 0)) continue;

      const { data: jugadores, error: errJug } = await db.from('players')
        .select('id, name, email, notify, created_at')
        .eq('team_id', equipo.id).in('status', ['Activo', 'Lesionado']);
      if (errJug) throw errJug;
      if (!jugadores?.length) continue;

      const { data: pagos, error: errPagos } = await db.from('payments')
        .select('player_id, month, year, status').in('player_id', jugadores.map((j) => j.id));
      if (errPagos) throw errPagos;

      const avisos: Aviso[] = [];
      for (const j of jugadores) {
        const pendientes = mesesPendientes(j.created_at, (pagos ?? []).filter((p) => p.player_id === j.id), hoy);
        const debeElMes = pendientes.some((p) => p.year === hoy.year && p.month === hoy.month);
        const leToca = tipo === 'inicio' ? debeElMes : pendientes.length > 0;
        if (!leToca || !j.email || j.notify === false) continue;
        avisos.push({ nombre: j.name, email: String(j.email).trim().toLowerCase(), pendientes, total: pendientes.length * cuota });
      }
      avisos.sort((a, b) => b.pendientes.length - a.pendientes.length);

      if (simular) {
        resumen.push({ equipo: nombreEquipo, tipo, cuota, destinatarios: avisos.map((a) => ({ nombre: a.nombre, meses: a.pendientes.length, total: a.total })) });
        continue;
      }
      if (avisos.length === 0) { resumen.push({ equipo: nombreEquipo, enviados: 0 }); continue; }

      // Las respuestas le llegan al dueño del equipo.
      let correoDueno = '';
      if (equipo.owner_id) {
        const { data: dueno } = await db.auth.admin.getUserById(equipo.owner_id);
        correoDueno = dueno?.user?.email ?? '';
      }

      const pago = equipo.payment_button_enabled ? linkDePago(equipo.payment_link) : '';
      const remitente = `${nombreEquipo.replace(/[<>"\r\n]/g, '').slice(0, 60)} <cuotas@miclubpro.cl>`;
      const armar = (a: Aviso, para: string, prefijo = '') => {
        const { asunto, html } = plantilla(tipo, a, nombreEquipo, cuota, hoy, pago);
        return { from: remitente, to: [para], subject: prefijo + asunto, html, ...(correoDueno ? { reply_to: correoDueno } : {}) };
      };

      let correos;
      if (prueba) {
        if (!correoDueno) { resumen.push({ equipo: nombreEquipo, error: 'El equipo no tiene dueño con correo' }); continue; }
        correos = [armar(avisos[0], correoDueno, '[PRUEBA] ')];
      } else {
        // Reservar el envío del mes: si ya existe, este aviso ya salió.
        const { error: yaEnviado } = await db.from('recordatorios_cuota')
          .insert({ team_id: equipo.id, year: hoy.year, month: hoy.month, tipo, enviados: avisos.length });
        if (yaEnviado) { resumen.push({ equipo: nombreEquipo, enviados: 0, mensaje: 'Ya se había enviado este mes.' }); continue; }
        correos = avisos.map((a) => armar(a, a.email));
      }

      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(correos),
      });
      if (!res.ok) {
        const detalle = await res.text();
        // Liberar la reserva para poder reintentar.
        if (!prueba) await db.from('recordatorios_cuota').delete().match({ team_id: equipo.id, year: hoy.year, month: hoy.month, tipo });
        resumen.push({ equipo: nombreEquipo, enviados: 0, error: `Resend: ${detalle.slice(0, 300)}` });
        continue;
      }
      resumen.push({ equipo: nombreEquipo, tipo, prueba, enviados: correos.length });
    }

    return json({ ok: true, tipo, mes: `${MESES[hoy.month - 1]} ${hoy.year}`, resumen });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
