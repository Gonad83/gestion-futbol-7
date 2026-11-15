import { useAuth } from '../hooks/useAuth';
import { useDashboard } from './dashboard/useDashboard';
import { HeroEquipo } from './dashboard/HeroEquipo';
import { MiPanel } from './dashboard/MiPanel';
import { BannerPago } from './dashboard/BannerPago';
import { FilaKpi } from './dashboard/FilaKpi';
import { ProximoPartido } from './dashboard/ProximoPartido';
import { TarjetaMvp } from './dashboard/TarjetaMvp';
import { TarjetaMorosos } from './dashboard/TarjetaMorosos';
import { TarjetaPlantilla } from './dashboard/TarjetaPlantilla';
import { TarjetaParticipaciones } from './dashboard/TarjetaParticipaciones';
import { ModalAsistencia } from './dashboard/ModalAsistencia';

/**
 * Panel de inicio. Aquí solo se arma la pantalla: los datos y acciones vienen
 * de useDashboard y cada bloque se dibuja en su propio archivo en ./dashboard.
 */
export default function Dashboard() {
  const { isAdmin, isMatchmaker, teamId } = useAuth();
  const d = useDashboard(teamId);

  if (d.loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <div className="w-10 h-10 rounded-full border-2 border-t-soccer-green border-r-soccer-green/20 border-b-soccer-green/10 border-l-soccer-green/5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fade-in pb-20 md:pb-0 space-y-6 relative overflow-x-hidden">
      <HeroEquipo teamSettings={d.teamSettings} isAdmin={isAdmin} />

      {d.myPlayer && (
        <MiPanel
          stats={d.stats}
          myPlayer={d.myPlayer}
          myConfirmStatus={d.myConfirmStatus}
          confirmingMyStatus={d.confirmingMyStatus}
          handleMyConfirm={d.handleMyConfirm}
        />
      )}

      {d.teamSettings.payment_button_enabled && d.teamSettings.payment_link && <BannerPago teamSettings={d.teamSettings} />}

      <FilaKpi stats={d.stats} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <ProximoPartido
          stats={d.stats}
          isMatchmaker={isMatchmaker}
          confirmedPlayers={d.confirmedPlayers}
          guestsDash={d.guestsDash}
          guestInputDash={d.guestInputDash}
          setGuestInputDash={d.setGuestInputDash}
          addingGuestDash={d.addingGuestDash}
          addGuestDash={d.addGuestDash}
          removeGuestDash={d.removeGuestDash}
          openAttendanceModal={d.openAttendanceModal}
          copyForWhatsApp={d.copyForWhatsApp}
          copied={d.copied}
        />
        <TarjetaMvp
          stats={d.stats}
          isAdmin={isAdmin}
          copiedVote={d.copiedVote}
          shareVoteWhatsApp={d.shareVoteWhatsApp}
          closeVoting={d.closeVoting}
          notifyVoting={d.notifyVoting}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TarjetaMorosos stats={d.stats} isAdmin={isAdmin} />
        <TarjetaPlantilla stats={d.stats} />
        <TarjetaParticipaciones stats={d.stats} />
      </div>

      {d.showAttendanceModal && d.stats.nextMatch && (
        <ModalAsistencia
          stats={d.stats}
          isMatchmaker={isMatchmaker}
          attendanceList={d.attendanceList}
          attendanceLoading={d.attendanceLoading}
          guestList={d.guestList}
          guestInput={d.guestInput}
          setGuestInput={d.setGuestInput}
          addGuest={d.addGuest}
          removeGuest={d.removeGuest}
          handleAttendanceChange={d.handleAttendanceChange}
          setShowAttendanceModal={d.setShowAttendanceModal}
        />
      )}
    </div>
  );
}
