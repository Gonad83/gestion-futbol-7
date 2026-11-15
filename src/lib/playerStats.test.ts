import { describe, expect, it } from 'vitest';
import { MAX_STARS, ratingFromSubStats, subStat } from './playerStats';

const valores = (forma: number, tecnica: number, vision: number, ataque: number, defensa: number) => ({
  forma, tecnica, vision, ataque, defensa,
});

describe('ratingFromSubStats', () => {
  it('es el promedio redondeado de las cinco sub-estrellas', () => {
    expect(ratingFromSubStats(valores(5, 5, 5, 5, 5))).toBe(5);
    expect(ratingFromSubStats(valores(7, 6, 5, 4, 3))).toBe(5);
    expect(ratingFromSubStats(valores(4, 4, 4, 5, 5))).toBe(4); // 4,4
    expect(ratingFromSubStats(valores(4, 4, 5, 5, 5))).toBe(5); // 4,6
  });

  it('nunca baja de 1 ni pasa del máximo', () => {
    expect(ratingFromSubStats(valores(0, 0, 0, 0, 0))).toBe(1);
    expect(ratingFromSubStats(valores(9, 9, 9, 9, 9))).toBe(MAX_STARS);
  });
});

describe('subStat', () => {
  it('usa la sub-estrella cuando el jugador la tiene', () => {
    expect(subStat({ rating: 4, ataque: 6 }, 'ataque')).toBe(6);
  });

  it('cae al rating general cuando falta, y a 0 sin jugador', () => {
    expect(subStat({ rating: 4, ataque: null }, 'ataque')).toBe(4);
    expect(subStat({ rating: 4 }, 'defensa')).toBe(4);
    expect(subStat(null, 'forma')).toBe(0);
  });

  it('respeta una sub-estrella que vale 0', () => {
    expect(subStat({ rating: 4, vision: 0 }, 'vision')).toBe(0);
  });
});
