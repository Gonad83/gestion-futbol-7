import { useState, useEffect } from 'react';
import { supabase, withTimeout } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Plus, Edit2, Star, X, LayoutGrid, List } from 'lucide-react';
import PlayerModal from '../components/PlayerModal';

const getPositionWeight = (pos: string) => {
  if (!pos) return 5;
  if (pos.includes('Portero')) return 1;
  if (pos.includes('Defensa') || pos.includes('Lateral')) return 2;
  if (pos.includes('Medio') || pos.includes('Volante') || pos.includes('Enganche')) return 3;
  if (pos.includes('Delantero') || pos.includes('Extremo')) return 4;
  return 5;
};

const getPositionGroup = (pos: string) => {
  if (!pos) return 'Otro';
  if (pos.includes('Portero') || pos.includes('Arco')) return 'Portero';
  if (pos.includes('Defensa') || pos.includes('Lateral') || pos.includes('Central')) return 'Defensa';
  if (pos.includes('Medio') || pos.includes('Volante') || pos.includes('Enganche') || pos.includes('Interior')) return 'Medio';
  if (pos.includes('Delantero') || pos.includes('Extremo') || pos.includes('Punta')) return 'Delantero';
  return 'Otro';
};

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Activo:   { bg: 'rgba(68,243,169,0.1)',  color: '#44f3a9', border: 'rgba(68,243,169,0.2)' },
  Lesionado:{ bg: 'rgba(248,113,113,0.1)', color: '#f87171', border: 'rgba(248,113,113,0.2)' },
  Inactivo: { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', border: 'rgba(255,255,255,0.08)' },
};

const POS_FILTERS = ['Todos', 'Portero', 'Defensa', 'Medio', 'Delantero'] as const;
type PosFilter = typeof POS_FILTERS[number];

