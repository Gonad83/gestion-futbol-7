import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ListaPlantilla, ResumenPlantilla } from './ListaPlantilla';
import { colorAsistencia, filtrarPlantilla, grupoDe, iniciales, type JugadorPlantilla } from './plantilla';

const j = (id: string, name: string, position: string, extra: Partial<JugadorPlantilla> = {}): JugadorPlantilla => ({
  id, name, position, status: 'Activo', rating: 5, nickname: null, photo_url: null, matchesPlayed: 0, participationPct: 50, ...extra,
});
const plantel = [
  j('1', 'Matías Soto', 'Portero', { nickname: 'El Gato', participationPct: 85 }),
  j('2', 'Cristián Rojas', 'Portero', { status: 'Lesionado', participationPct: 25 }),
  j('3', 'Esteban Paredes', 'Defensa Central', { participationPct: 80 }),
  j('4', 'Gonzalo Valenzuela', 'Lateral Izquierdo', { participationPct: 10 }),
  j('5', 'Jorge Valdivia', 'Enganche / 10 (MCO)', { nickname: 'Mago' }),
  j('6', 'Pedro', '', {}),
];

describe('Plantilla', () => {
  it('agrupa cada posición en su línea', () => {
    expect(grupoDe('Portero')).toBe('Portero');
    expect(grupoDe('Lateral Derecho')).toBe('Defensa');
    expect(grupoDe('Enganche / 10 (MCO)')).toBe('Medio');
    expect(grupoDe('Extremo Izquierdo')).toBe('Delantero');
    expect(grupoDe(null)).toBe('Otro');
  });

  it('busca por nombre o apodo sin importar tildes y filtra por posición', () => {
    expect(filtrarPlantilla(plantel, 'Todos', 'cristian').map(p => p.id)).toEqual(['2']);
    expect(filtrarPlantilla(plantel, 'Todos', 'mago').map(p => p.id)).toEqual(['5']);
    expect(filtrarPlantilla(plantel, 'Portero', '').map(p => p.id)).toEqual(['1', '2']);
    expect(filtrarPlantilla(plantel, 'Defensa', 'esteban').map(p => p.id)).toEqual(['3']);
  });

  it('colores de asistencia e iniciales', () => {
    expect([colorAsistencia(70), colorAsistencia(40), colorAsistencia(39)]).toEqual(['#44f3a9', '#ffd08b', '#f87171']);
    expect(iniciales('Matías Soto Pérez')).toBe('MS');
  });

  it('resumen: activos, lesionados y promedio', () => {
    const html = renderToString(<ResumenPlantilla jugadores={plantel} />);
    expect(html).toContain('Lesionados');
    // (85+25+80+10+50+50)/6 = 50
    expect(html).toContain('50<!-- -->%');
  });

  it.each([[true], [false]])('lista por grupos (capitán: %s)', (isAdmin) => {
    const html = renderToString(<ListaPlantilla jugadores={plantel} isAdmin={isAdmin} totalPartidos={10} onAbrir={() => {}} onFoto={() => {}} />);
    for (const titulo of ['Arqueros', 'Defensas', 'Medios', 'Otros']) expect(html).toContain(titulo);
    expect(html).not.toContain('Delanteros');
    expect(html).toContain('Lesionado');
    expect(html.includes('Riesgo deserción')).toBe(isAdmin); // Gonzalo va al 10% con 10 partidos
    expect(html.includes('Editar a Matías Soto')).toBe(isAdmin);
  });
});
