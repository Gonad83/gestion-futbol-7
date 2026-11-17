import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MARCA, paginaDe, urlCanonica } from '../lib/seo';

function fijarMeta(selector: string, atributo: 'content' | 'href', valor: string) {
  const nodo = document.head.querySelector(selector);
  if (nodo) nodo.setAttribute(atributo, valor);
}

/**
 * Al navegar dentro de la app el HTML no se vuelve a pedir, así que el título,
 * la descripción y la dirección oficial se actualizan aquí. La primera carga
 * ya trae los de su página desde scripts/prerender.mjs.
 */
export function Seo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const pagina = paginaDe(pathname);
    if (!pagina) {
      document.title = MARCA;
      return;
    }
    document.title = pagina.titulo;
    fijarMeta('meta[name="description"]', 'content', pagina.descripcion);
    fijarMeta('link[rel="canonical"]', 'href', urlCanonica(pagina.ruta));
    fijarMeta('meta[property="og:url"]', 'content', urlCanonica(pagina.ruta));
    fijarMeta('meta[property="og:title"]', 'content', pagina.titulo);
    fijarMeta('meta[property="og:description"]', 'content', pagina.descripcion);
  }, [pathname]);

  return null;
}
