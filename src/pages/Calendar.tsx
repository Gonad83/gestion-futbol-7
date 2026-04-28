import { useState, useEffect } from 'react';
import { supabase, withTimeout } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, Cake } from 'lucide-react';
import MatchDetailsModal from '../components/MatchDetailsModal';

export default function Calendar() {
  const { isAdmin, teamId } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [matches, setMatches] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      if (data) setMatches(data);
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

  const getBirthdaysOnDay = (day: Date) =>
    players.filter(p => {
      if (!p.birth_date) return false;
      const bd = new Date(p.birth_date);
      return bd.getMonth() === day.getMonth() && bd.getDate() === day.getDate();
    });

  const EVENT_STYLE: Record<string, { bg: string; text: string; border: string; emoji: string }> = {
    Partido:      { bg: 'bg-soccer-green/20', text: 'text-soccer-green', border: 'border-soccer-green/30', emoji: '⚽' },
    Deportivo:    { bg: 'bg-blue-500/20',     text: 'text-blue-400',     border: 'border-blue-500/30',     emoji: '🏃' },
    Recreacional: { bg: 'bg-purple-500/20',   text: 'text-purple-400',   border: 'border-purple-500/30',   emoji: '🎉' },
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleDayClick = (day: Date) => {
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
    <div className="fade-in pb-20 md:pb-0 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-soccer-green/70 mb-1">Agenda</p>
          <h1 className="font-headline text-3xl font-black text-white tracking-tight">Calendario de Partidos</h1>
        </div>
        {isAdmin && (
          <button onClick={() => { setSelectedMatch(null); setIsModalOpen(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            <span className="hidden sm:inline">Nuevo Evento</span>
          </button>
        )}
      </div>

      <div className="glass-card mb-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={prevMonth} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/8" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-headline text-xl font-bold text-white capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h2>
          <button onClick={nextMonth} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/8" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <ChevronRight size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-soccer-green"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-slate-400 p-2">
                {day}
              </div>
            ))}
            
            {Array.from({ length: startOfMonth(currentDate).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2 sm:p-4 opacity-50"></div>
            ))}

            {days.map(day => {
              const match = matches.find(m => isSameDay(new Date(m.date), day));
              const birthdays = getBirthdaysOnDay(day);
              const style = match ? (EVENT_STYLE[match.event_type] ?? EVENT_STYLE['Partido']) : null;
              return (
                <div
                  key={day.toString()}
                  onClick={() => handleDayClick(day)}
                  className={`
                    min-h-[80px] sm:min-h-[100px] p-2 rounded-xl border transition-all cursor-pointer relative overflow-hidden group
                    ${isToday(day) ? 'border-soccer-green/50 bg-soccer-green/5' : 'border-glass-border bg-black/20 hover:bg-white/5'}
                    ${match ? `ring-1 shadow-lg ${style!.border.replace('border-', 'ring-')}` : ''}
                  `}
                >
                  <span className={`text-sm font-semibold ${isToday(day) ? 'text-soccer-green' : 'text-slate-300'}`}>
                    {format(day, 'd')}
                  </span>

                  {match && style && (
                    <div className="mt-1 text-xs">
                      <div className={`${style.bg} ${style.text} p-1.5 rounded-lg border ${style.border} flex flex-col items-center sm:items-start gap-1`}>
                        <span className="text-base">{style.emoji}</span>
                        <div className="hidden sm:block w-full">
                          <p className="font-bold truncate">{format(new Date(match.date), 'HH:mm')}</p>
                          <p className="text-[10px] opacity-80 truncate">{match.location}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {birthdays.length > 0 && (
                    <div className="mt-1 flex flex-col gap-0.5">
                      {birthdays.map(p => (
                        <div key={p.id} className="flex items-center gap-1 bg-pink-500/15 border border-pink-500/25 rounded-lg px-1.5 py-0.5">
                          <Cake size={10} className="text-pink-400 flex-shrink-0" />
                          <span className="text-[9px] text-pink-300 font-bold truncate hidden sm:block">
                            {p.nickname || p.name.split(' ')[0]}
                          </span>
                          <span className="text-[9px] text-pink-300 sm:hidden">🎂</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!match && isAdmin && (
                    <div className="absolute inset-0 bg-soccer-green/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus size={24} className="text-soccer-green" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[11px] text-slate-400 px-1">
        <span className="flex items-center gap-1.5"><span>🏃</span> Deportivo</span>
        <span className="flex items-center gap-1.5"><span>🎉</span> Recreacional</span>
        <span className="flex items-center gap-1.5"><Cake size={11} className="text-pink-400" /> Cumpleaños</span>
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
