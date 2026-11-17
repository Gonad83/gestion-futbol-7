// Flow devuelve al comprador con un POST, haya pagado o no (también al cancelar o volver atrás).
// El sitio es estático y responde 405 a un POST, así que Flow vuelve primero aquí. Esta función
// le pregunta a Flow, con nuestra firma, el estado real del pago y redirige con un GET:
//   pagado            → /payment-success
//   pendiente / dudas → /payment-success?estado=pendiente (el plan se activa solo con flow-webhook)
//   rechazado / anulado / sin token → de vuelta a /checkout con un aviso, sin cobrar nada
// Se publica sin verificación de JWT: la llama el navegador del comprador desde Flow.
// Esta página solo informa: el plan lo activa flow-webhook, nunca esta redirección.

const SITIO = 'https://miclubpro.cl';
const ORIGENES = new Set([SITIO, 'https://www.miclubpro.cl', 'http://localhost:5183']);
const CAMPOS = ['plan', 'cycle', 'email', 'name', 'team'];
const FLOW_API_URL = 'https://www.flow.cl/api';

// Estados de Flow (payment/getStatus): 1 pendiente, 2 pagado, 3 rechazado, 4 anulado.
type Resultado = 'pagado' | 'pendiente' | 'rechazado' | 'cancelado';

async function firmar(params: Record<string, string>, secreto: string): Promise<string> {
  const texto = Object.keys(params).sort().map(k => `${k}${params[k]}`).join('');
  const cod = new TextEncoder();
  const llave = await crypto.subtle.importKey('raw', cod.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const firma = await crypto.subtle.sign('HMAC', llave, cod.encode(texto));
  return Array.from(new Uint8Array(firma)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function tokenDe(req: Request, entrada: URLSearchParams): Promise<string> {
  if (req.method === 'POST') {
    try {
      const datos = await req.formData();
      const token = datos.get('token');
      if (typeof token === 'string' && token) return token;
    } catch { /* cuerpo vacío o con otro formato */ }
  }
  return entrada.get('token') ?? '';
}

async function resultadoDe(token: string): Promise<Resultado> {
  // Sin token Flow no creó o no completó ningún pago: el comprador volvió sin pagar.
  if (!token) return 'cancelado';
  const apiKey = Deno.env.get('FLOW_API_KEY');
  const secreto = Deno.env.get('FLOW_SECRET_KEY');
  // Si no podemos preguntar, no afirmamos nada: el webhook decide si se pagó.
  if (!apiKey || !secreto) return 'pendiente';
  try {
    const params: Record<string, string> = { apiKey, token };
    params.s = await firmar(params, secreto);
    const res = await fetch(`${FLOW_API_URL}/payment/getStatus?${new URLSearchParams(params)}`);
    const pago = await res.json();
    if (pago.status === 2) return 'pagado';
    if (pago.status === 3) return 'rechazado';
    if (pago.status === 4) return 'cancelado';
    return 'pendiente';
  } catch (err) {
    console.error('flow-return getStatus:', err instanceof Error ? err.message : err);
    return 'pendiente';
  }
}

Deno.serve(async (req) => {
  const entrada = new URL(req.url).searchParams;
  // Solo se redirige a direcciones propias, nunca a una que venga escrita en el enlace.
  const origen = ORIGENES.has(entrada.get('o') ?? '') ? entrada.get('o')! : SITIO;
  const resultado = await resultadoDe(await tokenDe(req, entrada));

  const salida = new URLSearchParams();
  for (const campo of CAMPOS) {
    const valor = entrada.get(campo);
    if (valor) salida.set(campo, valor.slice(0, 120));
  }

  let destino: string;
  if (resultado === 'pagado' || resultado === 'pendiente') {
    salida.set('gateway', 'flow');
    if (resultado === 'pendiente') salida.set('estado', 'pendiente');
    destino = `${origen}/payment-success?${salida}`;
  } else {
    salida.set('pago', resultado);
    destino = `${origen}/checkout?${salida}`;
  }
  return new Response(null, { status: 303, headers: { Location: destino } });
});
