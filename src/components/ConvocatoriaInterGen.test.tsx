import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ConvocatoriaInterGen from './ConvocatoriaInterGen';
import { contarConvocatoria, textoConvocatoria, type EstadoConvocatoria, type JugadorPlantel } from '../lib/convocatoria';

const plantel: JugadorPlantel[] = ['Ana Soto', 'Beto Rojas', 'Caco Díaz', 'Dani Vera'].map((name, i) => ({ id: `p${i}`, name, photo_url: null }));
const respuestas = new Map<string, EstadoConvocatoria>([['p0', 'va'], ['p1', 'no_va'], ['p3', 'va'], ['fuera', 'va']]);
const nada = () => {};

describe('convocatoria del Inter Generaciones', () => {
  it('cuenta solo a los inscritos', () => {
    expect(contarConvocatoria(plantel, respuestas)).toEqual({ van: 2, noVan: 1, sinResponder: 1 });
    expect(contarConvocatoria(plantel, new Map())).toEqual({ van: 0, noVan: 0, sinResponder: 4 });
  });

  it('arma el texto para WhatsApp con cada grupo', () => {
    const texto = textoConvocatoria('G16 vs Real Ebolo', 'Viernes 4 de diciembre · 19:45 · Cancha 2', plantel, respuestas);
    expect(texto).toContain('*G16 vs Real Ebolo*');
    expect(texto).toContain('*Confirmados (2)*\n1. Ana Soto\n2. Dani Vera');
    expect(texto).toContain('*No asisten (1)*\n- Beto Rojas');
    expect(texto).toContain('*Sin responder (1)*\n- Caco Díaz');
  });

  it('el jugador solo cambia su respuesta; el capitán, la de todos', () => {
    const dibujar = (puedeEditar: boolean) => renderToString(
      <ConvocatoriaInterGen titulo="G16 vs Real Ebolo" cuando="Viernes 4" plantel={plantel} respuestas={respuestas}
        miJugadorId="p2" puedeEditar={puedeEditar} onMarcar={nada} onCerrar={nada} />,
    );
    const jugador = dibujar(false);
    expect(jugador).toContain('¿Puedes ir a este partido?');
    // Cada grupo va en su propia lista, con su cuenta.
    for (const lista of ['Confirmados', 'No asisten', 'Sin responder']) expect(jugador).toContain(`aria-label="${lista}"`);
    expect(jugador).toContain('aria-label="Caco Díaz va"');
    expect(jugador).not.toContain('aria-label="Ana Soto va"');
    expect(dibujar(true)).toContain('aria-label="Ana Soto va"');
  });

  it('sin inscritos explica dónde agregarlos', () => {
    const html = renderToString(
      <ConvocatoriaInterGen titulo="G16 vs Real Ebolo" cuando="Viernes 4" plantel={[]} respuestas={new Map()}
        miJugadorId={null} puedeEditar onMarcar={nada} onCerrar={nada} />,
    );
    expect(html).toContain('Todavía no hay jugadores inscritos');
    expect(html).not.toContain('Copiar para WhatsApp');
  });
});
