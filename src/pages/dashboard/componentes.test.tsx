import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({ supabase: {}, withTimeout: (p: Promise<unknown>) => p }));

import { STATS_VACIAS, type DashboardStats, type JugadorDash } from '../../lib/api/dashboard';
import { ModalAsistencia } from './ModalAsistencia';
import { PartidoHero } from './PartidoHero';
import { AvisoCuota, MosaicosInicio } from './ResumenInicio';
import { SaludoInicio } from './SaludoInicio';
import { TarjetaMvp } from './TarjetaMvp';
import { TarjetaParticipaciones } from './TarjetaParticipaciones';
import { TarjetaTitular } from './TarjetaTitular';

/**
 * Pruebas de humo: cada bloque del panel se dibuja sin romperse, tanto con el
 * equipo recién creado (sin datos) como con datos completos.
 */
const dibujar = (elemento: ReactElement) => renderToString(<MemoryRouter>{elemento}</MemoryRouter>);
const nada = () => {};

const jugador = (id: string, name: string): JugadorDash => ({
  id, name, nickname: 'Apodo ' + id, status: 'Activo', photo_url: null, user_id: null, position: 'Delantero', match_role: null,
});
const ana = jugador('a', 'Ana Rojas');
const beto = jugador('b', 'Beto Díaz');
const top = (j: JugadorDash, count: number) => ({ id: j.id, count, name: j.name, nickname: j.nickname ?? '', photo_url: '' });
const ganador = { player_id: 'a', player_name: 'Ana Rojas', player_photo_url: null, vote_count: 4, week_date: '2026-05-17', created_at: '2026-05-17T23:59:00Z' };

const ajustes = { team_name: 'Los Cóndores FC', logo_url: '', join_code: 'ABC123', payment_link: 'https://pago.example/x', payment_button_enabled: true, banner_url: '' };

const llenas: DashboardStats = {
  ...STATS_VACIAS,
  nextMatch: { id: 'm1', date: '2026-12-20T20:00:00Z', location: 'Cancha 3', event_type: 'Deportivo', opponent: 'Rival FC' },
  confirmedCount: 1,
  declinedCount: 0,
  pendingCount: 1,
  morosos: [{ ...beto, pendingPayments: [{ player_id: 'b', month: 4, year: 2026, amount: 5000, status: 'Pendiente' }] }],
  balance: 125000,
  activePlayers: 2,
  totalPlayers: 2,
  topParticipations: [top(ana, 8), top(beto, 3)],
  totalMatchesPlayed: 10,
  allPlayers: [ana, beto],
  lastMvpWinner: ganador,
  mvpHistory: [ganador],
  mvpWinHistory: [top(ana, 1)],
};
const votando: DashboardStats = { ...llenas, votingIsOpen: true, openVoteMatchId: 'm0', openVoteMatchDate: '2026-12-13T20:00:00Z', topMvp: [top(ana, 3), top(beto, 2)] };

