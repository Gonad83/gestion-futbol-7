import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Plus, Edit2, Star, X } from 'lucide-react';
import PlayerModal from '../components/PlayerModal';

const getPositionWeight = (pos: string) => {
  if (!pos) return 5;
  if (pos.includes('Portero')) return 1;
  if (pos.includes('Defensa') || pos.includes('Lateral')) return 2;
  if (pos.includes('Medio') || pos.includes('Volante') || pos.includes('Enganche')) return 3;
  if (pos.includes('Delantero') || pos.includes('Extremo')) return 4;
  return 5;
};

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Activo:   { bg: 'rgba(68,243,169,0.1)',  color: '#44f3a9', border: 'rgba(68,243,169,0.2)' },
  Lesionado:{ bg: 'rgba(248,113,113,0.1)', color: '#f87171', border: 'rgba(248,113,113,0.2)' },
  Inactivo: { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', border: 'rgba(255,255,255,0.08)' },
};

export default function Players() {
  const { isAdmin } = useAuth();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);

  useEffect(() => { fetchPlayers(); }, []);

  const fetchPlayers = async () => {
    setLoading(true);
    const { data } = await supabase.from('players').select('*');
    if (data) {
      const sorted = data.filter(p => p.status !== 'Inactivo').sort((a, b) => {
        const wa = getPositionWeight(a.position), wb = getPositionWeight(b.position);
        if (wa !== wb) return wa - wb;
        return a.name.localeCompare(b.name);
      });
      setPlayers(sorted);
    }
    setLoading(false);
  };

  const handleEdit = (player: any) => { setSelectedPlayer(player); setIsModalOpen(true); };
  const handleNew = () => { setSelectedPlayer(null); setIsModalOpen(true); };

  return (
    <div className="fade-in pb-20 md:pb-0 space-y-6">
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

      {loading ? (
        <div className="flex justify-center p-16">
          <div className="w-9 h-9 rounded-full border-2 border-t-soccer-green border-r-soccer-green/20 border-b-soccer-green/10 border-l-soccer-green/5 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {players.map(player => {
            const st = STATUS_STYLE[player.status] || STATUS_STYLE.Inactivo;
            return (
              <div
                key={player.id}
                className="relative flex flex-col items-center p-6 rounded-2xl transition-all duration-300 hover:translate-y-[-2px] group"
                style={{
                  background: '#1c2026',
                  border: '1px solid rgba(255,255,255,0.05)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.35)'
                }}
              >
                {/* Subtle top glow on hover */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, rgba(68,243,169,0.03) 0%, transparent 60%)' }} />

                {/* Photo */}
                <div
                  className={`w-24 h-24 rounded-full mb-5 overflow-hidden flex-shrink-0 flex items-center justify-center ${player.photo_url ? 'cursor-zoom-in' : ''}`}
                  style={{ background: '#262a31', border: `2px solid ${player.photo_url ? 'rgba(68,243,169,0.2)' : 'rgba(255,255,255,0.06)'}` }}
                  onClick={() => player.photo_url && setZoomPhoto(player.photo_url)}
                >
                  {player.photo_url ? (
                    <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black text-white/20">{player.name.charAt(0)}</span>
                  )}
                </div>

                {/* Name */}
                <h3 className="font-headline text-lg font-bold text-white text-center w-full truncate" title={player.name}>
                  {player.name}
                </h3>
                {player.nickname && (
                  <p className="text-white/35 text-xs mb-1 truncate">"{player.nickname}"</p>
                )}

                {/* Position */}
                <div className="h-10 flex flex-col items-center justify-center mb-4 w-full">
                  <p className="text-xs font-bold text-center px-2" style={{ color: '#44f3a9' }}>{player.position}</p>
                  {player.secondary_position && (
                    <p className="text-[10px] text-white/30 mt-0.5 text-center px-2">{player.secondary_position}</p>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex items-center justify-around w-full rounded-xl p-3 mb-4" style={{ background: '#0a0e14' }}>
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
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                    >
                      {player.status}
                    </span>
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

          {players.length === 0 && (
            <div className="col-span-full text-center py-16 rounded-2xl" style={{ background: '#1c2026', border: '1px dashed rgba(255,255,255,0.08)' }}>
              <span className="text-4xl mb-4 block">👤</span>
              <h3 className="font-headline text-lg font-bold text-white mb-2">Sin jugadores</h3>
              <p className="text-white/40 text-sm mb-5">Aún no hay jugadores registrados en el equipo.</p>
              {isAdmin && <button onClick={handleNew} className="btn-primary">Crear primer jugador</button>}
            </div>
          )}
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
