import { renderToString as dibujar } from 'react-dom/server';

/** Sin los separadores que React mete entre textos, para poder buscar frases. */
const renderToString = (e: Parameters<typeof dibujar>[0]) => dibujar(e).replaceAll('<!-- -->', '');
import { describe, expect, it } from 'vitest';
import { armarAgenda, cumplesDelMes, edadQueCumple, puntosDelDia, tituloPartido, type JugadorCal, type PartidoCal } from './agenda';
import { ItemAgenda, MesCompacto, YaJugados } from './BloquesCalendario';

const nov = new Date(2026, 10, 15);
const hoy = new Date(2026, 10, 19, 10);
const partidos: PartidoCal[] = [
  { id: 'p1', date: '2026-11-07T21:00:00', event_type: 'Deportivo', location: 'Cancha Norte' },
  { id: 'p2', date: '2026-11-21T21:00:00', event_type: 'Deportivo', description: 'Partido vs Los Leones' },
  { id: 's1', date: '2026-11-23T20:30:00', event_type: 'Recreacional', description: 'Asado de fin de año' },
  { id: 'x', date: '2026-12-02T21:00:00', event_type: 'Deportivo' }, // otro mes: no entra
];
const jugadores: JugadorCal[] = [
  { id: 'j1', name: 'Matías Rojas', nickname: null, birth_date: '1990-11-24' },
  { id: 'j2', name: 'Pedro', nickname: 'Peter', birth_date: '1992-05-01' },
];

describe('Calendario', () => {
  it('títulos por defecto', () => {
    expect(tituloPartido({ id: '1', date: '', event_type: 'Deportivo', match_type: '6vs6' })).toBe('Partido 6vs6');
    expect(tituloPartido({ id: '1', date: '', event_type: 'Recreacional' })).toBe('Evento social');
    expect(tituloPartido({ id: '1', date: '', event_type: 'Torneo' })).toBe('Torneo');
    expect(tituloPartido({ id: '1', date: '', event_type: 'Torneo', description: 'Copa Generaciones' })).toBe('Copa Generaciones');
    expect(tituloPartido({ id: '1', date: '', description: '  Final  ' })).toBe('Final');
  });

  it('cumpleaños del mes sin importar el año de nacimiento', () => {
    const c = cumplesDelMes(jugadores, nov);
    expect(c).toHaveLength(1);
    expect(c[0].fecha.getDate()).toBe(24);
  });

  it('separa lo que viene de lo que ya pasó, en orden', () => {
    const { proximos, pasados, total } = armarAgenda(partidos, jugadores, nov, hoy);
    expect(total).toBe(4);
    expect(pasados.map(e => (e.tipo === 'partido' ? e.partido.id : e.jugador.id))).toEqual(['p1']);
    expect(proximos.map(e => (e.tipo === 'partido' ? e.partido.id : e.jugador.id))).toEqual(['p2', 's1', 'j1']);
  });

  it('puntos de cada día', () => {
    const cumples = cumplesDelMes(jugadores, nov);
    expect(puntosDelDia(new Date(2026, 10, 21), partidos, cumples)).toEqual({ partido: true, torneo: false, social: false, cumple: false });
    expect(puntosDelDia(new Date(2026, 10, 23), partidos, cumples)).toEqual({ partido: false, torneo: false, social: true, cumple: false });
    expect(puntosDelDia(new Date(2026, 10, 24), partidos, cumples)).toEqual({ partido: false, torneo: false, social: false, cumple: true });
    const conTorneo: PartidoCal[] = [{ id: 't1', date: '2026-11-28T10:00:00', event_type: 'Torneo', description: 'Copa Generaciones' }];
    expect(puntosDelDia(new Date(2026, 10, 28), conTorneo, cumples)).toEqual({ partido: false, torneo: true, social: false, cumple: false });
  });

  it('años que cumple', () => {
    expect(edadQueCumple(jugadores[0], new Date(2026, 10, 24, 12))).toBe(36);
    expect(edadQueCumple({ id: 'z', name: 'Sin año', birth_date: 'nada' }, nov)).toBeNull();
  });

  it('la fecha lleva el mes y el día de la semana completo, no "MAR" a secas', () => {
    const martes: PartidoCal = { id: 'm', date: '2026-12-08T21:00:00', event_type: 'Deportivo' };
    const html = renderToString(<ItemAgenda evento={{ tipo: 'partido', fecha: new Date(martes.date), partido: martes }} confirmados={0} activos={14} abrir={() => {}} />);
    expect(html).toContain('>dic<');
    expect(html).toContain('Martes · 21:00');
    const torneo: PartidoCal = { id: 't', date: '2026-12-05T10:00:00', event_type: 'Torneo', description: 'Copa Generaciones' };
    const copa = renderToString(<ItemAgenda evento={{ tipo: 'partido', fecha: new Date(torneo.date), partido: torneo }} confirmados={0} activos={14} abrir={() => {}} />);
    expect(copa).toContain('Copa Generaciones');
    expect(copa).toContain('Torneo');
  });

  it('dibuja el mes, la agenda y lo ya jugado', () => {
    const nada = () => {};
    const mes = renderToString(
      <MesCompacto mes={nov} partidos={partidos} cumples={cumplesDelMes(jugadores, nov)} total={4} seleccionado={null}
        cargando={false} anterior={nada} siguiente={nada} tocarDia={nada} />,
    );
    expect(mes).toContain('Noviembre 2026');
    expect(mes).toContain('4 eventos');
    const { proximos, pasados } = armarAgenda(partidos, jugadores, nov, hoy);
    const html = proximos.map(e => renderToString(<ItemAgenda evento={e} confirmados={9} activos={14} abrir={nada} />)).join('');
    expect(html).toContain('Partido vs Los Leones');
    expect(html).toContain('9/14 confirmados');
    expect(html).toContain('Social');
    expect(html).toContain('Cumpleaños de Matías');
    expect(renderToString(<YaJugados eventos={pasados} confirmados={{}} activos={14} abrir={nada} />)).toContain('Ya pasaron este mes (');
    expect(renderToString(<YaJugados eventos={[]} confirmados={{}} activos={14} abrir={nada} />)).toBe('');
  });
});
