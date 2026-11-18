import { describe, expect, it } from 'vitest';
import { armarTitular, cuposPorLinea, intercambiarPuestos, type JugadorTitular } from './titular';

const j = (id: string, position: string, rating: number, extra: Partial<JugadorTitular> = {}): JugadorTitular => ({
  id, name: id, position, rating, status: 'Activo', ...extra,
});
const ids = (puestos: { jugador: JugadorTitular }[]) => puestos.map((p) => p.jugador.id);

describe('equipo titular', () => {
  it('reparte los cupos según la formación', () => {
    expect(cuposPorLinea('3-2-1')).toEqual({ Portero: 1, Defensa: 3, Medio: 2, Delantero: 1 });
    expect(cuposPorLinea('2-0-2')).toEqual({ Portero: 1, Defensa: 2, Medio: 0, Delantero: 2 });
    expect(cuposPorLinea('4-2-3-1')).toEqual({ Portero: 1, Defensa: 4, Medio: 5, Delantero: 1 });
  });

  it('pone a los mejores de cada posición y deja al resto en la banca', () => {
    const plantel = [
      j('arq1', 'Portero', 4), j('arq2', 'Portero', 6),
      j('def1', 'Defensa Central', 5), j('def2', 'Lateral Derecho', 7), j('def3', 'Lateral Izquierdo', 3), j('def4', 'Defensa Central', 6),
      j('med1', 'Medio Mixto (MC)', 6), j('med2', 'Volante Derecho', 4), j('med3', 'Enganche / 10 (MCO)', 7),
      j('del1', 'Delantero Centro (9)', 5), j('del2', 'Extremo Derecho', 6),
      j('lesionado', 'Delantero Centro (9)', 7, { status: 'Lesionado' }),
    ];
    const t = armarTitular(plantel, '3-2-1');
    expect(ids(t.lineas.Portero)).toEqual(['arq2']);
    expect(ids(t.lineas.Defensa)).toEqual(['def2', 'def4', 'def1']);
    expect(ids(t.lineas.Medio)).toEqual(['med3', 'med1']);
    expect(ids(t.lineas.Delantero)).toEqual(['del2']);
    expect(t.banca.map((p) => p.id)).toEqual(['del1', 'arq1', 'med2', 'def3']);
    expect(t.promedio).toBe('6.1');
  });

  it('desempata por la sub-estrella de la línea y luego por partidos jugados', () => {
    const plantel = [j('a', 'Delantero Centro (9)', 6, { ataque: 5 }), j('b', 'Segundo Delantero', 6, { ataque: 7 })];
    expect(ids(armarTitular(plantel, '3-2-1').lineas.Delantero)).toEqual(['b']);
    const iguales = [j('a', 'Delantero Centro (9)', 6), j('b', 'Segundo Delantero', 6)];
    expect(ids(armarTitular(iguales, '3-2-1', { a: 2, b: 9 }).lineas.Delantero)).toEqual(['b']);
  });

  it('llena los huecos con la posición secundaria y después con los mejores que queden', () => {
    const plantel = [
      j('arq', 'Portero', 5), j('arq2', 'Portero', 7),
      j('def', 'Defensa Central', 5),
      j('med1', 'Medio Mixto (MC)', 6), j('med2', 'Medio Mixto (MC)', 3, { secondary_position: 'Lateral Derecho' }), j('med3', 'Medio Mixto (MC)', 4),
      j('del1', 'Delantero Centro (9)', 6), j('del2', 'Extremo Derecho', 3),
    ];
    const t = armarTitular(plantel, '3-2-1');
    // med2 baja a la defensa por su posición secundaria; el último cupo es para un jugador de campo, no para el otro arquero.
    expect(t.lineas.Defensa.map((p) => [p.jugador.id, p.fueraDePuesto])).toEqual([['def', false], ['med2', false], ['del2', true]]);
    expect(ids(t.lineas.Medio)).toEqual(['med1', 'med3']);
    expect(ids(t.lineas.Delantero)).toEqual(['del1']);
    expect(t.banca.map((p) => p.id)).toEqual(['arq']);
  });

  it('respeta los puestos fijados a mano y rellena los que quedan libres', () => {
    const plantel = [
      j('arq', 'Portero', 5), j('def1', 'Defensa Central', 6), j('def2', 'Defensa Central', 5), j('def3', 'Defensa Central', 4),
      j('med1', 'Medio Mixto (MC)', 6), j('med2', 'Medio Mixto (MC)', 5), j('del1', 'Delantero Centro (9)', 6), j('del2', 'Delantero Centro (9)', 3),
    ];
    const auto = armarTitular(plantel, '3-2-1');
    expect(auto.banca.map((p) => p.id)).toEqual(['del2']);

    // Banca por titular: del2 entra en el puesto de del1.
    const conCambio = intercambiarPuestos(auto, '3-2-1', 'del2', 'del1');
    const t = armarTitular(plantel, '3-2-1', {}, conCambio);
    expect(ids(t.lineas.Delantero)).toEqual(['del2']);
    expect(t.banca.map((p) => p.id)).toEqual(['del1']);

    // Rotar dos titulares: el arquero sale a jugar y un defensa va al arco.
    const rotado = armarTitular(plantel, '3-2-1', {}, intercambiarPuestos(t, '3-2-1', 'arq', 'def2'));
    expect(ids(rotado.lineas.Portero)).toEqual(['def2']);
    expect(rotado.lineas.Defensa.map((p) => [p.jugador.id, p.fueraDePuesto])).toEqual([['def1', false], ['arq', true], ['def3', false]]);

    // Si un fijado ya no está disponible, su puesto se rellena solo.
    const sinDel2 = armarTitular(plantel.filter((p) => p.id !== 'del2'), '3-2-1', {}, conCambio);
    expect(ids(sinDel2.lineas.Delantero)).toEqual(['del1']);
  });

  it('sin jugadores no arma nada', () => {
    const t = armarTitular([], '3-2-1');
    expect(Object.values(t.lineas).flat()).toEqual([]);
    expect(t.promedio).toBe('0.0');
  });
});
