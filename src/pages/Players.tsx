import { useState, useEffect } from 'react';
import { supabase, withTimeout } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Plus, Edit2, X, LayoutGrid, List, Search } from 'lucide-react';
import SubStatStars from '../components/SubStatStars';
import PlayerModal from '../components/PlayerModal';
import { Capa } from '../components/Capa';
import { ListaPlantilla, ResumenPlantilla } from './players/ListaPlantilla';
import { cargarTemporada } from '../lib/api/temporada';
import { confiabilidadPlantel, type Confiabilidad } from '../lib/temporada';
import { GRUPOS, filtrarPlantilla, grupoDe, type GrupoId, type JugadorPlantilla } from './players/plantilla';

const getPositionWeight = (pos: string) => {
  if (!pos) return 5;
  if (pos.includes('Portero')) return 1;
  if (pos.includes('Defensa') || pos.includes('Lateral')) return 2;
  if (pos.includes('Medio') || pos.includes('Volante') || pos.includes('Enganche')) return 3;
  if (pos.includes('Delantero') || pos.includes('Extremo')) return 4;
  return 5;
};

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Activo:   { bg: 'rgba(4,20,12,0.88)',  color: '#44f3a9', border: 'rgba(68,243,169,0.35)' },
  Lesionado:{ bg: 'rgba(20,4,4,0.88)', color: '#f87171', border: 'rgba(248,113,113,0.35)' },
  Inactivo: { bg: 'rgba(10,14,20,0.88)', color: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.15)' },
};

const getInitials = (name: string) => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map(part => part.charAt(0).toUpperCase())
  .join('');

const getPositionGroup = (pos?: string | null) => grupoDe(pos);

/**
 * Plantilla. Diseño para celular basado en el concepto de Stitch
 * (docs/diseno/plantilla-movil-stitch.png): resumen, buscador, filtros por
 * posición y una lista compacta agrupada por puesto. En pantallas grandes se
 * puede cambiar a las tarjetas con foto grande.
 */
