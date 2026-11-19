import { describe, expect, it, vi } from 'vitest';

vi.mock('../supabase', () => ({ supabase: {} }));

import { armarPlanilla, avisoDescuadre, rankingGoleadores, type FilaPlanilla } from './resultado';

const j = (id: string, extra = {}) => ({ id, name: `Jugador ${id}`, nickname: null, photo_url: null, ...extra });
const plantel = new Map(['a', 'b', 'c', 'd', 'e'].map((id) => [id, j(id)]));

describe('armarPlanilla', () => {
  it('toma el lado de los equipos armados y deja fuera a los invitados', () => {
    const filas = armarPlanilla([j('a'), j('x', { isGuest: true })], [j('b')], [], [], plantel);
    expect(filas.map((f) => `${f.player_id}:${f.equipo}`)).toEqual(['a:A', 'b:B']);
  });

  it('suma a quienes confirmaron sin estar en un equipo armado, sin lado', () => {
    const filas = armarPlanilla([j('a')], [j('b')], [j('a'), j('c')], [], plantel);
    expect(filas.map((f) => `${f.player_id}:${f.equipo ?? '-'}`)).toEqual(['a:A', 'b:B', 'c:-']);
  });

  it('lo ya guardado manda sobre el armado, y no repite jugadores', () => {
    const filas = armarPlanilla([j('a')], [j('b')], [j('a')], [{ player_id: 'a', equipo: 'B', goles: 2, asistencias: 1 }], plantel);
    expect(filas).toHaveLength(2);
    expect(filas.find((f) => f.player_id === 'a')).toMatchObject({ equipo: 'B', goles: 2, asistencias: 1 });
  });

  it('ignora a quien ya no está en el plantel', () => {
    expect(armarPlanilla([j('zz')], [], [], [], plantel)).toEqual([]);
  });
});

describe('avisoDescuadre', () => {
  const fila = (equipo: 'A' | 'B', goles: number): FilaPlanilla => ({ player_id: equipo + goles, name: '', nickname: null, photo_url: null, equipo, goles, asistencias: 0 });

  it('acepta una planilla con menos goles que el marcador (goles sin anotar)', () => {
    expect(avisoDescuadre(3, 1, [fila('A', 2)])).toBeNull();
  });

  it('avisa si la planilla tiene más goles que el marcador', () => {
    expect(avisoDescuadre(1, 0, [fila('A', 2)])).toMatch(/más goles/);
  });
});

describe('rankingGoleadores', () => {
  it('ordena por goles, luego asistencias, y cuenta partidos', () => {
    const stats = [
      { player_id: 'a', equipo: 'A', goles: 2, asistencias: 0 },
      { player_id: 'b', equipo: 'B', goles: 2, asistencias: 3 },
      { player_id: 'a', equipo: 'A', goles: 1, asistencias: 0 },
      { player_id: 'c', equipo: 'A', goles: 0, asistencias: 0 },
    ];
    const r = rankingGoleadores(stats, [...plantel.values()]);
    expect(r.map((g) => `${g.id} ${g.goles}g ${g.asistencias}a ${g.partidos}p`)).toEqual(['a 3g 0a 2p', 'b 2g 3a 1p']);
  });
});
