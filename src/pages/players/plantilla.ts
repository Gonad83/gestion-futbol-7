/** Datos y reglas de la pantalla Plantilla (sin dibujo, para poder probarlas). */

export interface JugadorPlantilla {
  id: string;
  name: string;
  nickname?: string | null;
  position?: string | null;
  secondary_position?: string | null;
  status: string;
  rating?: number | null;
  photo_url?: string | null;
  matchesPlayed: number;
  participationPct: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [campo: string]: any;
}

export type GrupoId = 'Portero' | 'Defensa' | 'Medio' | 'Delantero' | 'Otro';

export const GRUPOS: { id: GrupoId; plural: string }[] = [
  { id: 'Portero', plural: 'Arqueros' },
  { id: 'Defensa', plural: 'Defensas' },
  { id: 'Medio', plural: 'Medios' },
  { id: 'Delantero', plural: 'Delanteros' },
  { id: 'Otro', plural: 'Otros' },
];

export function grupoDe(pos?: string | null): GrupoId {
  if (!pos) return 'Otro';
  if (pos.includes('Portero') || pos.includes('Arco') || pos.includes('Arquero')) return 'Portero';
  if (pos.includes('Defensa') || pos.includes('Lateral') || pos.includes('Central')) return 'Defensa';
  if (pos.includes('Medio') || pos.includes('Volante') || pos.includes('Enganche') || pos.includes('Interior')) return 'Medio';
  if (pos.includes('Delantero') || pos.includes('Extremo') || pos.includes('Punta')) return 'Delantero';
  return 'Otro';
}

/** Verde 70% o más, dorado 40-69%, rojo bajo 40%. */
export const colorAsistencia = (pct: number) => (pct >= 70 ? '#44f3a9' : pct >= 40 ? '#ffd08b' : '#f87171');

export const iniciales = (nombre: string) =>
  nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?';

/** Filtra por grupo de posición y por texto (nombre o apodo, sin importar tildes ni mayúsculas). */
export function filtrarPlantilla(jugadores: JugadorPlantilla[], grupo: GrupoId | 'Todos', texto: string) {
  const limpio = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const buscado = limpio(texto.trim());
  return jugadores.filter(j =>
    (grupo === 'Todos' || grupoDe(j.position) === grupo) &&
    (!buscado || limpio(`${j.name} ${j.nickname ?? ''}`).includes(buscado)));
}
