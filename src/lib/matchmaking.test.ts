import { describe, expect, it } from 'vitest';
import {
  FORMATIONS,
  armarEquipos,
  datosListaFinal,
  esInvitado,
  esInvitadoTemporal,
  esPartidoPorJugar,
  formacionesPara,
  getAvg,
  getPosition,
  posicionVertical,
  intercambiar,
  nombreDeInvitado,
  textoAsistencia,
  textoEquipos,
  type JugadorMM, formatoHabitual, formacionesDe } from './matchmaking';

const j = (id: string, rating: number, position = 'Mediocampista', extra: Partial<JugadorMM> = {}): JugadorMM => ({
  id, name: `Jugador ${id}`, rating, position, ...extra,
});
const suma = (equipo: JugadorMM[]) => equipo.reduce((a, p) => a + p.rating, 0);
const ids = (equipo: JugadorMM[]) => equipo.map((p) => p.id);

describe('armarEquipos', () => {
  const plantel = [
    j('g1', 6, 'Portero'), j('g2', 4, 'Arquero'),
    j('a', 7), j('b', 7), j('c', 6), j('d', 5), j('e', 5), j('f', 4), j('g', 3), j('h', 3), j('i', 2), j('k', 1),
  ];

  it.each([[0.1], [0.9]])('reparte a todos, sin repetir, en dos equipos del mismo tamaño (sorteo %s)', (valor) => {
    const { teamA, teamB } = armarEquipos(plantel, () => valor);
    expect([...ids(teamA), ...ids(teamB)].sort()).toEqual(ids(plantel).sort());
    expect(teamA).toHaveLength(6);
    expect(teamB).toHaveLength(6);
  });

  it('pone un arquero en cada equipo, el mejor en el A', () => {
    const { teamA, teamB } = armarEquipos(plantel, () => 0.1);
    expect(teamA[0].id).toBe('g1');
    expect(teamB[0].id).toBe('g2');
  });

  it('deja los equipos parejos aunque el sorteo favorezca siempre al mismo lado', () => {
    for (const valor of [0, 0.3, 0.6, 0.99]) {
      const { teamA, teamB } = armarEquipos(plantel, () => valor);
      expect(Math.abs(suma(teamA) - suma(teamB))).toBeLessThanOrEqual(3);
    }
  });

  it('con número impar, el que sobra va al equipo que va abajo', () => {
    const { teamA, teamB } = armarEquipos([j('a', 7), j('b', 5), j('c', 4)], () => 0.9);
    // a→A, b→B; c va a B, que suma menos.
    expect(ids(teamA)).toEqual(['a']);
    expect(ids(teamB)).toEqual(['b', 'c']);
  });

  it('no modifica la lista original', () => {
    const copia = plantel.map((p) => p.id);
    armarEquipos(plantel);
    expect(ids(plantel)).toEqual(copia);
  });
});

describe('formaciones y posiciones', () => {
  it('ofrece formaciones según cuántos confirmados hay', () => {
    expect(formacionesPara(10)).toBe(FORMATIONS['5vs5']);
    expect(formacionesPara(12)).toBe(FORMATIONS['6vs6']);
    expect(formacionesPara(14)).toBe(FORMATIONS['7vs7']);
    expect(formacionesPara(18)).toBe(FORMATIONS['11vs11']);
  });

  it('cada formación suma los jugadores de campo de su modalidad', () => {
    const jugadoresDeCampo = { '5vs5': 4, '6vs6': 5, '7vs7': 6, '11vs11': 10 } as const;
    for (const [modalidad, formaciones] of Object.entries(FORMATIONS)) {
      for (const f of formaciones) {
        const total = f.value.split('-').map(Number).reduce((a, b) => a + b, 0);
        expect(total, `${modalidad} ${f.name}`).toBe(jugadoresDeCampo[modalidad as keyof typeof jugadoresDeCampo]);
      }
    }
  });

  it('el arquero va al fondo de su lado y los equipos quedan en mitades opuestas', () => {
    const arqueroA = getPosition(0, 'A', 7, '3-2-1');
    const arqueroB = getPosition(0, 'B', 7, '3-2-1');
    expect(arqueroA).toMatchObject({ left: '5%', top: '50%' });
    expect(arqueroB).toMatchObject({ left: '95%', top: '50%' });
    for (let i = 0; i < 7; i++) {
      expect(parseFloat(getPosition(i, 'A', 7, '3-2-1').left)).toBeLessThan(50);
      expect(parseFloat(getPosition(i, 'B', 7, '3-2-1').left)).toBeGreaterThan(50);
    }
  });

  it('nadie queda encima de otro dentro del mismo equipo', () => {
    const puestos = Array.from({ length: 7 }, (_, i) => getPosition(i, 'A', 7, '3-2-1')).map((p) => `${p.left}/${p.top}`);
    expect(new Set(puestos).size).toBe(7);
  });

  it('los que no caben en la formación van a la banca, abajo', () => {
    expect(getPosition(7, 'A', 9, '3-2-1')).toMatchObject({ left: '15%', bottom: '2%' });
    expect(getPosition(8, 'B', 9, '3-2-1')).toMatchObject({ left: '73%', bottom: '2%' });
  });

  it('promedio con un decimal y 0.0 para un equipo vacío', () => {
    expect(getAvg([j('a', 5), j('b', 6)])).toBe('5.5');
    expect(getAvg([])).toBe('0.0');
  });
});

