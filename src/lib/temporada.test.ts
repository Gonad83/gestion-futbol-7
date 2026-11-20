import { describe, expect, it } from 'vitest';
import { confiabilidad, resumenTemporada, sugerenciasNivel, type DatosTemporada, type PartidoT } from './temporada';

const partido = (n: number, ga: number | null = null, gb: number | null = null): PartidoT =>
  ({ id: `m${n}`, date: `2026-0${Math.min(9, n)}-10T23:00:00Z`, goles_a: ga, goles_b: gb });

const base = (extra: Partial<DatosTemporada> = {}): DatosTemporada => ({
  partidos: [], asistencia: [], armados: [], stats: [], mvps: [],
  jugadores: [
    { id: 'j1', name: 'Ana', rating: 4, created_at: '2026-01-01', status: 'Activo' },
    { id: 'j2', name: 'Beto', nickname: 'Bet', rating: 4, created_at: '2026-01-01', status: 'Activo' },
  ],
  ...extra,
});

describe('confiabilidad', () => {
  it('sin 3 partidos no hay índice', () => {
    const d = base({ partidos: [partido(1), partido(2)] });
    expect(confiabilidad(d, d.jugadores[0])).toBeNull();
  });

  it('descuenta las bajas de última hora', () => {
    const partidos = [1, 2, 3, 4].map((n) => partido(n));
    const d = base({
      partidos,
      asistencia: [
        { match_id: 'm1', player_id: 'j1', status: 'Voy', updated_at: '2026-01-05T00:00:00Z' },
        { match_id: 'm2', player_id: 'j1', status: 'Voy', updated_at: '2026-02-05T00:00:00Z' },
        { match_id: 'm3', player_id: 'j1', status: 'No voy', updated_at: '2026-03-10T20:00:00Z' }, // 3 h antes
        // m4 sin responder (otro sí respondió: el partido cuenta)
        { match_id: 'm4', player_id: 'j2', status: 'Voy', updated_at: null },
      ],
    });
    const c = confiabilidad(d, d.jugadores[0])!;
    expect(c).toMatchObject({ partidos: 4, respondidas: 3, ultimaHora: 1, puntaje: 65, nivel: 'media' });
  });

  it('no cuenta partidos en que nadie respondió (duplicados o no jugados)', () => {
    const voy = (m: string) => ({ match_id: m, player_id: 'j1', status: 'Voy', updated_at: null });
    const d = base({ partidos: [1, 2, 3, 4].map((n) => partido(n)), asistencia: [voy('m1'), voy('m2'), voy('m3')] });
    expect(confiabilidad(d, d.jugadores[0])).toMatchObject({ partidos: 3, respondidas: 3, puntaje: 100 });
  });

  it('no cuenta partidos de antes de entrar al equipo', () => {
    const d = base({ partidos: [1, 2, 3, 4, 5].map((n) => partido(n)) });
    const nuevo = { id: 'j3', name: 'Cata', created_at: '2026-04-01' };
    expect(confiabilidad(d, nuevo)).toBeNull(); // solo m4 y m5
  });
});

describe('sugerenciasNivel', () => {
  it('sube al que gana casi siempre y baja al que pierde', () => {
    const partidos = [1, 2, 3, 4, 5].map((n) => partido(n, 3, 1));
    const armados = partidos.map((p) => ({ match_id: p.id, a: ['j1'], b: ['j2'] }));
    const s = sugerenciasNivel(base({ partidos, armados }));
    expect(s.map((x) => [x.jugador.id, x.actual, x.sugerido])).toEqual([['j1', 4, 5], ['j2', 4, 3]]);
  });

  it('con pocos partidos no sugiere nada, y la planilla manda sobre el armado', () => {
    const partidos = [1, 2, 3, 4, 5].map((n) => partido(n, 2, 0));
    const armados = partidos.map((p) => ({ match_id: p.id, a: ['j1'], b: ['j2'] }));
    // En la planilla j2 jugó por A en dos partidos: queda 2 G / 3 P → 40%, sin cambio.
    const stats = ['m1', 'm2'].map((m) => ({ match_id: m, player_id: 'j2', equipo: 'A', goles: 0, asistencias: 0 }));
    const s = sugerenciasNivel(base({ partidos, armados, stats }));
    expect(s.map((x) => x.jugador.id)).toEqual(['j1']);
    expect(sugerenciasNivel(base({ partidos: partidos.slice(0, 4), armados }))).toEqual([]);
  });
});

describe('resumenTemporada', () => {
  it('suma partidos, goles, récord, racha y socio', () => {
    const partidos = [partido(1, 2, 1), partido(2, 0, 0), partido(3), partido(4, 1, 3), partido(5, 4, 0)];
    const voy = (m: string, j: string) => ({ match_id: m, player_id: j, status: 'Voy', updated_at: null });
    const d = base({
      partidos,
      asistencia: [voy('m1', 'j1'), voy('m2', 'j1'), voy('m4', 'j1'), voy('m5', 'j1'), { match_id: 'm3', player_id: 'j1', status: 'No voy', updated_at: null }],
      armados: ['m1', 'm2', 'm4', 'm5'].map((m) => ({ match_id: m, a: ['j1', 'j2'], b: ['x'] })),
      stats: [{ match_id: 'm1', player_id: 'j1', equipo: 'A', goles: 2, asistencias: 1 }, { match_id: 'm5', player_id: 'j1', equipo: 'A', goles: 1, asistencias: 0 }],
      mvps: [{ match_id: 'm5', player_id: 'j1' }],
    });
    expect(resumenTemporada(d, d.jugadores[0], 2026)).toEqual({
      anio: 2026, partidosEquipo: 5, jugados: 4, asistenciaPct: 80, goles: 3, asistencias: 1, mvps: 1,
      ganados: 2, empatados: 1, perdidos: 1, mejorRacha: 2, mesTop: 'enero', socio: { nombre: 'Bet', veces: 4 },
    });
  });

  it('un año sin partidos queda en cero', () => {
    const r = resumenTemporada(base({ partidos: [partido(1)] }), { id: 'j1', name: 'Ana' }, 2025);
    expect(r).toMatchObject({ partidosEquipo: 0, jugados: 0, asistenciaPct: 0, mesTop: null, socio: null });
  });
});
