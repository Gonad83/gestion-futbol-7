import { useAuth } from '../hooks/useAuth';
import { useDashboard } from './dashboard/useDashboard';
import { SaludoInicio } from './dashboard/SaludoInicio';
import { PartidoHero } from './dashboard/PartidoHero';
import { AvisoCuota, MosaicosInicio } from './dashboard/ResumenInicio';
import { TarjetaMvp } from './dashboard/TarjetaMvp';
import { TarjetaParticipaciones } from './dashboard/TarjetaParticipaciones';
import { TarjetaGoleadores } from './dashboard/TarjetaGoleadores';
import { AvisosCelular } from '../components/AvisosCelular';
import { PedidosRefuerzo } from './profile/MiRefuerzo';
import { ModalAsistencia } from './dashboard/ModalAsistencia';
import { TarjetaTitular } from './dashboard/TarjetaTitular';

const ROLES: Record<string, string> = { captain: 'Capitán', subcaptain: 'Subcapitán' };

/**
 * Inicio. Aquí solo se arma la pantalla: los datos y acciones vienen de
 * useDashboard y cada bloque se dibuja en su propio archivo en ./dashboard.
 * Diseño para celular basado en el concepto de Stitch (docs/diseno/inicio-movil-stitch.png):
 * el próximo partido con Voy / No voy manda; después la cuota pendiente, la
 * caja, el MVP y quiénes más juegan.
 */
export default function Dashboard() {
  const { isAdmin, isMatchmaker, teamId, user } = useAuth();
  const d = useDashboard(teamId);

  if (d.loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <div className="w-10 h-10 rounded-full border-2 border-t-soccer-green border-r-soccer-green/20 border-b-soccer-green/10 border-l-soccer-green/5 animate-spin" />
      </div>
    );
  }

  const nombre = d.myPlayer?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const rol = isAdmin ? 'Capitán' : ROLES[d.myPlayer?.match_role ?? ''] ?? 'Jugador';

  return (
    <div className="fade-in pb-20 md:pb-0 max-w-5xl mx-auto space-y-5">
      <SaludoInicio nombre={nombre} rol={rol} codigo={isAdmin ? d.teamSettings.join_code : null} portada={d.teamSettings.banner_url}
        onCambiarPortada={isAdmin ? d.cambiarPortada : undefined} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        <div className="lg:col-span-3 space-y-5">
          <PartidoHero
            stats={d.stats}
            myPlayer={d.myPlayer}
            myConfirmStatus={d.myConfirmStatus}
            confirmingMyStatus={d.confirmingMyStatus}
            handleMyConfirm={d.handleMyConfirm}
            confirmedPlayers={d.confirmedPlayers}
            guestsDash={d.guestsDash}
            isMatchmaker={isMatchmaker}
            openAttendanceModal={d.openAttendanceModal}
            copyForWhatsApp={d.copyForWhatsApp}
            copied={d.copied}
          />
          <AvisoCuota stats={d.stats} myPlayer={d.myPlayer} teamSettings={d.teamSettings} />
          {d.myPlayer && <PedidosRefuerzo soloPendientes />}
          {d.myPlayer && <AvisosCelular modo="tarjeta" />}
          <MosaicosInicio stats={d.stats} isAdmin={isAdmin} myPlayer={d.myPlayer} />
          <TarjetaTitular stats={d.stats} guardado={d.teamSettings.titular ?? null} puedeEditar={isAdmin} onGuardar={d.cambiarTitular} />
        </div>

        <div className="lg:col-span-2 space-y-5">
          <TarjetaMvp
            stats={d.stats}
            isAdmin={isAdmin}
            copiedVote={d.copiedVote}
            shareVoteWhatsApp={d.shareVoteWhatsApp}
            closeVoting={d.closeVoting}
            notifyVoting={d.notifyVoting}
          />
          <TarjetaGoleadores goleadores={d.stats.goleadores} puedeCargar={isAdmin || isMatchmaker} />
          <TarjetaParticipaciones stats={d.stats} />
        </div>
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
          teamId={teamId}
          sumarInvitado={d.sumarInvitado}
          removeGuest={d.removeGuest}
          handleAttendanceChange={d.handleAttendanceChange}
          setShowAttendanceModal={d.setShowAttendanceModal}
        />
      )}
    </div>
  );
}
