import { createElement, lazy, type ComponentType, type ReactElement } from 'react';

type Modulo = { default: ComponentType };

export type Cargable = (() => ReactElement) & {
  /** Descarga la pantalla ya. Después se dibuja sin pasar por la pantalla de carga. */
  precargar: () => Promise<void>;
};

/**
 * Como React.lazy, pero si la pantalla ya se descargó con precargar() se dibuja
 * al tiro. React.lazy siempre muestra la pantalla de carga la primera vez,
 * aunque el archivo ya esté: en las páginas públicas eso borraría por un
 * instante el contenido que ya viene dibujado en el HTML (scripts/prerender.mjs).
 */
export function cargable(descargar: () => Promise<Modulo>): Cargable {
  let lista: ComponentType | null = null;
  let pendiente: Promise<Modulo> | null = null;
  const traer = () => (pendiente ??= descargar());
  const Perezosa = lazy(traer);

  const Pantalla = () => createElement(lista ?? Perezosa);
  return Object.assign(Pantalla, {
    precargar: () => traer().then(m => { lista = m.default; }),
  });
}
