/**
 * Corre al final de `npm run build`. Escribe en dist/:
 *  - un HTML completo por página pública (index.html, sobre-nosotros.html, …)
 *    con su título, descripción, dirección oficial, datos estructurados y el
 *    contenido ya dibujado, para que Google y los robots de IA lo lean sin
 *    ejecutar JavaScript;
 *  - app.html: la cáscara vacía de siempre, para las pantallas con sesión
 *    (marcada noindex: no debe aparecer en buscadores);
 *  - sitemap.xml con todas las páginas públicas.
 *
 * Las páginas y sus textos se definen en src/lib/seo.ts.
 */
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ = process.cwd();
const DIST = join(RAIZ, 'dist');
const SSR = join(RAIZ, 'dist-ssr');

const { render, PAGINAS, FUENTES, datosEstructurados, urlCanonica, SITIO } =
  await import(pathToFileURL(join(SSR, 'prerender.js')).href);

const plantilla = readFileSync(join(DIST, 'index.html'), 'utf8');
const manifiesto = JSON.parse(readFileSync(join(DIST, '.vite', 'manifest.json'), 'utf8'));

const escapar = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** CSS y JS de una página (y de lo que importa), para que se vea bien antes de que cargue React. */
function recursosDe(fuente) {
  const css = new Set();
  const js = new Set();
  const visitar = (clave, vistos = new Set()) => {
    const e = manifiesto[clave];
    if (!e || vistos.has(clave)) return;
    vistos.add(clave);
    (e.css ?? []).forEach((c) => css.add(c));
    if (!e.isEntry) js.add(e.file);
    (e.imports ?? []).forEach((i) => visitar(i, vistos));
  };
  visitar(fuente);
  return { css: [...css], js: [...js] };
}

function reemplazar(html, patron, valor, nombre) {
  const esta = typeof patron === 'string' ? html.includes(patron) : patron.test(html);
  if (!esta) throw new Error(`No encontré ${nombre} en index.html`);
  return html.replace(patron, valor);
}

function conCabecera(html, { titulo, descripcion, canonica }) {
  const t = escapar(titulo);
  const d = escapar(descripcion);
  html = reemplazar(html, /<title>[^<]*<\/title>/, `<title>${t}</title>`, 'el título');
  html = reemplazar(html, /(<meta name="description" content=")[^"]*/, `$1${d}`, 'la descripción');
  html = reemplazar(html, /(<link rel="canonical" href=")[^"]*/, `$1${canonica}`, 'la dirección oficial');
  html = reemplazar(html, /(<meta property="og:url" content=")[^"]*/, `$1${canonica}`, 'og:url');
  html = reemplazar(html, /(<meta property="og:title" content=")[^"]*/, `$1${t}`, 'og:title');
  html = reemplazar(html, /(<meta property="og:description" content=")[^"]*/, `$1${d}`, 'og:description');
  html = reemplazar(html, /(<meta name="twitter:title" content=")[^"]*/, `$1${t}`, 'twitter:title');
  html = reemplazar(html, /(<meta name="twitter:description" content=")[^"]*/, `$1${d}`, 'twitter:description');
  return html;
}

// Quien ya tiene sesión y abre la portada va directo a su panel: se borra la
// portada dibujada para que no aparezca un instante antes de redirigir.
const BORRAR_SI_HAY_SESION = `<script>try{if(Object.keys(localStorage).some(function(k){return k.indexOf('sb-')===0&&k.slice(-11)==='-auth-token'}))document.getElementById('root').innerHTML=''}catch(e){}</script>`;

for (const pagina of PAGINAS) {
  const canonica = urlCanonica(pagina.ruta);
  const { css, js } = recursosDe(FUENTES[pagina.ruta]);
  const extra = [
    ...css.map((c) => `<link rel="stylesheet" href="/${c}">`),
    ...js.map((j) => `<link rel="modulepreload" href="/${j}">`),
    `<script type="application/ld+json">${JSON.stringify(datosEstructurados(pagina.ruta)).replace(/</g, '\\u003c')}</script>`,
  ].join('\n    ');

  let html = conCabecera(plantilla, { titulo: pagina.titulo, descripcion: pagina.descripcion, canonica });
  html = html.replace('</head>', `    ${extra}\n  </head>`);
  html = reemplazar(html, '<div id="root"></div>', `<div id="root">${render(pagina.ruta)}</div>${pagina.ruta === '/' ? BORRAR_SI_HAY_SESION : ''}`, 'el div root');

  const archivo = pagina.ruta === '/' ? 'index.html' : `${pagina.ruta.slice(1)}.html`;
  writeFileSync(join(DIST, archivo), html);
  console.log(`  ${archivo}`);
}

// Cáscara para las pantallas con sesión y cualquier otra dirección.
const app = plantilla
  .replace(/\s*<link rel="canonical"[^>]*>/, '')
  .replace(/<meta name="robots" content="[^"]*"/, '<meta name="robots" content="noindex"');
if (!app.includes('content="noindex"')) throw new Error('No pude marcar app.html como noindex');
writeFileSync(join(DIST, 'app.html'), app);
console.log('  app.html');

const hoy = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGINAS.map((p) => `  <url>
    <loc>${urlCanonica(p.ruta)}</loc>
    <lastmod>${hoy}</lastmod>
    <changefreq>${p.frecuencia}</changefreq>
    <priority>${p.prioridad.toFixed(1)}</priority>
  </url>`).join('\n')}
</urlset>
`;
writeFileSync(join(DIST, 'sitemap.xml'), sitemap);
console.log(`  sitemap.xml (${PAGINAS.length} páginas, ${SITIO})`);

rmSync(SSR, { recursive: true, force: true });
