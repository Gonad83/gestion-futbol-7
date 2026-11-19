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
/** `abonado` es lo ya pagado a cuenta de los meses pendientes; `total` es el saldo que queda. */
interface Aviso { nombre: string; email: string; pendientes: Mes[]; abonado: number; total: number }
/** Escudo y foto de portada del equipo (los mismos de la app). */
interface Marca { equipo: string; logo: string; banner: string }

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

/** Una imagen solo si su dirección es https. */
function urlDeImagen(link: unknown) {
  try {
    const url = new URL(String(link ?? ''));
    return url.protocol === 'https:' ? url.toString() : '';
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

const LEXEND = `'Lexend','Helvetica Neue',Arial,sans-serif`;
const mesCorto = (p: Mes) => `${MESES[p.month - 1].slice(0, 3)} ${p.year}`;

function plantilla(tipo: Tipo, a: Aviso, marca: Marca, cuota: number, hoy: Mes, pago: string) {
  const equipo = marca.equipo;
  const mesActual = MESES[hoy.month - 1];
  const anteriores = a.pendientes.filter((p) => !(p.year === hoy.year && p.month === hoy.month));
  const esInicio = tipo === 'inicio';
  const acento = esInicio ? '#44f3a9' : '#ffd08b';
  const brillo = esInicio ? 'rgba(68,243,169,0.18)' : 'rgba(255,208,139,0.18)';
  // Día 1: la cuota del mes (o su saldo, si ya abonó parte). Día 15: todo lo que debe.
  const cifra = esInicio && anteriores.length > 0 ? cuota : a.total;
  const n = a.pendientes.length;
  // Quien debe varias cuotas no tiene que pagarlas todas juntas: puede abonar.
  const variasCuotas = n > 1;

  const titulo = esInicio ? `Cuota de ${mesActual}` : 'Tu cuota sigue pendiente';
  const etiqueta = esInicio ? `${mesActual} ${hoy.year}` : `Recordatorio · ${mesActual}`;
  const bajada = esInicio ? 'Cuota mensual' : (n === 1 ? '1 cuota pendiente' : `${n} cuotas pendientes`);
  const mensaje = esInicio
    ? `Empezó ${mesActual} y ya puedes pagar la cuota del mes. Con las cuotas al día pagamos la cancha y los gastos del equipo.`
    : `Vamos a mitad de mes y todavía no registramos tu pago. Ponerte al día nos ayuda a pagar la cancha y los gastos del equipo.`;

  const chip = (p: Mes, color: string, fondo: string) =>
    `<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 12px;border-radius:999px;background:${fondo};color:${color};font-size:12px;font-weight:700;">${mesCorto(p)}</span>`;

  // Tres datos en fila: resumen de la deuda.
  const dato = (rotulo: string, valor: string, color: string) => `
          <td width="33%" align="center" style="padding:14px 6px;background:#262a31;border-radius:14px;">
            <p style="margin:0 0 6px;color:rgba(255,255,255,0.45);font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;">${rotulo}</p>
            <p style="margin:0;color:${color};font-family:${LEXEND};font-size:18px;font-weight:700;">${valor}</p>
          </td>`;
  const separador = '<td width="8" style="font-size:0;line-height:0;">&nbsp;</td>';
  const datos = esInicio
    ? (anteriores.length === 0 ? [] : [
        dato('Anteriores', String(anteriores.length), '#ffd08b'),
        dato('Desde', mesCorto(anteriores[0]), '#ffffff'),
        dato('Total', clp(a.total), '#ffffff'),
      ])
    : [
        dato('Cuotas', String(n), '#fca5a5'),
        dato('Valor cuota', clp(cuota), '#ffffff'),
        dato('Desde', mesCorto(a.pendientes[0]), '#ffffff'),
      ];
  const filaDeDatos = datos.length === 0 ? '' : `
    <tr><td style="padding:0 28px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${datos.join(separador)}
      </tr></table>
    </td></tr>`;

  const mesesEnChips = esInicio ? anteriores : a.pendientes;
  const cajaDeMeses = mesesEnChips.length === 0 ? '' : `
    <tr><td style="padding:0 28px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#181c22;border-radius:14px;">
        <tr><td style="padding:16px 18px 10px;">
          <p style="margin:0 0 10px;color:rgba(255,255,255,0.45);font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;">${esInicio ? 'Meses anteriores pendientes' : 'Meses pendientes'}</p>
          <div>${mesesEnChips.map((p) => esInicio ? chip(p, '#ffd08b', 'rgba(255,208,139,0.12)') : chip(p, '#fca5a5', 'rgba(248,113,113,0.14)')).join('')}</div>
        </td></tr>
      </table>
    </td></tr>`;

  const estiloBoton = 'display:block;padding:16px;border-radius:14px;background:#44f3a9;background-image:linear-gradient(135deg,#44f3a9,#00d68f);color:#003822;font-family:' + LEXEND + ';font-size:16px;font-weight:700;text-decoration:none;text-align:center;';
  const botonPrincipal = pago
    ? `<a href="${escapar(pago)}" style="${estiloBoton}">${variasCuotas ? 'Pagar o abonar' : `Pagar ${clp(a.total)}`}</a>`
    : `<a href="${SITIO}/profile" style="${estiloBoton}">Subir mi comprobante</a>`;
  const botonSecundario = pago
    ? `<a href="${SITIO}/profile" style="display:block;margin-top:10px;padding:14px;border-radius:14px;background:#262a31;color:#9acbff;font-size:14px;font-weight:700;text-decoration:none;text-align:center;">Ya transferí: subir comprobante</a>`
    : '';
  const abono = variasCuotas ? `
    <tr><td style="padding:10px 28px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(154,203,255,0.08);border-radius:14px;">
        <tr><td style="padding:14px 18px;color:rgba(255,255,255,0.75);font-size:13px;line-height:1.55;"><strong style="color:#9acbff;">No tienes que pagar todo de una vez.</strong> Puedes abonar de a una cuota (${clp(cuota)}) o lo que puedas este mes: cada abono cubre primero el mes más antiguo.</td></tr>
      </table>
    </td></tr>` : '';
  const notaAbono = a.abonado > 0 ? `
    <tr><td style="padding:0 28px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(68,243,169,0.08);border-radius:14px;">
        <tr><td style="padding:14px 18px;color:rgba(255,255,255,0.75);font-size:13px;line-height:1.55;"><strong style="color:#44f3a9;">Ya abonaste ${clp(a.abonado)}.</strong> Te queda un saldo de <strong style="color:#ffffff;">${clp(a.total)}</strong>.</td></tr>
      </table>
    </td></tr>` : '';
  const paso1 = pago
    ? (variasCuotas ? 'Paga o abona con el botón, o haz la transferencia de siempre.' : 'Paga con el botón o haz la transferencia de siempre.')
    : (variasCuotas ? 'Haz la transferencia de siempre, por el total o por un abono.' : 'Haz la transferencia de siempre.');

  const paso =(numero: number, texto: string) => `
        <tr>
          <td width="34" valign="top" style="padding:0 0 10px;"><span style="display:inline-block;width:24px;height:24px;line-height:24px;border-radius:999px;background:rgba(68,243,169,0.14);color:#44f3a9;font-size:12px;font-weight:800;text-align:center;">${numero}</span></td>
          <td valign="top" style="padding:2px 0 10px;color:rgba(255,255,255,0.65);font-size:13px;line-height:1.5;">${texto}</td>
        </tr>`;

  const portada = marca.banner ? `
    <tr><td style="padding:0;font-size:0;line-height:0;background:#0a0e14;">
      <img src="${escapar(marca.banner)}" width="520" alt="${escapar(equipo)}" style="display:block;width:100%;max-width:520px;height:auto;border:0;">
    </td></tr>` : '';
  const escudo = (lado: number, radio: number) => marca.logo
    ? `<img src="${escapar(marca.logo)}" width="${lado}" height="${lado}" alt="Escudo de ${escapar(equipo)}" style="display:block;width:${lado}px;height:${lado}px;border-radius:${radio}px;border:0;">`
    : '';

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@700;900&family=Manrope:wght@400;700;800&display=swap" rel="stylesheet">
<title>${escapar(titulo)}</title></head>
<body style="margin:0;padding:0;background:#10141a;font-family:'Manrope','Helvetica Neue',Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapar(esInicio ? `${clp(cifra)} · ${equipo}` : `${bajada}: ${clp(a.total)} · ${equipo}`)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#10141a;">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1c2026;border-radius:24px;overflow:hidden;">${portada}
    <tr><td style="height:4px;font-size:0;line-height:4px;background:#44f3a9;background-image:linear-gradient(90deg,#44f3a9,#9acbff,#ffd08b);">&nbsp;</td></tr>
    <tr><td style="padding:18px 28px;background:#0a0e14;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        ${marca.logo ? `<td width="66" valign="middle">${escudo(54, 14)}</td>` : ''}
        <td valign="middle">
          <p style="margin:0;color:#ffffff;font-family:${LEXEND};font-size:17px;font-weight:700;">${escapar(equipo)}</p>
          <p style="margin:3px 0 0;color:rgba(255,255,255,0.45);font-size:12px;">Tesorería del equipo</p>
        </td>
        <td align="right" valign="middle"><span style="display:inline-block;padding:7px 12px;border-radius:999px;background:${brillo};color:${acento};font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;white-space:nowrap;">${escapar(etiqueta)}</span></td>
      </tr></table>
    </td></tr>
    <tr><td align="center" style="padding:36px 28px 30px;background:#181c22;background-image:radial-gradient(circle at 50% 0%,${brillo},rgba(24,28,34,0) 70%);">
      <p style="margin:0 0 12px;color:rgba(255,255,255,0.5);font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">${escapar(bajada)}</p>
      <p style="margin:0;color:${acento};font-family:${LEXEND};font-size:56px;line-height:1;font-weight:900;letter-spacing:-1.5px;">${clp(cifra)}</p>
      <p style="margin:14px 0 0;color:#ffffff;font-family:${LEXEND};font-size:20px;font-weight:700;">${escapar(titulo)}</p>
    </td></tr>
    <tr><td style="padding:26px 28px 18px;">
      <p style="margin:0 0 10px;color:#ffffff;font-family:${LEXEND};font-size:17px;font-weight:700;">Hola ${escapar(a.nombre)} 👋</p>
      <p style="margin:0;color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;">${mensaje}</p>
    </td></tr>${filaDeDatos}${cajaDeMeses}${notaAbono}
    <tr><td style="padding:14px 28px 6px;">${botonPrincipal}${botonSecundario}</td></tr>${abono}
    <tr><td style="padding:22px 28px 14px;">
      <p style="margin:0 0 12px;color:rgba(255,255,255,0.45);font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;">Cómo queda registrado</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${paso(1, paso1)}${paso(2, 'Si transferiste, sube la foto del comprobante en tu perfil.')}${paso(3, 'El capitán lo aprueba y tu cuota queda al día en la Caja.')}
      </table>
    </td></tr>
    <tr><td style="padding:0 28px 26px;">
      <p style="margin:0;color:rgba(255,255,255,0.35);font-size:12px;line-height:1.5;">¿Ya pagaste? No hagas nada, este aviso se cruza con los pagos recientes.</p>
    </td></tr>
    <tr><td style="padding:18px 28px;background:#0a0e14;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        ${marca.logo ? `<td width="40" valign="middle">${escudo(28, 8)}</td>` : ''}
        <td valign="middle" style="color:rgba(255,255,255,0.4);font-size:11px;line-height:1.5;">${escapar(equipo)}<br>Enviado con <a href="${SITIO}" style="color:#44f3a9;text-decoration:none;">miclubpro.cl</a></td>
      </tr></table>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const asunto = esInicio
    ? `Cuota de ${mesActual}: ${clp(cifra)} — ${equipo}`
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
      .select('id, team_name, owner_id, quota_amount, payment_link, payment_button_enabled, logo_url, banner_url, aviso_cuotas');
    if (errEquipos) throw errEquipos;

    const resumen: unknown[] = [];

    for (const equipo of equipos ?? []) {
      const nombreEquipo = String(equipo.team_name || 'MiClubPro');
      // El capitán apagó los avisos de cuota en Ajustes (la prueba manual igual sale).
      if (equipo.aviso_cuotas === false && !prueba) { resumen.push({ equipo: nombreEquipo, omitido: 'Aviso apagado en Ajustes' }); continue; }
      const cuota = Number(equipo.quota_amount ?? CUOTA_POR_DEFECTO);
      if (!(cuota > 0)) continue;

      const { data: jugadores, error: errJug } = await db.from('players')
        .select('id, name, email, notify, created_at')
        .eq('team_id', equipo.id).in('status', ['Activo', 'Lesionado']);
      if (errJug) throw errJug;
      if (!jugadores?.length) continue;

      const { data: pagos, error: errPagos } = await db.from('payments')
        .select('player_id, month, year, status, amount, es_deuda').in('player_id', jugadores.map((j) => j.id));
      if (errPagos) throw errPagos;

      const avisos: Aviso[] = [];
      for (const j of jugadores) {
        const suyos = (pagos ?? []).filter((p) => p.player_id === j.id);
        const pendientes = mesesPendientes(j.created_at, suyos, hoy);
        const debeElMes = pendientes.some((p) => p.year === hoy.year && p.month === hoy.month);
        const leToca = tipo === 'inicio' ? debeElMes : pendientes.length > 0;
        if (!leToca || !j.email || j.notify === false) continue;
        // Abonos: filas sin pagar con un monto menor a la cuota, en meses que aún debe.
        // (Una fila pendiente con el monto completo de la cuota es solo la deuda anotada.)
        const debe = new Set(pendientes.map((p) => `${p.year}-${p.month}`));
        const abonado = suyos.reduce((suma, p) => {
          const monto = Number(p.amount ?? 0);
          // La deuda que anotaba n8n (es_deuda) no es dinero; cualquier otro monto pendiente es un abono.
          const esAbono = (p.status === 'Pendiente' || p.status === 'Atrasado') && !p.es_deuda && monto > 0 && debe.has(`${p.year}-${p.month}`);
          return esAbono ? suma + monto : suma;
        }, 0);
        avisos.push({ nombre: j.name, email: String(j.email).trim().toLowerCase(), pendientes, abonado, total: Math.max(0, pendientes.length * cuota - abonado) });
      }
      avisos.sort((a, b) => b.pendientes.length - a.pendientes.length);

      if (simular) {
        resumen.push({ equipo: nombreEquipo, tipo, cuota, destinatarios: avisos.map((a) => ({ nombre: a.nombre, meses: a.pendientes.length, abonado: a.abonado, total: a.total })) });
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
      const marca: Marca = { equipo: nombreEquipo, logo: urlDeImagen(equipo.logo_url), banner: urlDeImagen(equipo.banner_url) };
      const remitente = `${nombreEquipo.replace(/[<>"\r\n]/g, '').slice(0, 60)} <cuotas@miclubpro.cl>`;
      const armar = (a: Aviso, para: string, prefijo = '') => {
        const { asunto, html } = plantilla(tipo, a, marca, cuota, hoy, pago);
        return { from: remitente, to: [para], subject: prefijo + asunto, html, ...(correoDueno ? { reply_to: correoDueno } : {}) };
      };

      let correos;
      if (prueba) {
        if (!correoDueno) { resumen.push({ equipo: nombreEquipo, error: 'El equipo no tiene dueño con correo' }); continue; }
        // La muestra usa a alguien con abono, si hay, para ver el caso más completo.
        correos = [armar(avisos.find((a) => a.abonado > 0) ?? avisos[0], correoDueno, '[PRUEBA] ')];
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