describe('cancha vertical del celular', () => {
  it('arqueros en los extremos: B arriba, A abajo', () => {
    expect(posicionVertical(0, 'A', '3-2-1')).toEqual({ left: '50%', top: '91%' });
    expect(posicionVertical(0, 'B', '3-2-1')).toEqual({ left: '50%', top: '9%' });
  });

  it('cada equipo en su mitad, con espacio libre al medio', () => {
    for (let i = 0; i < 7; i++) {
      expect(parseFloat(posicionVertical(i, 'A', '3-2-1')!.top)).toBeGreaterThanOrEqual(58);
      expect(parseFloat(posicionVertical(i, 'B', '2-3-1')!.top)).toBeLessThanOrEqual(42);
    }
  });

  it('nadie encima de otro y los de más van a la banca', () => {
    const puestos = Array.from({ length: 7 }, (_, i) => posicionVertical(i, 'A', '3-2-1')).map((p) => `${p!.left}/${p!.top}`);
    expect(new Set(puestos).size).toBe(7);
    expect(posicionVertical(7, 'A', '3-2-1')).toBeNull();
  });
});

describe('intercambiar', () => {
  const A = [j('a1', 5), j('a2', 4)];
  const B = [j('b1', 6), j('b2', 3)];

  it('cambia jugadores entre equipos sin tocar las listas originales', () => {
    const r = intercambiar(A, B, { team: 'A', index: 0 }, { team: 'B', index: 1 });
    expect(ids(r.teamA)).toEqual(['b2', 'a2']);
    expect(ids(r.teamB)).toEqual(['b1', 'a1']);
    expect(ids(A)).toEqual(['a1', 'a2']);
  });

  it('cambia de puesto a dos jugadores del mismo equipo', () => {
    const r = intercambiar(A, B, { team: 'B', index: 0 }, { team: 'B', index: 1 });
    expect(ids(r.teamB)).toEqual(['b2', 'b1']);
    expect(ids(r.teamA)).toEqual(['a1', 'a2']);
  });
});

describe('invitados y partidos', () => {
  it('reconoce invitados por la marca o por el (I) del nombre', () => {
    expect(esInvitado(j('x', 5, 'Invitado', { isGuest: true }))).toBe(true);
    expect(esInvitado(j('x', 5, 'Invitado', { name: 'Pedro (I)' }))).toBe(true);
    expect(esInvitado(j('x', 5))).toBe(false);
    expect(esInvitadoTemporal('guest-1700000000')).toBe(true);
    expect(esInvitadoTemporal('3f2c-uuid')).toBe(false);
  });

  it('el nombre de un invitado termina en (I) una sola vez', () => {
    expect(nombreDeInvitado('  Pedro ')).toBe('Pedro (I)');
    expect(nombreDeInvitado('Pedro (I)')).toBe('Pedro (I)');
    expect(nombreDeInvitado('Pedro (i)')).toBe('Pedro (i)');
  });

  it('solo se edita un partido programado que aún no se juega', () => {
    const ahora = new Date('2026-05-15T12:00:00Z').getTime();
    expect(esPartidoPorJugar({ id: '1', date: '2026-05-16T20:00:00Z', status: 'Programado' }, ahora)).toBe(true);
    expect(esPartidoPorJugar({ id: '1', date: '2026-05-14T20:00:00Z', status: 'Programado' }, ahora)).toBe(false);
    expect(esPartidoPorJugar({ id: '1', date: '2026-05-16T20:00:00Z', status: 'Cancelado' }, ahora)).toBe(false);
    expect(esPartidoPorJugar(undefined, ahora)).toBe(false);
  });
});

