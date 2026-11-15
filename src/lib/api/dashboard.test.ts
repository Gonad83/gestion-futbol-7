import { describe, expect, it, vi } from 'vitest';

// Estas pruebas solo usan las cuentas; no se conectan a Supabase.
vi.mock('../supabase', () => ({ supabase: {}, withTimeout: (p: Promise<unknown>) => p }));

import {
  calcularMorosos,
  cierreDeVotacion,
  contarVotos,
  rankingMvp,
  rankingParticipaciones,
  unirAsistencia,
  type GanadorMvp,
  type JugadorDash,
  type PagoDash,
} from './dashboard';

const jugador = (id: string, extra: Partial<JugadorDash> = {}): JugadorDash => ({
  id, name: `Jugador ${id}`, nickname: null, status: 'Activo', photo_url: null, user_id: null, position: null, match_role: null, ...extra,
});
const pago = (player_id: string, month: number, year: number, status: string): PagoDash => ({ player_id, month, year, status, amount: 5000 });
const meses = (m: { pendingPayments: PagoDash[] }) => m.pendingPayments.map((p) => `${p.year}-${p.month}`);

/** 15 de mayo de 2026. */
const HOY = new Date(2026, 4, 15);

describe('calcularMorosos', () => {
  it('quien pagó el mes en curso y no debe meses anteriores no aparece', () => {
    expect(calcularMorosos([jugador('a')], [pago('a', 5, 2026, 'Pagado')], HOY)).toEqual([]);
  });

  it('sin fila para el mes en curso, igual queda como pendiente', () => {
    const [m] = calcularMorosos([jugador('a')], [], HOY);
    expect(meses(m)).toEqual(['2026-5']);
  });

  it('lista los meses pendientes del más antiguo al más nuevo, sin repetir', () => {
    const pagos = [pago('a', 5, 2026, 'Pendiente'), pago('a', 3, 2026, 'Pendiente'), pago('a', 3, 2026, 'Pendiente'), pago('a', 11, 2025, 'Pendiente')];
    const [m] = calcularMorosos([jugador('a')], pagos, HOY);
    expect(meses(m)).toEqual(['2025-11', '2026-3', '2026-5']);
  });

  it('no cuenta meses futuros, exentos, ya pagados, ni enero y febrero', () => {
    const pagos = [
      pago('a', 6, 2026, 'Pendiente'), // futuro
      pago('a', 4, 2026, 'Exento'),
      pago('a', 3, 2026, 'Pendiente'), pago('a', 3, 2026, 'Pagado'), // pagado gana
      pago('a', 2, 2026, 'Pendiente'), // febrero no se cobra
      pago('a', 5, 2026, 'Pagado'),
    ];
    expect(calcularMorosos([jugador('a')], pagos, HOY)).toEqual([]);
  });

  it('un mes exento en curso no genera deuda', () => {
    expect(calcularMorosos([jugador('a')], [pago('a', 5, 2026, 'Exento')], HOY)).toEqual([]);
  });

  it('en enero y febrero nadie queda pendiente por el mes en curso', () => {
    expect(calcularMorosos([jugador('a')], [], new Date(2026, 1, 10))).toEqual([]);
  });

  it('los pagos de otro jugador no se mezclan', () => {
    const morosos = calcularMorosos([jugador('a'), jugador('b')], [pago('a', 5, 2026, 'Pagado')], HOY);
    expect(morosos.map((m) => m.id)).toEqual(['b']);
  });
});

describe('contarVotos', () => {
  it('ordena de más a menos votos e ignora votos vacíos', () => {
    const votos = ['a', 'b', 'a', null, 'c', 'a', 'b'].map((voted_player_id) => ({ voted_player_id }));
    expect(contarVotos(votos)).toEqual([['a', 3], ['b', 2], ['c', 1]]);
  });

  it('sin votos devuelve una lista vacía', () => {
    expect(contarVotos([])).toEqual([]);
    expect(contarVotos([{ voted_player_id: null }])).toEqual([]);
  });
});

describe('cierreDeVotacion', () => {
  it('un partido de miércoles cierra el domingo siguiente a las 23:59', () => {
    const cierre = cierreDeVotacion(new Date(2026, 4, 13, 20, 0)); // miércoles 13 de mayo
    expect([cierre.getFullYear(), cierre.getMonth(), cierre.getDate(), cierre.getHours(), cierre.getMinutes()]).toEqual([2026, 4, 17, 23, 59]);
  });

  it('un partido de domingo cierra ese mismo día', () => {
    const cierre = cierreDeVotacion(new Date(2026, 4, 17, 10, 0));
    expect(cierre.getDate()).toBe(17);
    expect(cierre.getHours()).toBe(23);
  });

  it('pasa bien de un mes al siguiente', () => {
    const cierre = cierreDeVotacion(new Date(2026, 4, 29, 20, 0)); // viernes 29 de mayo
    expect([cierre.getMonth(), cierre.getDate()]).toEqual([4, 31]);
    const otro = cierreDeVotacion(new Date(2026, 5, 30, 20, 0)); // martes 30 de junio
    expect([otro.getMonth(), otro.getDate()]).toEqual([6, 5]);
  });
});

describe('rankingParticipaciones', () => {
  it('incluye a todo el plantel, con 0 para quien no ha ido, y cuenta partidos distintos', () => {
    const asistencias = [
      { player_id: 'a', match_id: 'm1' }, { player_id: 'a', match_id: 'm2' }, { player_id: 'b', match_id: 'm1' },
    ];
    const { ranking, totalPartidos } = rankingParticipaciones([jugador('b'), jugador('c'), jugador('a', { nickname: 'El A' })], asistencias);
    expect(ranking.map((r) => [r.id, r.count])).toEqual([['a', 2], ['b', 1], ['c', 0]]);
    expect(ranking[0].nickname).toBe('El A');
    expect(totalPartidos).toBe(2);
  });
});

describe('rankingMvp', () => {
  it('cuenta victorias por jugador y deja como máximo cinco', () => {
    const g = (player_id: string): GanadorMvp => ({ player_id, player_name: player_id.toUpperCase(), player_photo_url: null, vote_count: 3, week_date: '2026-05-17', created_at: '' });
    const ranking = rankingMvp(['a', 'b', 'a', 'c', 'd', 'e', 'f', 'a', 'b'].map(g));
    expect(ranking).toHaveLength(5);
    expect(ranking.slice(0, 2).map((r) => [r.id, r.count, r.name])).toEqual([['a', 3, 'A'], ['b', 2, 'B']]);
  });
});

describe('unirAsistencia', () => {
  it('deja solo a los activos y marca "Pendiente" a quien no respondió', () => {
    const lista = unirAsistencia(
      [jugador('a'), jugador('b'), jugador('c', { status: 'Lesionado' })],
      [{ player_id: 'a', status: 'Voy' }, { player_id: 'c', status: 'Voy' }],
    );
    expect(lista.map((p) => [p.id, p.attendanceStatus])).toEqual([['a', 'Voy'], ['b', 'Pendiente']]);
  });
});
