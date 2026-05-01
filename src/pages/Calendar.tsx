import { useState, useEffect } from 'react';
import { supabase, withTimeout } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, addMonths, subMonths, isToday, isPast, startOfDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, Cake, CalendarDays, MapPin, Clock } from 'lucide-react';
import MatchDetailsModal from '../components/MatchDetailsModal';

const EVENT_CFG: Record<string, { bg: string; color: string; border: string; emoji: string }> = {
  Deportivo:    { bg: 'rgba(68,243,169,0.08)',  color: '#44f3a9', border: 'rgba(68,243,169,0.2)',  emoji: '⚽' },
  Partido:      { bg: 'rgba(68,243,169,0.08)',  color: '#44f3a9', border: 'rgba(68,243,169,0.2)',  emoji: '⚽' },
  Recreacional: { bg: 'rgba(167,139,250,0.08)', color: '#a78bfa', border: 'rgba(167,139,250,0.2)', emoji: '🎉' },
};

export default function Calendar() {
  const { isAdmin, teamId } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [matches, setMatches] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => { if (teamId) fetchMatches(); }, [currentDate, teamId]);
  useEffect(() => { if (teamId) fetchPlayers(); }, [teamId]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const { data } = (await withTimeout(
        supabase.from('matches').select('*').eq('team_id', teamId)
          .gte('date', start.toISOString()).lte('date', end.toISOString()) as any,
        10000
      )) as any;

      if (data) {
        setMatches(data);
        if (data.length > 0) {
          const matchIds = data.map((m: any) => m.id);
          const { data: attData } = await supabase
            .from('attendance').select('match_id')
            .in('match_id', matchIds).eq('status', 'Voy');
          const counts: Record<string, number> = {};
          attData?.forEach((a: any) => { counts[a.match_id] = (counts[a.match_id] || 0) + 1; });
          setAttendanceCounts(counts);
        }
      }
    } catch (e) {
      console.error('Error fetching calendar matches:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    const { data } = await supabase.from('players').select('id, name, nickname, birth_date')
      .eq('team_id', teamId).eq('status', 'Activo').not('birth_date', 'is', null);
    if (data) setPlayers(data);
  };

  // Birthdays mapped to current month/year
  const birthdaysThisMonth = players
    .filter(p => p.birth_date)
    .map(p => {
      const bd = new Date(p.birth_date);
      return { ...p, birthdayDate: new Date(currentDate.getFullYear(), bd.getMonth(), bd.getDate()) };
    })
    .filter(p => p.birthdayDate.getMonth() === currentDate.getMonth());

  const getBirthdaysOnDay = (day: Date) =>
    birthdaysThisMonth.filter(p => isSameDay(p.birthdayDate, day));

  // All events combined and sorted
  const allEvents = [
    ...matches.map(m => ({ type: 'match' as const, date: new Date(m.date), data: m })),
    ...birthdaysThisMonth.map(p => ({ type: 'birthday' as const, date: p.birthdayDate, data: p })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  // Monday-first offset
  const startOffset = (startOfMonth(currentDate).getDay() + 6) % 7;

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    const match = matches.find(m => isSameDay(new Date(m.date), day));
    if (match) {
      setSelectedMatch(match);
      setIsModalOpen(true);
    } else if (isAdmin) {
      setSelectedMatch({ date: day.toISOString(), location: '', status: 'Programado' });
      setIsModalOpen(true);
    }
  };

  return (
    <div className="fade-in pb-20 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: 'rgba(68,243,169,0.7)' }}>Agenda</p>
          <h1 className="font-headline text-3xl font-black text-white tracking-tight">Calendario</h1>
        </div>
        {isAdmin && (
          <button onClick={() => { setSelectedMatch(null); setIsModalOpen(true); }}
            className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            <span className="hidden sm:inline">Nuevo Evento</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">

        {/* ── LEFT: Mini Calendar ── */}
        <div className="rounded-2xl p-5" style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-headline font-bold text-white capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </h2>
              <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {matches.length + birthdaysThisMonth.length} evento{(matches.length + birthdaysThisMonth.length) !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/8"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <ChevronLeft size={16} className="text-white/40" />
              </button>
              <button onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/8"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <ChevronRight size={16} className="text-white/40" />
              </button>
            </div>
          </div>

          {/* Day headers — Monday first */}
          <div className="grid grid-cols-7 mb-1">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
              <div key={d} className="text-center text-[10px] font-black py-1.5"
                style={{ color: 'rgba(255,255,255,0.22)' }}>{d}</div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-soccer-green" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startOffset }).map((_, i) => <div key={`e-${i}`} />)}
              {days.map(day => {
                const match = matches.find(m => isSameDay(new Date(m.date), day));
                const birthdays = getBirthdaysOnDay(day);
                const cfg = match ? (EVENT_CFG[match.event_type] ?? EVENT_CFG['Deportivo']) : null;
                const today = isToday(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);

                return (
                  <div key={day.toString()} onClick={() => handleDayClick(day)}
                    className="flex flex-col items-center justify-center aspect-square rounded-xl cursor-pointer transition-all group relative select-none"
                    style={{
                      background: match ? cfg!.bg : isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
                      border: today
                        ? '1.5px solid rgba(68,243,169,0.5)'
                        : match
                          ? `1px solid ${cfg!.border}`
                          : '1px solid transparent',
                    }}
                  >
                    <span className="text-[11px] font-bold leading-none"
                      style={{ color: today ? '#44f3a9' : match ? cfg!.color : 'rgba(255,255,255,0.55)' }}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex gap-0.5 mt-0.5 h-1">
                      {match && <div className="w-1 h-1 rounded-full" style={{ background: cfg!.color }} />}
                      {birthdays.length > 0 && <div className="w-1 h-1 rounded-full bg-pink-400" />}
                    </div>
                    {!match && !birthdays.length && isAdmin && (
                      <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'rgba(68,243,169,0.05)' }}>
                        <Plus size={12} className="text-soccer-green/40" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <span>⚽</span> Deportivo
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <span>🎉</span> Recreacional
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <Cake size={10} className="text-pink-400" /> Cumpleaños
            </span>
          </div>
        </div>

        {/* ── RIGHT: Events Panel ── */}
        <div className="rounded-2xl p-5" style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-headline font-bold text-white text-lg capitalize">
              {format(currentDate, 'MMMM', { locale: es })}
            </h3>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
              {allEvents.length} {allEvents.length === 1 ? 'evento' : 'eventos'}
            </span>
          </div>

          {allEvents.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <CalendarDays size={40} className="text-white/10" />
              <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.2)' }}>No hay eventos este mes</p>
              {isAdmin && (
                <button onClick={() => { setSelectedMatch(null); setIsModalOpen(true); }}
                  className="text-[11px] font-black px-4 py-2 rounded-xl transition-all hover:brightness-110"
                  style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}>
                  + Crear primer evento
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {allEvents.map((event, idx) => {
                const isPastEvent = isPast(startOfDay(event.date)) && !isSameDay(event.date, new Date());

                if (event.type === 'birthday') {
                  const p = event.data;
                  return (
                    <div key={`bday-${p.id}-${idx}`}
                      className="flex items-center gap-4 p-4 rounded-2xl transition-all"
                      style={{
                        background: 'rgba(236,72,153,0.07)', border: '1px solid rgba(236,72,153,0.15)',
                        opacity: isPastEvent ? 0.5 : 1,
                      }}>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: 'rgba(236,72,153,0.12)' }}>🎂</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{p.nickname || p.name}</p>
                        <p className="text-[11px] mt-0.5 flex items-center gap-1.5"
                          style={{ color: 'rgba(255,255,255,0.35)' }}>
                          <Clock size={10} />
                          {format(event.date, "EEEE d 'de' MMMM", { locale: es })}
                        </p>
                      </div>
                      <span className="text-[9px] font-black px-2.5 py-1 rounded-full flex-shrink-0 uppercase"
                        style={{ background: 'rgba(236,72,153,0.15)', color: '#f472b6' }}>
                        {format(event.date, 'EEE d', { locale: es })}
                      </span>
                    </div>
                  );
                }

                const m = event.data;
                const cfg = EVENT_CFG[m.event_type] ?? EVENT_CFG['Deportivo'];
                const confirmed = attendanceCounts[m.id] || 0;

                return (
                  <div key={m.id}
                    onClick={() => { setSelectedMatch(m); setIsModalOpen(true); }}
                    className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all hover:brightness-110 hover:translate-x-0.5 active:scale-[0.99]"
                    style={{
                      background: cfg.bg, border: `1px solid ${cfg.border}`,
                      opacity: isPastEvent ? 0.55 : 1,
                    }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: `${cfg.color}15` }}>{cfg.emoji}</div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-white truncate">
                        {m.description || (m.event_type === 'Deportivo' ? 'Partido deportivo' : 'Evento recreacional')}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-[11px] flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          <Clock size={10} />
                          {format(event.date, "EEE d · HH:mm", { locale: es })}
                        </span>
                        {m.location && (
                          <span className="text-[11px] flex items-center gap-1 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            <MapPin size={10} className="flex-shrink-0" />
                            {m.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider"
                        style={{ background: `${cfg.color}18`, color: cfg.color }}>
                        {m.event_type}
                      </span>
                      {m.event_type === 'Deportivo' && (
                        <span className="text-[10px] font-black" style={{ color: cfg.color }}>
                          {confirmed > 0 ? `${confirmed} conf.` : m.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <MatchDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={fetchMatches}
          match={selectedMatch}
        />
      )}
    </div>
  );
}