describe('bloques del panel de inicio', () => {
  it('saludo con el primer nombre y el código de invitación solo si se pasa', () => {
    const html = dibujar(<SaludoInicio nombre="Gonzalo Araos" rol="Capitán" codigo="ABC123" />);
    expect(html).toContain('Gonzalo');
    expect(html).not.toContain('Araos');
    expect(html).toContain('ABC123');
    expect(dibujar(<SaludoInicio nombre="" rol="Jugador" />)).not.toContain('ABC123');
    expect(dibujar(<SaludoInicio nombre="Ana" rol="Jugador" portada="https://x.example/portada.jpg" />)).toContain('portada.jpg');
  });

  it.each([['sin datos', STATS_VACIAS], ['con datos', llenas], ['con votación abierta', votando]])('mosaicos, MVP y participaciones %s', (_, stats) => {
    for (const isAdmin of [true, false]) {
      expect(dibujar(<MosaicosInicio stats={stats} isAdmin={isAdmin} myPlayer={isAdmin ? null : beto} />)).toBeTruthy();
      expect(dibujar(<TarjetaMvp stats={stats} isAdmin={isAdmin} copiedVote={false} shareVoteWhatsApp={nada} closeVoting={nada} notifyVoting={nada} />)).toBeTruthy();
    }
    expect(dibujar(<TarjetaParticipaciones stats={stats} />)).toBeTruthy();
  });

  it('equipo titular: sin plantel no se dibuja y quien dijo "No voy" queda fuera', () => {
    expect(dibujar(<TarjetaTitular stats={STATS_VACIAS} />)).toBe('');
    const html = dibujar(<TarjetaTitular stats={{ ...llenas, declinedIds: ['b'] }} />);
    expect(html).toContain('A. Rojas');
    expect(html).toContain('No van (');
    expect(dibujar(<TarjetaTitular stats={llenas} />)).not.toContain('No van (');
  });

  it('el capitán ve cuántos deben; el jugador, su asistencia', () => {
    expect(dibujar(<MosaicosInicio stats={llenas} isAdmin myPlayer={null} />)).toContain('Morosos');
    // Ana jugó 8 de 10 partidos.
    expect(dibujar(<MosaicosInicio stats={llenas} isAdmin={false} myPlayer={ana} />)).toContain('80');
  });

  it('aviso de cuota solo para quien debe, con el botón de pago si está activo', () => {
    expect(dibujar(<AvisoCuota stats={llenas} myPlayer={beto} teamSettings={ajustes} />)).toContain('https://pago.example/x');
    expect(dibujar(<AvisoCuota stats={llenas} myPlayer={beto} teamSettings={{ ...ajustes, payment_button_enabled: false }} />)).toContain('/finance');
    expect(dibujar(<AvisoCuota stats={llenas} myPlayer={ana} teamSettings={ajustes} />)).toBe('');
    expect(dibujar(<AvisoCuota stats={llenas} myPlayer={null} teamSettings={ajustes} />)).toBe('');
  });

  it.each([['sin partido', STATS_VACIAS], ['con partido', llenas]])('próximo partido %s', (_, stats) => {
    for (const isMatchmaker of [true, false]) {
      for (const [myPlayer, estado] of [[beto, 'Voy'], [beto, 'No voy'], [null, 'Pendiente']] as const) {
        const html = dibujar(
          <PartidoHero
            stats={stats} myPlayer={myPlayer} myConfirmStatus={estado} confirmingMyStatus={false} handleMyConfirm={nada}
            confirmedPlayers={stats.nextMatch ? [ana] : []} guestsDash={stats.nextMatch ? [{ id: 'g1', name: 'Invitado Uno' }] : []}
            isMatchmaker={isMatchmaker} openAttendanceModal={nada} copyForWhatsApp={nada} copied={false} ahora={new Date('2026-12-18T12:00:00Z')}
          />,
        );
        expect(html).toContain(stats.nextMatch ? 'Cancha 3' : 'Sin partidos próximos');
        if (stats.nextMatch) {
          expect(html).toContain('Faltan 2 días');
          expect(html.includes('No voy')).toBe(myPlayer !== null);
        }
      }
    }
  });

  it('ventana de asistencia cargando y con la lista', () => {
    const base = { stats: llenas, guestInput: '', setGuestInput: nada, addGuest: nada, removeGuest: nada, handleAttendanceChange: nada, setShowAttendanceModal: nada };
    expect(dibujar(<ModalAsistencia {...base} isMatchmaker attendanceLoading attendanceList={[]} guestList={[]} />)).toContain('Asistencia Manual');
    const html = dibujar(
      <ModalAsistencia
        {...base} isMatchmaker attendanceLoading={false}
        attendanceList={[{ ...ana, attendanceStatus: 'Voy' }, { ...beto, attendanceStatus: 'Pendiente' }]}
        guestList={[{ id: 'g1', name: 'Invitado Uno' }]}
      />,
    );
    expect(html).toContain('Ana Rojas');
    expect(html).toContain('Invitado Uno');
  });
});
