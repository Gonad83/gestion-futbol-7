import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, MapPin, Clock, Users, CheckCircle2, XCircle, Trash2, Circle, Bell } from 'lucide-react';

interface MatchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  match: any;
}

export default function MatchDetailsModal({ isOpen, onClose, onSave, match }: MatchDetailsModalProps) {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [myAttendance, setMyAttendance] = useState<any>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    time: '20:00',
    location: '',
    match_type: '7vs7',
    status: 'Programado',
    event_type: 'Deportivo',
    description: ''
  });

  useEffect(() => {
    if (match?.id) {
      fetchAttendances();
      if (isAdmin) {
        setFormData({
          time: format(new Date(match.date), 'HH:mm'),
          location: match.location,
          match_type: match.match_type || '7vs7',
          status: match.status,
          event_type: match.event_type || 'Deportivo',
          description: match.description || ''
        });
      }
    } else if (match?.date) {
      setFormData(prev => ({ ...prev, time: '20:00', location: '', match_type: '7vs7', status: 'Programado' }));
    }
    
    const fetchMyPlayer = async () => {
      if (user?.id) {
        const { data } = await supabase.from('players').select('id').eq('user_id', user.id).single();
        if (data) setMyPlayerId(data.id);
      }
    };
    fetchMyPlayer();
  }, [match, user]);

  const fetchAttendances = async () => {
    if (!match?.id) return;
    const { data } = await supabase
      .from('attendance')
      .select('*, player:players(name, nickname, photo_url)')
      .eq('match_id', match.id);
      
    if (data) {
      setAttendances(data);
    }
  };

  useEffect(() => {
    if (myPlayerId && attendances.length > 0) {
      const mine = attendances.find(a => a.player_id === myPlayerId);
      setMyAttendance(mine || null);
    }
  }, [myPlayerId, attendances]);

  const handleAdminSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading(true);

    try {
      const [hours, minutes] = formData.time.split(':');
      const matchDate = new Date(match.date);
      matchDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));

      const payload = {
        date: matchDate.toISOString(),
        location: formData.location,
        match_type: formData.event_type === 'Recreacional' ? null : formData.match_type,
        status: formData.status,
        event_type: formData.event_type,
        description: formData.description
      };

      if (match?.id) {
        const { error: updateError } = await supabase.from('matches').update(payload).eq('id', match.id);
        if (updateError) throw updateError;
      } else {
        const { data: newMatch, error: insertError } = await supabase.from('matches').insert([payload]).select();
        if (insertError) throw insertError;
        
        // Trigger n8n Webhook for new match
        if (newMatch && newMatch.length > 0) {
          const { data: activePlayers } = await supabase.from('players').select('id, name, email').eq('status', 'Activo').eq('notify', true).not('email', 'is', null);
          
          if (activePlayers && activePlayers.length > 0) {
            const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
            if (webhookUrl) {
              fetch(webhookUrl, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'X-N8N-API-KEY': import.meta.env.VITE_N8N_API_KEY || ''
                },
                body: JSON.stringify({ 
                  match: newMatch[0], 
                  players: activePlayers 
                })
              }).catch(err => console.error('Error triggering webhook:', err));
            } else {
              console.log('No n8n Webhook configured (VITE_N8N_WEBHOOK_URL). Skip sending auto-emails.');
            }
          }
        }
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Save error:', error);
      alert('Error al guardar: ' + (error?.message || JSON.stringify(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async () => {
    if (!match?.id || !isAdmin) return;
    setLoading(true);
    try {
      const { data: activePlayers } = await supabase
        .from('players')
        .select('id, name, email')
        .eq('status', 'Activo')
        .eq('notify', true)
        .not('email', 'is', null);

      const respondedIds = attendances.map((a) => a.player_id);
      const pendingPlayers = activePlayers?.filter((p) => !respondedIds.includes(p.id)) || [];

      if (pendingPlayers.length === 0) {
        alert('Todos los jugadores ya han respondido.');
        return;
      }

      const webhookUrl = import.meta.env.VITE_N8N_REMINDER_URL || import.meta.env.VITE_N8N_WEBHOOK_URL;
      if (webhookUrl) {
        const { data: teamSettings } = await supabase.from('team_settings').select('team_name').single();
        for (const player of pendingPlayers) {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-N8N-API-KEY': import.meta.env.VITE_N8N_API_KEY || ''
            },
            body: JSON.stringify({
              type: 'attendance_reminder',
              player: { id: player.id, name: player.name, email: player.email },
              match: {
                id: match.id,
                date: match.date,
                location: match.location
              },
              actions: {
                confirm_url: `https://n8n.soygad.com/webhook/confirmar?player_id=${player.id}&match_id=${match.id}&status=Voy`,
                decline_url: `https://n8n.soygad.com/webhook/confirmar?player_id=${player.id}&match_id=${match.id}&status=No%20voy`
              },
              team_name: teamSettings?.team_name || 'Real Ébolo FC'
            })
          });
        }
        alert(`Recordatorio enviado a ${pendingPlayers.length} jugador(es) sin responder.`);
      } else {
        alert('No hay URL de webhook configurada (VITE_N8N_REMINDER_URL).');
      }
    } catch (e) {
      console.error(e);
      alert('Error al enviar recordatorio');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!match?.id || !isAdmin) return;
    if (!confirm('¿Eliminar este partido? También se borrarán las asistencias registradas.')) return;
    setLoading(true);
    try {
      const { error: attError } = await supabase.from('attendance').delete().eq('match_id', match.id);
      if (attError) throw attError;

      const { error: gtError } = await supabase.from('generated_teams').delete().eq('match_id', match.id);
      if (gtError) throw gtError;

      const { error: matchError } = await supabase.from('matches').delete().eq('id', match.id);
      if (matchError) throw matchError;

      onSave();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error al eliminar el partido');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendance = async (status: 'Voy' | 'No voy') => {
    if (!myPlayerId || !match?.id) return;
    setLoading(true);
    try {
      if (myAttendance) {
        await supabase.from('attendance').update({ status }).eq('id', myAttendance.id);
      } else {
        await supabase.from('attendance').insert([{
          match_id: match.id,
          player_id: myPlayerId,
          status
        }]);
      }
      await fetchAttendances();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isNew = !match?.id;
  const matchDate = match?.date ? new Date(match.date) : new Date();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-xl font-bold text-white capitalize">
            {format(matchDate, "EEEE d 'de' MMMM", { locale: es })}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <X size={24} />
          </button>
        </div>

        {isNew && !isAdmin ? (
          <div className="text-center p-8 text-slate-400 flex-1">
            No hay partido programado para este día.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto flex-1 pb-2 md:pb-0 pr-1">
            {/* LEFT PANEL */}
            <div className="flex flex-col">
              <h3 className="font-semibold text-soccer-green mb-4 flex items-center gap-2">
                <MapPin size={18} /> Detalles del Evento
              </h3>
              
              {isAdmin ? (
                <form onSubmit={handleAdminSave} className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Tipo de Evento</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'Deportivo',    emoji: '🏃', label: 'Deportivo' },
                        { value: 'Recreacional', emoji: '🎉', label: 'Recreacional' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormData({...formData, event_type: opt.value})}
                          className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                            formData.event_type === opt.value
                              ? 'bg-white/15 border-white/40 text-white'
                              : 'bg-black/20 border-glass-border text-slate-400 hover:bg-white/8'
                          }`}
                        >
                          <span className="text-lg">{opt.emoji}</span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Hora</label>
                    <input type="time" required className="input-field" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                  </div>
                  {formData.event_type !== 'Recreacional' && (
                    <>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Lugar</label>
                        <input type="text" required className="input-field" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Ej. Complejo Dep. 7" />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Formato</label>
                        <select className="input-field bg-slate-900" value={formData.match_type} onChange={e => setFormData({...formData, match_type: e.target.value})}>
                          <option value="5vs5">5 vs 5</option>
                          <option value="7vs7">7 vs 7</option>
                          <option value="11vs11">11 vs 11</option>
                        </select>
                      </div>
                    </>
                  )}
                  {formData.event_type === 'Recreacional' && (
                    <>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Lugar</label>
                        <input
                          type="text"
                          className="input-field"
                          value={formData.location}
                          onChange={e => setFormData({...formData, location: e.target.value})}
                          placeholder="Ej. Parque, casa de alguien..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Descripción del evento</label>
                        <textarea
                          className="input-field resize-none"
                          rows={3}
                          value={formData.description}
                          onChange={e => setFormData({...formData, description: e.target.value})}
                          placeholder="Ej. Asado de fin de temporada en el parque..."
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Estado</label>
                    <select className="input-field bg-slate-900" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option>Programado</option>
                      {formData.event_type !== 'Recreacional' && <option>Jugado</option>}
                      <option>Cancelado</option>
                    </select>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full mt-4">
                    {loading ? 'Guardando...' : `Guardar ${formData.event_type}`}
                  </button>
                  {match?.id && (
                    <button type="button" onClick={handleDelete} disabled={loading} className="w-full mt-2 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                      <Trash2 size={15} /> Eliminar Evento
                    </button>
                  )}
                  {match?.id && match.status === 'Programado' && (
                    <button type="button" onClick={handleSendReminder} disabled={loading} className="w-full mt-2 py-2 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                      <Bell size={15} /> Enviar Recordatorio
                    </button>
                  )}
                </form>
              ) : (
                <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-glass-border">
                  <div className="flex items-center gap-3">
                    <Clock className="text-soccer-green" size={20} />
                    <div>
                      <p className="text-xs text-slate-400 uppercase">Hora</p>
                      <p className="font-medium text-white">{format(matchDate, 'HH:mm')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="text-soccer-green" size={20} />
                    <div>
                      <p className="text-xs text-slate-400 uppercase">Lugar</p>
                      <p className="font-medium text-white">{match.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="text-soccer-green" size={20} />
                    <div>
                      <p className="text-xs text-slate-400 uppercase">Formato</p>
                      <p className="font-medium text-white">{match.match_type || '7vs7'}</p>
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className={`px-2 py-1 rounded-full ${
                      match.status === 'Programado' ? 'bg-blue-500/20 text-blue-400' :
                      match.status === 'Jugado' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {match.status}
                    </span>
                  </div>
                </div>
              )}

              {/* ATTENDANCE CONTROLS */}
              {!isNew && match.status === 'Programado' && (
                <div className="mt-8 border-t border-glass-border pt-6">
                  {myPlayerId ? (
                    <>
                      <h3 className="font-semibold text-white mb-4 text-center">¿Vas a jugar?</h3>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleAttendance('Voy')}
                          disabled={loading}
                          className={`flex-1 py-2 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all ${
                            myAttendance?.status === 'Voy' 
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                          }`}
                        >
                          <CheckCircle2 size={18} /> <span className="text-xs sm:text-sm">Confirmo</span>
                        </button>

                        <button 
                          onClick={() => handleAttendance('No voy')}
                          disabled={loading}
                          className={`flex-1 py-2 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all ${
                            myAttendance?.status === 'No voy' 
                              ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' 
                              : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                          }`}
                        >
                          <XCircle size={18} /> <span className="text-xs sm:text-sm">No Puedo</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                       <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-widest">
                         <Circle size={14} className="animate-pulse" /> Registro Pendiente
                       </div>
                       <p className="text-amber-200/60 text-xs">
                         Tu cuenta no está vinculada a ningún perfil de jugador. 
                         Contacta al administrador para que enlace tu email con tu ficha de jugador.
                       </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT PANEL: List */}
            {!isNew && (
              <div className="border-t md:border-t-0 md:border-l border-glass-border pt-6 md:pt-0 md:pl-8 flex flex-col min-h-[250px] md:min-h-0">
                <h3 className="font-semibold text-soccer-green mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2"><Users size={18} /> Confirmados</span>
                  <span className="bg-soccer-green/20 text-soccer-green py-0.5 px-2 rounded-full text-xs font-bold ring-1 ring-soccer-green/30">
                    {attendances.filter(a => a.status === 'Voy').length} Jugadores
                  </span>
                </h3>

                <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                  {attendances.length === 0 ? (
                    <p className="text-slate-500 text-sm italic text-center py-4">Nadie ha confirmado asistencia todavía.</p>
                  ) : (
                    <>
                      {/* CONFIRMADOS */}
                      <div className="space-y-2">
                        {attendances.filter(a => a.status === 'Voy').map(att => (
                          <div key={att.id} className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 border border-emerald-500/20">
                                {att.player?.photo_url ? (
                                  <img src={att.player.photo_url} alt={att.player.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-emerald-400/50">
                                    {att.player?.name?.charAt(0) || '?'}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white leading-tight">{att.player?.name}</p>
                                {att.player?.nickname && <p className="text-[10px] text-slate-400">"{att.player.nickname}"</p>}
                              </div>
                            </div>
                            <CheckCircle2 size={16} className="text-emerald-500" />
                          </div>
                        ))}
                      </div>

                      {/* BAJAS */}
                      {attendances.some(a => a.status === 'No voy') && (
                        <div className="pt-4 border-t border-glass-border">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-red-400/70 mb-3 px-1">Bajas del Partido</h4>
                          <div className="space-y-2">
                            {attendances.filter(a => a.status === 'No voy').map(att => (
                              <div key={att.id} className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/5 border border-red-500/10 opacity-70">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden flex-shrink-0 border border-red-500/10">
                                    {att.player?.photo_url ? (
                                      <img src={att.player.photo_url} alt={att.player.name} className="w-full h-full object-cover grayscale" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-red-400/30">
                                        {att.player?.name?.charAt(0) || '?'}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-300 leading-tight line-through decoration-red-500/50">{att.player?.name}</p>
                                  </div>
                                </div>
                                <XCircle size={16} className="text-red-500/50" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
