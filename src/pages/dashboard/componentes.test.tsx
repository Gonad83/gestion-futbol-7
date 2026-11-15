import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({ supabase: {}, withTimeout: (p: Promise<unknown>) => p }));

import { STATS_VACIAS, type DashboardStats, type JugadorDash } from '../../lib/api/dashboard';
import { BannerPago } from './BannerPago';
import { FilaKpi } from './FilaKpi';
import { HeroEquipo } from './HeroEquipo';
import { MiPanel } from './MiPanel';
import { ModalAsistencia } from './ModalAsistencia';
import { ProximoPartido } from './ProximoPartido';
import { TarjetaMorosos } from './TarjetaMorosos';
import { TarjetaMvp } from './TarjetaMvp';
import { TarjetaParticipaciones } from './TarjetaParticipaciones';
import { TarjetaPlantilla } from './TarjetaPlantilla';

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
  it('encabezado con el nombre del equipo y el código de invitación solo para el capitán', () => {
    expect(dibujar(<HeroEquipo teamSettings={ajustes} isAdmin />)).toContain('ABC123');
    expect(dibujar(<HeroEquipo teamSettings={ajustes} isAdmin={false} />)).not.toContain('ABC123');
    expect(dibujar(<HeroEquipo teamSettings={{ ...ajustes, team_name: '' }} isAdmin={false} />)).toBeTruthy();
  });

  it('botón de pago con su enlace', () => {
    expect(dibujar(<BannerPago teamSettings={ajustes} />)).toContain('https://pago.example/x');
  });

  it.each([['sin datos', STATS_VACIAS], ['con datos', llenas], ['con votación abierta', votando]])('tarjetas de resumen %s', (_, stats) => {
    expect(dibujar(<FilaKpi stats={stats} />)).toBeTruthy();
    expect(dibujar(<TarjetaMorosos stats={stats} isAdmin />)).toBeTruthy();
    expect(dibujar(<TarjetaMorosos stats={stats} isAdmin={false} />)).toBeTruthy();
    expect(dibujar(<TarjetaPlantilla stats={stats} />)).toBeTruthy();
    expect(dibujar(<TarjetaParticipaciones stats={stats} />)).toBeTruthy();
    for (const isAdmin of [true, false]) {
      expect(dibujar(<TarjetaMvp stats={stats} isAdmin={isAdmin} copiedVote={false} shareVoteWhatsApp={nada} closeVoting={nada} notifyVoting={nada} />)).toBeTruthy();
    }
  });

  it('los morosos muestran al jugador que debe', () => {
    expect(dibujar(<TarjetaMorosos stats={llenas} isAdmin />)).toContain('Beto Díaz');
  });

  it.each([['sin partido', STATS_VACIAS], ['con partido', llenas]])('próximo partido %s', (_, stats) => {
    for (const isMatchmaker of [true, false]) {
      const html = dibujar(
        <ProximoPartido
          stats={stats} isMatchmaker={isMatchmaker} confirmedPlayers={stats.nextMatch ? [ana] : []}
          guestsDash={stats.nextMatch ? [{ id: 'g1', name: 'Invitado Uno' }] : []} guestInputDash="" setGuestInputDash={nada}
          addingGuestDash={false} addGuestDash={nada} removeGuestDash={nada} openAttendanceModal={nada} copyForWhatsApp={nada} copied={false}
        />,
      );
      expect(html).toContain(stats.nextMatch ? 'Cancha 3' : 'Sin eventos próximos');
    }
  });

  it.each([['Pendiente'], ['Voy'], ['No voy']])('mi panel con respuesta %s', (estado) => {
    for (const stats of [STATS_VACIAS, llenas]) {
      expect(dibujar(<MiPanel stats={stats} myPlayer={beto} myConfirmStatus={estado} confirmingMyStatus={false} handleMyConfirm={nada} />)).toContain('Tu Panel');
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
