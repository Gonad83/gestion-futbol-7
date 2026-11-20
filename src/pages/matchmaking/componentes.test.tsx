import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { formacionesPara, type JugadorMM, type PartidoMM } from '../../lib/matchmaking';
import { BarraControles } from './BarraControles';
import { Convocados } from './Convocados';
import { EncabezadoPartido } from './EncabezadoPartido';
import { ModalInvitado } from './ModalInvitado';
import { Pizarra } from './Pizarra';
import { SinPartido } from './SinPartido';
import { CanchaMovil } from './CanchaMovil';

/**
 * Pruebas de humo: cada bloque de Matchmaking se dibuja sin romperse, con y
 * sin datos, pudiendo editar o solo mirando.
 */
const nada = () => {};
const jugador = (i: number, extra: Partial<JugadorMM> = {}): JugadorMM => ({
  id: `p${i}`, name: `Jugador ${i}`, nickname: i % 2 ? `Apodo ${i}` : null, rating: 3 + (i % 5),
  position: i < 2 ? 'Portero' : 'Mediocampista', photo_url: null, ...extra,
});
const plantel = Array.from({ length: 12 }, (_, i) => jugador(i));
const invitado = jugador(99, { name: 'Pedro (I)', isGuest: true, position: 'Invitado' });
const partidos: PartidoMM[] = [
  { id: 'm1', date: '2099-05-16T20:00:00', location: 'Cancha 3', status: 'Programado', has_saved_teams: true },
  { id: 'm0', date: '2020-05-09T20:00:00', location: 'Cancha 1', status: 'Programado', has_saved_teams: false },
];

describe('bloques de Matchmaking', () => {
  it('encabezado con la lista de partidos y aviso si no hay ninguno', () => {
    const base = { loading: false, setLoading: nada, selectedMatch: 'm1', setSelectedMatch: nada };
    const html = renderToString(<EncabezadoPartido {...base} matches={partidos} isPastMatch={false} />);
    expect(html).toContain('Cancha 3');
    expect(html).toContain('Próximo');
    expect(html).toContain('Pasado');
    expect(renderToString(<EncabezadoPartido {...base} matches={partidos} isPastMatch />)).toBeTruthy();
    expect(renderToString(<EncabezadoPartido {...base} matches={[]} selectedMatch="" isPastMatch={false} />)).toContain('No hay partidos');
    expect(renderToString(<SinPartido />)).toBeTruthy();
  });

  it.each([
    ['antes de armar', false, false], ['armados sin guardar', true, false], ['armados y guardados', true, true],
  ])('barra de controles %s', (_, teamsGenerated, saved) => {
    for (const canEdit of [true, false]) {
      for (const isFreePlan of [true, false]) {
        expect(renderToString(
          <BarraControles
            loading={false} confirmedPlayers={plantel} saved={saved} sendingList={false} teamsGenerated={teamsGenerated}
            showAddPlayerPanel={false} setShowAddPlayerPanel={nada} copied={false} showGuestForm={false} setShowGuestForm={nada}
            canEdit={canEdit} generateTeams={nada} saveTeams={nada} handleSendFinalList={nada} copyForWhatsApp={nada}
            isFreePlan={isFreePlan} guestCount={1} registeredCount={11}
          />,
        )).toBeTruthy();
      }
    }
  });

  it.each([[true], [false]])('convocados (puede editar: %s)', (canEdit) => {
    const base = {
      declinedPlayers: [jugador(20)], editingGuestId: null, setEditingGuestId: nada, editingGuestName: '', setEditingGuestName: nada,
      allActivePlayers: [...plantel, jugador(21)], guestName: '', setGuestName: nada, guestRating: '5', setGuestRating: nada, canEdit,
      addPlayerToConfirmed: nada, addGuestToPool: nada, removeFromPool: nada, saveGuestName: nada,
      isFreePlan: true, guestCount: 1, registeredCount: 12, canAddGuest: true, canAddRegistered: false,
    };
    const html = renderToString(<Convocados {...base} confirmedPlayers={[...plantel, invitado]} showAddPlayerPanel={false} showGuestForm={false} />);
    expect(html).toContain('Jugador 3');
    expect(html).toContain('Pedro');
    expect(renderToString(<Convocados {...base} confirmedPlayers={[...plantel, invitado]} showAddPlayerPanel showGuestForm editingGuestId="p99" editingGuestName="Pedro" />)).toBeTruthy();
    expect(renderToString(<Convocados {...base} confirmedPlayers={[]} declinedPlayers={[]} showAddPlayerPanel={false} showGuestForm={false} isFreePlan={false} />)).toBeTruthy();
  });

  it.each([[true, false], [false, true]])('pizarra con los dos equipos (puede editar: %s)', (canEdit, isPastMatch) => {
    const base = {
      formationA: '2-2-1', setFormationA: nada, formationB: '3-1-1', setFormationB: nada, colorA: 'blue', setColorA: nada, colorB: 'white', setColorB: nada,
      setSaved: nada, setEditingGuestId: nada, editingGuestName: '', setEditingGuestName: nada, copied: false,
      setShowGuestModal: nada, setGuestModalName: nada, setGuestModalRating: nada, isPastMatch, canEdit,
      getMatchFormations: () => formacionesPara(12), removeFromPool: nada, saveGuestName: nada, handleSwap: nada, copyTeamsForWhatsApp: nada,
    };
    const html = renderToString(<Pizarra {...base} teamA={plantel.slice(0, 6)} teamB={[...plantel.slice(6), invitado]} swapSelection={null} editingGuestId={null} />);
    expect(html).toContain('Jugador 0');
    expect(html).toContain('Jugador 11');
    expect(renderToString(<Pizarra {...base} teamA={plantel.slice(0, 6)} teamB={[...plantel.slice(6), invitado]} swapSelection={{ team: 'A', index: 2 }} editingGuestId="p99" />)).toBeTruthy();
    expect(renderToString(<Pizarra {...base} teamA={[]} teamB={[]} swapSelection={null} editingGuestId={null} />)).toBeTruthy();
  });

  it('ventana para sumar un invitado a un equipo', () => {
    const html = renderToString(
      <ModalInvitado showGuestModal={{ team: 'B' }} setShowGuestModal={nada} guestModalName="Pedro" setGuestModalName={nada}
        guestModalRating="5" setGuestModalRating={nada} addGuestToTeam={nada} />,
    );
    expect(html).toContain('Pedro');
  });

  it('cancha del celular: los suplentes se pueden tocar para cambiarlos', () => {
    // 5vs5 con 7 por lado: 5 en cancha y 2 en la banca de cada equipo.
    const a = plantel.slice(0, 7);
    const b = [...plantel.slice(7, 12), invitado, jugador(50)];
    const props = { teamA: a, teamB: b, formationA: '2-0-2', formationB: '2-0-2', colorA: 'blue', colorB: 'white', handleSwap: nada };
    const sinMarcas = (html: string) => html.replace(/<!-- -->/g, '');
    const editable = sinMarcas(renderToString(<CanchaMovil {...props} swapSelection={{ team: 'A', index: 5 }} canEdit />));
    expect(editable).toContain('Banca A');
    expect(editable).toMatch(/<button[^>]*aria-pressed="true"[^>]*aria-label="Jugador 5, suplente del equipo A, elegido para cambiar"/);
    expect((editable.match(/suplente del equipo/g) ?? []).length).toBe(4);
    const soloMirar = sinMarcas(renderToString(<CanchaMovil {...props} swapSelection={null} canEdit={false} />));
    expect(soloMirar).not.toContain('suplente del equipo');
    expect(soloMirar).toContain('Banca B');
  });
});

