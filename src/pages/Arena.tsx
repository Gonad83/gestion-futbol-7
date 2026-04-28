import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, withTimeout } from '../lib/supabase';
import { RefreshCw, Save, CheckCircle2, RotateCcw, MapPin, Clock, Users, Swords, Globe, Lock } from 'lucide-react';
import FifaCard from '../components/FifaCard';
import { useAuth } from '../hooks/useAuth';

const SUPER_ADMIN_EMAIL = 'garaosd@gmail.com';

/* ─── constants ─────────────────────────────────────────────── */
const FORMATIONS = [
  { name: 'Estándar',    value: '3-2-1' },
  { name: 'Dinámico',    value: '2-3-1' },
  { name: 'Doble Punta', value: '3-1-2' },
  { name: 'Catenaccio',  value: '4-1-1' },
];
const JERSEY_COLORS = [
  { name: 'Negro',    value: 'black',     cls: 'bg-slate-900 border-white/20' },
  { name: 'Blanco',   value: 'white',     cls: 'bg-white border-slate-300' },
  { name: 'Azul',     value: 'blue',      cls: 'bg-blue-600' },
  { name: 'Verde',    value: 'emerald',   cls: 'bg-emerald-600' },
  { name: 'Amarillo', value: 'yellow',    cls: 'bg-yellow-500' },
  { name: 'Rojo',     value: 'red',       cls: 'bg-red-600' },
  { name: 'Lila',     value: 'purple',    cls: 'bg-purple-600' },
  { name: 'Celeste',  value: 'lightblue', cls: 'bg-sky-400' },
];
const FAKE_TEAMS = [
  { name: 'Los Cóndores FC', zone: 'Las Condes', format: '7vs7', rating: 5.2, available: 'Sáb 18:00' },
  { name: 'Tiburones del Sur', zone: 'La Florida', format: '7vs7', rating: 4.8, available: 'Dom 10:00' },
  { name: 'Estrellas del Norte', zone: 'Independencia', format: '7vs7', rating: 5.5, available: 'Sáb 20:00' },
];

const LS_KEY = 'arena_lineup_v2';

/* ─── helpers ───────────────────────────────────────────────── */
const isGK  = (p: any) => /portero|arco|arquero/i.test(p.position || '');
const isDef = (p: any) => /defensa|lateral|central|stopper/i.test(p.position || '');
const isMid = (p: any) => /medio|volante|enganche|interior/i.test(p.position || '');
const isFwd = (p: any) => /delantero|extremo|punta|ariete/i.test(p.position || '');

function buildBest(players: any[], formation: string) {
  const parts = formation.split('-').map(Number);
  const slots = { gk: 1, def: parts[0] || 0, mid: parts[1] || 0, fwd: parts[2] || 0 };
  const pool  = [...players].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const sel: any[] = [];
  const used = new Set<string>();
  const pick = (test: (p: any) => boolean, n: number) =>
    pool.filter(p => !used.has(p.id) && test(p)).slice(0, n)
        .forEach(p => { used.add(p.id); sel.push(p); });
  pick(isGK, slots.gk); pick(isDef, slots.def); pick(isMid, slots.mid); pick(isFwd, slots.fwd);
  const total = slots.gk + slots.def + slots.mid + slots.fwd;
  pool.filter(p => !used.has(p.id)).slice(0, total - sel.length)
      .forEach(p => { used.add(p.id); sel.push(p); });
  return sel;
}

function pitchPos(idx: number, formation: string): React.CSSProperties {
  const parts = formation.split('-').map(Number);
  const lines = [1, ...parts];
  let acc = 0, li = 0, pi = 0;
  for (let i = 0; i < lines.length; i++) {
    if (idx < acc + lines[i]) { li = i; pi = idx - acc; break; }
    acc += lines[i];
  }
  return {
    position: 'absolute',
    bottom: `${5 + (li / (lines.length - 1)) * 80}%`,
    left:   `${(100 / (lines[li] + 1)) * (pi + 1)}%`,
    transform: 'translateX(-50%)',
    zIndex: 10 + li,
    transition: 'all 0.55s cubic-bezier(0.34,1.56,0.64,1)',
  };
}

type SwapTarget = { type: 'starter' | 'bench'; idx: number } | null;

