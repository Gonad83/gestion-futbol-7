import { useState, useEffect } from 'react';
import { supabase, withTimeout } from '../lib/supabase';
import {
  RefreshCw, Save, CheckCircle2, RotateCcw, MapPin, Clock, Users,
  Swords, Globe, Plus, X, Check, Filter, Trophy, CreditCard,
} from 'lucide-react';
import FifaCard from '../components/FifaCard';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
const FORMATS_ALL = ['Todos', '5vs5', '7vs7', '11vs11'];
const AGE_RANGES  = ['Open','Sub-18','Sub-21','25+','35+','40+','Mixto'];
const LS_KEY = 'arena_lineup_v2';
const clp = (n: number) => n === 0 ? 'Gratis' : `$${Math.round(n).toLocaleString('es-CL')}`;

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
type ArenaTab = 'amistosos' | 'torneos';

const fmtDate = (d: string) => {
  try { return format(new Date(d + 'T12:00:00'), "EEE d MMM", { locale: es }); }
  catch { return d; }
};

const reqBadge: Record<string, { label: string; cls: string }> = {
  open:       { label: 'Abierto',    cls: 'bg-soccer-green/15 text-soccer-green border-soccer-green/30' },
  challenged: { label: 'Desafiado',  cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  matched:    { label: 'Confirmado', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  cancelled:  { label: 'Cancelado',  cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
};
const tourBadge: Record<string, { label: string; cls: string }> = {
  open:      { label: 'Inscripciones abiertas', cls: 'bg-soccer-green/15 text-soccer-green border-soccer-green/30' },
  full:      { label: 'Completo',               cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  ongoing:   { label: 'En curso',               cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  finished:  { label: 'Finalizado',             cls: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
  cancelled: { label: 'Cancelado',              cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
};
const regBadge: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pendiente',   cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  confirmed: { label: 'Confirmado',  cls: 'bg-soccer-green/15 text-soccer-green border-soccer-green/30' },
  rejected:  { label: 'Rechazado',   cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

/* ─── component ─────────────────────────────────────────────── */
export default function Arena() {
  const { isAdmin, teamId } = useAuth();
  const [arenaTab, setArenaTab] = useState<ArenaTab>('amistosos');

  /* ── Formation builder state ── */
  const [allPlayers,   setAllPlayers]   = useState<any[]>([]);
  const [starters,     setStarters]     = useState<any[]>([]);
  const [bench,        setBench]        = useState<any[]>([]);
  const [loadingPitch, setLoadingPitch] = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [formation,    setFormation]    = useState('3-2-1');
  const [color,        setColor]        = useState('emerald');
  const [teamName,     setTeamName]     = useState('');
  const [swap,         setSwap]         = useState<SwapTarget>(null);

  /* ── Amistosos state ── */
  const [myRequests,   setMyRequests]   = useState<any[]>([]);
  const [openRequests, setOpenRequests] = useState<any[]>([]);
  const [filterFmt,    setFilterFmt]    = useState('Todos');
  const [showReqForm,  setShowReqForm]  = useState(false);
  const [publishing,   setPublishing]   = useState(false);
  const [reqForm,      setReqForm]      = useState({ date: '', time: '20:00', location: '', format: '7vs7', notes: '' });

  /* ── Torneos state ── */
  const [myTournaments,  setMyTournaments]  = useState<any[]>([]);
  const [openTournaments,setOpenTournaments]= useState<any[]>([]);
  const [myRegs,         setMyRegs]         = useState<any[]>([]);
  const [showTourForm,   setShowTourForm]   = useState(false);
  const [creatingTour,   setCreatingTour]   = useState(false);
  const [expandedTour,   setExpandedTour]   = useState<string | null>(null);
  const [tourRegs,       setTourRegs]       = useState<Record<string, any[]>>({});
  const [tourForm,       setTourForm]       = useState({
    name: '', description: '', date: '', location: '', city: '', commune: '',
    format: '7vs7', age_range: 'Open', max_teams: '8', entry_fee: '0', payment_info: '',
  });

  useEffect(() => { if (teamId) { fetchData(); fetchFriendlies(); fetchTournaments(); } }, [teamId]);

  /* ── Formation builder ── */
  const fetchData = async () => {
    setLoadingPitch(true);
    try {
      const [settRes, playRes] = await Promise.all([
        supabase.from('team_settings').select('team_name').eq('id', teamId).maybeSingle(),
        withTimeout(supabase.from('players').select('*').eq('status', 'Activo') as any, 10000),
      ]);
      if (settRes.data?.team_name) setTeamName(settRes.data.team_name);
      const sorted: any[] = [...((playRes as any).data || [])].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      setAllPlayers(sorted);
      const ls = (() => { try { return JSON.parse(localStorage.getItem(LS_KEY) || ''); } catch { return null; } })();
      if (ls?.starters && ls.formation) {
        const rs = (ls.starters as string[]).map((id: string) => sorted.find(p => p.id === id)).filter(Boolean);
        const exp = 1 + (ls.formation as string).split('-').map(Number).reduce((a: number, b: number) => a + b, 0);
        if (rs.length === exp) {
          setFormation(ls.formation); setColor(ls.color || 'emerald');
          setStarters(rs); setBench(sorted.filter(p => !(ls.starters as string[]).includes(p.id)));
          setSaved(true); setLoadingPitch(false); return;
        }
      }
      const s = buildBest(sorted, '3-2-1');
      setStarters(s); setBench(sorted.filter(p => !new Set(s.map((x: any) => x.id)).has(p.id)));
    } catch (e) { console.error(e); }
    finally { setLoadingPitch(false); }
  };

  /* ── Amistosos ── */
  const fetchFriendlies = async () => {
    if (!teamId) return;
    const [mine, open] = await Promise.all([
      supabase.from('friendly_requests').select('*, challenger:challenger_team_id(team_name,city,commune)')
        .eq('team_id', teamId).neq('status', 'cancelled').order('date'),
      supabase.from('friendly_requests').select('*, team:team_id(team_name,city,commune,logo_url)')
        .eq('status', 'open').order('date'),
    ]);
    setMyRequests(mine.data || []);
    setOpenRequests((open.data || []).filter((r: any) => r.team_id !== teamId));
  };

  const handlePublishReq = async (e: React.FormEvent) => {
    e.preventDefault(); setPublishing(true);
    try {
      const { error } = await supabase.from('friendly_requests').insert([{
        team_id: teamId, date: reqForm.date, time: reqForm.time,
        location: reqForm.location, format: reqForm.format,
        notes: reqForm.notes || null, status: 'open',
      }]);
      if (error) throw error;
      setReqForm({ date: '', time: '20:00', location: '', format: '7vs7', notes: '' });
      setShowReqForm(false); fetchFriendlies();
    } catch (err: any) { alert('Error: ' + err.message); }
    finally { setPublishing(false); }
  };

  const handleChallenge = async (id: string) => {
    if (!isAdmin || !confirm('¿Enviar solicitud de amistoso?')) return;
    const { error } = await supabase.from('friendly_requests')
      .update({ status: 'challenged', challenger_team_id: teamId }).eq('id', id).eq('status', 'open');
    if (error) { alert('Error: ' + error.message); return; }
    fetchFriendlies();
  };
  const handleAcceptReq  = async (id: string) => { await supabase.from('friendly_requests').update({ status: 'matched' }).eq('id', id); fetchFriendlies(); };
  const handleRejectReq  = async (id: string) => { await supabase.from('friendly_requests').update({ status: 'open', challenger_team_id: null }).eq('id', id); fetchFriendlies(); };
  const handleCancelReq  = async (id: string) => { if (!confirm('¿Cancelar solicitud?')) return; await supabase.from('friendly_requests').update({ status: 'cancelled' }).eq('id', id); fetchFriendlies(); };

  /* ── Torneos ── */
  const fetchTournaments = async () => {
    if (!teamId) return;
    const [mine, open, regs] = await Promise.all([
      supabase.from('tournaments').select('*').eq('organizer_team_id', teamId).neq('status', 'cancelled').order('date'),
      supabase.from('tournaments').select('*, organizer:organizer_team_id(team_name,city,commune,logo_url)').eq('status', 'open').order('date'),
      supabase.from('tournament_registrations').select('*, tournament:tournament_id(name,date,format,entry_fee,payment_info)').eq('team_id', teamId),
    ]);
    setMyTournaments(mine.data || []);
    setOpenTournaments((open.data || []).filter((t: any) => t.organizer_team_id !== teamId));
    setMyRegs(regs.data || []);
  };

  const fetchTourRegs = async (tourId: string) => {
    const { data } = await supabase.from('tournament_registrations')
      .select('*, team:team_id(team_name,city,commune,logo_url)').eq('tournament_id', tourId).order('registered_at');
    setTourRegs(prev => ({ ...prev, [tourId]: data || [] }));
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault(); setCreatingTour(true);
    try {
      const { error } = await supabase.from('tournaments').insert([{
        organizer_team_id: teamId,
        name: tourForm.name, description: tourForm.description || null,
        date: tourForm.date, location: tourForm.location,
        city: tourForm.city || null, commune: tourForm.commune || null,
        format: tourForm.format, age_range: tourForm.age_range,
        max_teams: parseInt(tourForm.max_teams) || 8,
        entry_fee: parseInt(tourForm.entry_fee) || 0,
        payment_info: tourForm.payment_info || null,
        status: 'open',
      }]);
      if (error) throw error;
      setTourForm({ name: '', description: '', date: '', location: '', city: '', commune: '', format: '7vs7', age_range: 'Open', max_teams: '8', entry_fee: '0', payment_info: '' });
      setShowTourForm(false); fetchTournaments();
    } catch (err: any) { alert('Error: ' + err.message); }
    finally { setCreatingTour(false); }
  };

  const handleRegister = async (tourId: string, entryFee: number, paymentInfo: string) => {
    if (!isAdmin) return;
    const msg = entryFee > 0
      ? `Inscripción: ${clp(entryFee)}\n\nInfo de pago:\n${paymentInfo || 'El organizador te dará los datos.'}\n\n¿Confirmar inscripción?`
      : '¿Confirmar inscripción gratuita?';
    if (!confirm(msg)) return;
    const { error } = await supabase.from('tournament_registrations').insert([{ tournament_id: tourId, team_id: teamId, status: 'pending' }]);
    if (error) { alert(error.code === '23505' ? 'Ya estás inscrito en este torneo.' : 'Error: ' + error.message); return; }
    fetchTournaments();
  };

  const handleWithdraw = async (regId: string) => {
    if (!confirm('¿Retirar la inscripción?')) return;
    await supabase.from('tournament_registrations').delete().eq('id', regId);
    fetchTournaments();
  };

  const handleConfirmReg = async (regId: string) => { await supabase.from('tournament_registrations').update({ status: 'confirmed' }).eq('id', regId); fetchTourRegs(expandedTour!); };
  const handleRejectReg  = async (regId: string) => { await supabase.from('tournament_registrations').update({ status: 'rejected' }).eq('id', regId); fetchTourRegs(expandedTour!); };

  const handleExpandTour = (id: string) => {
    if (expandedTour === id) { setExpandedTour(null); return; }
    setExpandedTour(id); fetchTourRegs(id);
  };

  const handleCloseTournament = async (id: string, newStatus: string) => {
    if (!confirm(`¿Cambiar estado a "${newStatus}"?`)) return;
    await supabase.from('tournaments').update({ status: newStatus }).eq('id', id);
    fetchTournaments();
  };

  /* ── Formation builder handlers ── */
  const applyFormation = (f: string) => {
    setFormation(f); setSwap(null); setSaved(false);
    const s = buildBest(allPlayers, f);
    setStarters(s); setBench(allPlayers.filter(p => !new Set(s.map((x: any) => x.id)).has(p.id)));
  };
  const handlePlayer = (type: 'starter' | 'bench', idx: number) => {
    if (swap?.type === type && swap.idx === idx) { setSwap(null); return; }
    if (!swap) { setSwap({ type, idx }); return; }
    const ns = [...starters], nb = [...bench];
    if (swap.type === 'starter' && type === 'starter')    { [ns[swap.idx], ns[idx]] = [ns[idx], ns[swap.idx]]; }
    else if (swap.type === 'bench' && type === 'bench')   { [nb[swap.idx], nb[idx]] = [nb[idx], nb[swap.idx]]; }
    else if (swap.type === 'starter' && type === 'bench') { [ns[swap.idx], nb[idx]] = [nb[idx], ns[swap.idx]]; }
    else                                                  { [ns[idx], nb[swap.idx]] = [nb[swap.idx], ns[idx]]; }
    setStarters(ns); setBench(nb); setSwap(null); setSaved(false);
  };
  const handleReset = () => { setSwap(null); setSaved(false); const s = buildBest(allPlayers, formation); setStarters(s); setBench(allPlayers.filter(p => !new Set(s.map((x: any) => x.id)).has(p.id))); };
  const handleSave  = () => { setSaving(true); const data = { formation, color, starters: starters.map(p => p.id) }; localStorage.setItem(LS_KEY, JSON.stringify(data)); supabase.from('team_settings').update({ arena_lineup: data }).eq('id', teamId).then(() => {}); setSaved(true); setSaving(false); };

  const avg = starters.length ? (starters.reduce((s, p) => s + (p.rating || 0), 0) / starters.length).toFixed(1) : '—';
  const anySwap    = swap !== null;
  const isStarSel  = (i: number) => swap?.type === 'starter' && swap.idx === i;
  const isBenchSel = (i: number) => swap?.type === 'bench'   && swap.idx === i;
  const filteredOpen = filterFmt === 'Todos' ? openRequests : openRequests.filter(r => r.format === filterFmt);

  const cardStyle   = { background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' };
  const headerStyle = { background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.05)' };
  const divStyle    = { borderColor: 'rgba(255,255,255,0.04)' };

  /* ══════════════════════════ JSX ══════════════════════════ */
  return (
    <div className="fade-in pb-24 md:pb-8">
      <div className="mb-5">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-soccer-green/70 mb-1">Club Pro</p>
        <h1 className="font-headline text-3xl font-black text-white tracking-tight italic uppercase">Arena</h1>
        <p className="text-white/30 text-xs mt-1">Conecta con otros equipos, juega amistosos y participa en torneos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ══ LEFT: Amistosos / Torneos ══ */}
        <div className="space-y-5">

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {([['amistosos', <Swords size={14} />, 'Amistosos'], ['torneos', <Trophy size={14} />, 'Torneos']] as const).map(([tab, icon, label]) => (
              <button key={tab} onClick={() => setArenaTab(tab as ArenaTab)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all"
                style={arenaTab === tab
                  ? { background: '#1c2026', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }
                  : { color: 'rgba(255,255,255,0.3)' }}>
                {icon}{label}
              </button>
            ))}
          </div>

          {/* ══════ TAB: AMISTOSOS ══════ */}
          {arenaTab === 'amistosos' && (
            <>
              {/* My requests */}
              {isAdmin && (
                <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                  <div className="px-5 py-4 flex items-center gap-3" style={headerStyle}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9' }}>
                      <Swords size={16} />
                    </div>
                    <div><p className="text-sm font-black text-white">Mis Amistosos</p><p className="text-[10px] text-white/30">Gestiona tus solicitudes</p></div>
                    {!showReqForm && (
                      <button onClick={() => setShowReqForm(true)}
                        className="ml-auto flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl"
                        style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}>
                        <Plus size={13} /> Publicar
                      </button>
                    )}
                  </div>

                  {showReqForm && (
                    <form onSubmit={handlePublishReq} className="p-5 space-y-3 border-b" style={divStyle}>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Fecha</label>
                          <input type="date" required className="input-field text-sm" value={reqForm.date} onChange={e => setReqForm(f => ({ ...f, date: e.target.value }))} /></div>
                        <div><label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Hora</label>
                          <input type="time" required className="input-field text-sm" value={reqForm.time} onChange={e => setReqForm(f => ({ ...f, time: e.target.value }))} /></div>
                      </div>
                      <div><label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Cancha / Lugar</label>
                        <input type="text" required className="input-field text-sm" placeholder="Complejo Dep. Las Condes" value={reqForm.location} onChange={e => setReqForm(f => ({ ...f, location: e.target.value }))} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Formato</label>
                          <select className="input-field bg-slate-900 text-sm" value={reqForm.format} onChange={e => setReqForm(f => ({ ...f, format: e.target.value }))}>
                            <option>5vs5</option><option>7vs7</option><option>11vs11</option>
                          </select></div>
                        <div><label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Nota (opcional)</label>
                          <input type="text" className="input-field text-sm" placeholder="Ej: Llevamos árbitro" value={reqForm.notes} onChange={e => setReqForm(f => ({ ...f, notes: e.target.value }))} /></div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="submit" disabled={publishing} className="btn-primary flex-1 py-2 text-sm">
                          {publishing ? 'Publicando...' : <><Globe size={13} className="inline mr-1" />Publicar</>}
                        </button>
                        <button type="button" onClick={() => setShowReqForm(false)} className="px-4 py-2 rounded-xl text-white/40 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <X size={14} />
                        </button>
                      </div>
                    </form>
                  )}

                  {myRequests.length === 0 && !showReqForm ? (
                    <div className="px-5 py-8 text-center"><Swords size={28} className="mx-auto text-white/10 mb-2" /><p className="text-white/25 text-xs">No tienes solicitudes activas.</p></div>
                  ) : (
                    <div className="divide-y" style={divStyle}>
                      {myRequests.map(req => {
                        const badge = reqBadge[req.status] || reqBadge.open;
                        return (
                          <div key={req.id} className="px-5 py-4 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
                                <span className="text-xs font-bold text-white">{req.format}</span>
                                <span className="text-[10px] text-white/40 flex items-center gap-1"><Clock size={9} /> {fmtDate(req.date)} · {req.time}</span>
                              </div>
                              {(req.status === 'open' || req.status === 'challenged') && (
                                <button onClick={() => handleCancelReq(req.id)} className="text-red-400/50 hover:text-red-400 transition-colors"><X size={13} /></button>
                              )}
                            </div>
                            <p className="text-[11px] text-white/40 flex items-center gap-1"><MapPin size={9} /> {req.location}</p>
                            {req.status === 'challenged' && req.challenger && (
                              <div className="p-3 rounded-xl flex items-center justify-between gap-3" style={{ background: 'rgba(255,208,139,0.06)', border: '1px solid rgba(255,208,139,0.15)' }}>
                                <div>
                                  <p className="text-xs font-black text-amber-400">⚔️ {req.challenger.team_name} quiere jugar</p>
                                  {(req.challenger.city || req.challenger.commune) && <p className="text-[10px] text-white/30 mt-0.5">{[req.challenger.commune, req.challenger.city].filter(Boolean).join(', ')}</p>}
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                  <button onClick={() => handleAcceptReq(req.id)} className="flex items-center gap-1 text-[11px] font-black px-3 py-1.5 rounded-lg" style={{ background: 'rgba(68,243,169,0.12)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.25)' }}><Check size={11} /> Aceptar</button>
                                  <button onClick={() => handleRejectReq(req.id)} className="flex items-center gap-1 text-[11px] font-black px-3 py-1.5 rounded-lg" style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}><X size={11} /> Rechazar</button>
                                </div>
                              </div>
                            )}
                            {req.status === 'matched' && req.challenger && (
                              <div className="p-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                                <p className="text-xs font-black text-blue-400">✅ Confirmado con {req.challenger.team_name}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Open requests */}
              <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                <div className="px-5 py-4 flex items-center gap-3" style={headerStyle}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(154,203,255,0.1)', color: '#9acbff' }}><Users size={16} /></div>
                  <div><p className="text-sm font-black text-white">Buscar Rival</p><p className="text-[10px] text-white/30">{filteredOpen.length} solicitudes abiertas</p></div>
                </div>
                <div className="px-5 py-3 flex gap-2 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <Filter size={12} className="text-white/20 mt-0.5 flex-shrink-0" />
                  {FORMATS_ALL.map(f => (
                    <button key={f} onClick={() => setFilterFmt(f)} className="text-[10px] font-black px-2.5 py-1 rounded-lg transition-all"
                      style={filterFmt === f ? { background: 'rgba(154,203,255,0.15)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.3)' } : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      {f}
                    </button>
                  ))}
                </div>
                {filteredOpen.length === 0 ? (
                  <div className="px-5 py-10 text-center"><Globe size={28} className="mx-auto text-white/10 mb-2" /><p className="text-white/25 text-xs">No hay solicitudes abiertas.</p></div>
                ) : (
                  <div className="divide-y" style={divStyle}>
                    {filteredOpen.map(req => (
                      <div key={req.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-black text-sm overflow-hidden"
                          style={{ background: 'linear-gradient(135deg,#064e3b,#10b981)', color: '#fff', border: '2px solid rgba(68,243,169,0.2)' }}>
                          {req.team?.logo_url ? <img src={req.team.logo_url} alt="" className="w-full h-full object-cover" /> : (req.team?.team_name?.charAt(0) || '?')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-white truncate">{req.team?.team_name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {(req.team?.commune || req.team?.city) && <span className="text-[10px] text-white/30 flex items-center gap-1"><MapPin size={9} />{[req.team?.commune, req.team?.city].filter(Boolean).join(', ')}</span>}
                            <span className="text-[10px] text-white/30 flex items-center gap-1"><Clock size={9} />{fmtDate(req.date)} · {req.time}</span>
                            <span className="text-[10px] font-black" style={{ color: '#9acbff' }}>{req.format}</span>
                          </div>
                          <p className="text-[10px] text-white/25 mt-0.5 flex items-center gap-1 truncate"><MapPin size={9} />{req.location}</p>
                          {req.notes && <p className="text-[10px] text-white/20 mt-0.5 italic truncate">"{req.notes}"</p>}
                        </div>
                        {isAdmin && (
                          <button onClick={() => handleChallenge(req.id)} className="flex-shrink-0 text-[11px] font-black px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
                            style={{ background: 'rgba(68,243,169,0.08)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}>
                            ⚔️ Desafiar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══════ TAB: TORNEOS ══════ */}
          {arenaTab === 'torneos' && (
            <>
              {/* My organized tournaments */}
              {isAdmin && (
                <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                  <div className="px-5 py-4 flex items-center gap-3" style={headerStyle}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,208,139,0.1)', color: '#ffd08b' }}><Trophy size={16} /></div>
                    <div><p className="text-sm font-black text-white">Mis Torneos</p><p className="text-[10px] text-white/30">Torneos que organizas</p></div>
                    {!showTourForm && (
                      <button onClick={() => setShowTourForm(true)} className="ml-auto flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl"
                        style={{ background: 'rgba(255,208,139,0.1)', color: '#ffd08b', border: '1px solid rgba(255,208,139,0.2)' }}>
                        <Plus size={13} /> Crear
                      </button>
                    )}
                  </div>

                  {showTourForm && (
                    <form onSubmit={handleCreateTournament} className="p-5 space-y-3 border-b" style={divStyle}>
                      <div><label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Nombre del torneo</label>
                        <input type="text" required className="input-field text-sm" placeholder="Copa de Verano 2026" value={tourForm.name} onChange={e => setTourForm(f => ({ ...f, name: e.target.value }))} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Fecha</label>
                          <input type="date" required className="input-field text-sm" value={tourForm.date} onChange={e => setTourForm(f => ({ ...f, date: e.target.value }))} /></div>
                        <div><label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Formato</label>
                          <select className="input-field bg-slate-900 text-sm" value={tourForm.format} onChange={e => setTourForm(f => ({ ...f, format: e.target.value }))}>
                            <option>5vs5</option><option>7vs7</option><option>11vs11</option>
                          </select></div>
                      </div>
                      <div><label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Cancha / Lugar</label>
                        <input type="text" required className="input-field text-sm" placeholder="Estadio / Complejo" value={tourForm.location} onChange={e => setTourForm(f => ({ ...f, location: e.target.value }))} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Ciudad</label>
                          <input type="text" className="input-field text-sm" placeholder="Santiago" value={tourForm.city} onChange={e => setTourForm(f => ({ ...f, city: e.target.value }))} /></div>
                        <div><label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Rango Etario</label>
                          <select className="input-field bg-slate-900 text-sm" value={tourForm.age_range} onChange={e => setTourForm(f => ({ ...f, age_range: e.target.value }))}>
                            {AGE_RANGES.map(r => <option key={r}>{r}</option>)}
                          </select></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Cupos (nº equipos)</label>
                          <input type="number" min="2" max="64" required className="input-field text-sm" value={tourForm.max_teams} onChange={e => setTourForm(f => ({ ...f, max_teams: e.target.value }))} /></div>
                        <div><label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Inscripción (CLP)</label>
                          <input type="number" min="0" required className="input-field text-sm" placeholder="0 = Gratis" value={tourForm.entry_fee} onChange={e => setTourForm(f => ({ ...f, entry_fee: e.target.value }))} /></div>
                      </div>
                      {parseInt(tourForm.entry_fee) > 0 && (
                        <div><label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Datos de transferencia</label>
                          <textarea className="input-field resize-none text-sm" rows={2} placeholder="Banco, Nº cuenta, RUT, nombre…" value={tourForm.payment_info} onChange={e => setTourForm(f => ({ ...f, payment_info: e.target.value }))} /></div>
                      )}
                      <div><label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Descripción (opcional)</label>
                        <input type="text" className="input-field text-sm" placeholder="Bases, reglas, premios…" value={tourForm.description} onChange={e => setTourForm(f => ({ ...f, description: e.target.value }))} /></div>
                      <div className="flex gap-2 pt-1">
                        <button type="submit" disabled={creatingTour} className="btn-primary flex-1 py-2 text-sm">
                          {creatingTour ? 'Creando...' : <><Trophy size={13} className="inline mr-1" />Crear Torneo</>}
                        </button>
                        <button type="button" onClick={() => setShowTourForm(false)} className="px-4 py-2 rounded-xl text-white/40 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}><X size={14} /></button>
                      </div>
                    </form>
                  )}

                  {myTournaments.length === 0 && !showTourForm ? (
                    <div className="px-5 py-8 text-center"><Trophy size={28} className="mx-auto text-white/10 mb-2" /><p className="text-white/25 text-xs">No has creado torneos aún.</p></div>
                  ) : (
                    <div className="divide-y" style={divStyle}>
                      {myTournaments.map(t => {
                        const badge = tourBadge[t.status] || tourBadge.open;
                        const regs  = tourRegs[t.id] || [];
                        const isExp = expandedTour === t.id;
                        return (
                          <div key={t.id}>
                            <div className="px-5 py-4 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-black text-sm text-white truncate">{t.name}</p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
                                    <span className="text-[10px] text-white/40 flex items-center gap-1"><Clock size={9} />{fmtDate(t.date)}</span>
                                    <span className="text-[10px] font-black" style={{ color: '#ffd08b' }}>{t.format} · {t.age_range}</span>
                                    <span className="text-[10px] text-white/30">{clp(t.entry_fee)}</span>
                                  </div>
                                </div>
                                <button onClick={() => handleExpandTour(t.id)} className="text-[10px] font-black px-2 py-1 rounded-lg flex-shrink-0"
                                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                  {isExp ? 'Cerrar' : `Ver inscritos${regs.length ? ` (${regs.length})` : ''}`}
                                </button>
                              </div>
                              {t.status === 'open' && (
                                <div className="flex gap-2">
                                  <button onClick={() => handleCloseTournament(t.id, 'ongoing')} className="text-[10px] font-black px-2 py-1 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>Iniciar</button>
                                  <button onClick={() => handleCloseTournament(t.id, 'cancelled')} className="text-[10px] font-black px-2 py-1 rounded-lg" style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>Cancelar</button>
                                </div>
                              )}
                              {t.status === 'ongoing' && (
                                <button onClick={() => handleCloseTournament(t.id, 'finished')} className="text-[10px] font-black px-2 py-1 rounded-lg" style={{ background: 'rgba(68,243,169,0.08)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}>Finalizar torneo</button>
                              )}
                            </div>
                            {isExp && (
                              <div className="px-5 pb-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/25 pt-3">Inscritos · {regs.length} / {t.max_teams}</p>
                                {regs.length === 0 ? <p className="text-white/20 text-xs italic">Aún no hay inscritos.</p> : regs.map(reg => {
                                  const rb = regBadge[reg.status] || regBadge.pending;
                                  return (
                                    <div key={reg.id} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                      <div>
                                        <p className="text-xs font-black text-white">{reg.team?.team_name}</p>
                                        {(reg.team?.commune || reg.team?.city) && <p className="text-[10px] text-white/30">{[reg.team?.commune, reg.team?.city].filter(Boolean).join(', ')}</p>}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${rb.cls}`}>{rb.label}</span>
                                        {reg.status === 'pending' && (
                                          <>
                                            <button onClick={() => handleConfirmReg(reg.id)} className="text-[10px] font-black px-2 py-1 rounded-lg" style={{ background: 'rgba(68,243,169,0.12)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.25)' }}><Check size={11} /></button>
                                            <button onClick={() => handleRejectReg(reg.id)} className="text-[10px] font-black px-2 py-1 rounded-lg" style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}><X size={11} /></button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Open tournaments + my registrations */}
              <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                <div className="px-5 py-4 flex items-center gap-3" style={headerStyle}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(154,203,255,0.1)', color: '#9acbff' }}><Globe size={16} /></div>
                  <div><p className="text-sm font-black text-white">Torneos Disponibles</p><p className="text-[10px] text-white/30">{openTournaments.length} abiertos para inscripción</p></div>
                </div>
                {openTournaments.length === 0 ? (
                  <div className="px-5 py-10 text-center"><Trophy size={28} className="mx-auto text-white/10 mb-2" /><p className="text-white/25 text-xs">No hay torneos con inscripción abierta.</p></div>
                ) : (
                  <div className="divide-y" style={divStyle}>
                    {openTournaments.map(t => {
                      const myReg = myRegs.find(r => r.tournament_id === t.id);
                      return (
                        <div key={t.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-black text-sm overflow-hidden"
                                style={{ background: 'linear-gradient(135deg,#1e3a5f,#3b82f6)', color: '#fff', border: '2px solid rgba(154,203,255,0.2)' }}>
                                {t.organizer?.logo_url ? <img src={t.organizer.logo_url} alt="" className="w-full h-full object-cover" /> : (t.organizer?.team_name?.charAt(0) || '?')}
                              </div>
                              <div className="min-w-0">
                                <p className="font-black text-sm text-white truncate">{t.name}</p>
                                <p className="text-[10px] text-white/30">por {t.organizer?.team_name}</p>
                              </div>
                            </div>
                            {isAdmin && !myReg && (
                              <button onClick={() => handleRegister(t.id, t.entry_fee, t.payment_info)} className="flex-shrink-0 text-[11px] font-black px-3 py-1.5 rounded-lg whitespace-nowrap"
                                style={{ background: 'rgba(154,203,255,0.1)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.2)' }}>
                                Inscribirse
                              </button>
                            )}
                            {myReg && (
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${regBadge[myReg.status]?.cls}`}>{regBadge[myReg.status]?.label}</span>
                                {myReg.status === 'pending' && <button onClick={() => handleWithdraw(myReg.id)} className="text-red-400/50 hover:text-red-400 transition-colors"><X size={13} /></button>}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-[10px] text-white/40 flex items-center gap-1"><Clock size={9} />{fmtDate(t.date)}</span>
                            <span className="text-[10px] text-white/40 flex items-center gap-1"><MapPin size={9} />{t.location}{t.city ? `, ${t.city}` : ''}</span>
                            <span className="text-[10px] font-black" style={{ color: '#9acbff' }}>{t.format}</span>
                            <span className="text-[10px] text-white/40">{t.age_range}</span>
                            <span className="text-[10px] font-black" style={{ color: t.entry_fee > 0 ? '#ffd08b' : '#44f3a9' }}>
                              {t.entry_fee > 0 ? <><CreditCard size={9} className="inline mr-0.5" />{clp(t.entry_fee)}</> : '✓ Gratis'}
                            </span>
                          </div>
                          {t.description && <p className="text-[10px] text-white/25 italic truncate">"{t.description}"</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* My registrations summary */}
              {myRegs.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                  <div className="px-5 py-4" style={headerStyle}>
                    <p className="text-sm font-black text-white">Mis Inscripciones</p>
                  </div>
                  <div className="divide-y" style={divStyle}>
                    {myRegs.map(reg => {
                      const rb = regBadge[reg.status] || regBadge.pending;
                      return (
                        <div key={reg.id} className="px-5 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-black text-white truncate">{reg.tournament?.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-white/30 flex items-center gap-1"><Clock size={9} />{reg.tournament?.date ? fmtDate(reg.tournament.date) : ''}</span>
                              {reg.tournament?.entry_fee > 0 && (
                                <span className="text-[10px] font-black" style={{ color: '#ffd08b' }}>{clp(reg.tournament.entry_fee)}</span>
                              )}
                              {reg.status === 'pending' && reg.tournament?.payment_info && (
                                <span className="text-[10px] text-white/25 italic truncate">Transferir a: {reg.tournament.payment_info}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${rb.cls}`}>{rb.label}</span>
                            {reg.status === 'pending' && <button onClick={() => handleWithdraw(reg.id)} className="text-red-400/50 hover:text-red-400 transition-colors"><X size={13} /></button>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ══ RIGHT: Formation builder ══ */}
        <div className="space-y-4">
          {loadingPitch ? (
            <div className="flex justify-center p-16"><RefreshCw className="animate-spin text-soccer-green" size={28} /></div>
          ) : (
            <div className="relative w-full overflow-hidden shadow-2xl"
              style={{ aspectRatio: '3/4', background: 'linear-gradient(180deg,#053d2e 0%,#064e3b 40%,#065f46 100%)', border: '5px solid #0a0e14', borderRadius: '2rem' }}
              onClick={() => swap && setSwap(null)}>
              <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 9%,rgba(255,255,255,0.06) 9%,rgba(255,255,255,0.06) 10%)' }} />
              <div className="absolute inset-4 border-2 border-white/15 rounded-xl pointer-events-none" />
              <div className="absolute left-4 right-4 top-1/2 h-px bg-white/15 pointer-events-none" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 border-white/15 rounded-full pointer-events-none" />
              <div className="absolute left-1/2 -translate-x-1/2 top-4 w-28 h-14 border-2 border-white/15 border-t-0 rounded-b-xl pointer-events-none" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-4 w-28 h-14 border-2 border-white/15 border-b-0 rounded-t-xl pointer-events-none" />
              {teamName && <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-black text-white/15 uppercase tracking-widest whitespace-nowrap pointer-events-none">{teamName}</div>}
              {starters.map((player, i) => (
                <div key={player.id} className="pitch-player"
                  style={{ ...pitchPos(i, formation), filter: isStarSel(i) ? 'drop-shadow(0 0 14px #44f3a9)' : anySwap && !isStarSel(i) ? 'brightness(0.55)' : undefined, cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); handlePlayer('starter', i); }}>
                  <FifaCard player={player} color={i === 0 ? 'gold' : color} index={i} isSelected={isStarSel(i)} />
                </div>
              ))}
              {starters.length === 0 && <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none"><Globe size={36} className="text-white/15" /><p className="text-white/20 text-xs font-bold">Sin jugadores activos</p></div>}
            </div>
          )}

          {bench.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/25">Suplentes · {bench.length}</p>
                {swap?.type === 'bench' && <span className="ml-auto text-[9px] font-black text-soccer-green animate-pulse">Toca un titular para hacer el cambio</span>}
              </div>
              <div className="flex gap-2 p-3 overflow-x-auto custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
                {bench.map((player, i) => (
                  <div key={player.id} onClick={() => handlePlayer('bench', i)} className="flex-shrink-0 cursor-pointer"
                    style={{ width: '63px', height: '90px', position: 'relative', filter: isBenchSel(i) ? 'drop-shadow(0 0 10px #44f3a9)' : anySwap && !isBenchSel(i) ? 'brightness(0.45)' : undefined, transition: 'filter 0.2s' }}>
                    <div style={{ transform: 'scale(0.74)', transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>
                      <FifaCard player={player} color={color} index={i} isSelected={isBenchSel(i)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-lg font-black text-white italic">{avg}</p>
                <p className="text-[9px] text-white/25 uppercase tracking-widest font-bold">rating prom.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.07)' }}><RotateCcw size={11} /> Reset</button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                  style={saved ? { background: 'rgba(68,243,169,0.12)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.3)' } : { background: '#44f3a9', color: '#003822' }}>
                  {saved ? <><CheckCircle2 size={12} /> Guardado</> : <><Save size={12} /> Guardar</>}
                </button>
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black text-white/25 uppercase tracking-widest mb-2">Táctica</p>
              <div className="flex flex-wrap gap-2">
                {FORMATIONS.map(f => (
                  <button key={f.value} onClick={() => applyFormation(f.value)} className="px-3 py-1.5 rounded-xl text-xs font-bold"
                    style={formation === f.value ? { background: 'rgba(68,243,169,0.15)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.4)' } : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <span className="font-black">{f.value}</span><span className="ml-1 text-[10px] opacity-60">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black text-white/25 uppercase tracking-widest mb-2">Camiseta</p>
              <div className="flex gap-2 flex-wrap">
                {JERSEY_COLORS.map(c => (
                  <button key={c.value} onClick={() => { setColor(c.value); setSaved(false); }} title={c.name}
                    className={`w-6 h-6 rounded-lg border-2 transition-all ${c.cls} ${color === c.value ? 'scale-125 border-white ring-2 ring-white/20' : 'border-transparent opacity-35 hover:opacity-90'}`} />
                ))}
              </div>
            </div>
            {anySwap && <p className="text-[10px] text-soccer-green font-bold animate-pulse">⚡ Toca otro jugador para realizar el cambio · Toca el campo para cancelar</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
