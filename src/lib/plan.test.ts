import { describe, expect, it } from 'vitest';
import { diasParaVencer, planVigente } from './plan';

const hoy = new Date('2026-11-16T12:00:00Z');

describe('planVigente', () => {
  it('mantiene el plan pagado mientras no venza', () => {
    expect(planVigente('monthly', '2026-12-16T12:00:00Z', hoy)).toBe('monthly');
    expect(planVigente('annual', '2027-11-16T12:00:00Z', hoy)).toBe('annual');
  });
  it('vuelve a gratis cuando el plan venció', () => {
    expect(planVigente('monthly', '2026-11-16T11:59:59Z', hoy)).toBe('free');
  });
  it('no vence si no hay fecha, y trata el plan vacío como gratis', () => {
    expect(planVigente('annual', null, hoy)).toBe('annual');
    expect(planVigente(null, null, hoy)).toBe('free');
    expect(planVigente('free', '2020-01-01T00:00:00Z', hoy)).toBe('free');
  });
});

describe('diasParaVencer', () => {
  it('cuenta los días que faltan o que pasaron', () => {
    expect(diasParaVencer('2026-11-19T12:00:00Z', hoy)).toBe(3);
    expect(diasParaVencer('2026-11-14T12:00:00Z', hoy)).toBe(-2);
    expect(diasParaVencer(null, hoy)).toBeNull();
  });
});
