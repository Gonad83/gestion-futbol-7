import { useCallback, useEffect, useState } from 'react';
import { aviso } from '../../lib/avisos';
import {
  FREE_GUEST_LIMIT,
  FREE_PLAYER_LIMIT,
  MINIMO_PARA_ARMAR,
  armarEquipos,
  datosListaFinal,
  esInvitado,
  esInvitadoTemporal,
  esPartidoPorJugar,
  formacionesPara,
  intercambiar,
  nombreDeInvitado,
  textoAsistencia,
  textoEquipos,
  type Equipo,
  type JugadorMM,
  type PartidoMM,
  type SeleccionCambio,
} from '../../lib/matchmaking';
import {
  borrarInvitado,
  cargarConvocatoria,
  cargarPartidos,
  confirmarJugador,
  crearInvitado,
  guardarEquipos,
  quitarAsistencia,
  renombrarInvitado,
} from '../../lib/api/matchmaking';

/**
 * Estado y acciones de Matchmaking. La pantalla solo dibuja lo que este hook
 * entrega; las reglas están en lib/matchmaking y las consultas en lib/api.
 */
export function useMatchmaking(teamId: number | null, canManage: boolean) {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<PartidoMM[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [confirmedPlayers, setConfirmedPlayers] = useState<JugadorMM[]>([]);
  const [declinedPlayers, setDeclinedPlayers] = useState<JugadorMM[]>([]);
  const [allActivePlayers, setAllActivePlayers] = useState<JugadorMM[]>([]);
  const [teamSettings, setTeamSettings] = useState({ team_name: '', logo_url: '', plan: 'free' });

  // Equipos armados y cómo se ven en la pizarra.
  const [teamA, setTeamA] = useState<JugadorMM[]>([]);
  const [teamB, setTeamB] = useState<JugadorMM[]>([]);
  const [formationA, setFormationA] = useState('3-2-1');
  const [formationB, setFormationB] = useState('3-2-1');
  const [colorA, setColorA] = useState('blue');
  const [colorB, setColorB] = useState('white');
  const [swapSelection, setSwapSelection] = useState<SeleccionCambio | null>(null);
  const [saved, setSaved] = useState(false);
  const [sendingList, setSendingList] = useState(false);
  const [teamsGenerated, setTeamsGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  // Invitados: edición de nombre, formulario antes de armar y ventana después de armar.
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
  const [editingGuestName, setEditingGuestName] = useState('');
  const [showAddPlayerPanel, setShowAddPlayerPanel] = useState(false);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestRating, setGuestRating] = useState('5');
  const [showGuestModal, setShowGuestModal] = useState<{ team: Equipo } | null>(null);
  const [guestModalName, setGuestModalName] = useState('');
  const [guestModalRating, setGuestModalRating] = useState('5');

  const currentMatchObj = matches.find((m) => m.id === selectedMatch);
  const isPastMatch = !!currentMatchObj && !esPartidoPorJugar(currentMatchObj);
  const canEdit = canManage && !isPastMatch;

  const getMatchFormations = () => formacionesPara(confirmedPlayers.length);

  const limpiarEquipos = () => {
    setTeamA([]);
    setTeamB([]);
    setSaved(false);
    setTeamsGenerated(false);
  };

  // Partidos disponibles.
  useEffect(() => {
    if (!teamId) return;
    let vigente = true;
    (async () => {
      setLoading(true);
      try {
        const { teamSettings: ajustes, proximos, jugados } = await cargarPartidos(teamId);
        if (!vigente) return;
        if (ajustes) setTeamSettings(ajustes);
        const ordenados = [...proximos, ...jugados];
        setMatches(ordenados);
        if (ordenados.length > 0) {
          // Si el partido elegido sigue en la lista se mantiene; si no, el más próximo.
          setSelectedMatch((actual) => (actual && ordenados.some((m) => m.id === actual) ? actual : proximos[0]?.id || ordenados[0].id));
        } else {
          setSelectedMatch('');
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (vigente) setLoading(false);
      }
    })();
    return () => { vigente = false; };
  }, [teamId]);

  // Convocatoria del partido elegido.
  const fetchConfirmedPlayers = useCallback(async (matchId: string) => {
    try {
      const { confirmados, bajas, activos, guardados } = await cargarConvocatoria(matchId, teamId);
      setDeclinedPlayers(bajas);
      setConfirmedPlayers(confirmados);
      setAllActivePlayers(activos);
      if (guardados) {
        setTeamA(guardados.team_a || []);
        setTeamB(guardados.team_b || []);
        if (guardados.metadata?.formationA) setFormationA(guardados.metadata.formationA);
        if (guardados.metadata?.formationB) setFormationB(guardados.metadata.formationB);
        if (guardados.metadata?.colorA) setColorA(guardados.metadata.colorA);
        if (guardados.metadata?.colorB) setColorB(guardados.metadata.colorB);
        setSaved(true);
        setTeamsGenerated(true);
      } else {
        limpiarEquipos();
      }
    } catch (e) {
      console.error('Error in fetchConfirmedPlayers:', e);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (selectedMatch) {
      fetchConfirmedPlayers(selectedMatch);
    } else {
      setConfirmedPlayers([]);
      setTeamA([]);
      setTeamB([]);
      setTeamsGenerated(false);
    }
  }, [selectedMatch, fetchConfirmedPlayers]);

  const addPlayerToConfirmed = async (player: JugadorMM) => {
    if (!selectedMatch) return;
    const { error } = await confirmarJugador(selectedMatch, player.id);
    if (!error) setConfirmedPlayers((prev) => [...prev, player]);
  };

  const addGuestToPool = async () => {
    if (!guestName.trim() || !selectedMatch) return;
    const { invitado, error } = await crearInvitado(selectedMatch, guestName.trim() + ' (I)', parseFloat(guestRating) || 5);
    if (error) {
      console.error(error);
      aviso.error('Error al guardar invitado');
      return;
    }
    if (invitado) setConfirmedPlayers((prev) => [...prev, invitado]);
    setGuestName('');
    setGuestRating('5');
    setShowGuestForm(false);
  };

  const removeFromPool = async (player: JugadorMM) => {
    const id = player.id;
    const quitarDeConfirmados = () => setConfirmedPlayers((prev) => prev.filter((p) => p.id !== id));

    if (esInvitado(player)) {
      if (esInvitadoTemporal(id)) { quitarDeConfirmados(); return; }
      const { error } = await borrarInvitado(id);
      if (!error) quitarDeConfirmados();
      return;
    }

    if (!selectedMatch) return;
    const { error } = await quitarAsistencia(selectedMatch, id);
    if (!error) {
      quitarDeConfirmados();
      setTeamA((prev) => prev.filter((p) => p.id !== id));
      setTeamB((prev) => prev.filter((p) => p.id !== id));
      setSaved(false);
    }
  };

  const saveGuestName = async (guestId: string) => {
    if (!editingGuestName.trim() || !selectedMatch) return;
    const newName = nombreDeInvitado(editingGuestName);

    if (!esInvitadoTemporal(guestId)) {
      const { error } = await renombrarInvitado(guestId, newName);
      if (error) {
        console.error(error);
        aviso.error('Error al actualizar nombre del invitado');
        return;
      }
    }

    const conNombreNuevo = (list: JugadorMM[]) => list.map((p) => (p.id === guestId ? { ...p, name: newName, isGuest: true } : p));
    setConfirmedPlayers(conNombreNuevo);
    setTeamA(conNombreNuevo);
    setTeamB(conNombreNuevo);

    setEditingGuestId(null);
    setEditingGuestName('');
    setSaved(false);
  };

  const generateTeams = () => {
    if (confirmedPlayers.length < MINIMO_PARA_ARMAR) return;
    const equipos = armarEquipos(confirmedPlayers);
    setTeamA(equipos.teamA);
    setTeamB(equipos.teamB);
    setSaved(false);
    setTeamsGenerated(true);
  };

  const saveTeams = async () => {
    if (!selectedMatch || !canManage) return;
    try {
      await guardarEquipos(selectedMatch, { team_a: teamA, team_b: teamB, metadata: { formationA, formationB, colorA, colorB } });
      setSaved(true);
    } catch (e) {
      console.error(e);
      aviso.error('Error al guardar');
    }
  };

  const handleSendFinalList = async () => {
    if (!selectedMatch || !canManage) return;
    setSendingList(true);
    try {
      const webhookUrl = import.meta.env.VITE_N8N_LISTA_FINAL_URL || import.meta.env.VITE_N8N_WEBHOOK_URL;
      if (!webhookUrl) {
        aviso.info('No hay URL de webhook configurada (VITE_N8N_LISTA_FINAL_URL).');
        return;
      }
      await fetch(webhookUrl, {
        method: 'POST',
        // Sin la llave de administrador de n8n: el webhook no la pide y
        // mandarla la dejaba a la vista de cualquiera en la web.
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosListaFinal(currentMatchObj, { teamA, teamB, colorA, colorB, formationA, formationB })),
      });
      aviso.ok('¡Lista final enviada con éxito!');
    } catch (e) {
      console.error(e);
      aviso.error('Error técnico al enviar la lista final');
    } finally {
      setSendingList(false);
    }
  };

  const addGuestToTeam = (team: Equipo) => {
    if (!guestModalName.trim()) return;
    const guest: JugadorMM = {
      id: `guest-${Date.now()}`, name: guestModalName.trim() + ' (I)', rating: parseFloat(guestModalRating) || 5,
      position: 'Invitado', photo_url: null, nickname: null, isGuest: true,
    };
    if (team === 'A') setTeamA((prev) => [...prev, guest]);
    else setTeamB((prev) => [...prev, guest]);
    setGuestModalName('');
    setGuestModalRating('5');
    setShowGuestModal(null);
    setSaved(false);
  };

  /** Primer toque elige a un jugador; el segundo lo intercambia con otro (o lo suelta si es el mismo). */
  const handleSwap = (team: Equipo, index: number) => {
    if (!swapSelection) { setSwapSelection({ team, index }); return; }
    if (swapSelection.team === team && swapSelection.index === index) { setSwapSelection(null); return; }
    const equipos = intercambiar(teamA, teamB, swapSelection, { team, index });
    setTeamA(equipos.teamA);
    setTeamB(equipos.teamB);
    setSwapSelection(null);
    setSaved(false);
  };

  const copiar = (texto: string) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };
  const copyTeamsForWhatsApp = () => copiar(textoEquipos(teamSettings.team_name, currentMatchObj, { teamA, teamB, colorA, colorB }));
  const copyForWhatsApp = () => copiar(textoAsistencia(teamSettings.team_name, currentMatchObj, confirmedPlayers, declinedPlayers, allActivePlayers));

  const isFreePlan = (teamSettings.plan || 'free') === 'free';
  const guestCount = confirmedPlayers.filter(esInvitado).length;
  const registeredCount = confirmedPlayers.length - guestCount;

  return {
    loading, setLoading, matches, selectedMatch, setSelectedMatch, confirmedPlayers, declinedPlayers, allActivePlayers, teamSettings,
    teamA, setTeamA, teamB, setTeamB, formationA, setFormationA, formationB, setFormationB, colorA, setColorA, colorB, setColorB,
    swapSelection, setSwapSelection, saved, setSaved, sendingList, teamsGenerated, setTeamsGenerated, copied,
    editingGuestId, setEditingGuestId, editingGuestName, setEditingGuestName, showAddPlayerPanel, setShowAddPlayerPanel,
    showGuestForm, setShowGuestForm, guestName, setGuestName, guestRating, setGuestRating,
    showGuestModal, setShowGuestModal, guestModalName, setGuestModalName, guestModalRating, setGuestModalRating,
    currentMatchObj, isPastMatch, canEdit, getMatchFormations,
    addPlayerToConfirmed, addGuestToPool, removeFromPool, saveGuestName, generateTeams, saveTeams, handleSendFinalList,
    addGuestToTeam, handleSwap, copyTeamsForWhatsApp, copyForWhatsApp,
    isFreePlan, guestCount, registeredCount,
    canAddGuest: !isFreePlan || guestCount < FREE_GUEST_LIMIT,
    canAddRegistered: !isFreePlan || registeredCount < FREE_PLAYER_LIMIT,
  };
}
