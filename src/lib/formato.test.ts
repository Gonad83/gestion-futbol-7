import { describe, expect, it } from 'vitest';
import { mostrarTelefono, normalizarTelefono } from './formato';

describe('teléfono', () => {
  it('acepta los formatos comunes de un celular chileno', () => {
    for (const t of ['912345678', '9 1234 5678', '+56 9 1234 5678', '56912345678', '+56-9-1234-5678']) {
      expect(normalizarTelefono(t)).toBe('+56912345678');
    }
  });

  it('vacío es null y lo que no es número da error', () => {
    expect(normalizarTelefono('  ')).toBeNull();
    expect(normalizarTelefono(null)).toBeNull();
    expect(() => normalizarTelefono('123')).toThrow();
  });

  it('se muestra con espacios', () => {
    expect(mostrarTelefono('+56912345678')).toBe('+56 9 1234 5678');
    expect(mostrarTelefono('+5491122334455')).toBe('+5491122334455');
    expect(mostrarTelefono(null)).toBe('');
  });
});