export default function Players() {
  const { isAdmin, teamId } = useAuth();
  const [players, setPlayers] = useState<JugadorPlantilla[]>([]);
  const [totalMatchesYear, setTotalMatchesYear] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<JugadorPlantilla | null>(null);
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);
  const [filterPos, setFilterPos] = useState<GrupoId | 'Todos'>('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');
  const [confiabilidad, setConfiabilidad] = useState<Map<string, Confiabilidad>>();

  useEffect(() => { if (teamId) fetchPlayers(); }, [teamId]);

  // Solo el capitán ve qué tan confiable es cada uno (últimos 10 partidos: con 6 meses sobra).
  useEffect(() => {
    if (!teamId || !isAdmin) return;
    let vivo = true;
    const desde = new Date(Date.now() - 183 * 24 * 60 * 60 * 1000).toISOString();
    cargarTemporada(teamId, desde)
      .then((d) => vivo && setConfiabilidad(confiabilidadPlantel(d)))
      .catch(() => { /* sin índice: la lista se ve igual */ });
    return () => { vivo = false; };
  }, [teamId, isAdmin]);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
      const now = new Date().toISOString();

      const [playersRes, yearMatchesRes] = await Promise.all([
        withTimeout(supabase.from('players').select('*').eq('team_id', teamId) as any, 10000),
        withTimeout(supabase.from('matches').select('id').eq('team_id', teamId).gte('date', yearStart).lt('date', now) as any, 8000),
      ]);

      const data = (playersRes as any).data;
      const yearMatches = (yearMatchesRes as any).data || [];
      const todos: string[] = yearMatches.map((m: any) => m.id);

      // Solo cuentan los partidos en que alguien respondió: los duplicados o
      // las fechas que no se jugaron no bajan el porcentaje de nadie.
      const attendanceCounts: Record<string, number> = {};
      const conRespuesta = new Set<string>();
      if (todos.length > 0) {
        const { data: attData } = await supabase
          .from('attendance')
          .select('player_id, match_id, status')
          .in('match_id', todos);
        attData?.forEach((a: any) => {
          conRespuesta.add(a.match_id);
          if (a.status === 'Voy' && a.player_id) attendanceCounts[a.player_id] = (attendanceCounts[a.player_id] || 0) + 1;
        });
      }
      const matchIds = todos.filter((id) => conRespuesta.has(id));
      setTotalMatchesYear(matchIds.length);

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

  const handleEdit = (player: JugadorPlantilla) => { setSelectedPlayer(player); setIsModalOpen(true); };
  const handleNew = () => { setSelectedPlayer(null); setIsModalOpen(true); };

  const filtered = filtrarPlantilla(players, filterPos, busqueda);
  const countFor = (f: GrupoId | 'Todos') => (f === 'Todos' ? players.length : players.filter(p => grupoDe(p.position) === f).length);
  const filtros: (GrupoId | 'Todos')[] = ['Todos', ...GRUPOS.map(g => g.id).filter(id => id !== 'Otro' || countFor('Otro') > 0)];
  const etiqueta = (f: GrupoId | 'Todos') => (f === 'Todos' ? 'Todos' : GRUPOS.find(g => g.id === f)!.plural);

  return (
    <div className="fade-in pb-24 md:pb-0 space-y-5 max-w-6xl mx-auto">
      <div className="flex justify-between items-end gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-soccer-green mb-1">Equipo</p>
          <h1 className="font-headline text-3xl font-black text-white tracking-tight">Plantilla</h1>
          <p className="text-white/55 text-sm mt-0.5">{players.length} {players.length === 1 ? 'jugador' : 'jugadores'}</p>
        </div>
        <div className="hidden sm:flex gap-1 p-1 rounded-xl" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.07)' }}>
          {([['list', List, 'Vista lista'], ['cards', LayoutGrid, 'Vista tarjetas']] as const).map(([modo, Icono, titulo]) => (
            <button key={modo} type="button" onClick={() => setViewMode(modo)} title={titulo} aria-label={titulo} aria-pressed={viewMode === modo}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
              style={viewMode === modo ? { background: 'rgba(68,243,169,0.15)', color: '#44f3a9' } : { color: 'rgba(255,255,255,0.45)' }}>
              <Icono size={16} />
            </button>
          ))}
        </div>
      </div>

      {!loading && players.length > 0 && <ResumenPlantilla jugadores={players} />}

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
        <input type="search" aria-label="Buscar jugador" placeholder="Buscar jugador..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="w-full h-12 pl-11 pr-4 rounded-2xl text-[15px] text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-soccer-green/50"
          style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.07)' }} />
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1" role="group" aria-label="Filtrar por posición">
        {filtros.map(f => {
          const activo = filterPos === f;
          return (
            <button key={f} type="button" onClick={() => setFilterPos(f)} aria-pressed={activo}
              className="shrink-0 h-10 px-4 rounded-full text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
              style={activo ? { background: '#44f3a9', color: '#003822' } : { background: '#262a31', color: 'rgba(255,255,255,0.75)' }}>
              {etiqueta(f)} <span className="tabular-nums opacity-70">{countFor(f)}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center p-16">
          <div className="w-9 h-9 rounded-full border-2 border-t-soccer-green border-r-soccer-green/20 border-b-soccer-green/10 border-l-soccer-green/5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 rounded-2xl" style={{ background: '#181c22', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <h3 className="font-headline text-lg font-bold text-white mb-2">
            {players.length === 0 ? 'Sin jugadores' : 'Nadie coincide'}
          </h3>
          <p className="text-white/55 text-sm mb-5 px-6">
            {players.length === 0 ? 'Aún no hay jugadores registrados en el equipo.' : 'Prueba con otro nombre o cambia el filtro de posición.'}
          </p>
          {isAdmin && players.length === 0 && <button onClick={handleNew} className="btn-primary">Crear primer jugador</button>}
        </div>
      ) : viewMode === 'list' ? (
        <ListaPlantilla jugadores={filtered} isAdmin={isAdmin} totalPartidos={totalMatchesYear} confiabilidad={isAdmin ? confiabilidad : undefined} onAbrir={handleEdit} onFoto={setZoomPhoto} />
      ) : (
        /* ── VISTA TARJETAS (pantallas grandes) ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map(player => {
            const st = STATUS_STYLE[player.status] || STATUS_STYLE.Inactivo;
            return (
              <div
                key={player.id}
                className="relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 group"
                style={{ background: '#10141a', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 16px 40px rgba(0,0,0,0.28)' }}
              >
                <div
                  className={`relative h-72 overflow-hidden flex items-end justify-center ${player.photo_url ? 'cursor-zoom-in' : ''}`}
                  style={{ background: 'linear-gradient(180deg, #e8eee8 0%, #d6ddd6 100%)' }}
                  onClick={() => player.photo_url && setZoomPhoto(player.photo_url)}
                >
                  <div className="absolute left-4 top-4 z-10">
                    <span
                      className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]"
                      style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                    >
                      {player.status}
                    </span>
                  </div>
                  <div className="absolute right-4 top-4 z-10 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]"
                    style={{ background: 'rgba(10,14,20,0.9)', color: '#44f3a9' }}>
                    {getPositionGroup(player.position)}
                  </div>
                  {player.photo_url
                    ? <img src={player.photo_url} alt={player.name} className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
                    : (
                      <div className="mb-16 flex h-28 w-28 items-center justify-center rounded-full text-4xl font-black"
                        style={{ background: '#10141a', color: 'rgba(255,255,255,0.22)' }}>
                        {getInitials(player.name) || '?'}
                      </div>
                    )
                  }
                  <div className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
                    style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(10,14,20,0.9) 100%)' }} />
                </div>

                <div className="p-5" style={{ background: '#10141a' }}>
                  <div className="min-h-[82px]">
                    <h3 className="font-headline text-2xl font-black uppercase leading-none text-white" title={player.name}>
                      {player.name}
                    </h3>
                    {player.nickname && <p className="mt-1 text-xs font-semibold text-white/50 truncate">"{player.nickname}"</p>}
                    <p className="mt-3 text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: '#44f3a9' }}>
                      {player.position}
                    </p>
                    {player.secondary_position && <p className="mt-1 text-[11px] text-white/50">{player.secondary_position}</p>}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-[11px] text-white/50 uppercase tracking-wider mb-2 font-bold">Calidad <span style={{ color: '#ffd08b' }}>{player.rating}/7</span></p>
                      <SubStatStars player={player} size={9} compact />
                    </div>
                    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-[11px] text-white/50 uppercase tracking-wider mb-1 font-bold">Asistencia</p>
                      <div className="flex items-end gap-1">
                        <span className="font-headline text-2xl font-black leading-none"
                          style={{ color: player.participationPct >= 70 ? '#44f3a9' : player.participationPct >= 40 ? '#ffd08b' : '#f87171' }}>
                          {player.participationPct}
                        </span>
                        <span className="pb-0.5 text-[11px] font-bold text-white/50">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">Partidos</span>
                      <span className="text-[11px] font-bold text-white/50">{player.matchesPlayed}/{totalMatchesYear}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${player.participationPct}%`, background: player.participationPct >= 70 ? '#44f3a9' : player.participationPct >= 40 ? '#ffd08b' : '#f87171' }} />
                    </div>
                  </div>

                  {isAdmin && player.participationPct < 25 && totalMatchesYear >= 4 && (
                    <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(20,12,4,0.85)', border: '1px solid rgba(251,146,60,0.35)' }}>
                      <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: '#fb923c' }}>⚠ Riesgo deserción</span>
                    </div>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => handleEdit(player)}
                      className="mt-4 flex w-full items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:text-soccer-green"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                    >
                      <Edit2 size={14} /> Editar Perfil
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PlayerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={fetchPlayers} player={selectedPlayer} teamId={teamId} />

      {isAdmin && (
        <Capa>
          <button type="button" onClick={handleNew}
            className="fixed right-4 z-30 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:bottom-8 md:right-8 h-14 pl-4 pr-5 rounded-full flex items-center gap-2 font-headline font-bold text-[#003822] cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #44f3a9, #00d68f)', boxShadow: '0 10px 30px -6px rgba(68,243,169,0.5)' }}>
            <Plus size={22} /> Jugador
          </button>
        </Capa>
      )}

      {zoomPhoto && (
        <Capa>
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 fade-in"
            style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)' }}
            onClick={() => setZoomPhoto(null)}
            role="dialog" aria-modal="true" aria-label="Foto del jugador"
          >
            <button type="button" aria-label="Cerrar" className="absolute top-5 right-5 w-12 h-12 flex items-center justify-center text-white/50 hover:text-white transition-colors" onClick={() => setZoomPhoto(null)}>
              <X size={28} strokeWidth={1.5} />
            </button>
            <img src={zoomPhoto} alt="Foto" className="max-w-sm w-full max-h-[80vh] object-contain rounded-2xl scale-in" style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
          </div>
        </Capa>
      )}
    </div>
  );
}
