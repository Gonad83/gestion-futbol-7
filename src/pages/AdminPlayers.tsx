import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase, withTimeout } from '../lib/supabase';
import { Star, Edit2, Trash2, Bell, BellOff, CheckCircle2, Circle, DollarSign, BellRing, Send, Loader2, Crown, ShieldCheck, MoreHorizontal, ChevronDown } from 'lucide-react';
import PlayerModal from '../components/PlayerModal';
import { useAuth } from '../hooks/useAuth';
import { sendMatchReminder, sendPaymentReminder } from '../lib/sendEmail';

export default function AdminPlayers() {
  const { teamId, isAdmin } = useAuth();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [sending, setSending] = useState<'pago' | 'recordatorio' | 'lista' | null>(null);
  const [teamName, setTeamName] = useState('Real Ebolo FC');
  const [filterAccount, setFilterAccount] = useState<'all' | 'unlinked'>('all');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [sendMenuOpen, setSendMenuOpen] = useState(false);
  const sendMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (teamId) fetchPlayers(); }, [teamId]);

  // Close send menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sendMenuRef.current && !sendMenuRef.current.contains(e.target as Node)) setSendMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const { data } = (await withTimeout(
        supabase.from('players').select('*').eq('team_id', teamId).order('name') as any, 10000
      )) as any;
      if (data) setPlayers(data);

      const { data: matches } = (await withTimeout(
        supabase.from('matches').select('*').eq('team_id', teamId)
          .gte('date', new Date().toISOString()).order('date').limit(1) as any, 8000
      )) as any;

      if (matches && matches.length > 0) {
        setNextMatch(matches[0]);
        const { data: att } = (await withTimeout(
          supabase.from('attendance').select('*').eq('match_id', matches[0].id) as any, 5000
        )) as any;
        if (att) setAttendances(att);
      }

      const { data: settings } = (await withTimeout(
        supabase.from('team_settings').select('*').eq('id', teamId).single() as any, 5000
      )) as any;
      if (settings) setTeamName(settings.team_name || 'Real Ebolo FC');
    } catch (e) {
      console.error('Error in AdminPlayers fetch:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = async (playerId: string) => {
    if (!isAdmin || !nextMatch) return;
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

  const toggleNotify = async (player: any) => {
    if (!isAdmin) return;
    setTogglingId(player.id + 'notify');
    const update = { notify: !player.notify };
    await supabase.from('players').update(update).eq('id', player.id).eq('team_id', teamId);
    setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, ...update } : p));
    setTogglingId(null);
  };

  const changeStatus = async (player: any, newStatus: string) => {
    if (!isAdmin) return;
    await supabase.from('players').update({ status: newStatus }).eq('id', player.id).eq('team_id', teamId);
    setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, status: newStatus } : p));
  };

  const handleDelete = async (player: any) => {
    if (!isAdmin) return;
    if (!confirm(`¿Eliminar a ${player.name}? Esta acción no se puede deshacer.`)) return;
    setMenuId(null);
    await supabase.from('attendance').delete().eq('player_id', player.id);
    await supabase.from('payments').delete().eq('player_id', player.id);
    await supabase.from('players').delete().eq('id', player.id);
    setPlayers(prev => prev.filter(p => p.id !== player.id));
  };

  const handleEdit = (player: any) => { setMenuId(null); setSelectedPlayer(player); setIsModalOpen(true); };

  const toggleCaptainRole = async (player: any) => {
    if (!isAdmin) return;
    const captains = players.filter(p => p.match_role === 'captain' && p.id !== player.id);
    const subcaptains = players.filter(p => p.match_role === 'subcaptain' && p.id !== player.id);
    let newRole: string | null = null;
    if (!player.match_role) {
      if (subcaptains.length >= 3) { alert('Ya hay 3 subcapitanes.'); return; }
      newRole = 'subcaptain';
    } else if (player.match_role === 'subcaptain') {
      if (captains.length >= 1) { alert('Ya hay un capitán.'); return; }
      newRole = 'captain';
    }
    await supabase.from('players').update({ match_role: newRole }).eq('id', player.id).eq('team_id', teamId);
    setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, match_role: newRole } : p));
  };

  const bulkNotify = async (value: boolean) => {
    if (!isAdmin) return;
    await supabase.from('players').update({ notify: value }).eq('team_id', teamId);
    setPlayers(prev => prev.map(p => ({ ...p, notify: value })));
  };

  const sendToPlayer = async (type: 'pago' | 'recordatorio', player: any) => {
    setMenuId(null);
    if (!player.email) { alert(`${player.name} no tiene email registrado.`); return; }
    try {
      if (type === 'recordatorio' && nextMatch) {
        const date = format(new Date(nextMatch.date), "EEEE d 'de' MMMM, HH:mm", { locale: es });
        const confirmUrl = `${window.location.origin}/confirmar?player_id=${player.id}&match_id=${nextMatch.id}&status=Voy`;
        const declineUrl = `${window.location.origin}/confirmar?player_id=${player.id}&match_id=${nextMatch.id}&status=No%20voy`;
        await sendMatchReminder(player.email, player.name, date, nextMatch.location || '', confirmUrl, declineUrl);
      } else if (type === 'pago') {
        await sendPaymentReminder(player.email, player.name, ['Cuota pendiente'], '$8.000');
      }
      alert(`Email enviado a ${player.name}.`);
    } catch { alert('Error al enviar el email.'); }
  };

  const sendBulk = async (type: 'pago' | 'recordatorio' | 'lista') => {
    setSendMenuOpen(false);
    if (type === 'lista') {
      const url = import.meta.env.VITE_N8N_LISTA_FINAL_URL;
      if (!url) { alert('Configura VITE_N8N_LISTA_FINAL_URL en el .env'); return; }
      if (!confirm('¿Enviar la lista final a todo el equipo?')) return;
      setSending('lista');
      try {
        const confirmed = players.filter(p => attendances.some(a => a.player_id === p.id && a.status === 'Voy'));
        const declined  = players.filter(p => attendances.some(a => a.player_id === p.id && a.status === 'No voy'));
        const pending   = players.filter(p => p.status === 'Activo' && !attendances.some(a => a.player_id === p.id));
        const res = await fetch(url, {
          method: 'POST',
          // El webhook no necesita credenciales. Antes se mandaba aquí la llave de
          // administrador de n8n, y por eso viajaba dentro de la web pública.
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'admin_summary',
            match_date: nextMatch ? format(new Date(nextMatch.date), "EEEE d 'de' MMMM, HH:mm", { locale: es }) : 'Próximo partido',
            match_location: nextMatch?.location || 'Cancha habitual',
            lista_confirmados: confirmed.map(p => `✅ ${p.name}`).join('\n') || 'Ninguno',
            lista_bajas: declined.map(p => `❌ ${p.name}`).join('\n') || 'Ninguno',
            lista_pendientes: pending.map(p => `⏳ ${p.name}`).join('\n') || 'Ninguno',
            confirmados_count: confirmed.length, bajas_count: declined.length,
            pendientes_count: pending.length, team_info: teamName,
          }),
        });
        if (res.ok) alert('Lista final enviada.'); else alert(`Error: ${res.status}`);
      } catch { alert('Error al enviar.'); }
      setSending(null);
      return;
    }

    let targets = players.filter(p => p.notify !== false && p.status === 'Activo' && p.email);
    if (type === 'recordatorio') targets = targets.filter(p => !attendances.some(a => a.player_id === p.id && a.status === 'Voy'));
    if (targets.length === 0) { alert('No hay jugadores a los que enviar.'); return; }
    if (!confirm(`¿Enviar ${type === 'pago' ? 'cobro' : 'recordatorio'} a ${targets.length} jugadores?`)) return;
    setSending(type);
    try {
      let sent = 0;
      for (const p of targets) {
        if (type === 'recordatorio' && nextMatch) {
          const date = format(new Date(nextMatch.date), "EEEE d 'de' MMMM, HH:mm", { locale: es });
          const ok = await sendMatchReminder(p.email, p.name, date, nextMatch.location || '',
            `${window.location.origin}/confirmar?player_id=${p.id}&match_id=${nextMatch.id}&status=Voy`,
            `${window.location.origin}/confirmar?player_id=${p.id}&match_id=${nextMatch.id}&status=No%20voy`);
          if (ok) sent++;
        } else if (type === 'pago') {
          const ok = await sendPaymentReminder(p.email, p.name, ['Cuota pendiente'], '$8.000');
          if (ok) sent++;
        }
      }
      alert(`Enviados ${sent} de ${targets.length} emails.`);
    } catch { alert('Error al enviar.'); }
    setSending(null);
  };

  const syncAccounts = async () => {
    if (!confirm('¿Intentar vincular jugadores con sus cuentas de usuario?')) return;
    setLoading(true);
    const { data } = await supabase.from('players').select('*').order('name');
    if (data) setPlayers(data);
    setLoading(false);
    alert('Datos actualizados.');
  };

  const STATUS_STYLE: Record<string, string> = {
    Activo:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    Lesionado:'bg-red-500/15 text-red-400 border-red-500/25',
    Inactivo: 'bg-white/5 text-white/30 border-white/10',
  };

  const unlinkedCount = players.filter(p => !p.user_id).length;

  return (
    <div className="fade-in pb-20 md:pb-0 space-y-6" onClick={() => { setMenuId(null); }}>
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-soccer-green/70 mb-1">Panel</p>
        <h1 className="font-headline text-3xl font-black text-white tracking-tight">Administrar Equipo</h1>
        <p className="text-white/35 text-sm mt-1">Gestiona plantilla, notificaciones y perfil del equipo.</p>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}>

        {/* Toolbar */}
        <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3" style={{ background: '#0a0e14', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Left */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => bulkNotify(true)} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl transition-all" style={{ background: 'rgba(154,203,255,0.08)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.15)' }}>
              <Bell size={12} /> Activar notif.
            </button>
            <button onClick={() => bulkNotify(false)} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl transition-all" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <BellOff size={12} /> Desactivar
            </button>
            <button onClick={syncAccounts} disabled={loading} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl" style={{ background: 'rgba(68,243,169,0.06)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.15)' }}>
              <CheckCircle2 size={12} /> Vincular cuentas
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {unlinkedCount > 0 && (
              <button
                onClick={() => setFilterAccount(f => f === 'all' ? 'unlinked' : 'all')}
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl transition-all ${filterAccount === 'unlinked' ? 'bg-amber-500 text-black' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}
              >
                <Circle size={12} /> {filterAccount === 'unlinked' ? 'Viendo sin cuenta' : `${unlinkedCount} sin cuenta`}
              </button>
            )}

            {/* Enviar dropdown */}
            <div className="relative" ref={sendMenuRef} onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setSendMenuOpen(v => !v)}
                disabled={sending !== null}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl transition-all disabled:opacity-50"
                style={{ background: 'rgba(68,243,169,0.08)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}
              >
                {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Enviar a todos
                <ChevronDown size={11} style={{ transform: sendMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {sendMenuOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-2xl min-w-[180px]" style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button onClick={() => sendBulk('recordatorio')} className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-left hover:bg-white/5 transition-colors" style={{ color: '#9acbff' }}>
                    <BellRing size={13} /> Recordatorio partido
                  </button>
                  <button onClick={() => sendBulk('pago')} className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-left hover:bg-white/5 transition-colors" style={{ color: '#ffd08b' }}>
                    <DollarSign size={13} /> Cobro de cuota
                  </button>
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                  <button onClick={() => sendBulk('lista')} className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-left hover:bg-white/5 transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <Send size={13} /> Lista final (n8n)
                  </button>
                </div>
              )}
            </div>
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
                  <th className="px-4 py-4 text-center">Notif</th>
                  <th className="px-4 py-4 text-center">Asiste</th>
                  <th className="px-4 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {players
                  .filter(p => filterAccount === 'all' || !p.user_id)
                  .map(player => {
                    const isGoing = attendances.some(a => a.player_id === player.id && a.status === 'Voy');
                    const isMenuOpen = menuId === player.id;
                    return (
                      <tr key={player.id}
                        className={`transition-colors hover:bg-white/[0.02] ${player.status === 'Inactivo' ? 'opacity-40' : ''}`}
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
                                {!player.user_id
                                  ? <span className="text-[8px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 rounded-sm leading-tight">Sin Cuenta</span>
                                  : <div className="w-1.5 h-1.5 rounded-full bg-soccer-green/40 shadow-[0_0_4px_rgba(68,243,169,0.5)]" />
                                }
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

                        {/* Rol */}
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleCaptainRole(player)}
                            title={player.match_role === 'captain' ? 'Capitán — quitar' : player.match_role === 'subcaptain' ? 'Subcapitán — promover' : 'Sin rol — asignar'}
                            className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all"
                            style={player.match_role === 'captain'
                              ? { background: 'rgba(255,208,139,0.15)', color: '#ffd08b', border: '1px solid rgba(255,208,139,0.35)' }
                              : player.match_role === 'subcaptain'
                              ? { background: 'rgba(154,203,255,0.1)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.25)' }
                              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.07)' }}
                          >
                            {player.match_role === 'subcaptain' ? <ShieldCheck size={14} /> : <Crown size={14} />}
                          </button>
                        </td>

                        {/* Estado */}
                        <td className="px-4 py-3 text-center">
                          <select value={player.status} onChange={e => changeStatus(player, e.target.value)}
                            className={`text-[10px] font-bold px-2 py-1 rounded-full border cursor-pointer bg-transparent outline-none ${STATUS_STYLE[player.status] || STATUS_STYLE.Inactivo}`}>
                            <option value="Activo" className="bg-slate-900 text-emerald-400">Activo</option>
                            <option value="Lesionado" className="bg-slate-900 text-red-400">Lesionado</option>
                            <option value="Inactivo" className="bg-slate-900 text-white/30">Inactivo</option>
                          </select>
                        </td>

                        {/* Notif */}
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleNotify(player)} disabled={togglingId === player.id + 'notify'}
                            title={player.notify !== false ? 'Recibe emails' : 'Sin emails'}
                            className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all"
                            style={player.notify !== false
                              ? { background: 'rgba(154,203,255,0.1)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.2)' }
                              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            {player.notify !== false ? <Bell size={14} /> : <BellOff size={14} />}
                          </button>
                        </td>

                        {/* Asiste */}
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleAttendance(player.id)}
                            disabled={!nextMatch || togglingId === player.id + 'att'}
                            title={!nextMatch ? 'No hay partidos próximos' : 'Confirmar asistencia'}
                            className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all"
                            style={isGoing
                              ? { background: '#44f3a9', color: '#003822', boxShadow: '0 0 12px rgba(68,243,169,0.3)' }
                              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            {isGoing ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                          </button>
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 justify-end" onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleEdit(player)} title="Editar"
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:text-soccer-green"
                              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>
                              <Edit2 size={13} />
                            </button>

                            {/* ··· menu */}
                            <div className="relative">
                              <button onClick={() => setMenuId(isMenuOpen ? null : player.id)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                                style={isMenuOpen
                                  ? { background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }
                                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <MoreHorizontal size={13} />
                              </button>
                              {isMenuOpen && (
                                <div className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-2xl min-w-[170px]" style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.1)' }}>
                                  {nextMatch && (
                                    <button onClick={() => sendToPlayer('recordatorio', player)}
                                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-left hover:bg-white/5 transition-colors"
                                      style={{ color: '#9acbff' }}>
                                      <BellRing size={12} /> Recordatorio partido
                                    </button>
                                  )}
                                  <button onClick={() => sendToPlayer('pago', player)}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-left hover:bg-white/5 transition-colors"
                                    style={{ color: '#ffd08b' }}>
                                    <DollarSign size={12} /> Enviar cobro
                                  </button>
                                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                                  <button onClick={() => handleDelete(player)}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-left hover:bg-red-500/10 transition-colors"
                                    style={{ color: '#f87171' }}>
                                    <Trash2 size={12} /> Eliminar jugador
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