describe('textos para compartir', () => {
  const partido = { id: 'm1', date: '2026-05-16T20:00:00', location: 'Cancha 3', status: 'Programado' };
  const A = [j('a', 6, 'Delantero', { name: 'Ana' }), j('i', 5, 'Invitado', { name: 'Pedro (I)', isGuest: true })];
  const B = [j('b', 4, 'Defensa', { name: 'Beto', notify: false })];

  it('equipos: nombre, cancha, camisetas, posiciones y promedio', () => {
    const texto = textoEquipos('Los Cóndores', partido, { teamA: A, teamB: B, colorA: 'blue', colorB: 'white' });
    expect(texto).toContain('⚽ *Los Cóndores — Equipos del partido*');
    expect(texto).toContain('📍 Cancha 3');
    expect(texto).toContain('🟦 *EQUIPO A — Camiseta Azul (2 jugadores):*');
    expect(texto).toContain('1. Ana — Delantero');
    expect(texto).toContain('2. Pedro — Invitado');
    expect(texto).toContain('⬜ *EQUIPO B — Camiseta Blanco (1 jugadores):*');
    expect(texto).toContain('⭐ Rating prom: 5.5');
  });

  it('asistencia: van, no van y sin respuesta', () => {
    const activos = [A[0], B[0], j('c', 3, 'Defensa', { name: 'Caro' })];
    const texto = textoAsistencia('Los Cóndores', partido, A, [B[0]], activos);
    expect(texto).toContain('✅ *Confirmados (2):*\n1. Ana\n2. Pedro (Invitado)');
    expect(texto).toContain('❌ *No asisten (1):*\n• Beto');
    expect(texto).toContain('⏳ *Sin respuesta (1):*\n• Caro');
    expect(texto).toContain('_Total activos: 3_');
  });

  it('lista final: no nombra a quien pidió no recibir avisos, pero sí a los invitados', () => {
    const datos = datosListaFinal(partido, { teamA: A, teamB: B, colorA: 'blue', colorB: 'white', formationA: '3-2-1', formationB: '2-3-1' });
    expect(datos).toMatchObject({
      type: 'final_list', match_date: '16/05/2026 20:00', match_location: 'Cancha 3',
      team_a_names: '⚽ Ana\n⚽ Pedro (Invitado)', team_b_names: '', team_a_color: 'Azul', team_b_color: 'Blanco',
    });
    expect(datos.raw_data.formationB).toBe('2-3-1');
    expect(datosListaFinal(undefined, { teamA: [], teamB: [], colorA: 'x', colorB: 'y', formationA: '', formationB: '' }))
      .toMatchObject({ match_date: 'Próximo partido', match_location: 'Cancha habitual', team_a_color: 'x' });
  });
});

describe('formatoHabitual', () => {
  it('elige el formato más jugado aunque el preferido diga otra cosa', () => {
    expect(formatoHabitual(['5vs5', '7vs7', '5vs5', '5vs5'], '7vs7')).toBe('5vs5');
  });
  it('en empate gana el más reciente', () => {
    expect(formatoHabitual(['7vs7', '5vs5', '5vs5', '7vs7'])).toBe('7vs7');
  });
  it('sin partidos usa el preferido y, si no sirve, 7vs7', () => {
    expect(formatoHabitual([], '11vs11')).toBe('11vs11');
    expect(formatoHabitual([null, 'raro'], 'Todos')).toBe('7vs7');
  });
});

describe('formacionesDe', () => {
  it('5vs5 usa formaciones de cuatro jugadores de campo', () => {
    expect(formacionesDe('5vs5').every((f) => f.value.split('-').reduce((a, b) => a + Number(b), 0) === 4)).toBe(true);
    expect(formacionesDe(undefined)[0].value).toBe('3-2-1');
  });
});
