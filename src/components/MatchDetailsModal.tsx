import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, MapPin, Clock, Users, CheckCircle2, XCircle, Trash2, Circle, Bell, Repeat2, HelpCircle, Hourglass } from 'lucide-react';
import { sendNewMatchEmail, sendMatchReminder, sendEventEmail } from '../lib/sendEmail';
import { aviso, confirmar } from '../lib/avisos';
import { enlacesDelPartido } from '../lib/enlaceAsistencia';
import { fechaSinHora } from '../lib/formato';
import { guardarAsistencia } from '../lib/api/dashboard';
import { formatoHabitual } from '../lib/matchmaking';

/** Cupo sugerido según el formato: los dos equipos completos. */
const CUPO_SUGERIDO: Record<string, number> = { '5vs5': 10, '7vs7': 14, '11vs11': 22 };
import { Capa } from './Capa';
import { ResultadoPartido } from './ResultadoPartido';

interface MatchDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  match: any;
}

export default function MatchDetailsModal({ isOpen, onClose, onSave, match }: MatchDetailsModalProps) {
  const { user, isAdmin, isMatchmaker, teamId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [myAttendance, setMyAttendance] = useState<any>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '20:00',
    location: '',
    match_type: '7vs7',
    status: 'Programado',
    event_type: 'Deportivo',
    description: '',
    /** '' = sin límite. */
    cupo: '14',
  });
  const [recurring, setRecurring] = useState(false);
  const [repeatDay, setRepeatDay] = useState(2); // 0=Dom, 1=Lun, 2=Mar, ...
  const [repeatStartDate, setRepeatStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [repeatEndDate, setRepeatEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return format(d, 'yyyy-MM-dd');
  });

  useEffect(() => {
    if (match?.id) {
      fetchAttendances();
      if (isAdmin) {
        setFormData({
          date: format(new Date(match.date), 'yyyy-MM-dd'),
          time: format(new Date(match.date), 'HH:mm'),
          location: match.location,
          match_type: match.match_type || '7vs7',
          status: match.status,
          event_type: match.event_type || 'Deportivo',
          description: match.description || '',
          cupo: match.cupo ? String(match.cupo) : '',
        });
      }
    } else if (match?.date) {
      setFormData(prev => ({ ...prev, date: format(new Date(match.date), 'yyyy-MM-dd'), time: '20:00', location: '', match_type: '7vs7', status: 'Programado', cupo: '14' }));
    }
    
    const fetchMyPlayer = async () => {
      if (user?.id) {
        const { data } = await supabase.from('players').select('id').eq('user_id', user.id).single();
        if (data) setMyPlayerId(data.id);
      }
    };
    fetchMyPlayer();
  }, [match, user]);

  // Partido nuevo: formato y cupo sugeridos según cómo juega el equipo de verdad
  // (el formato más repetido en sus últimos partidos), no un 7vs7 fijo.
  useEffect(() => {
    if (!isOpen || match?.id || !teamId || !isAdmin) return;
    let vivo = true;
    Promise.all([
      supabase.from('matches').select('match_type').eq('team_id', teamId).eq('event_type', 'Deportivo')
        .order('date', { ascending: false }).limit(10),
      supabase.from('team_settings').select('preferred_format').eq('id', teamId).maybeSingle(),
    ]).then(([partidos, ajustes]) => {
      if (!vivo || partidos.error) return;
      const formato = formatoHabitual((partidos.data ?? []).map((p) => p.match_type), ajustes.data?.preferred_format);
      setFormData((prev) => ({ ...prev, match_type: formato, cupo: prev.cupo ? String(CUPO_SUGERIDO[formato]) : '' }));
    });
    return () => { vivo = false; };
  }, [isOpen, match?.id, teamId, isAdmin]);

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

      // Recurring: bulk insert multiple matches (only for new events)
      if (recurring && !match?.id) {
        const cur = new Date(repeatStartDate + 'T12:00:00');
        // Sin fecha de inicio o de término, el ciclo de abajo no terminaría nunca.
        if (Number.isNaN(cur.getTime()) || Number.isNaN(new Date(repeatEndDate + 'T23:59:59').getTime())) {
          aviso.info('Elige desde y hasta qué fecha se repite.');
          setLoading(false);
          return;
        }
        while (cur.getDay() !== repeatDay) cur.setDate(cur.getDate() + 1);
        const end = new Date(repeatEndDate + 'T23:59:59');

        const payloads: any[] = [];
        while (cur <= end) {
          const d = new Date(cur);
          d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
          payloads.push({
            date: d.toISOString(),
            location: formData.location,
            match_type: formData.event_type === 'Recreacional' ? '7vs7' : formData.match_type,
            cupo: formData.event_type === 'Recreacional' || !formData.cupo ? null : Number(formData.cupo),
            status: formData.status,
            event_type: formData.event_type,
            description: formData.description,
            team_id: teamId,
          });
          cur.setDate(cur.getDate() + 7);
        }

        if (payloads.length === 0) { aviso.info('No hay fechas válidas en ese rango.'); setLoading(false); return; }
        const { error: insertError } = await supabase.from('matches').insert(payloads);
        if (insertError) throw insertError;
        onSave();
        onClose();
        return;
      }

      // La fecha del formulario es "aaaa-mm-dd": se lee como ese día en Chile, no en UTC
      // (antes quedaba un día antes). Al editar también se respeta si se cambió la fecha.
      const matchDate = fechaSinHora(formData.date);
      matchDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      const payload: any = {
        date: matchDate.toISOString(),
        location: formData.location,
        match_type: formData.event_type === 'Recreacional' ? '7vs7' : formData.match_type,
        cupo: formData.event_type === 'Recreacional' || !formData.cupo ? null : Number(formData.cupo),
        status: formData.status,
        event_type: formData.event_type,
        description: formData.description,
        ...(match?.id ? {} : { team_id: teamId }),
      };

      if (match?.id) {
        const { error: updateError } = await supabase.from('matches').update(payload).eq('id', match.id);
        if (updateError) throw updateError;
      } else {
        const { data: newMatch, error: insertError } = await supabase.from('matches').insert([payload]).select();
        if (insertError) throw insertError;

        // Avisar a los jugadores: partido ("¿vas?") o evento social ("¿te sumas?").
        if (newMatch && newMatch.length > 0) {
          const { data: activePlayers } = await supabase.from('players').select('id, name, email').eq('team_id', teamId).eq('status', 'Activo').eq('notify', true).not('email', 'is', null);
          if (activePlayers && activePlayers.length > 0) {
            const dateLabel = format(matchDate, "EEEE d 'de' MMMM, HH:mm", { locale: es });
            const social = formData.event_type === 'Recreacional';
            // El partido ya quedó guardado: si fallan los enlaces, se avisa y el
            // capitán puede mandar el recordatorio después.
            const enlace = await enlacesDelPartido(newMatch[0].id).catch(() => null);
            if (!enlace) aviso.error('Partido guardado, pero no se pudieron enviar los correos. Usa "Recordatorio".');
            else {
              const envios = await Promise.all(activePlayers.map((player) => {
                const confirmUrl = enlace(player.id, 'Voy');
                const declineUrl = enlace(player.id, 'No voy');
                return social
                  ? sendEventEmail(player.email, player.name, formData.description, dateLabel, formData.location, confirmUrl, declineUrl)
                  : sendNewMatchEmail(player.email, player.name, dateLabel, formData.location, confirmUrl, declineUrl);
              }));
              const enviados = envios.filter(Boolean).length;
              if (enviados === activePlayers.length) aviso.ok(`Guardado. Invitación enviada a ${enviados} jugador(es).`);
              else aviso.error(`Guardado, pero solo se enviaron ${enviados} de ${activePlayers.length} invitaciones. Usa "Recordatorio" para reintentar.`);
            }
          }
        }
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Save error:', error);
      aviso.error('Error al guardar: ' + (error?.message || JSON.stringify(error)));
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
        .eq('team_id', teamId)
        .eq('status', 'Activo')
        .eq('notify', true)
        .not('email', 'is', null);

      const respondedIds = attendances.map((a) => a.player_id);
      const pendingPlayers = activePlayers?.filter((p) => !respondedIds.includes(p.id)) || [];

      if (pendingPlayers.length === 0) {
        aviso.info('Todos los jugadores ya han respondido.');
        return;
      }

      const dateLabel = format(new Date(match.date), "EEEE d 'de' MMMM, HH:mm", { locale: es });
      let sent = 0;
      const enlace = await enlacesDelPartido(match.id);
      for (const player of pendingPlayers) {
        const confirmUrl = enlace(player.id, 'Voy');
        const declineUrl = enlace(player.id, 'No voy');
        const ok = match.event_type === 'Recreacional'
          ? await sendEventEmail(player.email, player.name, match.description || '', dateLabel, match.location || '', confirmUrl, declineUrl, true)
          : await sendMatchReminder(player.email, player.name, dateLabel, match.location || '', confirmUrl, declineUrl);
        if (ok) sent++;
      }
      aviso.ok(`Recordatorio enviado a ${sent} de ${pendingPlayers.length} jugador(es) sin responder.`);
    } catch (e) {
      console.error(e);
      aviso.error('Error al enviar recordatorio');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!match?.id || !isAdmin) return;
    if (!(await confirmar('¿Eliminar este partido? También se borrarán las asistencias registradas.'))) return;
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
      aviso.error('Error al eliminar el partido');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendance = async (status: 'Voy' | 'No voy' | 'Tal vez') => {
    if (!myPlayerId || !match?.id) return;
    setLoading(true);
    try {
      const final = await guardarAsistencia(match.id, myPlayerId, status);
      if (final === 'Espera') aviso.info('El partido está lleno: quedaste en la lista de espera. Si alguien se baja, entras y te avisamos por correo.');
      await fetchAttendances();
    } catch (e) {
      aviso.error('No se guardó tu respuesta: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isNew = !match?.id;
  const matchDate = match?.date ? new Date(match.date) : new Date();

  return (
    <Capa>
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
                  {!match?.date && (
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Fecha</label>
                      <input type="date" required className="input-field" value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })} />
                    </div>
                  )}
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
                        <select className="input-field bg-slate-900" value={formData.match_type}
                          onChange={e => setFormData({ ...formData, match_type: e.target.value, cupo: formData.cupo ? String(CUPO_SUGERIDO[e.target.value] ?? formData.cupo) : '' })}>
                          <option value="5vs5">5 vs 5</option>
                          <option value="7vs7">7 vs 7</option>
                          <option value="11vs11">11 vs 11</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="cupo-partido" className="block text-sm text-slate-300 mb-1">Cupo</label>
                        <select id="cupo-partido" className="input-field bg-slate-900" value={formData.cupo} onChange={e => setFormData({ ...formData, cupo: e.target.value })}>
                          <option value="">Sin límite</option>
                          {[8, 10, 12, 14, 16, 18, 22].map(n => <option key={n} value={String(n)}>{n} jugadores</option>)}
                        </select>
                        <p className="text-xs text-slate-400 mt-1">Lleno el cupo, quienes confirman quedan en lista de espera y entran solos si alguien se baja.</p>
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

                  {/* Recurring options — only for new events */}
                  {!match?.id && (
                    <div className="rounded-xl border border-glass-border bg-black/20 p-3 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={recurring}
                          onChange={e => setRecurring(e.target.checked)}
                          className="w-4 h-4 accent-soccer-green"
                        />
                        <Repeat2 size={15} className="text-soccer-green" />
                        <span className="text-sm text-slate-300 font-medium">Repetir semanalmente</span>
                      </label>
                      {recurring && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Día de la semana</label>
                            <select className="input-field bg-slate-900 text-sm" value={repeatDay} onChange={e => setRepeatDay(parseInt(e.target.value))}>
                              <option value={1}>Lunes</option>
                              <option value={2}>Martes</option>
                              <option value={3}>Miércoles</option>
                              <option value={4}>Jueves</option>
                              <option value={5}>Viernes</option>
                              <option value={6}>Sábado</option>
                              <option value={0}>Domingo</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Fecha de inicio</label>
                            <input
                              type="date"
                              className="input-field text-sm"
                              value={repeatStartDate}
                              onChange={e => setRepeatStartDate(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Fecha de término</label>
                            <input
                              type="date"
                              className="input-field text-sm"
                              value={repeatEndDate}
                              onChange={e => setRepeatEndDate(e.target.value)}
                            />
                          </div>
                          <p className="col-span-2 text-[11px] text-slate-400">
                            {(() => {
                              const cur = new Date(repeatStartDate + 'T12:00:00');
                              while (cur.getDay() !== repeatDay) cur.setDate(cur.getDate() + 1);
                              const end = new Date(repeatEndDate + 'T23:59:59');
                              let count = 0;
                              const tmp = new Date(cur);
                              while (tmp <= end) { count++; tmp.setDate(tmp.getDate() + 7); }
                              return `Se crearán ${count} eventos cada ${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][repeatDay]}`;
                            })()}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="btn-primary w-full mt-4">
                    {loading ? 'Guardando...' : recurring && !match?.id ? 'Crear eventos recurrentes' : `Guardar ${formData.event_type}`}
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
                  {match.event_type !== 'Recreacional' && (
                    <div className="flex items-center gap-3">
                      <Users className="text-soccer-green" size={20} />
                      <div>
                        <p className="text-xs text-slate-400 uppercase">Formato</p>
                        <p className="font-medium text-white">{match.match_type || '7vs7'}</p>
                      </div>
                    </div>
                  )}
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

              {/* RESULTADO: partidos deportivos ya jugados */}
              {!isNew && match?.id && teamId && match.event_type !== 'Recreacional' && match.status !== 'Cancelado' && new Date(match.date) < new Date() && (
                <ResultadoPartido matchId={match.id} teamId={teamId} puedeEditar={isAdmin || isMatchmaker} alGuardar={onSave} partido={match} />
              )}

              {/* ATTENDANCE CONTROLS */}
              {!isNew && match.status === 'Programado' && (
                <div className="mt-8 border-t border-glass-border pt-6">
                  {myPlayerId ? (
                    <>
                      <h3 className="font-semibold text-white mb-4 text-center">{match.event_type === 'Recreacional' ? '¿Te sumas?' : '¿Vas a jugar?'}</h3>
                      {myAttendance?.status === 'Espera' && (
                        <p role="status" className="mb-3 text-center text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                          Estás en la lista de espera (puesto {attendances.filter(a => a.status === 'Espera').sort((a, b) => String(a.updated_at).localeCompare(String(b.updated_at))).findIndex(a => a.player_id === myPlayerId) + 1}). Si alguien se baja, entras solo.
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleAttendance('Voy')}
                          disabled={loading}
                          className={`flex-1 py-2 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all ${
                            myAttendance?.status === 'Voy' || myAttendance?.status === 'Espera'
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                          }`}
                        >
                          <CheckCircle2 size={18} /> <span className="text-xs sm:text-sm">{match.event_type === 'Recreacional' ? 'Me sumo' : 'Confirmo'}</span>
                        </button>

                        <button
                          onClick={() => handleAttendance('Tal vez')}
                          disabled={loading}
                          aria-pressed={myAttendance?.status === 'Tal vez'}
                          className={`flex-1 py-2 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all ${
                            myAttendance?.status === 'Tal vez'
                              ? 'bg-sky-400 text-slate-900'
                              : 'bg-sky-400/10 text-sky-300 hover:bg-sky-400/20 border border-sky-400/30'
                          }`}
                        >
                          <HelpCircle size={18} /> <span className="text-xs sm:text-sm">Tal vez</span>
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
                    {attendances.filter(a => a.status === 'Voy').length} {match.event_type === 'Recreacional' ? 'Se suman' : 'Jugadores'}
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
                                {att.player?.nickname && <p className="text-[11px] text-slate-400">"{att.player.nickname}"</p>}
                              </div>
                            </div>
                            <CheckCircle2 size={16} className="text-emerald-500" />
                          </div>
                        ))}
                      </div>

                      {/* LISTA DE ESPERA */}
                      {attendances.some(a => a.status === 'Espera') && (
                        <div className="pt-4 border-t border-glass-border">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-300/80 mb-3 px-1 flex items-center gap-1.5"><Hourglass size={12} /> Lista de espera</h4>
                          <ol className="space-y-2">
                            {attendances.filter(a => a.status === 'Espera')
                              .sort((a, b) => String(a.updated_at).localeCompare(String(b.updated_at)))
                              .map((att, i) => (
                                <li key={att.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15">
                                  <span className="w-6 text-center text-xs font-black text-amber-300">{i + 1}</span>
                                  <span className="text-sm text-white">{att.player?.name}</span>
                                </li>
                              ))}
                          </ol>
                        </div>
                      )}

                      {/* TAL VEZ */}
                      {attendances.some(a => a.status === 'Tal vez') && (
                        <div className="pt-4 border-t border-glass-border">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-sky-300/80 mb-3 px-1 flex items-center gap-1.5"><HelpCircle size={12} /> Tal vez</h4>
                          <div className="space-y-2">
                            {attendances.filter(a => a.status === 'Tal vez').map(att => (
                              <div key={att.id} className="p-2.5 rounded-lg bg-sky-400/5 border border-sky-400/10 text-sm text-white/80">{att.player?.name}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* BAJAS */}
                      {attendances.some(a => a.status === 'No voy') && (
                        <div className="pt-4 border-t border-glass-border">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-red-400/70 mb-3 px-1">Bajas del Partido</h4>
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
    </Capa>
  );
}