/* ─── component ─────────────────────────────────────────────── */
export default function Arena() {
  const { user, teamId } = useAuth();
  const navigate = useNavigate();
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [starters,   setStarters]   = useState<any[]>([]);
  const [bench,      setBench]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [formation,  setFormation]  = useState('3-2-1');
  const [color,      setColor]      = useState('emerald');
  const [teamName,   setTeamName]   = useState('');
  const [swap,       setSwap]       = useState<SwapTarget>(null);

  useEffect(() => {
    if (user && user.email !== SUPER_ADMIN_EMAIL) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => { if (teamId) fetchData(); }, [teamId]);

  /* Load players + restore saved lineup */
  const fetchData = async () => {
    setLoading(true);
    try {
      const [settRes, playRes] = await Promise.all([
        supabase.from('team_settings').select('team_name').eq('id', teamId).maybeSingle(),
        withTimeout(supabase.from('players').select('*').eq('status', 'Activo') as any, 10000),
      ]);
      if (settRes.data?.team_name) setTeamName(settRes.data.team_name);

      const sorted: any[] = [...((playRes as any).data || [])]
        .sort((a, b) => (b.rating || 0) - (a.rating || 0));
      setAllPlayers(sorted);

      // Restore from localStorage
      const saved = (() => { try { return JSON.parse(localStorage.getItem(LS_KEY) || ''); } catch { return null; } })();
      if (saved?.starters && Array.isArray(saved.starters) && saved.formation) {
        const restoredStarters = (saved.starters as string[])
          .map(id => sorted.find(p => p.id === id))
          .filter(Boolean);
        const expectedTotal = 1 + (saved.formation as string).split('-').map(Number).reduce((a: number, b: number) => a + b, 0);
        if (restoredStarters.length === expectedTotal) {
          setFormation(saved.formation);
          setColor(saved.color || 'emerald');
          setStarters(restoredStarters);
          setBench(sorted.filter(p => !(saved.starters as string[]).includes(p.id)));
          setSaved(true);
          setLoading(false);
          return;
        }
      }
      // Auto-build
      const s = buildBest(sorted, '3-2-1');
      setStarters(s);
      setBench(sorted.filter(p => !new Set(s.map((x: any) => x.id)).has(p.id)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const applyFormation = (f: string) => {
    setFormation(f); setSwap(null); setSaved(false);
    const s = buildBest(allPlayers, f);
    setStarters(s);
    setBench(allPlayers.filter(p => !new Set(s.map((x: any) => x.id)).has(p.id)));
  };

  const handlePlayer = (type: 'starter' | 'bench', idx: number) => {
    if (swap?.type === type && swap.idx === idx) { setSwap(null); return; }
    if (!swap) { setSwap({ type, idx }); return; }
    const ns = [...starters], nb = [...bench];
    if (swap.type === 'starter' && type === 'starter')        { [ns[swap.idx], ns[idx]] = [ns[idx], ns[swap.idx]]; }
    else if (swap.type === 'bench'   && type === 'bench')     { [nb[swap.idx], nb[idx]] = [nb[idx], nb[swap.idx]]; }
    else if (swap.type === 'starter' && type === 'bench')     { [ns[swap.idx], nb[idx]] = [nb[idx], ns[swap.idx]]; }
    else                                                      { [ns[idx], nb[swap.idx]] = [nb[swap.idx], ns[idx]]; }
    setStarters(ns); setBench(nb); setSwap(null); setSaved(false);
  };

  const handleReset = () => {
    setSwap(null); setSaved(false);
    const s = buildBest(allPlayers, formation);
    setStarters(s);
    setBench(allPlayers.filter(p => !new Set(s.map((x: any) => x.id)).has(p.id)));
  };

  const handleSave = () => {
    setSaving(true);
    const data = { formation, color, starters: starters.map(p => p.id) };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    // Also try Supabase (best-effort)
    supabase.from('team_settings').update({ arena_lineup: data }).eq('id', teamId).then(() => {});
    setSaved(true);
    setSaving(false);
  };

  const avg = starters.length
    ? (starters.reduce((s, p) => s + (p.rating || 0), 0) / starters.length).toFixed(1) : '—';
  const anySwap = swap !== null;
  const isStarSel = (i: number) => swap?.type === 'starter' && swap.idx === i;
  const isBenchSel = (i: number) => swap?.type === 'bench'   && swap.idx === i;

  return (
    <div className="fade-in pb-24 md:pb-8">
      {/* ── Page header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-soccer-green/70">Club Pro</p>
          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(154,203,255,0.08)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.2)' }}>
            🔜 En desarrollo
          </span>
        </div>
        <h1 className="font-headline text-3xl font-black text-white tracking-tight italic uppercase">Arena</h1>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ══ LEFT: Arena / Amistosos ══ */}
        <div className="space-y-5">

          {/* Create friendly */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="px-5 py-4 flex items-center gap-3" style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9' }}>
                <Swords size={16} />
              </div>
              <div>
                <p className="text-sm font-black text-white">Crear Amistoso</p>
                <p className="text-[10px] text-white/30">Publica un reto para otros equipos</p>
              </div>
              <span className="ml-auto text-[9px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1"
                style={{ background: 'rgba(255,208,139,0.1)', color: '#ffd08b', border: '1px solid rgba(255,208,139,0.2)' }}>
                <Lock size={9} /> Próximamente
              </span>
            </div>
            <div className="p-5 space-y-3 opacity-40 pointer-events-none select-none">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 mb-1 uppercase tracking-wider">Fecha</label>
                  <div className="input-field flex items-center gap-2 text-white/30 text-sm">
                    <Clock size={13} /> dd/mm/aaaa
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/40 mb-1 uppercase tracking-wider">Hora</label>
                  <div className="input-field text-white/30 text-sm">20:00</div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-white/40 mb-1 uppercase tracking-wider">Cancha / Recinto</label>
                <div className="input-field flex items-center gap-2 text-white/30 text-sm">
                  <MapPin size={13} /> Ej. Complejo Deportivo Las Condes
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 mb-1 uppercase tracking-wider">Formato</label>
                  <div className="input-field text-white/30 text-sm">7 vs 7</div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/40 mb-1 uppercase tracking-wider">Nivel</label>
                  <div className="input-field text-white/30 text-sm">Amateur</div>
                </div>
              </div>
              <button className="btn-primary w-full opacity-50 cursor-not-allowed" disabled>
                <Globe size={15} /> Publicar Amistoso
              </button>
            </div>
          </div>

          {/* Teams online */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="px-5 py-4 flex items-center gap-3" style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(154,203,255,0.1)', color: '#9acbff' }}>
                <Users size={16} />
              </div>
              <div>
                <p className="text-sm font-black text-white">Equipos en línea</p>
                <p className="text-[10px] text-white/30">Busca rivales disponibles cerca tuyo</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-soccer-green animate-pulse" />
                <span className="text-[10px] font-black text-soccer-green">En breve</span>
              </div>
            </div>

            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {FAKE_TEAMS.map((team, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 opacity-50 pointer-events-none select-none">
                  {/* Team avatar */}
                  <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-black text-sm"
                    style={{ background: 'linear-gradient(135deg, #064e3b, #10b981)', color: '#fff', border: '2px solid rgba(68,243,169,0.2)' }}>
                    {team.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white truncate">{team.name}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-white/30 flex items-center gap-1">
                        <MapPin size={9} /> {team.zone}
                      </span>
                      <span className="text-[10px] text-white/30 flex items-center gap-1">
                        <Clock size={9} /> {team.available}
                      </span>
                      <span className="text-[10px] font-bold" style={{ color: '#9acbff' }}>{team.format}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-black text-white/60">⭐ {team.rating}</p>
                    <button className="mt-1 text-[10px] font-black uppercase px-3 py-1 rounded-lg cursor-not-allowed"
                      style={{ background: 'rgba(68,243,169,0.08)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}>
                      Desafiar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-[11px] text-white/20 font-bold">
                🔜 Próximamente podrás buscar y desafiar equipos reales en tu zona
              </p>
            </div>
          </div>
        </div>

        {/* ══ RIGHT: Formation builder ══ */}
        <div className="space-y-4">

          {/* Formation + color controls */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}>

            {/* Rating + save row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-lg font-black text-white italic">{avg}</p>
                <p className="text-[9px] text-white/25 uppercase tracking-widest font-bold">rating prom.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <RotateCcw size={11} /> Reset
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={saved
                    ? { background: 'rgba(68,243,169,0.12)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.3)' }
                    : { background: '#44f3a9', color: '#003822' }}>
                  {saved ? <><CheckCircle2 size={12} /> Guardado</> : <><Save size={12} /> Guardar</>}
                </button>
              </div>
            </div>

            {/* Formations */}
            <div>
              <p className="text-[9px] font-black text-white/25 uppercase tracking-widest mb-2">Táctica</p>
              <div className="flex flex-wrap gap-2">
                {FORMATIONS.map(f => (
                  <button key={f.value} onClick={() => applyFormation(f.value)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={formation === f.value
                      ? { background: 'rgba(68,243,169,0.15)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.4)' }
                      : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <span className="font-black">{f.value}</span>
                    <span className="ml-1 text-[10px] opacity-60">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div>
              <p className="text-[9px] font-black text-white/25 uppercase tracking-widest mb-2">Camiseta</p>
              <div className="flex gap-2 flex-wrap">
                {JERSEY_COLORS.map(c => (
                  <button key={c.value} onClick={() => { setColor(c.value); setSaved(false); }} title={c.name}
                    className={`w-6 h-6 rounded-lg border-2 transition-all ${c.cls} ${
                      color === c.value ? 'scale-125 border-white ring-2 ring-white/20' : 'border-transparent opacity-35 hover:opacity-90'
                    }`} />
                ))}
              </div>
            </div>

            {anySwap && (
              <p className="text-[10px] text-soccer-green font-bold animate-pulse">
                ⚡ Toca otro jugador para realizar el cambio · Toca el campo para cancelar
              </p>
            )}
          </div>

          {/* Pitch */}
          {loading ? (
            <div className="flex justify-center p-16">
              <RefreshCw className="animate-spin text-soccer-green" size={28} />
            </div>
          ) : (
            <div className="relative w-full overflow-hidden shadow-2xl"
              style={{
                aspectRatio: '3/4',
                background: 'linear-gradient(180deg, #053d2e 0%, #064e3b 40%, #065f46 100%)',
                border: '5px solid #0a0e14',
                borderRadius: '2rem',
              }}
              onClick={() => swap && setSwap(null)}
            >
              {/* Markings */}
              <div className="absolute inset-0 opacity-15 pointer-events-none"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 9%,rgba(255,255,255,0.06) 9%,rgba(255,255,255,0.06) 10%)' }} />
              <div className="absolute inset-4 border-2 border-white/15 rounded-xl pointer-events-none" />
              <div className="absolute left-4 right-4 top-1/2 h-px bg-white/15 pointer-events-none" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/15 rounded-full pointer-events-none" />
              <div className="absolute left-1/2 -translate-x-1/2 top-4 w-28 h-14 border-2 border-white/15 border-t-0 rounded-b-xl pointer-events-none" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-4 w-28 h-14 border-2 border-white/15 border-b-0 rounded-t-xl pointer-events-none" />
              {teamName && (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-black text-white/15 uppercase tracking-widest whitespace-nowrap pointer-events-none">
                  {teamName}
                </div>
              )}

              {/* Starters */}
              {starters.map((player, i) => (
                <div key={player.id} className="pitch-player"
                  style={{
                    ...pitchPos(i, formation),
                    filter: isStarSel(i) ? 'drop-shadow(0 0 14px #44f3a9)' : anySwap && !isStarSel(i) ? 'brightness(0.55)' : undefined,
                    cursor: 'pointer',
                  }}
                  onClick={e => { e.stopPropagation(); handlePlayer('starter', i); }}>
                  <FifaCard player={player} color={i === 0 ? 'gold' : color} index={i} isSelected={isStarSel(i)} />
                </div>
              ))}

              {starters.length === 0 && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                  <Globe size={36} className="text-white/15" />
                  <p className="text-white/20 text-xs font-bold">Sin jugadores activos</p>
                </div>
              )}
            </div>
          )}

          {/* Bench */}
          {bench.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/25">Suplentes · {bench.length}</p>
                {swap?.type === 'bench' && (
                  <span className="ml-auto text-[9px] font-black text-soccer-green animate-pulse">
                    Toca un titular para hacer el cambio
                  </span>
                )}
              </div>
              <div className="flex gap-2 p-3 overflow-x-auto custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
                {bench.map((player, i) => (
                  <div key={player.id} onClick={() => handlePlayer('bench', i)}
                    className="flex-shrink-0 cursor-pointer"
                    style={{
                      width: '63px', height: '90px', position: 'relative',
                      filter: isBenchSel(i) ? 'drop-shadow(0 0 10px #44f3a9)' : anySwap && !isBenchSel(i) ? 'brightness(0.45)' : undefined,
                      transition: 'filter 0.2s',
                    }}>
                    <div style={{ transform: 'scale(0.74)', transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
                      <FifaCard player={player} color={color} index={i} isSelected={isBenchSel(i)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
