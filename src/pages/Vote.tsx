import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Star, CheckCircle2, ArrowLeft, UserCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Vote() {
  const { playerProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get('match_id');

  const [match, setMatch] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [existingVote, setExistingVote] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (matchId && playerProfile) {
      loadVoteData();
    } else if (!matchId) {
      loadLatestMatch();
    }
  }, [matchId, playerProfile]);

  const loadLatestMatch = async () => {
    setLoading(true);
    try {
      // Load the most recent completed match (past 48h)
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - 48);
      const { data } = await supabase
        .from('matches')
        .select('*')
        .lt('date', new Date().toISOString())
        .gt('date', cutoff.toISOString())
        .order('date', { ascending: false })
        .limit(1);
      if (data?.[0]) {
        setMatch(data[0]);
        if (playerProfile) await loadPlayersAndVote(data[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadVoteData = async () => {
    setLoading(true);
    try {
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();
      if (matchError || !matchData) { setError('Partido no encontrado.'); return; }
      setMatch(matchData);
      await loadPlayersAndVote(matchData.id);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayersAndVote = async (mid: string) => {
    if (!playerProfile) return;

    // Load confirmed attendees
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('player_id')
      .eq('match_id', mid)
      .eq('status', 'Voy');

    const playerIds = (attendanceData || []).map(a => a.player_id).filter(Boolean);

    if (playerIds.length > 0) {
      const { data: playerData } = await supabase
        .from('players')
        .select('id, name, nickname, photo_url')
        .in('id', playerIds)
        .neq('id', playerProfile.id); // Can't vote for yourself
      setPlayers(playerData || []);
    }

    // Check if already voted
    const { data: voteData } = await supabase
      .from('match_mvp_votes')
      .select('voted_player_id')
      .eq('match_id', mid)
      .eq('voter_player_id', playerProfile.id)
      .maybeSingle();

    if (voteData) {
      setExistingVote(voteData.voted_player_id);
      setSelectedPlayer(voteData.voted_player_id);
      setSubmitted(true);
    }
  };

  const handleVote = async () => {
    if (!selectedPlayer || !playerProfile || !match || submitting || existingVote) return;
    setSubmitting(true);
    try {
      const { error: voteError } = await supabase
        .from('match_mvp_votes')
        .insert({
          match_id: match.id,
          voter_player_id: playerProfile.id,
          voted_player_id: selectedPlayer,
        });
      if (voteError) throw voteError;
      setExistingVote(selectedPlayer);
      setSubmitted(true);
    } catch (err: any) {
      alert('Error al votar: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const votedPlayer = players.find(p => p.id === existingVote);

  if (!playerProfile) {
    return (
      <div className="fade-in flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <UserCircle size={48} className="text-white/20" />
        <div>
          <h2 className="font-headline text-xl font-bold text-white mb-1">Inicia sesión para votar</h2>
          <p className="text-white/40 text-sm mb-4">Necesitas estar logueado con tu perfil de jugador.</p>
          <Link to="/login" className="btn-primary px-6 py-2.5">Iniciar Sesión</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-10 h-10 rounded-full border-2 border-t-soccer-green border-r-soccer-green/20 border-b-soccer-green/10 border-l-soccer-green/5 animate-spin" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="fade-in flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <Star size={48} className="text-white/20" />
        <div>
          <h2 className="font-headline text-xl font-bold text-white mb-1">
            {error || 'No hay partido reciente para votar'}
          </h2>
          <p className="text-white/40 text-sm mb-4">La votación se abre automáticamente después de cada partido.</p>
          <Link to="/" className="btn-secondary px-6 py-2.5">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in pb-20 md:pb-0 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div>
        <Link to="/" className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs font-semibold mb-4 transition-colors">
          <ArrowLeft size={13} /> Volver al dashboard
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-soccer-green/70 mb-1">Votación</p>
        <h1 className="font-headline text-3xl font-black text-white tracking-tight">Mejor Jugador</h1>
      </div>

      {/* Match info */}
      <div
        className="p-4 rounded-2xl flex items-center gap-4"
        style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div
          className="flex flex-col items-center justify-center p-3 rounded-xl flex-shrink-0"
          style={{ background: '#0a0e14', border: '1px solid rgba(68,243,169,0.15)', minWidth: 72 }}
        >
          <p className="font-headline text-xl font-black text-white">{format(new Date(match.date), 'HH:mm')}</p>
          <p className="text-[9px] text-white/40 uppercase tracking-wider font-bold">{format(new Date(match.date), 'dd MMM', { locale: es })}</p>
        </div>
        <div>
          <p className="text-white font-bold">{match.location}</p>
          <p className="text-[10px] text-white/30 mt-0.5">{match.match_type || '7vs7'} · {players.length + 1} confirmados</p>
        </div>
      </div>

      {submitted ? (
        /* Already voted */
        <div
          className="glass-card text-center space-y-4"
          style={{ background: 'rgba(68,243,169,0.04)', borderColor: 'rgba(68,243,169,0.15)' }}
        >
          <CheckCircle2 size={40} className="mx-auto" style={{ color: '#44f3a9' }} />
          <div>
            <h3 className="font-headline text-xl font-black text-white mb-1">¡Voto registrado!</h3>
            <p className="text-white/40 text-sm">Votaste por</p>
            <p className="font-bold text-lg mt-1" style={{ color: '#ffd700' }}>
              {votedPlayer?.name || '—'}
              {votedPlayer?.nickname && <span className="text-white/40 text-base font-normal ml-1">"{votedPlayer.nickname}"</span>}
            </p>
          </div>
          <Link to="/" className="btn-secondary inline-flex px-6 py-2.5 mt-2">
            Ver podio en el dashboard
          </Link>
        </div>
      ) : (
        /* Voting form */
        <div className="glass-card space-y-4">
          <h3 className="font-headline text-base font-bold text-white">
            ¿Quién fue el mejor jugador del partido?
          </h3>
          <p className="text-white/30 text-xs">Selecciona un compañero. Solo puedes votar una vez.</p>

          {players.length === 0 ? (
            <div className="text-center py-6 rounded-xl" style={{ background: 'rgba(0,0,0,0.15)', border: '1px dashed rgba(255,255,255,0.08)' }}>
              <p className="text-white/30 text-sm">No hay jugadores disponibles para votar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {players.map(player => {
                const isSelected = selectedPlayer === player.id;
                return (
                  <button
                    key={player.id}
                    onClick={() => setSelectedPlayer(player.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                    style={{
                      background: isSelected ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isSelected ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      boxShadow: isSelected ? '0 0 0 1px rgba(255,215,0,0.1)' : 'none',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                      style={{ background: '#31353c', border: isSelected ? '2px solid rgba(255,215,0,0.5)' : '1.5px solid rgba(255,255,255,0.08)' }}
                    >
                      {player.photo_url
                        ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                        : <span className="text-base font-black" style={{ color: 'rgba(255,255,255,0.3)' }}>{player.name.charAt(0)}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{player.name}</p>
                      {player.nickname && <p className="text-[10px] text-white/30">"{player.nickname}"</p>}
                    </div>
                    <div
                      className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all"
                      style={{
                        background: isSelected ? '#ffd700' : 'transparent',
                        border: `2px solid ${isSelected ? '#ffd700' : 'rgba(255,255,255,0.2)'}`,
                      }}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={handleVote}
              disabled={!selectedPlayer || submitting}
              className="btn-primary w-full py-3 gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={selectedPlayer ? { background: 'linear-gradient(135deg, #ffd700, #ffb800)', color: '#000', boxShadow: '0 4px 20px rgba(255,215,0,0.25)' } : {}}
            >
              <Star size={16} />
              {submitting ? 'Enviando voto...' : 'Confirmar voto'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
