/**
 * Equipo titular: los mejores del plantel activo, cada uno en su puesto.
 * Funciones puras (sin base de datos ni pantalla) para poder probarlas solas.
 */
import { grupoDe } from '../players/plantilla';

export type Linea = 'Portero' | 'Defensa' | 'Medio' | 'Delantero';
export const LINEAS: Linea[] = ['Portero', 'Defensa', 'Medio', 'Delantero'];

export interface JugadorTitular {
  id: string;
  name: string;
  status?: string;
  photo_url?: string | null;
  position?: string | null;
  secondary_position?: string | null;
  rating?: number | null;
  vision?: number | null;
  ataque?: number | null;
  defensa?: number | null;
}

export interface Puesto<T> {
  jugador: T;
  linea: Linea;
  /** Juega en una línea que no es su posición principal (o secundaria). */
  fueraDePuesto: boolean;
}

export interface Titular<T> {
  /** Del arco hacia adelante; las líneas sin cupo quedan vacías. */
  lineas: Record<Linea, Puesto<T>[]>;
  banca: T[];
  /** Promedio de estrellas de los titulares, con un decimal. */
  promedio: string;
}

/** La sub-estrella que desempata dentro de cada línea. */
const DESEMPATE: Record<Linea, 'defensa' | 'vision' | 'ataque'> = {
  Portero: 'defensa', Defensa: 'defensa', Medio: 'vision', Delantero: 'ataque',
};

/** "3-2-1" → 1 arquero, 3 defensas, 2 medios, 1 delantero. */
export function cuposPorLinea(formacion: string): Record<Linea, number> {
  const n = formacion.split('-').map((x) => Number(x) || 0);
  return {
    Portero: 1,
    Defensa: n[0] ?? 0,
    Medio: n.slice(1, -1).reduce((a, b) => a + b, 0),
    Delantero: n.length > 1 ? n[n.length - 1] : 0,
  };
}

/**
 * Arma el titular con los jugadores activos.
 * 1. Cada línea toma a sus mejores por estrellas entre quienes la tienen como
 *    posición principal (desempata la sub-estrella de la línea y luego los
 *    partidos jugados).
 * 2. Los cupos que sobran se llenan con quienes la tienen como posición secundaria.
 * 3. Si aún faltan, entran los mejores que queden, dejando a los arqueros al final.
 */
export function armarTitular<T extends JugadorTitular>(
  jugadores: T[],
  formacion: string,
  partidos: Record<string, number> = {},
): Titular<T> {
  const cupos = cuposPorLinea(formacion);
  const libres = jugadores.filter((j) => !j.status || j.status === 'Activo');
  const lineas: Record<Linea, Puesto<T>[]> = { Portero: [], Defensa: [], Medio: [], Delantero: [] };

  const valor = (j: T, linea: Linea) => (j.rating ?? 0) * 10 + (j[DESEMPATE[linea]] ?? j.rating ?? 0);
  const mejores = (linea: Linea) => (a: T, b: T) =>
    valor(b, linea) - valor(a, linea) || (partidos[b.id] ?? 0) - (partidos[a.id] ?? 0) || a.name.localeCompare(b.name);

  const llenar = (linea: Linea, candidatos: T[], fueraDePuesto: boolean) => {
    const faltan = cupos[linea] - lineas[linea].length;
    candidatos.sort(mejores(linea)).slice(0, Math.max(0, faltan)).forEach((jugador) => {
      lineas[linea].push({ jugador, linea, fueraDePuesto });
      libres.splice(libres.indexOf(jugador), 1);
    });
  };

  for (const linea of LINEAS) llenar(linea, libres.filter((j) => grupoDe(j.position) === linea), false);
  for (const linea of LINEAS) llenar(linea, libres.filter((j) => grupoDe(j.secondary_position) === linea), false);
  for (const linea of LINEAS) {
    const deCampo = libres.filter((j) => grupoDe(j.position) !== 'Portero');
    llenar(linea, deCampo, true);
    llenar(linea, [...libres], true);
  }

  const titulares = LINEAS.flatMap((l) => lineas[l]);
  const promedio = titulares.length
    ? (titulares.reduce((s, p) => s + (p.jugador.rating ?? 0), 0) / titulares.length).toFixed(1)
    : '0.0';
  const banca = [...libres].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name));

  return { lineas, banca, promedio };
}