export default function Players() {
  const { isAdmin } = useAuth();
  const [players, setPlayers] = useState<any[]>([]);
  const [totalMatchesYear, setTotalMatchesYear] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);
  const [filterPos, setFilterPos] = useState<PosFilter>('Todos');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  useEffect(() => { fetchPlayers(); }, []);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
      const now = new Date().toISOString();

      const [playersRes, yearMatchesRes] = await Promise.all([
        withTimeout(supabase.from('players').select('*') as any, 10000),
        withTimeout(supabase.from('matches').select('id').gte('date', yearStart).lt('date', now) as any, 8000),
      ]);

      const data = (playersRes as any).data;
      const yearMatches = (yearMatchesRes as any).data || [];
      const matchIds = yearMatches.map((m: any) => m.id);
      setTotalMatchesYear(matchIds.length);

      let attendanceCounts: Record<string, number> = {};
      if (matchIds.length > 0) {
        const { data: attData } = await supabase
          .from('attendance')
          .select('player_id')
          .eq('status', 'Voy')
          .in('match_id', matchIds);
        attData?.forEach((a: any) => {
          if (a.player_id) attendanceCounts[a.player_id] = (attendanceCounts[a.player_id] || 0) + 1;
        });
      }

      if (data) {
        const sorted = data.filter((p: any) => p.status !== 'Inactivo').sort((a: any, b: any) => {
          const wa = getPositionWeight(a.position), wb = getPositionWeight(b.position);
          if (wa !== wb) return wa - wb;
          return a.name.localeCompare(b.name);
        }).map((p: any) => ({
          ...p,
          matchesPlayed: attendanceCounts[p.id] || 0,
          participationPct: matchIds.length > 0 ? Math.round(((attendanceCounts[p.id] || 0) / matchIds.length) * 100) : 0,
        }));
        setPlayers(sorted);
      }
    } catch (e) {
      console.error('Error fetching players:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (player: any) => { setSelectedPlayer(player); setIsModalOpen(true); };
  const handleNew = () => { setSelectedPlayer(null); setIsModalOpen(true); };

  const filtered = filterPos === 'Todos'
    ? players
    : players.filter(p => getPositionGroup(p.position) === filterPos);

  const countFor = (f: PosFilter) => f === 'Todos' ? players.length : players.filter(p => getPositionGroup(p.position) === f).length;

  return (
    <div className="fade-in pb-20 md:pb-0 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-soccer-green/70 mb-1">Equipo</p>
          <h1 className="font-headline text-3xl font-black text-white tracking-tight">Plantilla de Jugadores</h1>
        </div>
        {isAdmin && (
          <button onClick={handleNew} className="btn-primary">
            <Plus size={16} />
            <span className="hidden sm:inline">Nuevo Jugador</span>
          </button>
        )}
      </div>

      {/* Filters + View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Position filters */}
        <div className="flex flex-wrap gap-2">
          {POS_FILTERS.map(f => {
            const count = countFor(f);
            const active = filterPos === f;
            return (
              <button
                key={f}
                onClick={() => setFilterPos(f)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={active
                  ? { background: 'rgba(68,243,169,0.15)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.35)' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }
                }
              >
                {f}
                <span
                  className="text-[10px] font-black px-1.5 py-0.5 rounded-lg"
                  style={active
                    ? { background: 'rgba(68,243,169,0.2)', color: '#44f3a9' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }
                  }
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* View mode toggle */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={() => setViewMode('cards')}
            className="p-2 rounded-lg transition-all"
            style={viewMode === 'cards'
              ? { background: 'rgba(68,243,169,0.15)', color: '#44f3a9' }
              : { color: 'rgba(255,255,255,0.3)' }
            }
            title="Vista tarjetas"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className="p-2 rounded-lg transition-all"
            style={viewMode === 'list'
              ? { background: 'rgba(68,243,169,0.15)', color: '#44f3a9' }
              : { color: 'rgba(255,255,255,0.3)' }
            }
            title="Vista lista"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-16">
          <div className="w-9 h-9 rounded-full border-2 border-t-soccer-green border-r-soccer-green/20 border-b-soccer-green/10 border-l-soccer-green/5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: '#1c2026', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <span className="text-4xl mb-4 block">👤</span>
          <h3 className="font-headline text-lg font-bold text-white mb-2">
            {filterPos === 'Todos' ? 'Sin jugadores' : `Sin ${filterPos}s registrados`}
          </h3>
          <p className="text-white/40 text-sm mb-5">
            {filterPos === 'Todos' ? 'Aún no hay jugadores registrados en el equipo.' : `No hay jugadores en la posición ${filterPos}.`}
          </p>
          {isAdmin && filterPos === 'Todos' && <button onClick={handleNew} className="btn-primary">Crear primer jugador</button>}
        </div>
      ) : viewMode === 'cards' ? (
        /* ── CARD VIEW ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map(player => {
            const st = STATUS_STYLE[player.status] || STATUS_STYLE.Inactivo;
            return (
              <div
                key={player.id}
                className="relative flex flex-col items-center p-6 rounded-2xl transition-all duration-300 hover:translate-y-[-2px] group"
                style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.35)' }}
              >
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, rgba(68,243,169,0.03) 0%, transparent 60%)' }} />

                <div
                  className={`w-24 h-24 rounded-full mb-5 overflow-hidden flex-shrink-0 flex items-center justify-center ${player.photo_url ? 'cursor-zoom-in' : ''}`}
                  style={{ background: '#262a31', border: `2px solid ${player.photo_url ? 'rgba(68,243,169,0.2)' : 'rgba(255,255,255,0.06)'}` }}
                  onClick={() => player.photo_url && setZoomPhoto(player.photo_url)}
                >
                  {player.photo_url
                    ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                    : <span className="text-3xl font-black text-white/20">{player.name.charAt(0)}</span>
                  }
                </div>

                <h3 className="font-headline text-lg font-bold text-white text-center w-full truncate" title={player.name}>
                  {player.name}
                </h3>
                {player.nickname && <p className="text-white/35 text-xs mb-1 truncate">"{player.nickname}"</p>}

                <div className="h-10 flex flex-col items-center justify-center mb-4 w-full">
                  <p className="text-xs font-bold text-center px-2" style={{ color: '#44f3a9' }}>{player.position}</p>
                  {player.secondary_position && <p className="text-[10px] text-white/30 mt-0.5 text-center px-2">{player.secondary_position}</p>}
                </div>

                <div className="flex items-center justify-around w-full rounded-xl p-3 mb-3" style={{ background: '#0a0e14' }}>
                  <div className="text-center">
                    <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5 font-bold">Calidad</p>
                    <div className="flex gap-0.5 justify-center">
                      {Array.from({ length: 7 }, (_, i) => (
                        <Star key={i} size={11} className={i < player.rating ? 'fill-current' : ''} style={{ color: i < player.rating ? '#ffd08b' : 'rgba(255,255,255,0.1)' }} />
                      ))}
                    </div>
                  </div>
                  <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="text-center">
                    <p className="text-[9px] text-white/25 uppercase tracking-wider mb-1.5 font-bold">Estado</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                      {player.status}
                    </span>
                  </div>
                </div>

                <div className="w-full rounded-xl px-3 py-2.5 mb-4" style={{ background: '#0a0e14' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[9px] text-white/25 uppercase tracking-wider font-bold">Asistencia {new Date().getFullYear()}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black" style={{ color: player.participationPct >= 70 ? '#44f3a9' : player.participationPct >= 40 ? '#ffd08b' : '#f87171' }}>
                        {player.participationPct}%
                      </span>
                      <span className="text-[9px] text-white/25">{player.matchesPlayed}/{totalMatchesYear}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${player.participationPct}%`, background: player.participationPct >= 70 ? '#44f3a9' : player.participationPct >= 40 ? '#ffd08b' : '#f87171' }} />
                  </div>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleEdit(player)}
                    className="flex w-full items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:text-soccer-green"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                  >
                    <Edit2 size={14} /> Editar Perfil
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ── LIST VIEW ── */
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25" style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th className="px-5 py-4 text-left">Jugador</th>
                <th className="px-4 py-4 text-left hidden md:table-cell">Posición</th>
                <th className="px-4 py-4 text-center hidden sm:table-cell">Calidad</th>
                <th className="px-4 py-4 text-center">Estado</th>
                <th className="px-4 py-4 text-center hidden sm:table-cell">Asistencia</th>
                {isAdmin && <th className="px-4 py-4 text-right">Editar</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(player => {
                const st = STATUS_STYLE[player.status] || STATUS_STYLE.Inactivo;
                return (
                  <tr
                    key={player.id}
                    className="transition-colors hover:bg-white/3"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    {/* Avatar + name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center ${player.photo_url ? 'cursor-zoom-in' : ''}`}
                          style={{ background: '#262a31', border: '1px solid rgba(255,255,255,0.07)' }}
                          onClick={() => player.photo_url && setZoomPhoto(player.photo_url)}
                        >
                          {player.photo_url
                            ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                            : <span className="text-sm font-black text-white/20">{player.name.charAt(0)}</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white text-sm truncate max-w-[150px]">{player.name}</p>
                          {player.nickname && <p className="text-[10px] text-white/30 truncate">"{player.nickname}"</p>}
                        </div>
                      </div>
                    </td>

                    {/* Position */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs font-bold" style={{ color: '#44f3a9' }}>{player.position}</p>
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

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap"
                        style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                        {player.status}
                      </span>
                    </td>

                    {/* Participation */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full"
                            style={{ width: `${player.participationPct}%`, background: player.participationPct >= 70 ? '#44f3a9' : player.participationPct >= 40 ? '#ffd08b' : '#f87171' }} />
                        </div>
                        <span className="text-[10px] font-black w-8 text-right"
                          style={{ color: player.participationPct >= 70 ? '#44f3a9' : player.participationPct >= 40 ? '#ffd08b' : '#f87171' }}>
                          {player.participationPct}%
                        </span>
                      </div>
                    </td>

                    {/* Edit */}
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleEdit(player)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center ml-auto transition-all hover:text-soccer-green"
                          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                          <Edit2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-5 py-3 text-[10px] text-white/25 text-right" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {filtered.length} jugadores{filterPos !== 'Todos' ? ` · ${filterPos}` : ''}
          </div>
        </div>
      )}

      <PlayerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={fetchPlayers} player={selectedPlayer} />

      {zoomPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)' }}
          onClick={() => setZoomPhoto(null)}
        >
          <button className="absolute top-5 right-5 text-white/30 hover:text-white transition-colors" onClick={() => setZoomPhoto(null)}>
            <X size={28} strokeWidth={1.5} />
          </button>
          <img src={zoomPhoto} alt="Foto" className="max-w-sm w-full max-h-[80vh] object-contain rounded-2xl scale-in" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
        </div>
      )}
    </div>
  );
}
