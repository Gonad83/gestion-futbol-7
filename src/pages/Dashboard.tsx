import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, DollarSign, CalendarDays, AlertTriangle, ArrowRight, Trophy, Star, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

type TopPlayer = { id: string; count: number; name: string; nickname: string; photo_url: string };

const RANK_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32'];

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    nextMatch: null as any,
    confirmedCount: 0,
    morosos: [] as any[],
    balance: 0,
    activePlayers: 0,
    totalPlayers: 0,
    declinedCount: 0,
    topParticipations: [] as TopPlayer[],
    topMvp: [] as TopPlayer[],
    allPlayers: [] as any[],
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'Programado')
        .gte('date', new Date().toISOString()) // Solo mostrar partidos futuros
        .order('date', { ascending: true })
        .limit(1);

      const nextMatch = matches?.[0] || null;
      let confirmedCount = 0;
      let declinedCount = 0;

      if (nextMatch) {
        const { count: confCount } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('match_id', nextMatch.id)
          .eq('status', 'Voy');
        confirmedCount = confCount || 0;

        const { count: decCount } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('match_id', nextMatch.id)
          .eq('status', 'No voy');
        declinedCount = decCount || 0;
      }

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { data: allPlayers } = await supabase.from('players').select('id, name, nickname, status, photo_url');
      const activePlayersList = allPlayers?.filter(p => p.status === 'Activo') || [];

      const { data: payments } = await supabase
        .from('payments')
        .select('player_id, month, year, amount, status');

      const morososWithDetails = activePlayersList.map(player => {
        const playerPayments = payments?.filter(p => p.player_id === player.id) || [];
        const paidMonths = new Set(
          playerPayments.filter(p => p.status === 'Pagado').map(p => `${p.year}-${p.month}`)
        );
        let pendingInfo = playerPayments.filter(p =>
          p.status === 'Pendiente' &&
          (p.year < currentYear || (p.year === currentYear && p.month <= currentMonth)) &&
          !paidMonths.has(`${p.year}-${p.month}`) &&
          p.month > 2
        );
        const hasCurrentMonthPaid = paidMonths.has(`${currentYear}-${currentMonth}`);
        const hasCurrentMonthPending = pendingInfo.some(p => p.month === currentMonth && p.year === currentYear);
        if (!hasCurrentMonthPaid && !hasCurrentMonthPending && currentMonth > 2) {
          pendingInfo.push({ player_id: player.id, month: currentMonth, year: currentYear, amount: 8000, status: 'Pendiente' });
        }
        const uniquePending = Array.from(
          new Map(pendingInfo.map(p => [`${p.year}-${p.month}`, p])).values()
        ).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
        return { ...player, pendingPayments: uniquePending };
      }).filter(p => p.pendingPayments.length > 0);

      const { data: payData } = await supabase.from('payments').select('amount').eq('status', 'Pagado');
      const { data: expData } = await supabase.from('expenses').select('amount');
      const { data: incomeData } = await supabase.from('cash_incomes').select('amount');

      const totalIncome = (payData ?? []).reduce((acc, p) => acc + Number(p.amount), 0);
      const totalExp = (expData ?? []).reduce((acc, p) => acc + Number(p.amount), 0);
      const totalManualIncomes = (incomeData ?? []).reduce((acc, i) => acc + Number(i.amount), 0);
      const balance = totalIncome + totalManualIncomes - totalExp;

      // Top Participaciones
      const { data: allAttendance } = await supabase
        .from('attendance')
        .select('player_id')
        .eq('status', 'Voy');

      const participationCounts: Record<string, number> = {};
      allAttendance?.forEach(a => {
        if (a.player_id) participationCounts[a.player_id] = (participationCounts[a.player_id] || 0) + 1;
      });
      const topParticipations: TopPlayer[] = Object.entries(participationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, count]) => {
          const p = allPlayers?.find(pl => pl.id === id);
          return { id, count, name: p?.name || '?', nickname: (p as any)?.nickname || '', photo_url: (p as any)?.photo_url || '' };
        });

      // Top MVP Votos
      let topMvp: TopPlayer[] = [];
      try {
        const { data: mvpVotes, error: mvpError } = await supabase
          .from('match_mvp_votes')
          .select('voted_player_id');
        if (!mvpError && mvpVotes && mvpVotes.length > 0) {
          const mvpCounts: Record<string, number> = {};
          mvpVotes.forEach(v => {
            if (v.voted_player_id) mvpCounts[v.voted_player_id] = (mvpCounts[v.voted_player_id] || 0) + 1;
          });
          topMvp = Object.entries(mvpCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id, count]) => {
              const p = allPlayers?.find(pl => pl.id === id);
              return { id, count, name: p?.name || '?', nickname: (p as any)?.nickname || '', photo_url: (p as any)?.photo_url || '' };
            });
        }
      } catch {
        // Table not yet created
      }

      setStats({ 
        nextMatch, 
        confirmedCount, 
        declinedCount,
        morosos: morososWithDetails, 
        balance, 
        activePlayers: activePlayersList.length, 
        totalPlayers: allPlayers?.length || 0, 
        topParticipations, 
        topMvp,
        allPlayers: allPlayers || []
      });
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const getMatchTimeLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoy';
    if (isTomorrow(date)) return 'Mañana';
    if (isThisWeek(date)) return 'Esta semana';
    return format(date, 'EEEE d', { locale: es });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <div className="w-10 h-10 rounded-full border-2 border-t-soccer-green border-r-soccer-green/20 border-b-soccer-green/10 border-l-soccer-green/5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fade-in pb-20 md:pb-0 space-y-6 relative overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-soccer-green/70 mb-1">Panel de Control</p>
          <h1 className="text-3xl md:text-4xl font-headline font-black text-white italic tracking-tight uppercase">
            Real Ebolo <span className="text-soccer-green">FC</span>
          </h1>
        </div>
        
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-soccer-green/30 transition-all group self-start md:self-auto"
        >
          <Users size={18} className="text-soccer-green group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-wider">Ver Plantilla</span>
          <div className="w-5 h-5 rounded-full bg-soccer-green/20 flex items-center justify-center ml-1">
            <span className="text-[10px] text-soccer-green font-black">{stats.allPlayers.length}</span>
          </div>
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Jugadores Activos',
            value: stats.activePlayers,
            sub: `${stats.totalPlayers} registrados`,
            icon: <Users size={18} />,
            color: '#44f3a9',
            link: '/players'
          },
          {
            label: 'Próximo Partido',
            value: stats.nextMatch ? format(new Date(stats.nextMatch.date), 'dd MMM', { locale: es }) : 'Por programar',
            sub: stats.nextMatch ? getMatchTimeLabel(stats.nextMatch.date) : 'Sin partidos próximos',
            icon: <CalendarDays size={18} />,
            color: '#9acbff',
            link: '/calendar'
          },
          {
            label: 'Confirmados',
            value: stats.confirmedCount,
            sub: stats.nextMatch ? 'para el próximo partido' : 'Sin partido programado',
            icon: <Trophy size={18} />,
            color: '#ffd08b',
            link: '/matchmaking'
          },
          {
            label: 'Saldo de Caja',
            value: `$${Math.round(stats.balance).toLocaleString('es-CL')}`,
            sub: stats.balance >= 0 ? 'Balance positivo' : 'Balance negativo',
            icon: <DollarSign size={18} />,
            color: stats.balance >= 0 ? '#44f3a9' : '#f87171',
            link: '/finance'
          },
        ].map((kpi) => (
          <Link key={kpi.label} to={kpi.link} className="group block">
            <div
              className="rounded-2xl p-5 h-full transition-all duration-300 group-hover:translate-y-[-2px]"
              style={{
                background: '#1c2026',
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${kpi.color}18`, color: kpi.color }}
                >
                  {kpi.icon}
                </div>
                <ArrowRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
              </div>
              <p className="font-headline text-3xl font-black text-white tracking-tight mb-1" style={{ letterSpacing: '-0.02em' }}>
                {kpi.value}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30 mb-0.5">{kpi.label}</p>
              <p className="text-xs text-white/40">{kpi.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Next Match - wide */}
        <div className="lg:col-span-3 glass-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(68,243,169,0.06) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9' }}>
                <CalendarDays size={16} />
              </div>
              <h2 className="font-headline font-bold text-white">Próximo Partido</h2>
              {stats.nextMatch && (isToday(new Date(stats.nextMatch.date)) || isTomorrow(new Date(stats.nextMatch.date))) && (
                <span className="status-pulse ml-1">
                  <span className="status-pulse-dot bg-soccer-green"></span>
                  <span className="status-pulse-inner bg-soccer-green"></span>
                </span>
              )}
            </div>
            <Link to="/calendar" className="text-xs font-semibold flex items-center gap-1 transition-colors hover:opacity-80" style={{ color: '#44f3a9' }}>
              Ver calendario <ArrowRight size={13} />
            </Link>
          </div>

          {stats.nextMatch ? (
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-stretch">
              <div
                className="flex flex-col items-center justify-center min-w-[130px] p-5 rounded-2xl"
                style={{ background: '#0a0e14', border: '1px solid rgba(68,243,169,0.15)' }}
              >
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#44f3a9' }}>{getMatchTimeLabel(stats.nextMatch.date)}</p>
                <p className="font-headline text-4xl font-black text-white tracking-tight" style={{ letterSpacing: '-0.02em' }}>{format(new Date(stats.nextMatch.date), 'HH:mm')}</p>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mt-1">{format(new Date(stats.nextMatch.date), 'dd MMM yyyy', { locale: es })}</p>
              </div>

              <div className="flex-1 flex flex-col justify-center space-y-4 w-full text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-3">
                  <span
                    className="text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest"
                    style={{ background: 'rgba(68,243,169,0.12)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}
                  >
                    {stats.nextMatch.match_type || '7vs7'}
                  </span>
                  <span className="text-white font-bold text-lg">{stats.nextMatch.location}</span>
                </div>

                <div className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Confirmados / Bajas</span>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black" style={{ color: '#44f3a9' }}>{stats.confirmedCount} Voy</span>
                       <span className="text-[10px] font-black" style={{ color: '#f87171' }}>{stats.declinedCount} No Voy</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden flex">
                    <div 
                      className="h-full bg-soccer-green transition-all duration-1000" 
                      style={{ width: `${Math.min((stats.confirmedCount / 14) * 100, 100)}%` }}
                    />
                    <div 
                      className="h-full bg-red-400/30 transition-all duration-1000" 
                      style={{ width: `${Math.min((stats.declinedCount / 14) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <Link to="/matchmaking" className="btn-secondary w-full sm:w-auto text-center py-2 text-sm">
                  Armar Equipos
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 rounded-2xl relative overflow-hidden" style={{ background: 'rgba(0,0,0,0.15)', border: '1px dashed rgba(255,255,255,0.08)' }}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #44f3a9 0%, transparent 70%)' }} />
              <CalendarDays size={48} className="mx-auto text-white/10 mb-4" />
              <h3 className="font-headline text-xl font-bold text-white mb-2">Sin partidos próximos</h3>
              <p className="text-white/40 mb-6 text-sm max-w-xs mx-auto">No hay eventos programados en el calendario por ahora.</p>
              <Link to="/calendar" className="btn-primary inline-flex text-sm px-8">Programar Partido</Link>
            </div>
          )}
        </div>

        {/* MVP Podium - Moved up */}
        <div className="lg:col-span-2 glass-card relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.05) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,215,0,0.1)', color: '#ffd700' }}>
                <Star size={16} />
              </div>
              <h2 className="font-headline font-bold text-white">Mejor Jugador</h2>
            </div>
            <Link to="/vote" className="text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: '#ffd700' }}>
              Votar <ArrowRight size={13} />
            </Link>
          </div>

          {stats.topMvp.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 rounded-xl" style={{ background: 'rgba(0,0,0,0.15)', border: '1px dashed rgba(255,255,255,0.08)' }}>
              <p className="text-white/30 text-sm mb-1">Sin votos aún.</p>
              <p className="text-white/20 text-xs text-center">Los votos se activan<br />después de cada partido.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-3">
              {stats.topMvp.map((player, i) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: i === 0 ? 'rgba(255,215,0,0.06)' : 'rgba(0,0,0,0.15)',
                    border: `1px solid ${i === 0 ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)'}`
                  }}
                >
                  <span
                    className="font-headline font-black text-xl w-6 text-center flex-shrink-0"
                    style={{ color: RANK_COLORS[i] }}
                  >
                    {i + 1}
                  </span>
                  <div
                    className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{ background: '#31353c', border: `1.5px solid ${RANK_COLORS[i]}40` }}
                  >
                    {player.photo_url
                      ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                      : <span className="text-sm font-black" style={{ color: 'rgba(255,255,255,0.3)' }}>{player.name.charAt(0)}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate leading-tight">{player.name}</p>
                    {player.nickname && <p className="text-[10px] text-white/30 truncate">"{player.nickname}"</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-headline font-black text-xl leading-none" style={{ color: RANK_COLORS[i] }}>{player.count}</p>
                    <p className="text-[9px] text-white/30 uppercase tracking-wider">votos</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Morosos */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>
                <AlertTriangle size={16} />
              </div>
              <h2 className="font-headline font-bold text-white">Cuotas Atrasadas</h2>
            </div>
            <span
              className="text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider"
              style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
            >
              {stats.morosos.length} jugadores
            </span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[260px] custom-scrollbar pr-1">
            {stats.morosos.length === 0 ? (
              <div className="text-center py-10 rounded-xl" style={{ background: 'rgba(68,243,169,0.04)', border: '1px dashed rgba(68,243,169,0.15)' }}>
                <p className="text-soccer-green font-semibold text-sm">¡Todos al día este mes!</p>
              </div>
            ) : (
              stats.morosos.map(player => (
                <div
                  key={player.id}
                  className="flex justify-between items-center p-3 rounded-xl transition-colors hover:bg-white/3"
                  style={{ background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.1)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs text-white font-bold"
                      style={{ background: '#31353c', border: '1px solid rgba(248,113,113,0.25)' }}
                    >
                      {player.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm leading-tight">{player.name}</p>
                      <p className="text-[10px] text-red-400/80 capitalize mt-0.5">
                        {player.pendingPayments.map((p: any) => format(new Date(p.year, p.month - 1), 'MMM yyyy', { locale: es })).join(', ')}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <Link
                      to="/finance"
                      className="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                    >
                      Cobrar
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Plantilla Stats */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9' }}>
                <Users size={16} />
              </div>
              <h2 className="font-headline font-bold text-white">Plantilla</h2>
            </div>
            <Link to="/players" className="text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: '#44f3a9' }}>
              Ver equipo <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="rounded-2xl p-6 text-center" style={{ background: '#0a0e14', border: '1px solid rgba(255,255,255,0.04)' }}>
              <p className="font-headline text-5xl font-black text-white mb-2" style={{ letterSpacing: '-0.02em' }}>{stats.activePlayers}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: '#44f3a9' }}>Activos</p>
            </div>
            <div className="rounded-2xl p-6 text-center" style={{ background: '#0a0e14', border: '1px solid rgba(255,255,255,0.04)' }}>
              <p className="font-headline text-5xl font-black text-white mb-2" style={{ letterSpacing: '-0.02em' }}>{stats.totalPlayers}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">Registrados</p>
            </div>
          </div>

          <p className="text-xs text-white/30 text-center pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            Inactivos y lesionados no aparecen en cobros ni matchmaking.
          </p>
        </div>

        {/* Top Participaciones - Moved down */}
        <div className="glass-card relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,208,139,0.05) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,208,139,0.1)', color: '#ffd08b' }}>
              <Trophy size={16} />
            </div>
            <h2 className="font-headline font-bold text-white">Participaciones</h2>
          </div>

          <div className="space-y-3">
            {stats.topParticipations.length === 0 ? (
              <div className="text-center py-8 rounded-xl" style={{ background: 'rgba(0,0,0,0.15)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                <p className="text-white/30 text-sm">Sin datos aún.</p>
              </div>
            ) : (
              stats.topParticipations.map((player, i) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: i === 0 ? 'rgba(255,215,0,0.06)' : 'rgba(0,0,0,0.15)',
                    border: `1px solid ${i === 0 ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)'}`
                  }}
                >
                  <span
                    className="font-headline font-black text-lg w-6 text-center flex-shrink-0"
                    style={{ color: RANK_COLORS[i] }}
                  >
                    {i + 1}
                  </span>
                  <div
                    className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{ background: '#31353c', border: `1.5px solid ${RANK_COLORS[i]}40` }}
                  >
                    {player.photo_url
                      ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                      : <span className="text-xs font-black" style={{ color: 'rgba(255,255,255,0.3)' }}>{player.name.charAt(0)}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-xs truncate leading-tight">{player.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-headline font-black text-lg leading-none" style={{ color: RANK_COLORS[i] }}>{player.count}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Drawer Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-[350px] max-w-[90vw] bg-[#15191e] border-l border-white/10 z-[101] shadow-2xl transition-transform duration-500 ease-out transform ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-soccer-green/10" style={{ background: 'linear-gradient(135deg, rgba(68,243,169,0.2) 0%, rgba(68,243,169,0.05) 100%)', color: '#44f3a9' }}>
                <Users size={22} />
              </div>
              <div>
                <h2 className="font-headline font-bold text-white text-xl leading-tight">Plantilla</h2>
                <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">{stats.allPlayers.length} Jugadores Totales</p>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
            >
              <X size={20} className="text-white/40" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {stats.allPlayers
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((player) => (
                <Link
                  key={player.id}
                  to={isAdmin ? `/admin?player=${player.id}` : '#'}
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 hover:bg-white/[0.03] border border-transparent hover:border-white/5 group"
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 ring-2 ring-white/5 group-hover:ring-soccer-green/30 transition-all flex items-center justify-center shadow-lg">
                      {player.photo_url ? (
                        <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-black text-white/20">{player.name.charAt(0)}</span>
                      )}
                    </div>
                    {player.status === 'Activo' && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-soccer-green border-[3px] border-[#15191e] shadow-sm" title="Activo" />
                    )}
                    {player.status === 'Lesionado' && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-orange-400 border-[3px] border-[#15191e] shadow-sm" title="Lesionado" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-[15px] truncate group-hover:text-soccer-green transition-colors">{player.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                       <p className="text-[11px] text-white/30 truncate uppercase tracking-widest">{player.nickname || 'Sin apodo'}</p>
                       <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                         player.status === 'Activo' ? 'text-soccer-green/80 bg-soccer-green/10' : 
                         player.status === 'Lesionado' ? 'text-orange-400/80 bg-orange-400/10' : 
                         'text-white/20 bg-white/5'
                       }`}>
                         {player.status}
                       </span>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-white/0 group-hover:text-soccer-green transition-all -translate-x-3 group-hover:translate-x-0" />
                </Link>
              ))}
          </div>

          <div className="mt-8 pt-6 border-t border-white/5">
            <Link 
              to="/players" 
              onClick={() => setIsSidebarOpen(false)}
              className="flex items-center justify-center gap-3 py-4 rounded-2xl bg-soccer-green text-[#0a0c10] text-sm font-black hover:bg-[#39d091] transition-all uppercase tracking-[0.15em] shadow-lg shadow-soccer-green/20"
            >
              <Users size={18} /> Gestionar Equipo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
