import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { aviso, confirmar } from '../../lib/avisos';
import { sinMarcaDeInvitado } from '../../lib/matchmaking';
import {
  STATS_VACIAS,
  agregarInvitado,
  asistenciaDelPartido,
  cargarDashboard,
  contarVotos,
  guardarAsistencia,
  guardarGanadorMvp,
  invitadosDelPartido,
  quitarInvitado,
  unirAsistencia,
  votosDelPartido,
  type AjustesEquipoDash,
  type DashboardStats,
  type EstadoAsistencia,
  type Invitado,
  type JugadorConAsistencia,
  type JugadorDash,
} from '../../lib/api/dashboard';

/**
 * Estado y acciones del panel de inicio. La pantalla solo dibuja lo que este
 * hook entrega; las consultas están en lib/api/dashboard.
 */
export function useDashboard(teamId: number | null) {
  const [teamSettings, setTeamSettings] = useState<AjustesEquipoDash>({
    team_name: '', logo_url: '', join_code: '', payment_link: '', payment_button_enabled: false, banner_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(STATS_VACIAS);
  const [myPlayer, setMyPlayer] = useState<JugadorDash | null>(null);
  const [myConfirmStatus, setMyConfirmStatus] = useState<string>('Pendiente');
  const [confirmingMyStatus, setConfirmingMyStatus] = useState(false);
  const [confirmedPlayers, setConfirmedPlayers] = useState<JugadorDash[]>([]);

  // Invitados que se ven en la tarjeta del próximo partido.
  const [guestsDash, setGuestsDash] = useState<Invitado[]>([]);
  const [guestInputDash, setGuestInputDash] = useState('');
  const [addingGuestDash, setAddingGuestDash] = useState(false);

  // Ventana de asistencia (lista completa del plantel).
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceList, setAttendanceList] = useState<JugadorConAsistencia[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [guestList, setGuestList] = useState<Invitado[]>([]);
  const [guestInput, setGuestInput] = useState('');

  const [copied, setCopied] = useState(false);
  const [copiedVote, setCopiedVote] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const datos = await cargarDashboard(teamId);
      if (datos.teamSettings) setTeamSettings(datos.teamSettings);
      setMyPlayer(datos.myPlayer);
      if (datos.stats.nextMatch) {
        setConfirmedPlayers(datos.confirmedPlayers);
        setGuestsDash(datos.guests);
        if (datos.myPlayer) setMyConfirmStatus(datos.myConfirmStatus);
      }
      setStats(datos.stats);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const matchId = stats.nextMatch?.id ?? null;

  const openAttendanceModal = async () => {
    if (!matchId) return;
    setShowAttendanceModal(true);
    setAttendanceLoading(true);
    try {
      const [asistencias, invitados] = await Promise.all([asistenciaDelPartido(matchId), invitadosDelPartido(matchId)]);
      setAttendanceList(unirAsistencia(stats.allPlayers, asistencias));
      setGuestList(invitados);
    } catch (e) {
      console.error(e);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const addGuest = async () => {
    const name = guestInput.trim();
    if (!name || !matchId) return;
    const { data, error } = await agregarInvitado(matchId, name);
    if (!error && data) {
      setGuestList((prev) => [...prev, data]);
      setGuestInput('');
    }
  };

  const removeGuest = async (guestId: string) => {
    await quitarInvitado(guestId);
    setGuestList((prev) => prev.filter((g) => g.id !== guestId));
  };

  const addGuestDash = async () => {
    const name = guestInputDash.trim();
    if (!name || !matchId || !teamId || addingGuestDash) return;
    setAddingGuestDash(true);
    try {
      const { data, error } = await agregarInvitado(matchId, name);
      if (error) {
        console.error('Error al agregar invitado:', error);
        aviso.error('Error al agregar invitado: ' + error.message);
        return;
      }
      if (data) {
        setGuestsDash((prev) => [...prev, data]);
        setGuestInputDash('');
      }
    } finally {
      setAddingGuestDash(false);
    }
  };

  const removeGuestDash = async (guestId: string) => {
    await quitarInvitado(guestId);
    setGuestsDash((prev) => prev.filter((g) => g.id !== guestId));
  };

  const handleAttendanceChange = async (playerId: string, newStatus: EstadoAsistencia) => {
    if (!matchId) return;
    await guardarAsistencia(matchId, playerId, newStatus);
    // Se parte de la lista más reciente (prev), no de la que había al hacer clic:
    // así dos cambios seguidos no se pisan.
    setAttendanceList((prev) => {
      const updated = prev.map((p) => (p.id === playerId ? { ...p, attendanceStatus: newStatus } : p));
      setStats((s) => ({
        ...s,
        confirmedCount: updated.filter((p) => p.attendanceStatus === 'Voy').length,
        declinedCount: updated.filter((p) => p.attendanceStatus === 'No voy').length,
        declinedIds: updated.filter((p) => p.attendanceStatus === 'No voy').map((p) => p.id),
        pendingCount: updated.filter((p) => p.attendanceStatus === 'Pendiente').length,
      }));
      return updated;
    });
  };

  const copyForWhatsApp = async () => {
    const match = stats.nextMatch;
    if (!match) return;

    // Los invitados se leen de nuevo: se pueden agregar desde la tarjeta o desde
    // la ventana de asistencia, y cada una guarda su propia lista.
    const [list, invitados] = await Promise.all([
      attendanceList.length > 0 ? attendanceList : asistenciaDelPartido(match.id).then((a) => unirAsistencia(stats.allPlayers, a)),
      invitadosDelPartido(match.id),
    ]);
    const van = list.filter((p) => p.attendanceStatus === 'Voy');
    const noVan = list.filter((p) => p.attendanceStatus === 'No voy');
    const sinResp = list.filter((p) => p.attendanceStatus === 'Pendiente');

    const lines: string[] = [];
    lines.push(`⚽ *${teamSettings.team_name}*`);
    lines.push(`📅 ${format(new Date(match.date), "EEEE dd 'de' MMMM • HH:mm", { locale: es })}`);
    if (match.location) lines.push(`📍 ${match.location}`);
    lines.push('');
    lines.push(`✅ *Van (${van.length + invitados.length}):*`);
    van.forEach((p, i) => lines.push(`${i + 1}. ${p.name}`));
    invitados.forEach((g, i) => lines.push(`${van.length + i + 1}. ${sinMarcaDeInvitado(g.name)} (Invitado)`));
    if (noVan.length > 0) {
      lines.push('');
      lines.push(`❌ *No van (${noVan.length}):*`);
      noVan.forEach((p) => lines.push(`• ${p.name}`));
    }
    if (sinResp.length > 0) {
      lines.push('');
      lines.push(`⏳ *Sin respuesta (${sinResp.length}):*`);
      sinResp.forEach((p) => lines.push(`• ${p.name}`));
    }
    lines.push('');
    lines.push(`_Total activos: ${list.length}_`);

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const shareVoteWhatsApp = async () => {
    if (!stats.openVoteMatchId) return;
    const voteUrl = `${window.location.origin}/vote?match_id=${stats.openVoteMatchId}`;
    const text = `🏆 *Votación MVP Abierta* 🏆\n¡Entra aquí y vota por la figura del partido! 👇\n${voteUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Votación MVP', text });
        return;
      } catch {
        // Si el teléfono no deja compartir, se abre WhatsApp directamente.
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedVote(true);
      setTimeout(() => setCopiedVote(false), 2500);
    } catch (e) {
      console.error(e);
    }

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const closeVoting = async () => {
    const voteMatchId = stats.openVoteMatchId;
    if (!voteMatchId) return;
    if (!(await confirmar('¿Cerrar votación y guardar al MVP de la semana?'))) return;
    try {
      const ganador = contarVotos(await votosDelPartido(voteMatchId))[0];
      if (!ganador) { aviso.info('No hay votos registrados aún.'); return; }
      const [winnerId, voteCount] = ganador;
      const winner = stats.allPlayers.find((p) => p.id === winnerId);
      if (!winner) { aviso.info('No se encontró el jugador ganador.'); return; }
      const { error } = await guardarGanadorMvp(voteMatchId, winner, voteCount);
      if (error) throw error;
      aviso.ok(`¡MVP registrado! Ganador: ${winner.name} con ${voteCount} votos.`);
      fetchDashboardData();
    } catch (err) {
      aviso.error('Error al cerrar votación: ' + (err as Error).message);
    }
  };

  const notifyVoting = async () => {
    if (!stats.openVoteMatchId) return;
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
    if (!webhookUrl) { aviso.info('No hay webhook configurado para notificaciones.'); return; }
    try {
      const voteUrl = `${window.location.origin}/vote?match_id=${stats.openVoteMatchId}`;
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'mvp_vote_open', vote_url: voteUrl }),
      });
      aviso.ok('¡Notificación enviada!');
    } catch (err) {
      aviso.error('Error al enviar notificación: ' + (err as Error).message);
    }
  };

  const handleMyConfirm = async (newStatus: 'Voy' | 'No voy') => {
    if (!matchId || !myPlayer || confirmingMyStatus) return;
    if (myConfirmStatus === newStatus) return;
    setConfirmingMyStatus(true);
    const prevStatus = myConfirmStatus;
    setMyConfirmStatus(newStatus);
    try {
      await guardarAsistencia(matchId, myPlayer.id, newStatus);
      setStats((s) => {
        let confirmed = s.confirmedCount;
        let declined = s.declinedCount;
        if (prevStatus === 'Voy') confirmed = Math.max(0, confirmed - 1);
        else if (prevStatus === 'No voy') declined = Math.max(0, declined - 1);
        if (newStatus === 'Voy') confirmed++;
        else declined++;
        const sinMi = s.declinedIds.filter((id) => id !== myPlayer.id);
        const declinedIds = newStatus === 'No voy' ? [...sinMi, myPlayer.id] : sinMi;
        return { ...s, confirmedCount: confirmed, declinedCount: declined, declinedIds, pendingCount: Math.max(0, s.activePlayers - confirmed - declined) };
      });
      if (newStatus === 'Voy') {
        setConfirmedPlayers((prev) => (prev.some((p) => p.id === myPlayer.id) ? prev : [...prev, myPlayer]));
      } else {
        setConfirmedPlayers((prev) => prev.filter((p) => p.id !== myPlayer.id));
      }
    } catch {
      setMyConfirmStatus(prevStatus);
    } finally {
      setConfirmingMyStatus(false);
    }
  };

  return {
    loading, teamSettings, stats, myPlayer, myConfirmStatus, confirmingMyStatus, confirmedPlayers,
    guestsDash, guestInputDash, setGuestInputDash, addingGuestDash, addGuestDash, removeGuestDash,
    showAttendanceModal, setShowAttendanceModal, attendanceList, attendanceLoading,
    guestList, guestInput, setGuestInput, addGuest, removeGuest, handleAttendanceChange, openAttendanceModal,
    copied, copiedVote, copyForWhatsApp, shareVoteWhatsApp, closeVoting, notifyVoting, handleMyConfirm,
  };
}
