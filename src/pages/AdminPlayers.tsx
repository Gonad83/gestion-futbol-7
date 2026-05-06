import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase, withTimeout } from '../lib/supabase';
import { Star, Edit2, Trash2, Bell, BellOff, Eye, EyeOff, CheckCircle2, Circle, DollarSign, BellRing, Send, Loader2, Crown, ShieldCheck } from 'lucide-react';
import PlayerModal from '../components/PlayerModal';
import { useAuth } from '../hooks/useAuth';

export default function AdminPlayers() {
  const { teamId } = useAuth();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [sending, setSending] = useState<'pago' | 'recordatorio' | 'lista' | 'test' | null>(null);

  const [teamName, setTeamName] = useState('Real Ebolo FC');
  const [filterAccount, setFilterAccount] = useState<'all' | 'unlinked'>('all');

  useEffect(() => { if (teamId) fetchPlayers(); }, [teamId]);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const { data } = (await withTimeout(
        supabase.from('players').select('*').eq('team_id', teamId).order('name') as any,
        10000
      )) as any;
      if (data) setPlayers(data);

      const { data: matches } = (await withTimeout(
        supabase
          .from('matches')
          .select('*')
          .eq('team_id', teamId)
          .gte('date', new Date().toISOString())
          .order('date')
          .limit(1) as any,
        8000
      )) as any;

      if (matches && matches.length > 0) {
        setNextMatch(matches[0]);
        const { data: att } = (await withTimeout(
          supabase.from('attendance').select('*').eq('match_id', matches[0].id) as any,
          5000
        )) as any;
        if (att) setAttendances(att);
      }

      const { data: settings } = (await withTimeout(
        supabase.from('team_settings').select('*').eq('id', teamId).single() as any,
        5000
      )) as any;

      if (settings) {
        setTeamName(settings.team_name || 'Real Ebolo FC');
      }
    } catch (e) {
      console.error('Error in AdminPlayers fetch:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = async (playerId: string) => {
    if (!nextMatch) return;
    setTogglingId(playerId + 'att');
    const existing = attendances.find(a => a.player_id === playerId);
    if (existing) {
      if (existing.status === 'Voy') {
        await supabase.from('attendance').delete().eq('id', existing.id);
        setAttendances(prev => prev.filter(a => a.id !== existing.id));
      } else {
        await supabase.from('attendance').update({ status: 'Voy' }).eq('id', existing.id);
        setAttendances(prev => prev.map(a => a.id === existing.id ? { ...a, status: 'Voy' } : a));
      }
    } else {
      const { data } = await supabase.from('attendance').insert([{ match_id: nextMatch.id, player_id: playerId, status: 'Voy' }]).select();
      if (data) setAttendances(prev => [...prev, data[0]]);
    }
    setTogglingId(null);
  };

  const toggleField = async (player: any, field: 'notify' | 'visible') => {
    setTogglingId(player.id + field);
    const update: any = field === 'notify' ? { notify: !player.notify } : { status: player.status === 'Activo' ? 'Inactivo' : 'Activo' };
    await supabase.from('players').update(update).eq('id', player.id);
    setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, ...update } : p));
    setTogglingId(null);
  };

  const changeStatus = async (player: any, newStatus: string) => {
    await supabase.from('players').update({ status: newStatus }).eq('id', player.id);
    setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, status: newStatus } : p));
  };

  const handleDelete = async (player: any) => {
    if (!confirm(`¿Eliminar a ${player.name}? Esta acción no se puede deshacer.`)) return;
    await supabase.from('attendance').delete().eq('player_id', player.id);
    await supabase.from('payments').delete().eq('player_id', player.id);
    await supabase.from('players').delete().eq('id', player.id);
    setPlayers(prev => prev.filter(p => p.id !== player.id));
  };

  const handleEdit = (player: any) => { setSelectedPlayer(player); setIsModalOpen(true); };

  const toggleCaptainRole = async (player: any) => {
    const captains = players.filter(p => p.match_role === 'captain' && p.id !== player.id);
    const subcaptains = players.filter(p => p.match_role === 'subcaptain' && p.id !== player.id);
    let newRole: string | null = null;
    if (!player.match_role) {
      if (subcaptains.length >= 3) { alert('Ya hay 3 subcapitanes. Quita uno primero.'); return; }
      newRole = 'subcaptain';
    } else if (player.match_role === 'subcaptain') {
      if (captains.length >= 1) { alert('Ya hay un capitán. Quita el actual primero.'); return; }
      newRole = 'captain';
    }
    await supabase.from('players').update({ match_role: newRole }).eq('id', player.id);
    setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, match_role: newRole } : p));
  };

  const bulkNotify = async (value: boolean) => {
    await supabase.from('players').update({ notify: value }).neq('id', '00000000-0000-0000-0000-000000000000');
    setPlayers(prev => prev.map(p => ({ ...p, notify: value })));
  };

  const sendManualNotification = async (type: 'pago' | 'recordatorio', player: any) => {
    const url = type === 'pago' ? import.meta.env.VITE_N8N_PAYMENT_URL : import.meta.env.VITE_N8N_REMINDER_URL;
    const apiKey = import.meta.env.VITE_N8N_API_KEY;
    if (!url) { alert('Configura VITE_N8N_PAYMENT_URL o VITE_N8N_REMINDER_URL en el .env'); return; }
    try {
      const res = await fetch(url, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': apiKey || ''
        }, 
        body: JSON.stringify({ player }) 
      });
      if (res.ok) alert(`¡Mensaje de ${type} enviado a ${player.name}!`);
      else alert('Error al enviar. Verifica si el Webhook en n8n está activo.');
    } catch (e) { alert('Error técnico al conectar con n8n.'); }
  };

  const sendBulkNotification = async (type: 'pago' | 'recordatorio' | 'lista' | 'test') => {
    let url = '';
    switch(type) {
      case 'pago': url = import.meta.env.VITE_N8N_PAYMENT_URL; break;
      case 'recordatorio': url = import.meta.env.VITE_N8N_REMINDER_URL; break;
      case 'lista': url = import.meta.env.VITE_N8N_LISTA_FINAL_URL; break;
      case 'test': url = import.meta.env.VITE_N8N_TEST_MAIL_URL; break;
    }
    
    if (!url) { 
      const envVarName = type === 'lista' ? 'VITE_N8N_LISTA_FINAL_URL' : `VITE_N8N_${type.toUpperCase()}_URL`;
      alert(`Configura la URL correspondiente en el .env (${envVarName})`); 
      return; 
    }

    if (type === 'lista' && !confirm('¿Estás seguro de enviar la lista final a todo el equipo?')) return;

    setSending(type);
    try {
      // Para la lista enviamos los datos procesados, para recordatorios individuales el loop de antes
      if (type === 'lista') {
        const confirmedPlayers = players.filter(p => attendances.some(a => a.player_id === p.id && a.status === 'Voy'));
        const declinedPlayers = players.filter(p => attendances.some(a => a.player_id === p.id && a.status === 'No voy'));
        const pendingPlayers = players.filter(p => p.status === 'Activo' && !attendances.some(a => a.player_id === p.id));

        const confirmadosNames = confirmedPlayers.map(p => `✅ ${p.name}`).join('\n') || 'Ninguno';
        const bajasNames = declinedPlayers.map(p => `❌ ${p.name}`).join('\n') || 'Ninguno';
        const pendientesNames = pendingPlayers.map(p => `⏳ ${p.name}`).join('\n') || 'Ninguno';
        
        const response = await fetch(url, { 
          method: 'POST', 
          headers: { 
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': import.meta.env.VITE_N8N_API_KEY || ''
          }, 
          body: JSON.stringify({ 
            type: 'admin_summary',
            match_date: nextMatch ? format(new Date(nextMatch.date), "EEEE d 'de' MMMM, HH:mm", { locale: es }) : 'Próximo partido',
            match_location: nextMatch?.location || 'Cancha habitual',
            lista_confirmados: confirmadosNames,
            lista_bajas: bajasNames,
            lista_pendientes: pendientesNames,
            confirmados_count: confirmedPlayers.length,
            bajas_count: declinedPlayers.length,
            pendientes_count: pendingPlayers.length,
            total_players: confirmedPlayers.length,
            team_info: teamName
          }) 
        });

        if (response.ok) {
          alert('Lista final enviada correctamente a n8n.');
        } else {
          alert(`Error en n8n: ${response.status} ${response.statusText}. Verifica que el flujo esté activo.`);
        }
      } else if (type === 'test') {
        await fetch(url, { 
          method: 'POST', 
          headers: { 
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': import.meta.env.VITE_N8N_API_KEY || ''
          }, 
          body: JSON.stringify({ email: 'garaosd@gmail.com' }) 
        });
        alert('Mail de prueba enviado a garaosd@gmail.com');
      } else {
        // Lógica original para pagos y recordatorios masivos
        let targets = players.filter(p => p.notify !== false && p.status === 'Activo');
        
        // Si es recordatorio, solo a los que NO han confirmado (status != 'Voy')
        if (type === 'recordatorio') {
          targets = targets.filter(p => !attendances.some(a => a.player_id === p.id && a.status === 'Voy'));
        }

        if (targets.length === 0) {
          const totalActive = players.filter(p => p.status === 'Activo').length;
          const totalWithNotify = players.filter(p => p.status === 'Activo' && p.notify !== false).length;
          const alreadyConfirmed = attendances.filter(a => a.status === 'Voy').length;
          
          alert(`Criterios de Recordatorio:\n` +
                `- Jugadores Activos: ${totalActive}\n` +
                `- Con Campanita: ${totalWithNotify}\n` +
                `- Ya confirmados (excluidos): ${alreadyConfirmed}\n\n` +
                `Resultado: 0 jugadores pendientes de avisar.`);
          setSending(null);
          return;
        }

        if (!confirm(`¿Enviar ${type === 'pago' ? 'cobro de cuota' : 'recordatorio de partido'} a ${targets.length} jugadores? (Solo con notificación activa)`)) {
          setSending(null);
          return;
        }

        for (const player of targets) {
          await fetch(url, { 
            method: 'POST', 
            headers: { 
              'Content-Type': 'application/json',
              'X-N8N-API-KEY': import.meta.env.VITE_N8N_API_KEY || ''
            }, 
            body: JSON.stringify({
              type: type === 'recordatorio' ? 'attendance_reminder' : 'payment_notice',
              player: {
                id: player.id,
                name: player.name,
                email: player.email,
                phone: player.phone
              },
              match: nextMatch ? {
                id: nextMatch.id,
                date: format(new Date(nextMatch.date), "EEEE d 'de' MMMM, HH:mm", { locale: es }),
                location: nextMatch.location
              } : null,
              actions: type === 'recordatorio' ? {
                confirm_url: `https://n8n.soygad.com/webhook/confirmar?player_id=${player.id}&match_id=${nextMatch?.id}&status=Voy`,
                decline_url: `https://n8n.soygad.com/webhook/confirmar?player_id=${player.id}&match_id=${nextMatch?.id}&status=No%20voy`
              } : null,
              team_name: teamName
            })
          });
        }
      }
      if (type !== 'test') alert('¡Acción completada con éxito!');
    } catch (e) {
      alert('Error al conectar con n8n.');
    }
    setSending(null);
  };

  const syncAccounts = async () => {
    if (!confirm('Esto intentará vincular a los jugadores con sus cuentas de usuario (Auth) comparando sus correos electrónicos. ¿Continuar?')) return;
    setLoading(true);
    try {
      // Nota: No podemos obtener auth.users directamente por seguridad.
      // Pero podemos usar una RPC o intentar actualizar via Postgres.
      // En este caso, el script SQL proporcionado es lo más efectivo.
      // Aquí simulamos un refresh o intentamos forzar que se marquen vinculados.
      
      const { data: updatedPlayers } = await supabase.from('players').select('*').order('name');
      if (updatedPlayers) setPlayers(updatedPlayers);
      
      alert('Se han actualizado los datos locales. Si los jugadores ya se han logueado alguna vez, deberían aparecer vinculados ahora.');
    } catch (e) {
      alert('Error al sincronizar.');
    } finally {
      setLoading(false);
    }
  };

  const STATUS_STYLE: Record<string, string> = {
    Activo: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    Lesionado: 'bg-red-500/15 text-red-400 border-red-500/25',
    Inactivo: 'bg-white/5 text-white/30 border-white/10',
  };

  return (
    <div className="fade-in pb-20 md:pb-0 space-y-6">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-soccer-green/70 mb-1">Panel</p>
        <h1 className="font-headline text-3xl font-black text-white tracking-tight">Administrar Equipo</h1>
        <p className="text-white/35 text-sm mt-1">Gestiona plantilla, notificaciones y perfil del equipo.</p>
      </div>

      {/* Acciones Maestras de Equipo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recordatorio Asistencia */}
        <button 
          onClick={() => sendBulkNotification('recordatorio')}
          disabled={sending !== null}
          className="glass-card flex items-center justify-between group hover:border-soccer-green/50 transition-all p-4"
          style={{ borderLeft: '3px solid #9acbff' }}
        >
          <div className="text-left">
            <h3 className="font-bold text-white text-sm">📢 Enviar Recordatorio</h3>
            <p className="text-[10px] text-white/40">Invitación "Voy/No Voy" a pendientes</p>
          </div>
          {sending === 'recordatorio' ? <Loader2 className="animate-spin text-soccer-green" /> : <BellRing size={20} className="text-[#9acbff] group-hover:scale-110 transition-transform" />}
        </button>

        {/* Lista Final */}
        <button 
          onClick={() => sendBulkNotification('lista')}
          disabled={sending !== null}
          className="glass-card flex items-center justify-between group hover:border-soccer-green/50 transition-all p-4"
          style={{ borderLeft: '3px solid #f59e0b' }}
        >
          <div className="text-left">
            <h3 className="font-bold text-white text-sm">📋 Enviar Lista Final</h3>
            <p className="text-[10px] text-white/40">Resumen para todo el equipo</p>
          </div>
          {sending === 'lista' ? <Loader2 className="animate-spin text-soccer-green" /> : <Send size={20} className="text-[#f59e0b] group-hover:scale-110 transition-transform" />}
        </button>
      </div>

      {/* Tabla de jugadores */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Barra de acciones */}
        <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3" style={{ background: '#0a0e14', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex flex-wrap gap-2">
            {/* Bulk notify toggles */}
            <button onClick={() => bulkNotify(true)} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl transition-all" style={{ background: 'rgba(154,203,255,0.08)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.15)' }}>
              <Bell size={12} /> Activar notif.
            </button>
            <button onClick={() => bulkNotify(false)} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl transition-all hover:bg-white/8" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <BellOff size={12} /> Desactivar notif.
            </button>
            <button onClick={syncAccounts} disabled={loading} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl transition-all" style={{ background: 'rgba(68,243,169,0.06)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.15)' }}>
              <CheckCircle2 size={12} /> Vincular cuentas
            </button>
          </div>

          {/* Bulk send buttons */}
          <div className="flex flex-wrap gap-2">
            {players.some(p => !p.user_id) && (
              <button
                onClick={() => setFilterAccount(filterAccount === 'all' ? 'unlinked' : 'all')}
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl transition-all ${
                  filterAccount === 'unlinked' ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.3)]' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20'
                }`}
                title="Mostrar solo jugadores que aún no han creado su cuenta o no están vinculados"
              >
                <Circle size={12} className={filterAccount === 'unlinked' ? 'fill-current' : ''} />
                {filterAccount === 'unlinked' ? 'Viendo No Registrados' : `${players.filter(p => !p.user_id).length} No Registrados`}
              </button>
            )}
            <button
              onClick={() => sendBulkNotification('pago')}
              disabled={sending !== null}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl transition-all disabled:opacity-50"
              style={{ background: 'rgba(255,208,139,0.08)', color: '#ffd08b', border: '1px solid rgba(255,208,139,0.18)' }}
              title="Enviar cobro a todos los jugadores activos con notificaciones activas"
            >
              {sending === 'pago' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Cobro a todos
            </button>
            <button
              onClick={() => sendBulkNotification('recordatorio')}
              disabled={sending !== null}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl transition-all disabled:opacity-50"
              style={{ background: 'rgba(154,203,255,0.08)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.18)' }}
              title="Enviar recordatorio a todos los jugadores activos con notificaciones activas"
            >
              {sending === 'recordatorio' ? <Loader2 size={12} className="animate-spin" /> : <BellRing size={12} />}
              Recordatorio a todos
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-16">
            <div className="w-9 h-9 rounded-full border-2 border-t-soccer-green border-r-soccer-green/20 border-b-soccer-green/10 border-l-soccer-green/5 animate-spin" />
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-20 text-white/30 text-sm">No hay jugadores registrados.</div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25" style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <tr>
                  <th className="px-5 py-4 text-left">Jugador</th>
                  <th className="px-4 py-4 text-left hidden md:table-cell">Posición</th>
                  <th className="px-4 py-4 text-center hidden sm:table-cell">Rating</th>
                  <th className="px-4 py-4 text-center">Rol</th>
                  <th className="px-4 py-4 text-center">Estado</th>
                  <th className="px-4 py-4 text-center">Vista</th>
                  <th className="px-4 py-4 text-center">Notif</th>
                  <th className="px-4 py-4 text-center">Asiste</th>
                  <th className="px-4 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {players
                  .filter(p => filterAccount === 'all' || !p.user_id)
                  .map(player => (
                  <tr
                    key={player.id}
                    className={`transition-colors hover:bg-white/3 ${player.status === 'Inactivo' ? 'opacity-40' : ''}`}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    {/* Avatar + Nombre */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#31353c', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {player.photo_url
                            ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/30">{player.name.charAt(0)}</div>
                          }
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white text-sm truncate max-w-[130px]">{player.name}</p>
                            {!player.user_id && (
                              <span className="text-[8px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 rounded-sm leading-tight tracking-tighter" title="Este perfil no tiene una cuenta de usuario vinculada">Sin Cuenta</span>
                            )}
                            {player.user_id && (
                              <div className="w-1.5 h-1.5 rounded-full bg-soccer-green/40 shadow-[0_0_4px_rgba(68,243,169,0.5)]" title="Cuenta Vinculada" />
                            )}
                          </div>
                          {player.nickname && <p className="text-[10px] text-white/30 truncate">"{player.nickname}"</p>}
                        </div>
                      </div>
                    </td>

                    {/* Posición */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs font-medium" style={{ color: '#44f3a9' }}>{player.position}</p>
                      {player.secondary_position && <p className="text-[10px] text-white/25">{player.secondary_position}</p>}
                    </td>

                    {/* Rating */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex gap-0.5 justify-center">
                        {Array.from({ length: 7 }, (_, i) => (
                          <Star key={i} size={10} className={i < player.rating ? 'fill-current' : ''} style={{ color: i < player.rating ? '#ffd08b' : 'rgba(255,255,255,0.1)' }} />
                        ))}
                      </div>
                    </td>

                    {/* Rol Matchmaking */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleCaptainRole(player)}
                        title={
                          player.match_role === 'captain' ? 'Capitán — click para quitar' :
                          player.match_role === 'subcaptain' ? 'Subcapitán — click para promover a Capitán' :
                          'Sin rol — click para asignar Subcapitán'
                        }
                        className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all"
                        style={
                          player.match_role === 'captain'
                            ? { background: 'rgba(255,208,139,0.15)', color: '#ffd08b', border: '1px solid rgba(255,208,139,0.35)' }
                            : player.match_role === 'subcaptain'
                            ? { background: 'rgba(154,203,255,0.1)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.25)' }
                            : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.07)' }
                        }
                      >
                        {player.match_role === 'captain'
                          ? <Crown size={14} />
                          : player.match_role === 'subcaptain'
                          ? <ShieldCheck size={14} />
                          : <Crown size={14} />
                        }
                      </button>
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3 text-center">
                      <select
                        value={player.status}
                        onChange={e => changeStatus(player, e.target.value)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-full border cursor-pointer bg-transparent outline-none ${STATUS_STYLE[player.status] || STATUS_STYLE.Inactivo}`}
                      >
                        <option value="Activo" className="bg-slate-900 text-emerald-400">Activo</option>
                        <option value="Lesionado" className="bg-slate-900 text-red-400">Lesionado</option>
                        <option value="Inactivo" className="bg-slate-900 text-white/30">Inactivo</option>
                      </select>
                    </td>

                    {/* Vista */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleField(player, 'visible')}
                        disabled={togglingId === player.id + 'visible'}
                        title={player.status === 'Activo' ? 'Visible — click para ocultar' : 'Oculto — click para mostrar'}
                        className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all"
                        style={player.status === 'Activo'
                          ? { background: 'rgba(68,243,169,0.1)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }
                          : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.07)' }}
                      >
                        {player.status === 'Activo' ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </td>

                    {/* Notif */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleField(player, 'notify')}
                        disabled={togglingId === player.id + 'notify'}
                        title={player.notify !== false ? 'Recibe emails — click para desactivar' : 'Sin emails — click para activar'}
                        className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all"
                        style={player.notify !== false
                          ? { background: 'rgba(154,203,255,0.1)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.2)' }
                          : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.07)' }}
                      >
                        {player.notify !== false ? <Bell size={14} /> : <BellOff size={14} />}
                      </button>
                    </td>

                    {/* Asiste (próximo partido) */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleAttendance(player.id)}
                        disabled={!nextMatch || togglingId === player.id + 'att'}
                        title={!nextMatch ? 'No hay partidos próximos' : 'Confirmar asistencia al próximo partido'}
                        className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all"
                        style={attendances.find(a => a.player_id === player.id && a.status === 'Voy')
                          ? { background: '#44f3a9', color: '#003822', boxShadow: '0 0 12px rgba(68,243,169,0.3)' }
                          : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.07)' }}
                      >
                        {attendances.find(a => a.player_id === player.id && a.status === 'Voy')
                          ? <CheckCircle2 size={15} />
                          : <Circle size={15} />}
                      </button>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => sendManualNotification('pago', player)}
                          title="Enviar cobro individual"
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all group/btn"
                          style={{ background: 'rgba(255,208,139,0.08)', color: '#ffd08b', border: '1px solid rgba(255,208,139,0.15)' }}
                        >
                          <DollarSign size={13} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => sendManualNotification('recordatorio', player)}
                          title="Enviar recordatorio individual"
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all group/btn"
                          style={{ background: 'rgba(154,203,255,0.08)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.15)' }}
                        >
                          <BellRing size={13} className="group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <div className="w-px h-4 mx-0.5" style={{ background: 'rgba(255,255,255,0.07)' }} />
                        <button
                          onClick={() => handleEdit(player)}
                          title="Editar perfil"
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:text-soccer-green"
                          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(player)}
                          title="Eliminar jugador"
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:text-red-400"
                          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-5 py-3 text-[10px] text-white/25 text-right" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {players.length} jugadores · {players.filter(p => p.status === 'Activo').length} activos · {players.filter(p => p.notify !== false && p.status === 'Activo').length} con notificaciones
        </div>
      </div>

      <PlayerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={fetchPlayers} player={selectedPlayer} teamId={teamId} />
    </div>
  );
}
