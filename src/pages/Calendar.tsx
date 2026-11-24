import { useState, useEffect, useCallback } from 'react';
import { supabase, withTimeout } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { startOfMonth, endOfMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { Plus, CalendarDays } from 'lucide-react';
import MatchDetailsModal from '../components/MatchDetailsModal';
import { Capa } from '../components/Capa';
import { armarAgenda, cumplesDelMes, type JugadorCal, type PartidoCal } from './calendar/agenda';
import { DetalleCumple, ItemAgenda, MesCompacto, YaJugados } from './calendar/BloquesCalendario';

/**
 * Calendario. Diseño para celular basado en el concepto de Stitch
 * (docs/diseno/calendario-movil-stitch.png): mes compacto con puntos de color,
 * la agenda de lo que viene y lo que ya pasó plegado.
 */
export default function Calendar() {
  const { isAdmin, teamId } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [matches, setMatches] = useState<PartidoCal[]>([]);
  const [players, setPlayers] = useState<JugadorCal[]>([]);
  const [activos, setActivos] = useState(0);
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [cumple, setCumple] = useState<{ jugador: JugadorCal; fecha: Date } | null>(null);

  const fetchMatches = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const { data } = (await withTimeout(
        supabase.from('matches').select('*').eq('team_id', teamId)
          .gte('date', startOfMonth(currentDate).toISOString()).lte('date', endOfMonth(currentDate).toISOString()) as unknown as Promise<{ data: PartidoCal[] | null }>,
        10000,
      ));
      setMatches(data ?? []);
      const counts: Record<string, number> = {};
      if (data && data.length > 0) {
        const { data: attData } = await supabase.from('attendance').select('match_id')
          .in('match_id', data.map(m => m.id)).eq('status', 'Voy');
        attData?.forEach((a: { match_id: string }) => { counts[a.match_id] = (counts[a.match_id] || 0) + 1; });
      }
      setAttendanceCounts(counts);
    } catch (e) {
      console.error('Error fetching calendar matches:', e);
    } finally {
      setLoading(false);
    }
  }, [currentDate, teamId]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  useEffect(() => {
    if (!teamId) return;
    supabase.from('players').select('id, name, nickname, birth_date, photo_url').eq('team_id', teamId).not('birth_date', 'is', null)
      .then(({ data }) => { if (data) setPlayers(data as JugadorCal[]); });
    supabase.from('players').select('id', { count: 'exact', head: true }).eq('team_id', teamId).eq('status', 'Activo')
      .then(({ count }) => setActivos(count ?? 0));
  }, [teamId]);

  const cumples = cumplesDelMes(players, currentDate);
  const { proximos, pasados, total } = armarAgenda(matches, players, currentDate);

  const abrir = (m: PartidoCal) => { setSelectedMatch(m); setIsModalOpen(true); };
  const nuevo = () => { setSelectedMatch(null); setIsModalOpen(true); };
  const abrirCumple = (jugador: JugadorCal, fecha: Date) => setCumple({ jugador, fecha });

  const tocarDia = (day: Date) => {
    setSelectedDay(day);
    const match = matches.find(m => isSameDay(new Date(m.date), day));
    const delDia = cumples.find(c => isSameDay(c.fecha, day));
    if (match) abrir(match);
    else if (delDia) abrirCumple(delDia.jugador, delDia.fecha);
    else if (isAdmin) { setSelectedMatch({ date: day.toISOString(), location: '', status: 'Programado' }); setIsModalOpen(true); }
  };

  return (
    <div className="fade-in pb-24 md:pb-0 max-w-5xl mx-auto space-y-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-soccer-green mb-1">Agenda</p>
        <h1 className="font-headline text-3xl font-black text-white tracking-tight">Calendario</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <MesCompacto
          mes={currentDate}
          partidos={matches}
          cumples={cumples}
          total={total}
          seleccionado={selectedDay}
          cargando={loading}
          anterior={() => setCurrentDate(d => subMonths(d, 1))}
          siguiente={() => setCurrentDate(d => addMonths(d, 1))}
          tocarDia={tocarDia}
        />

        <div className="space-y-4">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-white/70">Próximos</h2>
            <span className="text-sm text-soccer-green">{proximos.length} {proximos.length === 1 ? 'evento' : 'eventos'}</span>
          </div>

          {proximos.length === 0 && !loading ? (
            <div className="flex flex-col items-center text-center py-10 px-6 rounded-[20px]" style={{ background: '#181c22', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <CalendarDays size={34} className="text-white/20 mb-3" />
              <p className="text-sm text-white/60">No hay nada más agendado este mes.</p>
              {isAdmin && <button type="button" onClick={nuevo} className="btn-primary mt-4 px-6 py-3 text-sm">Agendar evento</button>}
            </div>
          ) : (
            <ul className="space-y-2">
              {proximos.map(e => (
                <ItemAgenda key={e.tipo === 'partido' ? e.partido.id : `c-${e.jugador.id}`} evento={e} activos={activos}
                  confirmados={e.tipo === 'partido' ? attendanceCounts[e.partido.id] || 0 : 0} abrir={abrir} abrirCumple={abrirCumple} />
              ))}
            </ul>
          )}

          <YaJugados eventos={pasados} confirmados={attendanceCounts} activos={activos} abrir={abrir} abrirCumple={abrirCumple} />
        </div>
      </div>

      {isAdmin && (
        <Capa>
          <button type="button" onClick={nuevo}
            className="fixed right-4 z-30 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:bottom-8 md:right-8 h-14 pl-4 pr-5 rounded-full flex items-center gap-2 font-headline font-bold text-[#003822] cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #44f3a9, #00d68f)', boxShadow: '0 10px 30px -6px rgba(68,243,169,0.5)' }}>
            <Plus size={22} /> Evento
          </button>
        </Capa>
      )}

      {cumple && <DetalleCumple jugador={cumple.jugador} fecha={cumple.fecha} cerrar={() => setCumple(null)} />}

      {isModalOpen && (
        <MatchDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={fetchMatches} match={selectedMatch} />
      )}
    </div>
  );
}
