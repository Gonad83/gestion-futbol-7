import { cargable, type Cargable } from './lib/cargable';

/**
 * Páginas públicas. Llegan ya dibujadas en el HTML (scripts/prerender.mjs);
 * main.tsx descarga la de la dirección abierta antes de arrancar React para
 * que el reemplazo no muestre la pantalla de carga.
 */
export const Landing = cargable(() => import('./pages/Landing'));
export const SobreNosotros = cargable(() => import('./pages/SobreNosotros'));
export const CentroDeAyuda = cargable(() => import('./pages/CentroDeAyuda'));
export const Tutoriales = cargable(() => import('./pages/Tutoriales'));
export const PreguntasFrecuentes = cargable(() => import('./pages/PreguntasFrecuentes'));
export const Contacto = cargable(() => import('./pages/Contacto'));
export const TerminosDeServicio = cargable(() => import('./pages/TerminosDeServicio'));
export const PoliticaDePrivacidad = cargable(() => import('./pages/PoliticaDePrivacidad'));
export const Seguridad = cargable(() => import('./pages/Seguridad'));

const POR_RUTA: Record<string, Cargable> = {
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

/** Descarga la página pública de esa dirección, si la hay. Nunca falla: a lo más no adelanta nada. */
export function precargarPagina(ruta: string): Promise<void> {
  const pagina = POR_RUTA[ruta.replace(/\/+$/, '') || '/'];
  return pagina ? pagina.precargar().catch(() => {}) : Promise.resolve();
}
