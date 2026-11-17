import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Dibuja una ventana emergente directo en <body>, fuera de la pantalla que la abre.
 *
 * Una ventana con position: fixed se ubica respecto de la pantalla del teléfono,
 * salvo que algún contenedor tenga transform, filter o backdrop-filter (las
 * animaciones de entrada y las tarjetas de vidrio los usan): entonces se ubica
 * respecto de ese contenedor y puede quedar fuera de la vista. Desde <body> no
 * hay contenedor que la mueva. El contexto de React (sesión, rutas) se mantiene.
 */
export function Capa({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return <>{children}</>; // pruebas sin navegador
  return createPortal(children, document.body);
}
