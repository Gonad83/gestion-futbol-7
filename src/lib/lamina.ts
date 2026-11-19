export type TonoLamina = 'oro' | 'plata' | 'bronce' | 'arquero';

/** Oro para los cracks (6-7 estrellas), plata para el medio (4-5), bronce el resto. */
export const tonoPorEstrellas = (estrellas?: number | null): TonoLamina =>
  !estrellas ? 'plata' : estrellas >= 6 ? 'oro' : estrellas >= 4 ? 'plata' : 'bronce';
