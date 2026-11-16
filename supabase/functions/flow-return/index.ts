// Flow devuelve al comprador con un POST. El sitio es estático y responde 405 a un POST,
// así que Flow vuelve primero aquí y esta función lo redirige con un GET a la página de pago recibido.
// Se publica sin verificación de JWT: la llama el navegador del comprador desde Flow.

const SITIO = 'https://miclubpro.cl';
const ORIGENES = new Set([SITIO, 'https://www.miclubpro.cl', 'http://localhost:5183']);
const CAMPOS = ['plan', 'cycle', 'email', 'name', 'team'];

Deno.serve((req) => {
  const entrada = new URL(req.url).searchParams;
  // Solo se redirige a direcciones propias, nunca a una que venga escrita en el enlace.
  const origen = ORIGENES.has(entrada.get('o') ?? '') ? entrada.get('o')! : SITIO;
  const salida = new URLSearchParams({ gateway: 'flow' });
  for (const campo of CAMPOS) {
    const valor = entrada.get(campo);
    if (valor) salida.set(campo, valor.slice(0, 120));
  }
  return new Response(null, { status: 303, headers: { Location: `${origen}/payment-success?${salida}` } });
});
