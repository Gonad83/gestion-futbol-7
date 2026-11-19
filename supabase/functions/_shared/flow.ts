// Lo común para hablar con la API de Flow: firma y llamadas GET/POST.
// Documentación: https://developers.flow.cl/api

export const FLOW_API_URL = 'https://www.flow.cl/api';
export const SITIO = 'https://miclubpro.cl';
export const ORIGENES = new Set([SITIO, 'https://www.miclubpro.cl', 'http://localhost:5183']);

/** Lo que cuesta cada plan mensual con suscripción (debe coincidir con contenidoPublico.ts). */
export const MENSUAL: Record<'pro' | 'elite', { monto: number; nombre: string }> = {
  pro: { monto: 4990, nombre: 'MiClubPro Pro mensual' },
  elite: { monto: 9990, nombre: 'MiClubPro Elite mensual' },
};

/** El precio va en el identificador: si cambia, se crea un plan nuevo en Flow y los suscritos siguen con el suyo. */
export const planFlowId = (tier: 'pro' | 'elite') => `miclubpro_${tier}_mensual_${MENSUAL[tier].monto}`;

export async function firmar(params: Record<string, string>, secreto: string): Promise<string> {
  const texto = Object.keys(params).sort().map((k) => `${k}${params[k]}`).join('');
  const cod = new TextEncoder();
  const llave = await crypto.subtle.importKey('raw', cod.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const firma = await crypto.subtle.sign('HMAC', llave, cod.encode(texto));
  return Array.from(new Uint8Array(firma)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function llaves() {
  const apiKey = Deno.env.get('FLOW_API_KEY');
  const secreto = Deno.env.get('FLOW_SECRET_KEY');
  if (!apiKey || !secreto) throw new Error('FLOW_API_KEY / FLOW_SECRET_KEY no configurados en Supabase');
  return { apiKey, secreto };
}

export class ErrorFlow extends Error {
  constructor(public codigo: number | string | undefined, mensaje: string) { super(mensaje); }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- respuesta libre de la API de Flow
async function leer(res: Response): Promise<any> {
  const datos = await res.json().catch(() => ({}));
  if (!res.ok || (datos && datos.code && datos.message)) throw new ErrorFlow(datos?.code, datos?.message || `Flow respondió ${res.status}`);
  return datos;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- respuesta libre de la API de Flow
export async function flowGet(servicio: string, params: Record<string, string>): Promise<any> {
  const { apiKey, secreto } = llaves();
  const todo: Record<string, string> = { ...params, apiKey };
  todo.s = await firmar(todo, secreto);
  return leer(await fetch(`${FLOW_API_URL}/${servicio}?${new URLSearchParams(todo)}`));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- respuesta libre de la API de Flow
export async function flowPost(servicio: string, params: Record<string, string>): Promise<any> {
  const { apiKey, secreto } = llaves();
  const todo: Record<string, string> = { ...params, apiKey };
  todo.s = await firmar(todo, secreto);
  return leer(await fetch(`${FLOW_API_URL}/${servicio}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(todo).toString(),
  }));
}

/** El token que Flow manda por POST (formulario) a nuestras páginas de aviso o retorno. */
export async function tokenDe(req: Request): Promise<string> {
  if (req.method === 'POST') {
    try {
      const datos = await req.formData();
      const token = datos.get('token');
      if (typeof token === 'string' && token) return token;
    } catch { /* cuerpo vacío o con otro formato */ }
  }
  return new URL(req.url).searchParams.get('token') ?? '';
}
