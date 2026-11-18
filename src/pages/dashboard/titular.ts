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
  /** Número de puesto dentro de la formación (0 = arquero). */
  indice: number;
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

/** Lo que el capitán dejó armado a mano: la formación y quién va en cada puesto. */
export interface TitularGuardado {
  formacion: string;
  /** Ids por puesto, del arco hacia adelante (el orden de `puestosDe`). */
  puestos: (string | null)[];
}

/** La línea de cada puesto de la formación, del arco hacia adelante. */
export function puestosDe(formacion: string): Linea[] {
  const cupos = cuposPorLinea(formacion);
  return LINEAS.flatMap((l) => Array<Linea>(cupos[l]).fill(l));
}

/**
 * Arma el titular con los jugadores activos.
 * 0. Los puestos fijados a mano (`fijos`) se respetan si el jugador sigue disponible.
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
  fijos: (string | null)[] = [],
): Titular<T> {
  const puestos = puestosDe(formacion);
  const libres = jugadores.filter((j) => !j.status || j.status === 'Activo');
  const elegidos: (T | null)[] = puestos.map(() => null);

  const valor = (j: T, linea: Linea) => (j.rating ?? 0) * 10 + (j[DESEMPATE[linea]] ?? j.rating ?? 0);
  const mejores = (linea: Linea) => (a: T, b: T) =>
    valor(b, linea) - valor(a, linea) || (partidos[b.id] ?? 0) - (partidos[a.id] ?? 0) || a.name.localeCompare(b.name);
  const poner = (i: number, jugador: T) => {
    elegidos[i] = jugador;
    libres.splice(libres.indexOf(jugador), 1);
  };

  puestos.forEach((_, i) => {
    const fijo = fijos[i] ? libres.find((j) => j.id === fijos[i]) : undefined;
    if (fijo) poner(i, fijo);
  });

  /** Llena los puestos vacíos de una línea con los mejores candidatos. */
  const llenar = (linea: Linea, candidatos: T[]) => {
    const orden = candidatos.sort(mejores(linea));
    puestos.forEach((l, i) => {
      if (l === linea && !elegidos[i] && orden.length > 0) poner(i, orden.shift()!);
    });
  };

  for (const linea of LINEAS) llenar(linea, libres.filter((j) => grupoDe(j.position) === linea));
  for (const linea of LINEAS) llenar(linea, libres.filter((j) => grupoDe(j.secondary_position) === linea));
  for (const linea of LINEAS) {
    llenar(linea, libres.filter((j) => grupoDe(j.position) !== 'Portero'));
    llenar(linea, [...libres]);
  }

  const lineas: Record<Linea, Puesto<T>[]> = { Portero: [], Defensa: [], Medio: [], Delantero: [] };
  elegidos.forEach((jugador, i) => {
    if (!jugador) return;
    const linea = puestos[i];
    lineas[linea].push({
      jugador, linea, indice: i,
      fueraDePuesto: grupoDe(jugador.position) !== linea && grupoDe(jugador.secondary_position) !== linea,
    });
  });

  const titulares = LINEAS.flatMap((l) => lineas[l]);
  const promedio = titulares.length
    ? (titulares.reduce((s, p) => s + (p.jugador.rating ?? 0), 0) / titulares.length).toFixed(1)
    : '0.0';
  const banca = [...libres].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name));

  return { lineas, banca, promedio };
}

/**
 * Intercambia dos jugadores y devuelve los puestos que quedan fijados.
 * Sirve entre dos titulares (rotan de puesto) y entre un titular y uno de la
 * banca (el de la banca entra en ese puesto). Entre dos de la banca no cambia nada.
 */
export function intercambiarPuestos<T extends JugadorTitular>(titular: Titular<T>, formacion: string, idA: string, idB: string): (string | null)[] {
  const ids: (string | null)[] = puestosDe(formacion).map(() => null);
  LINEAS.flatMap((l) => titular.lineas[l]).forEach((p) => { ids[p.indice] = p.jugador.id; });
  const a = ids.indexOf(idA);
  const b = ids.indexOf(idB);
  if (a >= 0) ids[a] = idB;
  if (b >= 0) ids[b] = idA;
  return ids;
}
