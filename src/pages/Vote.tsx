import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Star, CheckCircle2, ArrowLeft, UserCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { aviso } from '../lib/avisos';
import { Capa } from '../components/Capa';

export default function Vote() {
  const { playerProfile, teamId } = useAuth();
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
    } else if (!matchId && teamId) {
      loadLatestMatch();
    }
  }, [matchId, playerProfile, teamId]);

  const loadLatestMatch = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, 2=Tue...6=Sat
      if (dayOfWeek === 1) {
        setError('La votación está cerrada los lunes. Vuelve de martes a domingo después del partido.');
        return;
      }
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('team_id', teamId)
        .eq('event_type', 'Deportivo')
        .lt('date', now.toISOString())
        .gt('date', sevenDaysAgo.toISOString())
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
      aviso.error('Error al votar: ' + err.message);
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
            {error || 'No hay partido Deportivo reciente para votar'}
          </h2>
          <p className="text-white/40 text-sm mb-4">La votación se abre de martes a domingo después de cada partido Deportivo.</p>
          <Link to="/dashboard" className="btn-secondary px-6 py-2.5">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  const elegido = players.find(p => p.id === selectedPlayer);
  const iniciales = (n: string) => n.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');

  return (
    <div className="fade-in pb-40 md:pb-24 space-y-5 max-w-2xl mx-auto relative">
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,208,139,0.12), transparent 70%)' }} />
      <div className="relative">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white py-1 mb-2">
          <ArrowLeft size={15} /> Inicio
        </Link>
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#ffd08b] mb-1">Votación MVP</p>
        <h1 className="font-headline text-3xl font-black text-white tracking-tight">¿Quién fue el mejor?</h1>
      </div>

      <div className="relative flex items-center gap-3 p-3 rounded-2xl" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-[#ffd08b]" style={{ background: 'rgba(255,208,139,0.1)' }}>
          <Star size={18} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-white truncate first-letter:uppercase">
            {format(new Date(match.date), "EEEE d MMM '·' HH:mm", { locale: es })}{match.location ? ` · ${match.location}` : ''}
          </p>
          <p className="text-xs text-white/55">{players.length + 1} jugaron · un voto por partido, no puedes votarte</p>
        </div>
      </div>

      {submitted ? (
        <div className="relative text-center p-6 rounded-[20px] space-y-4" style={{ background: 'rgba(255,208,139,0.06)', border: '1px solid rgba(255,208,139,0.25)' }}>
          <span className="mx-auto w-20 h-20 rounded-full overflow-hidden flex items-center justify-center font-headline text-2xl font-black text-white"
            style={{ background: '#262a31', border: '3px solid #ffd08b', boxShadow: '0 0 30px -6px rgba(255,208,139,0.6)' }}>
            {votedPlayer?.photo_url ? <img src={votedPlayer.photo_url} alt="" className="w-full h-full object-cover" /> : iniciales(votedPlayer?.name || '?')}
          </span>
          <div>
            <p className="flex items-center justify-center gap-1.5 text-soccer-green font-bold text-sm"><CheckCircle2 size={16} /> Voto registrado</p>
            <p className="font-headline text-xl font-black text-white mt-1">
              {votedPlayer?.name || '—'}
              {votedPlayer?.nickname && <span className="text-white/50 text-base font-normal"> "{votedPlayer.nickname}"</span>}
            </p>
          </div>
          <Link to="/dashboard" className="inline-flex items-center justify-center h-12 px-6 rounded-full font-bold text-sm text-white" style={{ background: '#262a31' }}>
            Ver el ranking en el Inicio
          </Link>
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-10 px-6 rounded-[20px]" style={{ background: '#181c22', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <p className="text-white/60 text-sm">Nadie más confirmó asistencia a este partido, así que no hay a quién votar.</p>
        </div>
      ) : (
        <div className="relative grid grid-cols-2 gap-3" role="radiogroup" aria-label="Jugadores">
          {players.map(player => {
            const activo = selectedPlayer === player.id;
            return (
              <button key={player.id} type="button" role="radio" aria-checked={activo} onClick={() => setSelectedPlayer(player.id)}
                className="relative flex flex-col items-center text-center p-4 rounded-[20px] transition-all cursor-pointer"
                style={{
                  background: activo ? 'rgba(255,208,139,0.08)' : '#181c22',
                  border: `1.5px solid ${activo ? '#ffd08b' : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: activo ? '0 0 24px -8px rgba(255,208,139,0.6)' : 'none',
                }}>
                {activo && (
                  <span className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#ffd08b', color: '#2b1d00' }}>
                    <Star size={14} fill="#2b1d00" strokeWidth={0} />
                  </span>
                )}
                <span className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center font-headline text-lg font-bold text-white/70"
                  style={{ background: '#262a31', border: `2px solid ${activo ? '#ffd08b' : 'rgba(255,255,255,0.08)'}` }}>
                  {player.photo_url ? <img src={player.photo_url} alt="" className="w-full h-full object-cover" /> : iniciales(player.name)}
                </span>
                <span className="mt-2 font-semibold text-sm text-white leading-tight line-clamp-2">{player.name}</span>
                {player.nickname && <span className="text-xs italic text-white/50 truncate max-w-full">"{player.nickname}"</span>}
              </button>
            );
          })}
        </div>
      )}

      {!submitted && players.length > 0 && (
        <Capa>
          <div className="fixed inset-x-0 z-30 px-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6 md:left-auto md:right-8 md:w-[26rem]">
            <button type="button" onClick={handleVote} disabled={!selectedPlayer || submitting}
              className="w-full h-14 rounded-full flex items-center justify-center gap-2 font-headline font-bold text-[#2b1d00] cursor-pointer disabled:cursor-not-allowed transition-opacity"
              style={{
                background: selectedPlayer ? 'linear-gradient(135deg, #ffd08b, #ffb830)' : '#31353c',
                color: selectedPlayer ? '#2b1d00' : 'rgba(255,255,255,0.5)',
                boxShadow: selectedPlayer ? '0 10px 30px -8px rgba(255,184,48,0.6)' : 'none',
              }}>
              <Star size={18} />
              {submitting ? 'Enviando voto...' : elegido ? `Votar por ${elegido.name.split(' ')[0]}` : 'Elige a un compañero'}
            </button>
          </div>
        </Capa>
      )}
    </div>
  );
}
