import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, MapPin, Clock, Users, CheckCircle2, XCircle, Trash2 } from 'lucide-react';

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
    status: 'Programado'
  });

  useEffect(() => {
    if (match?.id) {
      fetchAttendances();
      if (isAdmin) {
        setFormData({
          time: format(new Date(match.date), 'HH:mm'),
          location: match.location,
          match_type: match.match_type || '7vs7',
          status: match.status
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
        match_type: formData.match_type,
        status: formData.status
      };

      if (match?.id) {
        await supabase.from('matches').update(payload).eq('id', match.id);
      } else {
        const { data: newMatch } = await supabase.from('matches').insert([payload]).select();
        
        // Trigger n8n Webhook for new match
        if (newMatch && newMatch.length > 0) {
          const { data: activePlayers } = await supabase.from('players').select('id, name, email').eq('status', 'Activo').eq('notify', true).not('email', 'is', null);
          
          if (activePlayers && activePlayers.length > 0) {
            const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
            if (webhookUrl) {
              fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
    } catch (error) {
      console.error(error);
      alert('Error al guardar el partido');
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
  const matchDate = new Date(match.date);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-xl font-bold text-white capitalize">
            {format(matchDate, 'EEEE d de MMMM', { locale: es })}
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
                <MapPin size={18} /> Detalles del Partido
              </h3>
              
              {isAdmin ? (
                <form onSubmit={handleAdminSave} className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Hora</label>
                    <input type="time" required className="input-field" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Cancha</label>
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
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Estado</label>
                    <select className="input-field bg-slate-900" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option>Programado</option>
                      <option>Jugado</option>
                      <option>Cancelado</option>
                    </select>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full mt-4">
                    {loading ? 'Guardando...' : 'Guardar Partido'}
                  </button>
                  {match?.id && (
                    <button type="button" onClick={handleDelete} disabled={loading} className="w-full mt-2 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                      <Trash2 size={15} /> Eliminar Partido
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
                    <div className="text-center p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
                      Pide al administrador que enlace tu cuenta con tu perfil de jugador para poder confirmar asistencia.
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

                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {attendances.length === 0 ? (
                    <p className="text-slate-500 text-sm italic text-center py-4">Nadie ha confirmado asistencia todavía.</p>
                  ) : (
                    attendances.sort((a,b) => {
                      const order = { 'Voy': 1, 'No voy': 2 };
                      return order[a.status as keyof typeof order] - order[b.status as keyof typeof order];
                    }).map(att => (
                      <div key={att.id} className="flex items-center justify-between p-2.5 rounded-lg bg-black/20 border border-glass-border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex-shrink-0 border border-slate-600">
                            {att.player?.photo_url ? (
                              <img src={att.player.photo_url} alt={att.player.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                                {att.player?.name?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white leading-tight">{att.player?.name}</p>
                            {att.player?.nickname && <p className="text-[10px] text-slate-400">"{att.player.nickname}"</p>}
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                          att.status === 'Voy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {att.status === 'Voy' ? 'Confirmo' : 'No puedo'}
                        </span>
                      </div>
                    ))
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
