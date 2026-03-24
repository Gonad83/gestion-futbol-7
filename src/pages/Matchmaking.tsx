import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { ShieldAlert, RefreshCw, Save, Users, CheckCircle2, UserPlus, X, Star, Edit2, Check } from 'lucide-react';

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
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
  const [editingGuestName, setEditingGuestName] = useState('');

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
        // setSelectedMatch will trigger another useEffect which calls fetchConfirmedPlayers
        setSelectedMatch(data[0].id);
      } else {
        setLoading(false);
      }
    } catch (e) { 
      console.error(e); 
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMatch) {
      fetchConfirmedPlayers(selectedMatch);
    } else {
      setConfirmedPlayers([]);
      setTeamA([]); setTeamB([]);
      setTeamsGenerated(false);
      // If we are here and not loading, we can stop loading
    }
  }, [selectedMatch]);

  const fetchConfirmedPlayers = async (matchId: string) => {
    try {
      // 1. Fetch real players from attendance
      const { data: attendanceData } = await supabase.from('attendance').select('*, player:players(*)').eq('match_id', matchId).eq('status', 'Voy');
      const realPlayers = attendanceData ? attendanceData.map(d => d.player) : [];

      // 2. Fetch guests from database
      const { data: guestsData } = await supabase.from('match_guests').select('*').eq('match_id', matchId);
      const guestPlayers = guestsData ? guestsData.map(g => ({ ...g, isGuest: true, photo_url: null, nickname: null })) : [];

      setConfirmedPlayers([...realPlayers, ...guestPlayers]);
      
      // 3. Check for saved teams
      await checkSavedTeams(matchId);
    } finally {
      setLoading(false);
    }
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
      setTeamA([]); setTeamB([]); 
      setSaved(false); setTeamsGenerated(false);
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

  const saveGuestName = async (guestId: string) => {
    if (!editingGuestName.trim() || !selectedMatch) return;
    
    // Ensure it ends with (I) if it doesn't already
    let newName = editingGuestName.trim();
    if (!newName.toLowerCase().endsWith('(i)')) {
      newName = `${newName} (I)`;
    }

    // Identify if it's a real guest from the DB or a temp guest
    const isTemp = typeof guestId === 'string' && guestId.startsWith('guest-');

    if (!isTemp) {
      // Update match_guests table ONLY if it's a persisted guest
      const { error } = await supabase.from('match_guests').update({ name: newName }).eq('id', guestId);
      if (error) {
        console.error(error);
        alert('Error al actualizar nombre del invitado');
        return;
      }
    }

    // Update local state (affects both pool and teams)
    const updateNameInList = (list: any[]) => list.map(p => p.id === guestId ? { ...p, name: newName, isGuest: true } : p);
    
    setConfirmedPlayers(prev => updateNameInList(prev));
    setTeamA(prev => updateNameInList(prev));
    setTeamB(prev => updateNameInList(prev));
    
    setEditingGuestId(null);
    setEditingGuestName('');
    setSaved(false); 
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


  if (loading && !selectedMatch) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="animate-spin text-soccer-green" size={40} />
        <p className="text-slate-400 font-medium animate-pulse tracking-wide">Cargando pizarra táctica...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 fade-in">
      {/* Header & Match Selection */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-soccer-green/10 rounded-xl border border-soccer-green/20">
            <Users className="text-soccer-green" size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-soccer-green uppercase tracking-[0.2em] mb-0.5">Estrategia</p>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Matchmaking</h1>
          </div>
        </div>

        <div className="relative group w-full md:w-auto">
          <select 
            className="input-field bg-slate-900/40 backdrop-blur-xl border-glass-border min-w-[280px] appearance-none cursor-pointer hover:border-soccer-green/30 transition-all pr-10"
            value={selectedMatch}
            onChange={(e) => {
              setLoading(true);
              setSelectedMatch(e.target.value);
            }}
          >
            {matches.length === 0 && <option value="">No hay partidos programados</option>}
            {matches.map(m => (
              <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                ⚽ {format(new Date(m.date), 'dd/MM/yyyy')} — {m.location}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <RefreshCw size={14} className={loading ? 'animate-spin text-soccer-green' : ''} />
          </div>
        </div>
      </div>

      {!selectedMatch ? (
        <div className="glass-card p-16 text-center flex flex-col items-center gap-6 border-dashed border-2 border-glass-border/40 bg-white/2">
          <div className="w-20 h-20 rounded-3xl bg-slate-800/50 flex items-center justify-center text-slate-500 shadow-inner">
            <ShieldAlert size={40} className="opacity-40" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-white uppercase italic">Calendario Vacío</h3>
            <p className="text-slate-400 max-w-xs mx-auto text-sm leading-relaxed">Primero debes agendar un partido en el calendario para poder organizar los equipos tácticos.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 animate-in fade-in duration-700">
          {/* Main Controls Overlay */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-black/40 backdrop-blur-2xl p-4 rounded-[2rem] border border-glass-border shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-5 py-2.5 bg-white/5 rounded-2xl border border-white/5">
                <Users size={16} className="text-soccer-green" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-tighter">Nómina:</span>
                <span className="text-sm font-black text-white min-w-[2ch]">{confirmedPlayers.length}</span>
              </div>
              
              {!teamsGenerated && isAdmin && (
                <button 
                  onClick={() => setShowGuestForm(!showGuestForm)}
                  className={`btn-glass text-xs flex items-center gap-2 px-4 py-2.5 rounded-2xl border-white/10 ${showGuestForm ? 'bg-white/10' : ''}`}
                >
                  <UserPlus size={14} />
                  <span>{showGuestForm ? 'Cancelar' : 'Invitados'}</span>
                </button>
              )}
            </div>

            <div className="flex gap-3">
              {isAdmin && (
                <>
                  <button 
                    onClick={generateTeams}
                    disabled={confirmedPlayers.length < 2 || loading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white transition-all border border-white/5"
                  >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    <span>{saved ? 'Reordenar' : 'Generar'}</span>
                  </button>
                  <button 
                    onClick={saveTeams}
                    disabled={!teamsGenerated || loading}
                    className={`flex items-center gap-2 px-8 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl ${
                      saved 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-soccer-green text-black hover:bg-soccer-green-light shadow-soccer-green/20'
                    }`}
                  >
                    {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
                    <span>{saved ? 'Listo' : 'Guardar'}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {!teamsGenerated ? (
            /* ── ROSTER VIEW ── */
            <div className="space-y-6">
              {showGuestForm && isAdmin && (
                <div className="flex flex-col sm:flex-row gap-4 items-end p-6 rounded-3xl fade-in bg-white/5 border border-white/10 backdrop-blur-xl">
                  <div className="flex-1 w-full space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-soccer-green italic">Nuevo Invitado</label>
                    <input
                      type="text"
                      className="input-field bg-black/20"
                      placeholder="Nombre del fenómeno"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addGuestToPool()}
                      autoFocus
                    />
                  </div>
                  <div className="w-full sm:w-32 space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-soccer-green italic">Rating (1–7)</label>
                    <input
                      type="number"
                      className="input-field bg-black/20"
                      min="1" max="7" step="1"
                      value={guestRating}
                      onChange={e => setGuestRating(e.target.value)}
                    />
                  </div>
                  <button onClick={addGuestToPool} className="btn-primary py-3.5 px-8 text-xs font-black uppercase tracking-widest w-full sm:w-auto">
                    Añadir
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {confirmedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-4 px-5 py-4 rounded-3xl transition-all hover:translate-y-[-2px] hover:shadow-xl bg-slate-900/40 border border-white/5 hover:border-white/10 group"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden bg-slate-800 border-2 border-white/10">
                        {player.photo_url
                          ? <img src={player.photo_url} className="w-full h-full object-cover" alt={player.name} />
                          : <span className="text-white/40 font-black">{player.name.charAt(0)}</span>
                        }
                      </div>
                      {player.isGuest && (
                        <div className="absolute -top-2 -right-2 bg-yellow-500 text-black p-1 rounded-lg">
                          <UserPlus size={10} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-white font-black text-sm uppercase tracking-tight truncate leading-none mb-1">{player.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{player.position || 'Invitado'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-black/30 rounded-xl border border-white/5">
                        <Star size={10} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-black text-white/80">{player.rating}</span>
                      </div>
                      {(player.isGuest || player.name.includes('(I)')) && isAdmin && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setEditingGuestId(player.id);
                              setEditingGuestName(player.name.replace(/\(I\)$/i, '').trim());
                            }}
                            className="opacity-0 group-hover:opacity-100 text-soccer-green/50 hover:text-soccer-green transition-all"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => removeFromPool(player.id)} className="opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-500 transition-all">
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inline Edit Modal/Input for Pool */}
                    {editingGuestId === player.id && (
                      <div className="absolute inset-0 z-50 bg-slate-900 rounded-3xl flex items-center gap-3 px-5 border-2 border-soccer-green/50">
                        <input 
                          type="text"
                          className="flex-1 bg-transparent border-none outline-none text-white font-black text-sm uppercase italic"
                          value={editingGuestName}
                          onChange={e => setEditingGuestName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveGuestName(player.id)}
                          autoFocus
                        />
                        <button onClick={() => saveGuestName(player.id)} className="text-soccer-green">
                          <Check size={18} />
                        </button>
                        <button onClick={() => setEditingGuestId(null)} className="text-slate-500">
                          <X size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── TEAMS VIEW ── */
            <div className="space-y-8">
              {/* Formation & Color selectors */}
              <div className="flex flex-col gap-4 items-center py-4 px-8 rounded-[2.5rem] mx-auto max-w-fit bg-black/40 border border-white/5 backdrop-blur-3xl shadow-2xl">
                <div className="flex items-center gap-6 flex-wrap justify-center">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">Táctica</span>
                    <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl">
                      {['A', 'B'].map((t: any) => (
                        <div key={t} className="flex items-center gap-2 px-3">
                          <span className={`text-[10px] font-black ${t === 'A' ? 'text-soccer-green' : 'text-blue-400'}`}>{t}:</span>
                          <div className="flex gap-1">
                            {getMatchFormations().map((f: any) => (
                              <button key={f.value} onClick={() => { t === 'A' ? setFormationA(f.value) : setFormationB(f.value); setSaved(false); }}
                                className={`text-[10px] px-2.5 py-1 rounded-xl font-bold transition-all border ${
                                  (t === 'A' ? formationA : formationB) === f.value
                                    ? (t === 'A' ? 'bg-soccer-green text-black border-soccer-green shadow-[0_0_15px_rgba(68,243,169,0.3)]' : 'bg-blue-600 text-white border-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.3)]')
                                    : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10'
                                }`}>
                                {f.value}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="w-full h-px bg-white/5" />

                <div className="flex items-center gap-6 flex-wrap justify-center">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">Identidad</span>
                    <div className="flex gap-4">
                      {['A', 'B'].map((t: any) => (
                        <div key={t} className="flex items-center gap-3 px-3 py-1.5 bg-white/5 rounded-2xl">
                          <span className={`text-[10px] font-black ${t === 'A' ? 'text-soccer-green' : 'text-blue-400'}`}>{t}:</span>
                          <div className="flex gap-2">
                            {JERSEY_COLORS.map(c => (
                              <button key={c.value} onClick={() => { t === 'A' ? setColorA(c.value) : setColorB(c.value); setSaved(false); }}
                                className={`w-5 h-5 rounded-lg border-2 transition-all ${c.class} shadow-lg ${
                                  (t === 'A' ? colorA : colorB) === c.value ? 'scale-125 border-white ring-2 ring-white/20' : 'border-transparent opacity-30 hover:opacity-100'
                                }`} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pitch */}
              <div className="relative w-full aspect-[16/10] md:aspect-[16/8] rounded-[3rem] overflow-hidden border-[6px] p-6 group shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)]"
                style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', borderColor: '#0f172a' }}>
                <div className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10%, rgba(255,255,255,0.05) 10%, rgba(255,255,255,0.05) 20%)', backgroundSize: '200% 100%' }} />
                <div className="absolute inset-8 border-2 border-white/20 rounded-[2rem] pointer-events-none" />
                <div className="absolute left-1/2 top-8 bottom-8 w-0.5 bg-white/20 pointer-events-none" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-64 md:h-64 border-2 border-white/20 rounded-full pointer-events-none" />
                <div className="absolute left-8 top-1/2 -translate-y-1/2 w-20 h-44 md:w-36 md:h-72 border-2 border-white/20 border-l-0 rounded-r-2xl pointer-events-none" />
                <div className="absolute right-8 top-1/2 -translate-y-1/2 w-20 h-44 md:w-36 md:h-72 border-2 border-white/20 border-r-0 rounded-l-2xl pointer-events-none" />
                
                <div className="pitch-team-label left-12 top-10 flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${JERSEY_COLORS.find(c => c.value === colorA)?.class}`} />
                  EQUIPO A
                </div>
                <div className="pitch-team-label right-12 top-10 flex items-center gap-2">
                  EQUIPO B
                  <div className={`w-3 h-3 rounded-full ${JERSEY_COLORS.find(c => c.value === colorB)?.class}`} />
                </div>

                {teamA.map((p, i) => (
                  <div key={p.id} className="pitch-player transition-all duration-700" style={getPosition(i, 'A', teamA.length, formationA)} onClick={() => handleSwap('A', i)}>
                    <FifaCard player={p} color={i === 0 ? 'gold' : colorA} index={i} isSelected={swapSelection?.team === 'A' && swapSelection?.index === i} />
                  </div>
                ))}
                {teamB.map((p, i) => (
                  <div key={p.id} className="pitch-player transition-all duration-700" style={getPosition(i, 'B', teamB.length, formationB)} onClick={() => handleSwap('B', i)}>
                    <FifaCard player={p} color={i === 0 ? 'gold' : colorB} index={i} isSelected={swapSelection?.team === 'B' && swapSelection?.index === i} />
                  </div>
                ))}
              </div>

              {/* Team lists side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {(['A', 'B'] as const).map(team => {
                  const players = team === 'A' ? teamA : teamB;
                  const color = team === 'A' ? colorA : colorB;
                  const colorHex = color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : color === 'white' ? '#fff' : color === 'yellow' ? '#eab308' : color === 'red' ? '#ef4444' : color === 'purple' ? '#a855f7' : color === 'lightblue' ? '#38bdf8' : '#1e293b';
                  return (
                    <div key={team} className="glass-card overflow-hidden group/card shadow-2xl transition-all hover:bg-white/[0.03]" style={{ borderTop: `4px solid ${colorHex}` }}>
                      <div className="flex justify-between items-center mb-6 px-2">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black italic shadow-lg ${team === 'A' ? 'bg-soccer-green text-black' : 'bg-blue-600 text-white'}`}>
                            {team}
                          </div>
                          <div>
                            <h3 className="font-headline text-lg font-black uppercase tracking-tighter" style={{ color: colorHex }}>Escuadrón {team}</h3>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{players.length} Jugadores Seleccionados</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xl font-black text-white italic">{getAvg(players)}</span>
                          <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Rating Promedio</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {players.map((p) => (
                          <div key={p.id} className="flex justify-between items-center px-4 py-3.5 rounded-2xl transition-all hover:translate-x-1 group/item" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.03)' }}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden border border-white/10 bg-black/20 group-hover/item:border-white/30 transition-all flex-shrink-0">
                                {p.photo_url ? <img src={p.photo_url} className="w-full h-full object-cover object-center" alt={p.name} /> : <span className="text-[10px] font-black opacity-30">{p.name.charAt(0)}</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                {(p.isGuest || p.name.includes('(I)')) && isAdmin && editingGuestId === p.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      className="bg-black/40 border border-soccer-green/30 rounded-lg px-2 py-1 text-[10px] flex-1 min-w-0 outline-none text-white"
                                      value={editingGuestName}
                                      onChange={e => setEditingGuestName(e.target.value)}
                                      onKeyDown={e => e.key === 'Enter' && saveGuestName(p.id)}
                                      autoFocus
                                    />
                                    <button onClick={() => saveGuestName(p.id)} className="text-soccer-green flex-shrink-0">
                                      <Check size={14} />
                                    </button>
                                    <button onClick={() => setEditingGuestId(null)} className="text-slate-500 flex-shrink-0">
                                      <X size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-black text-xs text-white/90 uppercase tracking-tight truncate group-hover/item:text-white transition-colors">
                                      {p.name}
                                    </span>
                                    {(p.isGuest || p.name.includes('(I)')) && isAdmin && (
                                      <button
                                        onClick={() => {
                                          setEditingGuestId(p.id);
                                          setEditingGuestName(p.name.replace(/\(I\)$/i, '').trim());
                                        }}
                                        className="text-soccer-green/60 hover:text-soccer-green flex-shrink-0 transition-colors"
                                      >
                                        <Edit2 size={11} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-white/30 uppercase italic ml-2 flex-shrink-0">{p.position?.split(' ')[0]}</span>
                          </div>
                        ))}
                      </div>
                      
                      {isAdmin && (
                        <button
                          onClick={() => { setShowGuestModal({ team }); setGuestModalName(''); setGuestModalRating('5'); }}
                          className="w-full mt-6 py-4 rounded-2xl border-2 border-dashed border-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white/60 hover:border-white/20 hover:bg-white/[0.02] transition-all"
                        >
                          + Integrar Invitado
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Post-generation guest modal */}
      {showGuestModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 fade-in" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}>
          <div className="glass-card w-full max-w-sm border-2 border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <p className="text-[10px] font-black text-soccer-green uppercase tracking-widest mb-1">Nueva incorporación</p>
                <h3 className="font-headline text-2xl font-black text-white italic uppercase tracking-tighter">Invitado · Equipo {showGuestModal.team}</h3>
              </div>
              <button onClick={() => setShowGuestModal(null)} className="p-2 rounded-xl bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block italic">Ficha Técnica · Nombre</label>
                <input type="text" className="input-field bg-black/40 border-white/10" placeholder="Ej: Juan Pérez" value={guestModalName}
                  onChange={e => setGuestModalName(e.target.value)} autoFocus />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block italic">Habilidad · Rating (1–7)</label>
                <input type="number" className="input-field bg-black/40 border-white/10" min="1" max="7" value={guestModalRating}
                  onChange={e => setGuestModalRating(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowGuestModal(null)} className="flex-1 py-4 rounded-2xl bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/10 transition-all">Cancelar</button>
                <button onClick={() => addGuestToTeam(showGuestModal.team)} className="flex-1 py-4 rounded-2xl bg-soccer-green text-[10px] font-black uppercase tracking-widest text-black shadow-xl shadow-soccer-green/20 hover:scale-[1.02] transition-all">Incorporar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FifaCard({ player, color, index, isSelected }: { player: any, color: string, index: number, isSelected?: boolean }) {
  const cardColorClass = color === 'emerald' ? 'emerald' : color === 'blue' ? 'blue' : color === 'white' ? 'white' : color === 'yellow' ? 'yellow' : color === 'red' ? 'red' : color === 'purple' ? 'purple' : color === 'lightblue' ? 'lightblue' : color === 'gold' ? 'gold' : 'blue';
  const displayName = player.name.replace(/\s*\(I\)\s*$/i, '').trim();

  return (
    <div className={`fifa-card-container fade-in ${isSelected ? 'scale-110 -translate-y-4 brightness-125 z-50' : 'z-10'}`} style={{ animationDelay: `${index * 50}ms` }}>
      <div className={`fifa-card ${cardColorClass} ${isSelected ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-transparent shadow-[0_0_30px_rgba(250,204,21,0.6)]' : ''}`}>
        <div className="card-top">
          <div className="card-pos">{player.position?.split(' ')[0].substring(0, 3).toUpperCase() || 'INV'}</div>
        </div>
        <div className="card-photo">
          {player.photo_url
            ? <img src={player.photo_url} alt={displayName} />
            : <div className="card-placeholder font-bold text-white/20 italic">{displayName.charAt(0)}</div>
          }
        </div>
        <div className="card-bottom">
          <div className="card-name">{displayName}</div>
          {player.nickname && <div className="card-nickname italic">"{player.nickname}"</div>}
        </div>
      </div>
    </div>
  );
}
