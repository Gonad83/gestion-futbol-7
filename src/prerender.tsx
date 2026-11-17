/* eslint-disable react-refresh/only-export-components -- solo se usa al compilar, nunca con recarga en caliente */
/**
 * Entrada que solo se usa al compilar (npm run build): dibuja cada página
 * pública como HTML para que buscadores y asistentes con IA, que en su
 * mayoría no ejecutan JavaScript, lean el contenido real. En el navegador
 * React vuelve a dibujar la página encima, así que esto no cambia la app.
 * La escritura de los archivos está en scripts/prerender.mjs.
 */
import type { ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import Landing from './pages/Landing';
import SobreNosotros from './pages/SobreNosotros';
import CentroDeAyuda from './pages/CentroDeAyuda';
import Tutoriales from './pages/Tutoriales';
import PreguntasFrecuentes from './pages/PreguntasFrecuentes';
import Contacto from './pages/Contacto';
import TerminosDeServicio from './pages/TerminosDeServicio';
import PoliticaDePrivacidad from './pages/PoliticaDePrivacidad';
import Seguridad from './pages/Seguridad';

export { PAGINAS, datosEstructurados, urlCanonica, SITIO } from './lib/seo';

const COMPONENTES: Record<string, ComponentType> = {
  '/': Landing,
  '/sobre-nosotros': SobreNosotros,
  '/centro-de-ayuda': CentroDeAyuda,
  '/tutoriales': Tutoriales,
  '/preguntas-frecuentes': PreguntasFrecuentes,
  '/contacto': Contacto,
  '/terminos-de-servicio': TerminosDeServicio,
  '/politica-de-privacidad': PoliticaDePrivacidad,
  '/seguridad': Seguridad,
};

/** Archivo fuente de cada página, para encontrar su CSS en el manifiesto de Vite. */
export const FUENTES: Record<string, string> = {
  '/': 'src/pages/Landing.tsx',
  '/sobre-nosotros': 'src/pages/SobreNosotros.tsx',
  '/centro-de-ayuda': 'src/pages/CentroDeAyuda.tsx',
  '/tutoriales': 'src/pages/Tutoriales.tsx',
  '/preguntas-frecuentes': 'src/pages/PreguntasFrecuentes.tsx',
  '/contacto': 'src/pages/Contacto.tsx',
  '/terminos-de-servicio': 'src/pages/TerminosDeServicio.tsx',
  '/politica-de-privacidad': 'src/pages/PoliticaDePrivacidad.tsx',
  '/seguridad': 'src/pages/Seguridad.tsx',
};

export function render(ruta: string): string {
  const Pagina = COMPONENTES[ruta];
  if (!Pagina) throw new Error(`Sin componente para ${ruta}`);
  return renderToString(<StaticRouter location={ruta}><Pagina /></StaticRouter>);
}
