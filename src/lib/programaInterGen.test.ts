import { describe, expect, it } from 'vitest';
import { PROGRAMAS, asignarCuartos, calcularTorneo, partidosDe, type FilaTabla, type Resultado } from './programaInterGen';

const fila = (equipo: string, grupo: string): FilaTabla => ({
  equipo, grupo, generacion: 2000, puesto: 1, pj: 3, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0, amarillas: 0,
});

const res = (match_code: string, home_goals: number, away_goals: number, penalty_winner: Resultado['penalty_winner'] = null): Resultado =>
  ({ match_code, home_goals, away_goals, home_yellows: 0, away_yellows: 0, penalty_winner });

describe('asignarCuartos', () => {
  it('reproduce el ejemplo del programa oficial', () => {
    // Ranking: 1A 2B 3C 4A 5B 6C 7B 8A
    const ranking = ['A', 'B', 'C', 'A', 'B', 'C', 'B', 'A'].map((g, i) => fila(`${i + 1}${g}`, g));
    const rivales = asignarCuartos(ranking).map(f => f.equipo);
    // Q1: 1A vs 7B · Q3: 2B vs 8A · Q4: 3C vs 5B · Q2: 4A vs 6C
    expect(rivales).toEqual(['7B', '8A', '5B', '6C']);
  });

  it('sin choques de grupo deja el cuadro normal', () => {
    const ranking = ['A', 'B', 'C', 'A', 'C', 'A', 'C', 'B'].map((g, i) => fila(`${i + 1}${g}`, g));
    expect(asignarCuartos(ranking).map(f => f.equipo)).toEqual(['8B', '7C', '6A', '5C']);
  });
});

describe('calcularTorneo', () => {
  const programa = PROGRAMAS[2026];

  it('sin resultados no hay cruces y las tablas siguen el sorteo', () => {
    const t = calcularTorneo(programa, new Map());
    expect(t.gruposCompletos).toBe(false);
    expect(t.totalGrupos).toBe(18);
    expect(t.cruces.Q1).toBeUndefined();
    expect(t.tablas[0].filas.map(f => f.equipo)).toEqual(['Deportes Croto', 'G16', 'Real Ebolo', 'Centenario FC']);
  });

  it('suma puntos y ordena la tabla', () => {
    const t = calcularTorneo(programa, new Map([['P4', res('P4', 1, 3)], ['P9', res('P9', 2, 2)]]));
    const ebolo = t.tablas[0].filas[0];
    expect(ebolo).toMatchObject({ equipo: 'Real Ebolo', pj: 2, g: 1, e: 1, pts: 4, gf: 5, gc: 3, dg: 2 });
  });

  it('con los grupos cerrados arma copas y avanza a los ganadores', () => {
    // Gana siempre el local: 1 a 0.
    const m = new Map(partidosDe(programa).filter(p => p.local).map(p => [p.codigo, res(p.codigo, 1, 0)]));
    const t = calcularTorneo(programa, m);
    expect(t.gruposCompletos).toBe(true);
    expect(t.rankingOro).toHaveLength(8);
    expect(t.rankingPlata).toHaveLength(4);
    // Los 4.º de cada grupo y un solo tercero van a Plata.
    expect(t.rankingPlata.filter(f => f.puesto === 4)).toHaveLength(3);
    expect(t.rankingPlata.filter(f => f.puesto === 3)).toHaveLength(1);
    for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
      const { local, visita } = t.cruces[q];
      const grupoDe = (n?: string) => t.rankingOro.find(f => f.equipo === n)!.grupo;
      expect(grupoDe(local)).not.toBe(grupoDe(visita));
    }
    const equiposCuartos = ['Q1', 'Q2', 'Q3', 'Q4'].flatMap(q => [t.cruces[q].local, t.cruces[q].visita]);
    expect(new Set(equiposCuartos).size).toBe(8);

    expect(t.cruces.S1).toEqual({ local: undefined, visita: undefined });
    m.set('Q1', res('Q1', 2, 0));
    m.set('Q2', res('Q2', 1, 1, 'visita'));
    const t2 = calcularTorneo(programa, m);
    expect(t2.cruces.S1).toEqual({ local: t2.cruces.Q1.local, visita: t2.cruces.Q2.visita });
  });
});
