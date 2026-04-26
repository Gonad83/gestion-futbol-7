import { useState, useEffect } from 'react';
import { supabase, withTimeout } from '../lib/supabase';
import { RefreshCw, Globe } from 'lucide-react';
import FifaCard from '../components/FifaCard';

const FORMATIONS = [
  { name: 'Estándar',   value: '3-2-1' },
  { name: 'Dinámico',   value: '2-3-1' },
  { name: 'Doble Punta', value: '3-1-2' },
  { name: 'Catenaccio', value: '4-1-1' },
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

const isGK  = (p: any) => /portero|arco|arquero/i.test(p.position || '');
const isDef = (p: any) => /defensa|lateral|central|stopper/i.test(p.position || '');
const isMid = (p: any) => /medio|volante|enganche|interior/i.test(p.position || '');
const isFwd = (p: any) => /delantero|extremo|punta|ariete/i.test(p.position || '');

function buildBestTeam(players: any[], formation: string) {
  const parts = formation.split('-').map(Number);
  const slots = { gk: 1, def: parts[0] || 0, mid: parts[1] || 0, fwd: parts[2] || 0 };
  const pool = [...players].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const selected: any[] = [];
  const used = new Set<string>();

  const pick = (test: (p: any) => boolean, n: number) => {
    pool.filter(p => !used.has(p.id) && test(p)).slice(0, n)
      .forEach(p => { used.add(p.id); selected.push(p); });
  };

  pick(isGK, slots.gk);
  pick(isDef, slots.def);
  pick(isMid, slots.mid);
  pick(isFwd, slots.fwd);

  const total = slots.gk + slots.def + slots.mid + slots.fwd;
  pool.filter(p => !used.has(p.id)).slice(0, total - selected.length)
    .forEach(p => { used.add(p.id); selected.push(p); });

  return selected;
}

function pitchPos(idx: number, formation: string): React.CSSProperties {
  const parts = formation.split('-').map(Number);
  const lines = [1, ...parts];
  let acc = 0, lineIdx = 0, posInLine = 0;
  for (let i = 0; i < lines.length; i++) {
    if (idx < acc + lines[i]) { lineIdx = i; posInLine = idx - acc; break; }
    acc += lines[i];
  }
  const bottomPct = 5 + (lineIdx / (lines.length - 1)) * 80;
  const left = (100 / (lines[lineIdx] + 1)) * (posInLine + 1);
  return {
    position: 'absolute',
    bottom: `${bottomPct}%`,
    left: `${left}%`,
    transform: 'translateX(-50%)',
    zIndex: 10 + lineIdx,
    transition: 'all 0.6s cubic-bezier(0.34,1.56,0.64,1)',
  };
}

export default function Arena() {
  const [players, setPlayers]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [formation, setFormation]   = useState('3-2-1');
  const [color, setColor]           = useState('emerald');
  const [teamName, setTeamName]     = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settRes, playRes] = await Promise.all([
        supabase.from('team_settings').select('team_name').eq('id', 1).maybeSingle(),
        withTimeout(supabase.from('players').select('*').eq('status', 'Activo') as any, 10000),
      ]);
      if (settRes.data) setTeamName(settRes.data.team_name || '');
      const data = (playRes as any).data;
      if (data) setPlayers(data.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const starters   = buildBestTeam(players, formation);
  const starterIds = new Set(starters.map(p => p.id));
  const bench      = players.filter(p => !starterIds.has(p.id));
  const avgRating  = starters.length
    ? (starters.reduce((s, p) => s + (p.rating || 0), 0) / starters.length).toFixed(1)
    : '—';

  return (
    <div className="fade-in pb-24 md:pb-8 space-y-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-soccer-green/70">Tu Equipo</p>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(154,203,255,0.08)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.2)' }}>
              🔜 Arena
            </span>
          </div>
          <h1 className="font-headline text-3xl font-black text-white tracking-tight italic uppercase">
            Mejor Alineación
          </h1>
        </div>
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl flex-shrink-0"
          style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="text-center">
            <p className="text-2xl font-black text-white italic leading-none">{avgRating}</p>
            <p className="text-[8px] text-white/25 uppercase tracking-widest font-bold mt-0.5">Rating prom.</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 p-4 rounded-2xl"
        style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}>

        {/* Formation */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[9px] font-black text-white/25 uppercase tracking-widest shrink-0 w-16">Táctica</span>
          <div className="flex flex-wrap gap-2">
            {FORMATIONS.map(f => (
              <button key={f.value} onClick={() => setFormation(f.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={formation === f.value
                  ? { background: 'rgba(68,243,169,0.15)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.4)' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.07)' }
                }
              >
                <span className="font-black">{f.value}</span>
                <span className="ml-1.5 text-[10px] opacity-60">{f.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Jersey color */}
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-black text-white/25 uppercase tracking-widest shrink-0 w-16">Camiseta</span>
          <div className="flex gap-2 flex-wrap">
            {JERSEY_COLORS.map(c => (
              <button key={c.value} onClick={() => setColor(c.value)} title={c.name}
                className={`w-6 h-6 rounded-lg border-2 transition-all shadow-lg ${c.cls} ${
                  color === c.value ? 'scale-125 border-white ring-2 ring-white/20' : 'border-transparent opacity-35 hover:opacity-90'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Pitch */}
      {loading ? (
        <div className="flex justify-center p-20">
          <RefreshCw className="animate-spin text-soccer-green" size={32} />
        </div>
      ) : (
        <div className="relative w-full overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.7)]"
          style={{
            aspectRatio: '3/4',
            background: 'linear-gradient(180deg, #053d2e 0%, #064e3b 40%, #065f46 100%)',
            border: '6px solid #0a0e14',
            borderRadius: '2.5rem',
          }}
        >
          {/* Pitch markings */}
          <div className="absolute inset-0 opacity-15 pointer-events-none"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 9%,rgba(255,255,255,0.06) 9%,rgba(255,255,255,0.06) 10%)' }} />
          <div className="absolute inset-5 border-2 border-white/15 rounded-2xl pointer-events-none" />
          {/* Halfway line */}
          <div className="absolute left-5 right-5 top-1/2 h-px bg-white/15 pointer-events-none" />
          {/* Center circle */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border-2 border-white/15 rounded-full pointer-events-none" />
          {/* Top penalty box */}
          <div className="absolute left-1/2 -translate-x-1/2 top-5 w-32 h-16 border-2 border-white/15 border-t-0 rounded-b-xl pointer-events-none" />
          {/* Bottom penalty box */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-5 w-32 h-16 border-2 border-white/15 border-b-0 rounded-t-xl pointer-events-none" />

          {/* Team label */}
          {teamName && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black text-white/20 uppercase tracking-[0.2em] whitespace-nowrap">
              {teamName}
            </div>
          )}

          {/* Players */}
          {starters.map((player, i) => (
            <div key={player.id} className="pitch-player transition-all duration-700" style={pitchPos(i, formation)}>
              <FifaCard player={player} color={i === 0 ? 'gold' : color} index={i} />
            </div>
          ))}

          {starters.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Globe size={40} className="text-white/15" />
              <p className="text-white/25 text-sm font-bold">Sin jugadores activos</p>
            </div>
          )}
        </div>
      )}

      {/* Bench */}
      {bench.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="px-5 py-3 flex items-center gap-2"
            style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/25">Suplentes</p>
            <span className="text-[9px] text-white/20 font-bold">— {bench.length} jugadores</span>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            {bench.map(player => (
              <div key={player.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-[11px] font-black text-white/20"
                  style={{ background: '#262a31', border: '1px solid rgba(255,255,255,0.07)' }}>
                  {player.photo_url
                    ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                    : player.name.charAt(0)
                  }
                </div>
                <div>
                  <p className="text-xs font-bold text-white/60 leading-none">{player.name.split(' ')[0]}</p>
                  <p className="text-[9px] text-white/25 mt-0.5">{player.position?.split(' ')[0] || '—'}</p>
                </div>
                <div className="flex gap-0.5 ml-1">
                  {Array.from({ length: 7 }, (_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full"
                      style={{ background: i < (player.rating || 0) ? '#ffd08b' : 'rgba(255,255,255,0.08)' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
