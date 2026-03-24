import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { ShieldAlert, RefreshCw, Save, Users, CheckCircle2, UserPlus, X, Star } from 'lucide-react';

export default function Matchmaking() {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [confirmedPlayers, setConfirmedPlayers] = useState<any[]>([]);
  const [teamA, setTeamA] = useState<any[]>([]);
  const [teamB, setTeamB] = useState<any[]>([]);
  const [formationA, setFormationA] = useState('3-2-1');
  const [formationB, setFormationB] = useState('3-2-1');
  const [colorA, setColorA] = useState('blue');
  const [colorB, setColorB] = useState('white');
  const [swapSelection, setSwapSelection] = useState<{ team: 'A' | 'B', index: number } | null>(null);
  const [saved, setSaved] = useState(false);
  const [teamsGenerated, setTeamsGenerated] = useState(false);

  // Guest form (pre-generation pool)
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestRating, setGuestRating] = useState('5');

  // Post-generation guest modal (add to specific team)
  const [showGuestModal, setShowGuestModal] = useState<{ team: 'A' | 'B' } | null>(null);
  const [guestModalName, setGuestModalName] = useState('');
  const [guestModalRating, setGuestModalRating] = useState('5');

  const { isAdmin } = useAuth();

  const FORMATIONS: any = {
    '5vs5': [
      { name: 'El Rombo', value: '1-2-1' },
      { name: 'El Cuadrado', value: '2-0-2' },
      { name: 'La Pirámide', value: '2-1-1' },
      { name: 'Invertida', value: '1-1-2' }
    ],
    '6vs6': [
      { name: 'El Muro', value: '3-1-1' },
      { name: 'Diamante', value: '2-2-1' },
      { name: 'Árbol Navidad', value: '2-1-2' },
      { name: 'La Flecha', value: '1-2-2' }
    ],
    '7vs7': [
      { name: 'Estándar', value: '3-2-1' },
      { name: 'Dinámico', value: '2-3-1' },
      { name: 'Doble Punta', value: '3-1-2' },
      { name: 'Catenaccio', value: '4-1-1' }
    ],
    '11vs11': [
      { name: 'Clásico', value: '4-4-2' },
      { name: 'Ofensivo', value: '4-3-3' },
      { name: 'Equilibrado', value: '4-2-3-1' },
      { name: 'Tres Centrales', value: '3-5-2' }
    ]
  };

  const JERSEY_COLORS = [
    { name: 'Negro', value: 'black', class: 'bg-slate-900 border-white/20' },
    { name: 'Blanco', value: 'white', class: 'bg-white border-slate-300' },
    { name: 'Azul', value: 'blue', class: 'bg-blue-600' },
    { name: 'Verde', value: 'emerald', class: 'bg-emerald-600' },
    { name: 'Amarillo', value: 'yellow', class: 'bg-yellow-500' },
    { name: 'Rojo', value: 'red', class: 'bg-red-600' },
    { name: 'Lila', value: 'purple', class: 'bg-purple-600' },
    { name: 'Celeste', value: 'lightblue', class: 'bg-sky-400' },
  ];

  const getMatchFormations = () => {
    const total = confirmedPlayers.length;
    if (total >= 18) return FORMATIONS['11vs11'];
    if (total >= 14) return FORMATIONS['7vs7'];
    if (total >= 12) return FORMATIONS['6vs6'];
    return FORMATIONS['5vs5'];
  };

  useEffect(() => { fetchMatches(); }, []);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('matches').select('*').eq('status', 'Programado').order('date', { ascending: true });
      if (data && data.length > 0) {
        setMatches(data);
        // Auto-select the first match (the closest one in time)
        setSelectedMatch(data[0].id);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (selectedMatch) {
      fetchConfirmedPlayers(selectedMatch);
    } else {
      setConfirmedPlayers([]);
      setTeamA([]); setTeamB([]);
      setTeamsGenerated(false);
    }
  }, [selectedMatch]);

  const fetchConfirmedPlayers = async (matchId: string) => {
    // 1. Fetch real players from attendance
    const { data: attendanceData } = await supabase.from('attendance').select('*, player:players(*)').eq('match_id', matchId).eq('status', 'Voy');
    const realPlayers = attendanceData ? attendanceData.map(d => d.player) : [];

    // 2. Fetch guests from database
    const { data: guestsData } = await supabase.from('match_guests').select('*').eq('match_id', matchId);
    const guestPlayers = guestsData ? guestsData.map(g => ({ ...g, isGuest: true, photo_url: null, nickname: null })) : [];

    setConfirmedPlayers([...realPlayers, ...guestPlayers]);
    
    // 3. Check for saved teams AFTER players are loaded
    await checkSavedTeams(matchId);
  };

  const checkSavedTeams = async (matchId: string) => {
    const { data } = await supabase.from('generated_teams').select('*').eq('match_id', matchId).single();
    if (data) {
      setTeamA(data.team_a || []); 
      setTeamB(data.team_b || []);
      if (data.metadata?.formationA) setFormationA(data.metadata.formationA);
      if (data.metadata?.formationB) setFormationB(data.metadata.formationB);
      if (data.metadata?.colorA) setColorA(data.metadata.colorA);
      if (data.metadata?.colorB) setColorB(data.metadata.colorB);
      setSaved(true); 
      setTeamsGenerated(true);
    } else {
      setTeamA([]); 
      setTeamB([]); 
      setSaved(false); 
      setTeamsGenerated(false);
    }
  };

  // Add guest to the confirmed pool (pre-generation)
  const addGuestToPool = async () => {
    if (!guestName.trim() || !selectedMatch) return;
    const guestData = {
      match_id: selectedMatch,
      name: guestName.trim() + ' (I)',
      rating: parseFloat(guestRating) || 5,
      position: 'Invitado'
    };
    
    // Guardamos en Supabase primero
    const { data, error } = await supabase.from('match_guests').insert([guestData]).select().single();
    
    if (error) {
      console.error(error);
      alert('Error al guardar invitado');
      return;
    }

    if (data) {
      const guest = { ...data, isGuest: true, photo_url: null, nickname: null };
      setConfirmedPlayers(prev => [...prev, guest]);
    }

    setGuestName('');
    setGuestRating('5');
    setShowGuestForm(false);
  };

  const removeFromPool = async (id: string) => {
    if (typeof id === 'string' && id.startsWith('guest-')) {
       // Local temporary guest (not yet in DB or from non-persisted state)
       setConfirmedPlayers(prev => prev.filter(p => p.id !== id));
       return;
    }

    const { error } = await supabase.from('match_guests').delete().eq('id', id);
    if (!error) {
      setConfirmedPlayers(prev => prev.filter(p => p.id !== id));
    }
  };

  const generateTeams = () => {
    if (confirmedPlayers.length < 10) return;
    const isGK = (p: any) => p.position?.toLowerCase().includes('por') || p.position?.toLowerCase().includes('arq');
    const goalkeepers = confirmedPlayers.filter(isGK).sort((a, b) => b.rating - a.rating);
    const others = confirmedPlayers.filter(p => !isGK(p)).sort((a, b) => b.rating - a.rating);
    const newTeamA: any[] = [], newTeamB: any[] = [];
    let sumA = 0, sumB = 0;
    goalkeepers.forEach((gk, i) => { if (i % 2 === 0) { newTeamA.push(gk); sumA += gk.rating; } else { newTeamB.push(gk); sumB += gk.rating; } });
    for (let i = 0; i < others.length; i += 2) {
      const p1 = others[i], p2 = others[i + 1];
      if (p2) {
        if (sumA > sumB + 1) { newTeamB.push(p1); sumB += p1.rating; newTeamA.push(p2); sumA += p2.rating; }
        else if (sumB > sumA + 1) { newTeamA.push(p1); sumA += p1.rating; newTeamB.push(p2); sumB += p2.rating; }
        else if (Math.random() > 0.5) { newTeamA.push(p1); sumA += p1.rating; newTeamB.push(p2); sumB += p2.rating; }
        else { newTeamB.push(p1); sumB += p1.rating; newTeamA.push(p2); sumA += p2.rating; }
      } else {
        if (sumA > sumB) { newTeamB.push(p1); sumB += p1.rating; } else { newTeamA.push(p1); sumA += p1.rating; }
      }
    }
    setTeamA(newTeamA); setTeamB(newTeamB);
    setSaved(false); setTeamsGenerated(true);
  };

  const backToRoster = () => { setTeamsGenerated(false); setTeamA([]); setTeamB([]); setSaved(false); };

  const saveTeams = async () => {
    if (!selectedMatch || !isAdmin) return;
    try {
      const { data: existing } = await supabase.from('generated_teams').select('id').eq('match_id', selectedMatch).single();
      const payload = { team_a: teamA, team_b: teamB, metadata: { formationA, formationB, colorA, colorB } };
      if (existing) { await supabase.from('generated_teams').update(payload).eq('id', existing.id); }
      else { await supabase.from('generated_teams').insert([{ match_id: selectedMatch, ...payload }]); }
      setSaved(true);
    } catch (e) { console.error(e); alert('Error al guardar'); }
  };

  // Post-generation: add guest to specific team
  const addGuestToTeam = (team: 'A' | 'B') => {
    if (!guestModalName.trim()) return;
    const guest = { id: `guest-${Date.now()}`, name: guestModalName.trim() + ' (I)', rating: parseFloat(guestModalRating) || 5, position: 'Invitado', photo_url: null, nickname: null };
    if (team === 'A') setTeamA(prev => [...prev, guest]);
    else setTeamB(prev => [...prev, guest]);
    setGuestModalName(''); setGuestModalRating('5'); setShowGuestModal(null); setSaved(false);
  };

  const handleSwap = (team: 'A' | 'B', index: number) => {
    if (!swapSelection) { setSwapSelection({ team, index }); return; }
    const { team: t1, index: i1 } = swapSelection;
    if (t1 === team && i1 === index) { setSwapSelection(null); return; }
    const nA = [...teamA], nB = [...teamB];
    const p1 = t1 === 'A' ? nA[i1] : nB[i1];
    const p2 = team === 'A' ? nA[index] : nB[index];
    if (t1 === 'A') nA[i1] = p2; else nB[i1] = p2;
    if (team === 'A') nA[index] = p1; else nB[index] = p1;
    setTeamA(nA); setTeamB(nB); setSwapSelection(null); setSaved(false);
  };

  const getPosition = (index: number, team: 'A' | 'B', _count: number, formation: string) => {
    const parts = formation.split('-').map(Number);
    const lines = [1, ...parts];
    const totalRepresented = lines.reduce((a, b) => a + b, 0);
    if (index >= totalRepresented) {
      const bi = index - totalRepresented;
      return { left: team === 'A' ? `${15 + bi * 12}%` : `${85 - bi * 12}%`, bottom: '2%', transform: 'translateX(-50%) scale(0.75)', zIndex: 5 };
    }
    let accumulated = 0, currentLine = 0, indexInLine = 0;
    for (let i = 0; i < lines.length; i++) {
      if (index < accumulated + lines[i]) { currentLine = i; indexInLine = index - accumulated; break; }
      accumulated += lines[i];
    }
    const xBase = team === 'A' ? ((currentLine / lines.length) * 44 + 5) : 95 - ((currentLine / lines.length) * 44);
    const spacing = 90 / (lines[currentLine] + 1);
    return { left: `${xBase}%`, top: `${5 + spacing * (indexInLine + 1)}%`, zIndex: 10 + currentLine };
  };

  const getAvg = (team: any[]) => team.length === 0 ? '0.0' : (team.reduce((a, p) => a + (p.rating || 0), 0) / team.length).toFixed(1);

  const canGenerate = confirmedPlayers.length >= 10;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-2 border-t-soccer-green border-r-soccer-green/20 border-b-soccer-green/10 border-l-soccer-green/5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fade-in pb-20 md:pb-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-soccer-green/70 mb-1">Táctica</p>
          <h1 className="font-headline text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9' }}>
              <ShieldAlert size={18} />
            </div>
            Matchmaking
          </h1>
        </div>

        <select
          className="input-field max-w-xs"
          value={selectedMatch}
          onChange={(e) => { setSelectedMatch(e.target.value); setTeamsGenerated(false); }}
        >
          <option value="">— Selecciona un partido —</option>
          {matches.map(m => (
            <option key={m.id} value={m.id}>
              {format(new Date(m.date), 'dd/MM/yyyy')} · {m.location}
            </option>
          ))}
        </select>
      </div>

      {!selectedMatch ? (
        <div className="text-center py-20 rounded-2xl" style={{ background: '#1c2026', border: '1px dashed rgba(255,255,255,0.08)' }}>
          <ShieldAlert size={40} className="mx-auto mb-4 opacity-20" />
          <h3 className="font-headline text-lg font-bold text-white mb-2">Selecciona un partido</h3>
          <p className="text-white/35 text-sm max-w-sm mx-auto">Elige un partido del menú para ver la nómina y armar los equipos.</p>
        </div>
      ) : !teamsGenerated ? (
        /* ── ROSTER VIEW ── */
        <div className="space-y-5">
          {/* Stats bar */}
          <div
            className="flex items-center justify-between px-5 py-4 rounded-2xl"
            style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9' }}>
                <Users size={17} />
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-none">{confirmedPlayers.length} jugadores</p>
                <p className="text-white/35 text-xs mt-0.5">
                  {confirmedPlayers.filter(p => p.isGuest).length > 0
                    ? `${confirmedPlayers.filter(p => !p.isGuest).length} confirmados · ${confirmedPlayers.filter(p => p.isGuest).length} invitados`
                    : 'confirmados para este partido'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={() => setShowGuestForm(!showGuestForm)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{ background: 'rgba(255,208,139,0.1)', color: '#ffd08b', border: '1px solid rgba(255,208,139,0.2)' }}
                >
                  <UserPlus size={15} />
                  Agregar Invitado
                </button>
              )}
              <button
                onClick={generateTeams}
                disabled={!canGenerate}
                className="btn-primary py-2 px-5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw size={15} />
                Generar Equipos
              </button>
            </div>
          </div>

          {/* Min players warning */}
          {confirmedPlayers.length < 10 && confirmedPlayers.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(255,208,139,0.06)', border: '1px solid rgba(255,208,139,0.15)', color: '#ffd08b' }}>
              <span className="text-base">⚠️</span>
              Faltan {10 - confirmedPlayers.length} jugador{10 - confirmedPlayers.length !== 1 ? 'es' : ''} para el mínimo 5 vs 5. Agrega invitados para completar.
            </div>
          )}

          {/* Guest form */}
          {showGuestForm && isAdmin && (
            <div className="flex flex-col sm:flex-row gap-3 items-end p-4 rounded-2xl fade-in" style={{ background: '#262a31', border: '1px solid rgba(255,208,139,0.15)' }}>
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Nombre del invitado</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej: Juan Pérez"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addGuestToPool()}
                  autoFocus
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Rating (1–7)</label>
                <input
                  type="number"
                  className="input-field"
                  min="1" max="7" step="1"
                  value={guestRating}
                  onChange={e => setGuestRating(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={addGuestToPool} className="btn-primary flex-1 sm:flex-none py-3 px-5 text-sm">Agregar</button>
                <button onClick={() => { setShowGuestForm(false); setGuestName(''); }} className="btn-secondary py-3 px-4 text-sm">
                  <X size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Roster 2 columns */}
          {confirmedPlayers.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ background: '#1c2026', border: '1px dashed rgba(255,255,255,0.08)' }}>
              <Users size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-white/40">No hay jugadores confirmados para este partido.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {confirmedPlayers.map((player, idx) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all group"
                  style={{
                    background: player.isGuest ? 'rgba(255,208,139,0.06)' : '#1c2026',
                    border: `1px solid ${player.isGuest ? 'rgba(255,208,139,0.15)' : 'rgba(255,255,255,0.05)'}`,
                  }}
                >
                  {/* Number */}
                  <span className="text-[10px] font-black text-white/20 w-5 text-center flex-shrink-0">{idx + 1}</span>

                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden text-sm font-black"
                    style={{
                      background: player.isGuest ? 'rgba(255,208,139,0.15)' : '#262a31',
                      border: `1.5px solid ${player.isGuest ? 'rgba(255,208,139,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      color: player.isGuest ? '#ffd08b' : 'rgba(255,255,255,0.4)'
                    }}
                  >
                    {player.photo_url
                      ? <img src={player.photo_url} className="w-full h-full object-cover" alt={player.name} />
                      : player.name.charAt(0)
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate leading-tight">{player.name}</p>
                    <p className="text-[10px] truncate" style={{ color: player.isGuest ? '#ffd08b' : 'rgba(255,255,255,0.3)' }}>
                      {player.position || 'Sin posición'}
                    </p>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Star size={11} className="fill-current" style={{ color: '#ffd08b' }} />
                    <span className="text-xs font-bold text-white/60">{player.rating}</span>
                  </div>

                  {/* Remove guest */}
                  {player.isGuest && isAdmin && (
                    <button
                      onClick={() => removeFromPool(player.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-white/30 hover:text-red-400"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {confirmedPlayers.length >= 10 && (
            <div className="flex justify-center pt-2">
              <button onClick={generateTeams} className="btn-primary px-10 py-3">
                <RefreshCw size={16} />
                Generar Equipos ({confirmedPlayers.length} jugadores)
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ── TEAMS VIEW ── */
        <div className="space-y-6">
          {/* Action bar */}
          <div
            className="flex items-center justify-between px-5 py-4 rounded-2xl"
            style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={backToRoster}
                className="btn-secondary py-2 px-4 text-sm"
              >
                ← Nómina
              </button>
              <span className="text-white/40 text-sm">{confirmedPlayers.length} jugadores · {teamA.length} vs {teamB.length}</span>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <button onClick={generateTeams} className="btn-secondary py-2 px-4 text-sm flex items-center gap-2">
                  <RefreshCw size={15} /> Re-generar
                </button>
                <button
                  onClick={saveTeams}
                  disabled={saved || teamA.length === 0}
                  className={`btn-primary py-2 px-4 text-sm flex items-center gap-2 ${saved ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
                  {saved ? 'Guardado' : 'Guardar'}
                </button>
              </div>
            )}
          </div>

          {/* Formation & Color selectors */}
          <div
            className="flex flex-col gap-3 items-center py-3 px-6 rounded-3xl mx-auto max-w-fit"
            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)' }}
          >
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <span className="text-[9px] font-black text-white/30 tracking-widest uppercase">Táctica</span>
              <div className="w-px h-3 bg-white/10" />
              <span className="text-[9px] font-black tracking-tighter" style={{ color: '#44f3a9' }}>A:</span>
              <div className="flex gap-1">
                {getMatchFormations().map((f: any) => (
                  <button key={f.value} onClick={() => { setFormationA(f.value); setSaved(false); }} title={f.name}
                    className="text-[9px] px-2 py-0.5 rounded-full transition-all"
                    style={formationA === f.value
                      ? { background: '#44f3a9', color: '#003822', boxShadow: '0 0 10px rgba(68,243,169,0.4)' }
                      : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                    {f.value}
                  </button>
                ))}
              </div>
              <div className="w-px h-3 bg-white/10" />
              <span className="text-[9px] font-black tracking-tighter text-blue-400">B:</span>
              <div className="flex gap-1">
                {getMatchFormations().map((f: any) => (
                  <button key={f.value} onClick={() => { setFormationB(f.value); setSaved(false); }} title={f.name}
                    className="text-[9px] px-2 py-0.5 rounded-full transition-all"
                    style={formationB === f.value
                      ? { background: '#3b82f6', color: '#fff', boxShadow: '0 0 10px rgba(59,130,246,0.4)' }
                      : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                    {f.value}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-center pt-2 w-full" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-[9px] font-black text-white/30 tracking-widest uppercase">Camisetas</span>
              <div className="w-px h-3 bg-white/10" />
              <span className="text-[9px] font-black" style={{ color: '#44f3a9' }}>A:</span>
              <div className="flex gap-1">
                {JERSEY_COLORS.map(c => (
                  <button key={c.value} onClick={() => { setColorA(c.value); setSaved(false); }}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${c.class} ${colorA === c.value ? 'scale-125 border-white' : 'border-transparent opacity-40 hover:opacity-100'}`}
                    title={c.name} />
                ))}
              </div>
              <div className="w-px h-3 bg-white/10" />
              <span className="text-[9px] font-black text-blue-400">B:</span>
              <div className="flex gap-1">
                {JERSEY_COLORS.map(c => (
                  <button key={c.value} onClick={() => { setColorB(c.value); setSaved(false); }}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${c.class} ${colorB === c.value ? 'scale-125 border-white' : 'border-transparent opacity-40 hover:opacity-100'}`}
                    title={c.name} />
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-[9px] text-white/25 font-medium">💡 Click en dos cartas para intercambiar posiciones</p>

          {/* Pitch */}
          <div className="relative w-full aspect-[16/10] md:aspect-[16/8] rounded-[2.5rem] overflow-hidden border-4 p-4 group"
            style={{ background: '#064e3b', borderColor: '#0a0e14', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8)' }}>
            <div className="absolute inset-0 opacity-15 pointer-events-none"
              style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10%, rgba(255,255,255,0.04) 10%, rgba(255,255,255,0.04) 20%)', backgroundSize: '200% 100%' }} />
            <div className="absolute inset-x-6 inset-y-6 border border-white/20 rounded-3xl pointer-events-none" />
            <div className="absolute left-1/2 top-6 bottom-6 w-px bg-white/15 pointer-events-none" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 md:w-52 md:h-52 border border-white/15 rounded-full pointer-events-none" />
            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-16 h-36 md:w-28 md:h-56 border border-white/15 border-l-0 rounded-r-xl pointer-events-none" />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 w-16 h-36 md:w-28 md:h-56 border border-white/15 border-r-0 rounded-l-xl pointer-events-none" />
            <div className="pitch-team-label left-10">Equipo A</div>
            <div className="pitch-team-label right-10">Equipo B</div>
            {teamA.map((p, i) => (
              <div key={p.id} className="pitch-player" style={getPosition(i, 'A', teamA.length, formationA)} onClick={() => handleSwap('A', i)}>
                <FifaCard player={p} color={i === 0 ? 'gold' : colorA} index={i} isSelected={swapSelection?.team === 'A' && swapSelection?.index === i} />
              </div>
            ))}
            {teamB.map((p, i) => (
              <div key={p.id} className="pitch-player" style={getPosition(i, 'B', teamB.length, formationB)} onClick={() => handleSwap('B', i)}>
                <FifaCard player={p} color={i === 0 ? 'gold' : colorB} index={i} isSelected={swapSelection?.team === 'B' && swapSelection?.index === i} />
              </div>
            ))}
          </div>

          {/* Team lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(['A', 'B'] as const).map(team => {
              const players = team === 'A' ? teamA : teamB;
              const color = team === 'A' ? colorA : colorB;
              const colorHex = color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : color === 'white' ? '#fff' : color === 'yellow' ? '#eab308' : color === 'red' ? '#ef4444' : color === 'purple' ? '#a855f7' : color === 'lightblue' ? '#38bdf8' : '#1e293b';
              return (
                <div key={team} className="glass-card" style={team === 'A' ? { borderLeft: `3px solid ${colorHex}` } : { borderRight: `3px solid ${colorHex}` }}>
                  <div className="flex justify-between items-center mb-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-3">
                      <h3 className="font-headline text-lg font-black uppercase" style={{ color: colorHex }}>Equipo {team}</h3>
                      {isAdmin && (
                        <button
                          onClick={() => { setShowGuestModal({ team }); setGuestModalName(''); setGuestModalRating('5'); }}
                          className="text-[9px] px-2 py-1 rounded-lg font-bold transition-all"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          + Invitado
                        </button>
                      )}
                    </div>
                    <span className="text-xs font-bold text-white/50 px-3 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      {getAvg(players)} ⭐
                    </span>
                  </div>
                  <div className="space-y-2">
                    {players.map(p => (
                      <div key={p.id} className="flex justify-between items-center p-3 rounded-xl transition-all hover:bg-white/3" style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <div className="flex items-center gap-3 truncate">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden text-xs font-bold flex-shrink-0"
                            style={{ background: '#31353c', color: 'rgba(255,255,255,0.5)' }}>
                            {p.photo_url ? <img src={p.photo_url} className="w-full h-full object-cover" alt={p.name} /> : p.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-white text-sm truncate">{p.name}</span>
                        </div>
                        <span className="font-black text-sm flex-shrink-0" style={{ color: colorHex }}>{p.rating}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Post-generation guest modal */}
      {showGuestModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 fade-in" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}>
          <div className="glass-card w-full max-w-sm">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-headline text-xl font-bold text-white">Invitado · Equipo {showGuestModal.team}</h3>
              <button onClick={() => setShowGuestModal(null)} className="text-white/30 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1.5">Nombre</label>
                <input type="text" className="input-field" placeholder="Ej: Juan Pérez" value={guestModalName}
                  onChange={e => setGuestModalName(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1.5">Rating (1–7)</label>
                <input type="number" className="input-field" min="1" max="7" value={guestModalRating}
                  onChange={e => setGuestModalRating(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowGuestModal(null)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={() => addGuestToTeam(showGuestModal.team)} className="btn-primary flex-1">Agregar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FifaCard({ player, color, index, isSelected }: { player: any, color: string, index: number, isSelected?: boolean }) {
  return (
    <div className={`fifa-card-container fade-in ${isSelected ? 'scale-110 -translate-y-4 brightness-125 z-50' : 'z-10'}`} style={{ animationDelay: `${index * 50}ms` }}>
      <div className={`fifa-card ${color} ${isSelected ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-transparent shadow-[0_0_30px_rgba(250,204,21,0.6)]' : ''}`}>
        <div className="card-top">
          <div className="card-rating font-black uppercase">{player.rating * 14}</div>
          <div className="card-pos">{player.position?.split(' ')[0].substring(0, 3).toUpperCase()}</div>
        </div>
        <div className="card-photo">
          {player.photo_url
            ? <img src={player.photo_url} alt={player.name} className="object-top" />
            : <div className="card-placeholder text-3xl font-bold text-white/20">{player.name.charAt(0)}</div>
          }
        </div>
        <div className="card-bottom">
          <div className="card-name">{player.name}</div>
          {player.nickname && <div className="card-nickname">"{player.nickname}"</div>}
        </div>
      </div>
    </div>
  );
}
