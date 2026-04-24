import { useState, useEffect } from 'react';
import { supabase, withTimeout } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, DollarSign, CalendarDays, AlertTriangle, ArrowRight, Trophy, Star, X, CheckCircle2, XCircle, Clock, Copy, CreditCard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

type TopPlayer = { id: string; count: number; name: string; nickname: string; photo_url: string };

const RANK_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32'];

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [teamSettings, setTeamSettings] = useState({ team_name: 'Real Ebolo FC', logo_url: '', join_code: '', payment_link: '', payment_button_enabled: false });
  const [loading, setLoading] = useState(true);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({
    nextMatch: null as any,
    confirmedCount: 0,
    morosos: [] as any[],
    balance: 0,
    activePlayers: 0,
    totalPlayers: 0,
    declinedCount: 0,
    pendingCount: 0,
    topParticipations: [] as TopPlayer[],
    topMvp: [] as TopPlayer[],
    allPlayers: [] as any[],
    votingIsOpen: false,
    openVoteMatchId: null as string | null,
    lastMvpWinner: null as any,
    mvpWinHistory: [] as TopPlayer[],
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch team settings
      const { data: settings } = await supabase.from('team_settings').select('*').eq('id', 1).maybeSingle();
      if (settings) {
        setTeamSettings({
          team_name: settings.team_name,
          logo_url: settings.logo_url || '',
          join_code: settings.join_code || '',
          payment_link: settings.payment_link || '',
          payment_button_enabled: settings.payment_button_enabled || false,
        });
      }
      const { data: matches } = (await withTimeout(
        supabase
          .from('matches')
          .select('*')
          .eq('status', 'Programado')
          .gte('date', new Date().toISOString())
          .order('date', { ascending: true })
          .limit(1) as any,
        20000
      )) as any;

      const nextMatch = matches?.[0] || null;
      let confirmedCount = 0;
      let declinedCount = 0;

      if (nextMatch) {
        const { count: confCount } = (await withTimeout(
          supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('match_id', nextMatch.id)
            .eq('status', 'Voy') as any,
          15000
        )) as any;
        confirmedCount = confCount || 0;

        const { count: decCount } = (await withTimeout(
          supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('match_id', nextMatch.id)
            .eq('status', 'No voy') as any,
          15000
        )) as any;
        declinedCount = decCount || 0;
      }

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { data: allPlayers } = (await withTimeout(
        supabase.from('players').select('id, name, nickname, status, photo_url') as any,
        8000
      )) as any;
      const activePlayersList = allPlayers?.filter((p: any) => p.status === 'Activo') || [];

      const { data: payments } = (await withTimeout(
        supabase
          .from('payments')
          .select('player_id, month, year, amount, status') as any,
        8000
      )) as any;

      const morososWithDetails = activePlayersList.map((player: any) => {
        const playerPayments = payments?.filter((p: any) => p.player_id === player.id) || [];
        const paidMonths = new Set(
          playerPayments.filter((p: any) => p.status === 'Pagado').map((p: any) => `${p.year}-${p.month}`)
        );
        let pendingInfo = playerPayments.filter((p: any) =>
          p.status === 'Pendiente' &&
          (p.year < currentYear || (p.year === currentYear && p.month <= currentMonth)) &&
          !paidMonths.has(`${p.year}-${p.month}`) &&
          p.month > 2
        );
        const hasCurrentMonthPaid = paidMonths.has(`${currentYear}-${currentMonth}`);
        const hasCurrentMonthPending = pendingInfo.some((p: any) => p.month === currentMonth && p.year === currentYear);
        if (!hasCurrentMonthPaid && !hasCurrentMonthPending && currentMonth > 2) {
          pendingInfo.push({ player_id: player.id, month: currentMonth, year: currentYear, amount: 8000, status: 'Pendiente' });
        }
        const uniquePending = Array.from(
          new Map(pendingInfo.map((p: any) => [`${p.year}-${p.month}`, p])).values()
        ).sort((a: any, b: any) => a.year !== b.year ? a.year - b.year : a.month - b.month);
        return { ...player, pendingPayments: uniquePending };
      }).filter((p: any) => p.pendingPayments.length > 0);

      const { data: payData } = (await withTimeout(supabase.from('payments').select('amount').eq('status', 'Pagado') as any, 15000)) as any;
      const { data: expData } = (await withTimeout(supabase.from('expenses').select('amount') as any, 15000)) as any;
      const { data: incomeData } = (await withTimeout(supabase.from('cash_incomes').select('amount') as any, 15000)) as any;

      const totalIncome = (payData ?? []).reduce((acc: number, p: any) => acc + Number(p.amount), 0);
      const totalExp = (expData ?? []).reduce((acc: number, p: any) => acc + Number(p.amount), 0);
      const totalManualIncomes = (incomeData ?? []).reduce((acc: number, i: any) => acc + Number(i.amount), 0);
      const balance = totalIncome + totalManualIncomes - totalExp;

      // Top Participaciones
      const { data: allAttendance } = (await withTimeout(
        supabase
          .from('attendance')
          .select('player_id')
          .eq('status', 'Voy') as any,
        8000
      )) as any;

      const participationCounts: Record<string, number> = {};
      allAttendance?.forEach((a: any) => {
        if (a.player_id) participationCounts[a.player_id] = (participationCounts[a.player_id] || 0) + 1;
      });
      const topParticipations: TopPlayer[] = Object.entries(participationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, count]) => {
          const p = allPlayers?.find((pl: any) => pl.id === id);
          return { id, count, name: p?.name || '?', nickname: (p as any)?.nickname || '', photo_url: (p as any)?.photo_url || '' };
        });

      // MVP / Voting section
      let topMvp: TopPlayer[] = [];
      let votingIsOpen = false;
      let openVoteMatchId: string | null = null;
      let lastMvpWinner: any = null;
      let mvpWinHistory: TopPlayer[] = [];
      try {
        const dayOfWeek = new Date().getDay();
        const couldBeOpen = dayOfWeek !== 1; // Not Monday
        if (couldBeOpen) {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const { data: recentDeportivo } = (await withTimeout(
            supabase
              .from('matches')
              .select('id')
              .eq('event_type', 'Deportivo')
              .lt('date', new Date().toISOString())
              .gt('date', sevenDaysAgo.toISOString())
              .order('date', { ascending: false })
              .limit(1) as any,
            5000
          )) as any;
          if (recentDeportivo?.[0]) {
            votingIsOpen = true;
            openVoteMatchId = recentDeportivo[0].id;
            const { data: liveVotes } = (await withTimeout(
              supabase
                .from('match_mvp_votes')
                .select('voted_player_id')
                .eq('match_id', openVoteMatchId) as any,
              5000
            )) as any;
            if (liveVotes && liveVotes.length > 0) {
              const counts: Record<string, number> = {};
              liveVotes.forEach((v: any) => {
                if (v.voted_player_id) counts[v.voted_player_id] = (counts[v.voted_player_id] || 0) + 1;
              });
              topMvp = Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 1)
                .map(([id, count]) => {
                  const p = allPlayers?.find((pl: any) => pl.id === id);
                  return { id, count, name: p?.name || '?', nickname: (p as any)?.nickname || '', photo_url: (p as any)?.photo_url || '' };
                });
            }
          }
        }
        const { data: winnersData, error: winnersError } = (await withTimeout(
          supabase
            .from('mvp_winners')
            .select('player_id, player_name, player_photo_url, vote_count, created_at')
            .order('created_at', { ascending: false }) as any,
          5000
        )) as any;
        if (!winnersError && winnersData && winnersData.length > 0) {
          lastMvpWinner = winnersData[0];
          const winCounts: Record<string, { name: string; photo: string; count: number }> = {};
          winnersData.forEach((w: any) => {
            if (!winCounts[w.player_id]) winCounts[w.player_id] = { name: w.player_name, photo: w.player_photo_url || '', count: 0 };
            winCounts[w.player_id].count++;
          });
          mvpWinHistory = Object.entries(winCounts)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 3)
            .map(([id, v]) => ({ id, count: v.count, name: v.name, nickname: '', photo_url: v.photo }));
        }
      } catch {
        // Tables may not exist yet
      }

      const pendingCount = nextMatch
        ? Math.max(0, activePlayersList.length - confirmedCount - declinedCount)
        : 0;

      setStats({
        nextMatch,
        confirmedCount,
        declinedCount,
        pendingCount,
        morosos: morososWithDetails,
        balance,
        activePlayers: activePlayersList.length,
        totalPlayers: allPlayers?.length || 0,
        topParticipations,
        topMvp,
        allPlayers: allPlayers || [],
        votingIsOpen,
        openVoteMatchId,
        lastMvpWinner,
        mvpWinHistory,
      });
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const openAttendanceModal = async () => {
    if (!stats.nextMatch) return;
    setShowAttendanceModal(true);
    setAttendanceLoading(true);
    try {
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('player_id, status')
        .eq('match_id', stats.nextMatch.id);
      const statusMap: Record<string, string> = {};
      attendanceData?.forEach((a: any) => { statusMap[a.player_id] = a.status; });
      const merged = stats.allPlayers
        .filter((p: any) => p.status === 'Activo')
        .map((p: any) => ({ ...p, attendanceStatus: statusMap[p.id] || 'Pendiente' }));
      setAttendanceList(merged);
    } catch (e) {
      console.error(e);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleAttendanceChange = async (playerId: string, newStatus: 'Voy' | 'No voy' | 'Pendiente') => {
    if (!stats.nextMatch) return;
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('match_id', stats.nextMatch.id)
      .eq('player_id', playerId)
      .maybeSingle();
    if (newStatus === 'Pendiente') {
      if (existing) await supabase.from('attendance').delete().eq('id', existing.id);
    } else if (existing) {
      await supabase.from('attendance').update({ status: newStatus }).eq('id', existing.id);
    } else {
      await supabase.from('attendance').insert([{ match_id: stats.nextMatch.id, player_id: playerId, status: newStatus }]);
    }
    setAttendanceList(prev => {
      const updated = prev.map(p => p.id === playerId ? { ...p, attendanceStatus: newStatus } : p);
      const confirmed = updated.filter(p => p.attendanceStatus === 'Voy').length;
      const declined = updated.filter(p => p.attendanceStatus === 'No voy').length;
      const pending = updated.filter(p => p.attendanceStatus === 'Pendiente').length;
      setStats(s => ({ ...s, confirmedCount: confirmed, declinedCount: declined, pendingCount: pending }));
      return updated;
    });
  };

  const copyForWhatsApp = async () => {
    if (!stats.nextMatch) return;
    const match = stats.nextMatch;

    let list = attendanceList;
    if (list.length === 0) {
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('player_id, status')
        .eq('match_id', match.id);
      const statusMap: Record<string, string> = {};
      attendanceData?.forEach((a: any) => { statusMap[a.player_id] = a.status; });
      list = stats.allPlayers
        .filter((p: any) => p.status === 'Activo')
        .map((p: any) => ({ ...p, attendanceStatus: statusMap[p.id] || 'Pendiente' }));
    }

    const van = list.filter(p => p.attendanceStatus === 'Voy');
    const noVan = list.filter(p => p.attendanceStatus === 'No voy');
    const sinResp = list.filter(p => p.attendanceStatus === 'Pendiente');

    const lines: string[] = [];
    lines.push(`⚽ *${teamSettings.team_name}*`);
    lines.push(`📅 ${format(new Date(match.date), "EEEE dd 'de' MMMM • HH:mm", { locale: es })}`);
    if (match.location) lines.push(`📍 ${match.location}`);
    lines.push('');
    lines.push(`✅ *Van (${van.length}):*`);
    van.forEach((p, i) => lines.push(`${i + 1}. ${p.name}`));
    if (noVan.length > 0) {
      lines.push('');
      lines.push(`❌ *No van (${noVan.length}):*`);
      noVan.forEach(p => lines.push(`• ${p.name}`));
    }
    if (sinResp.length > 0) {
      lines.push('');
      lines.push(`⏳ *Sin respuesta (${sinResp.length}):*`);
      sinResp.forEach(p => lines.push(`• ${p.name}`));
    }
    lines.push('');
    lines.push(`_Total activos: ${list.length}_`);

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const closeVoting = async () => {
    if (!stats.openVoteMatchId) return;
    if (!confirm('¿Cerrar votación y guardar al MVP de la semana?')) return;
    try {
      const { data: votes } = await supabase
        .from('match_mvp_votes')
        .select('voted_player_id')
        .eq('match_id', stats.openVoteMatchId);
      if (!votes || votes.length === 0) { alert('No hay votos registrados aún.'); return; }
      const counts: Record<string, number> = {};
      votes.forEach((v: any) => { if (v.voted_player_id) counts[v.voted_player_id] = (counts[v.voted_player_id] || 0) + 1; });
      const [[winnerId, voteCount]] = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const winner = stats.allPlayers.find((p: any) => p.id === winnerId);
      if (!winner) { alert('No se encontró el jugador ganador.'); return; }
      const { error } = await supabase.from('mvp_winners').insert({
        match_id: stats.openVoteMatchId,
        player_id: winnerId,
        player_name: winner.name,
        player_photo_url: winner.photo_url || null,
        vote_count: voteCount,
        week_date: new Date().toISOString().split('T')[0],
      });
      if (error) throw error;
      alert(`¡MVP registrado! Ganador: ${winner.name} con ${voteCount} votos.`);
      fetchDashboardData();
    } catch (err: any) {
      alert('Error al cerrar votación: ' + err.message);
    }
  };

  const notifyVoting = async () => {
    if (!stats.openVoteMatchId) return;
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
    if (!webhookUrl) { alert('No hay webhook configurado para notificaciones.'); return; }
    try {
      const voteUrl = `${window.location.origin}/vote?match_id=${stats.openVoteMatchId}`;
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'mvp_vote_open', vote_url: voteUrl }),
      });
      alert('¡Notificación enviada!');
    } catch (err: any) {
      alert('Error al enviar notificación: ' + err.message);
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
      {/* Hero Banner */}
      <div className="relative w-full h-36 md:h-48 rounded-2xl overflow-hidden">
        <img
          src="/stadium-banner.png"
          alt={teamSettings.team_name}
          className="w-full h-full object-cover object-center"
        />
        {/* gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(10,14,20,0.85) 0%, rgba(10,14,20,0.4) 50%, rgba(10,14,20,0.1) 100%)' }} />
        {/* title */}
        <div className="absolute inset-0 flex flex-col justify-center pl-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-soccer-green/80 mb-1">Panel de Control</p>
          <h1 className="text-3xl md:text-4xl font-headline font-black text-white italic tracking-tight uppercase drop-shadow-lg">
            {teamSettings.team_name.split(' ')[0]} <span className="text-soccer-green">{teamSettings.team_name.split(' ').slice(1).join(' ')}</span>
          </h1>
        </div>

        {/* Join Code for Admins */}
        {isAdmin && teamSettings.join_code && (
          <div className="absolute top-4 right-4 animate-in fade-in duration-700">
            <div className="flex flex-col items-end gap-1">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40 mr-1">Código de Invitación</span>
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-2xl">
                <span className="font-headline font-black text-lg tracking-[0.2em] text-soccer-green uppercase select-all">
                  {teamSettings.join_code}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-soccer-green animate-pulse" />
              </div>
            </div>
          </div>
        )}
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

      {/* Payment Banner */}
      {teamSettings.payment_button_enabled && teamSettings.payment_link && (
        <a
          href={teamSettings.payment_link}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 hover:brightness-110 hover:translate-y-[-1px]"
          style={{
            background: 'linear-gradient(135deg, rgba(68,243,169,0.12) 0%, rgba(68,243,169,0.06) 100%)',
            border: '1px solid rgba(68,243,169,0.25)',
            boxShadow: '0 4px 24px rgba(68,243,169,0.08)',
          }}
        >
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(68,243,169,0.15)', color: '#44f3a9' }}>
            <CreditCard size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-headline font-black text-white text-base leading-tight">Paga tu cuota mensual</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(68,243,169,0.6)' }}>Haz clic para pagar de forma segura con Mercado Pago</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="hidden sm:block text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl" style={{ background: '#44f3a9', color: '#003822' }}>
              Pagar ahora
            </span>
            <ArrowRight size={16} className="text-soccer-green group-hover:translate-x-1 transition-transform" />
          </div>
        </a>
      )}

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
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Asistencia</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black" style={{ color: '#44f3a9' }}>{stats.confirmedCount} Voy</span>
                      <span className="text-[10px] font-black" style={{ color: '#f87171' }}>{stats.declinedCount} No Voy</span>
                      <span className="text-[10px] font-black" style={{ color: '#fbbf24' }}>{stats.pendingCount} Pendiente</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden flex">
                    <div
                      className="h-full bg-soccer-green transition-all duration-1000"
                      style={{ width: `${Math.min((stats.confirmedCount / stats.activePlayers) * 100, 100)}%` }}
                    />
                    <div
                      className="h-full bg-red-400/50 transition-all duration-1000"
                      style={{ width: `${Math.min((stats.declinedCount / stats.activePlayers) * 100, 100)}%` }}
                    />
                    <div
                      className="h-full bg-amber-400/30 transition-all duration-1000"
                      style={{ width: `${Math.min((stats.pendingCount / stats.activePlayers) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-soccer-green" />
                      <span className="text-[9px] text-white/30">Confirmados</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-400/50" />
                      <span className="text-[9px] text-white/30">Bajas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-amber-400/30" />
                      <span className="text-[9px] text-white/30">Sin respuesta</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={openAttendanceModal}
                    className="btn-primary py-2 px-5 text-sm flex items-center gap-2"
                  >
                    <CheckCircle2 size={15} />
                    Confirmar Asistencia
                  </button>
                  <Link to="/matchmaking" className="btn-secondary text-center py-2 text-sm">
                    Armar Equipos
                  </Link>
                  <button
                    onClick={copyForWhatsApp}
                    className={`flex items-center gap-2 py-2 px-4 text-sm rounded-xl font-semibold border transition-all ${copied ? 'bg-soccer-green/20 text-soccer-green border-soccer-green/40' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white'}`}
                  >
                    <Copy size={14} />
                    {copied ? '¡Copiado!' : 'WhatsApp'}
                  </button>
                </div>
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

        {/* MVP Card */}
        <div className="lg:col-span-2 glass-card relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.05) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,215,0,0.1)', color: '#ffd700' }}>
                <Star size={16} />
              </div>
              <h2 className="font-headline font-bold text-white">Mejor Jugador</h2>
            </div>
            {stats.votingIsOpen && (
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse" style={{ background: 'rgba(68,243,169,0.15)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.3)' }}>
                ● Votación Abierta
              </span>
            )}
          </div>

          {stats.votingIsOpen ? (
            <div className="flex-1 flex flex-col gap-3">
              {stats.topMvp.length > 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)' }}>
                  <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: '#31353c', border: '2px solid rgba(255,215,0,0.4)' }}>
                    {stats.topMvp[0].photo_url
                      ? <img src={stats.topMvp[0].photo_url} alt={stats.topMvp[0].name} className="w-full h-full object-cover" />
                      : <span className="text-xl font-black" style={{ color: 'rgba(255,255,255,0.3)' }}>{stats.topMvp[0].name.charAt(0)}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#ffd700' }}>Líder actual</p>
                    <p className="font-headline font-black text-white text-lg leading-tight truncate">{stats.topMvp[0].name}</p>
                    {stats.topMvp[0].nickname && <p className="text-[10px] text-white/30">"{stats.topMvp[0].nickname}"</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-headline font-black text-2xl leading-none" style={{ color: '#ffd700' }}>{stats.topMvp[0].count}</p>
                    <p className="text-[9px] text-white/30 uppercase">votos</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 rounded-xl" style={{ background: 'rgba(0,0,0,0.15)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                  <Star size={28} className="mb-2" style={{ color: 'rgba(255,215,0,0.25)' }} />
                  <p className="text-white/30 text-sm">Sé el primero en votar</p>
                </div>
              )}
              <Link
                to={`/vote${stats.openVoteMatchId ? `?match_id=${stats.openVoteMatchId}` : ''}`}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-sm transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #ffd700, #ffb800)', color: '#000', boxShadow: '0 4px 20px rgba(255,215,0,0.25)' }}
              >
                <Star size={16} />
                ¡Votar ahora!
              </Link>
              {isAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={closeVoting}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    Cerrar y guardar MVP
                  </button>
                  <button
                    onClick={notifyVoting}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{ background: 'rgba(68,243,169,0.08)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.15)' }}
                  >
                    Notificar votación
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-3">
              {stats.lastMvpWinner ? (
                <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)' }}>
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center" style={{ background: '#31353c', border: '2px solid #ffd700' }}>
                      {stats.lastMvpWinner.player_photo_url
                        ? <img src={stats.lastMvpWinner.player_photo_url} alt={stats.lastMvpWinner.player_name} className="w-full h-full object-cover" />
                        : <span className="text-xl font-black" style={{ color: 'rgba(255,255,255,0.3)' }}>{stats.lastMvpWinner.player_name.charAt(0)}</span>
                      }
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{ background: '#ffd700' }}>🏆</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#ffd700' }}>MVP de la semana</p>
                    <p className="font-headline font-black text-white text-lg leading-tight truncate">{stats.lastMvpWinner.player_name}</p>
                    <p className="text-[10px] text-white/30">{stats.lastMvpWinner.vote_count} votos</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-6 rounded-xl" style={{ background: 'rgba(0,0,0,0.15)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                  <p className="text-white/30 text-sm text-center">Sin MVPs registrados aún.</p>
                  <p className="text-white/20 text-xs text-center mt-1">Votación abierta de martes a domingo.</p>
                </div>
              )}
              {stats.mvpWinHistory.length > 0 && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Histórico de MVP</p>
                  <div className="space-y-1.5">
                    {stats.mvpWinHistory.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.15)' }}>
                        <span className="text-xs font-black w-4 text-center" style={{ color: RANK_COLORS[i] }}>{i + 1}</span>
                        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-black" style={{ background: '#31353c', color: 'rgba(255,255,255,0.3)' }}>
                          {p.photo_url ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" /> : p.name.charAt(0)}
                        </div>
                        <p className="flex-1 text-xs text-white font-semibold truncate">{p.name}</p>
                        <span className="text-xs font-black" style={{ color: RANK_COLORS[i] }}>{p.count}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Link to="/vote" className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-semibold transition-all" style={{ color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.07)' }}>
                Ver historial <ArrowRight size={11} />
              </Link>
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

      {/* Attendance Modal */}
      {showAttendanceModal && stats.nextMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card w-full max-w-md max-h-[80vh] flex flex-col" style={{ background: '#1c2026' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-headline font-black text-white text-lg">Asistencia Manual</h2>
                <p className="text-xs text-white/40 mt-0.5">{format(new Date(stats.nextMatch.date), 'dd MMM yyyy — HH:mm', { locale: es })}</p>
              </div>
              <button onClick={() => setShowAttendanceModal(false)} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-2 mb-4 text-[10px] font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1 text-soccer-green"><CheckCircle2 size={11} />{attendanceList.filter(p => p.attendanceStatus === 'Voy').length} Voy</span>
              <span className="flex items-center gap-1 text-red-400 ml-3"><XCircle size={11} />{attendanceList.filter(p => p.attendanceStatus === 'No voy').length} No Voy</span>
              <span className="flex items-center gap-1 text-amber-400 ml-3"><Clock size={11} />{attendanceList.filter(p => p.attendanceStatus === 'Pendiente').length} Pendiente</span>
            </div>

            <div className="overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {attendanceLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-7 h-7 rounded-full border-2 border-t-soccer-green animate-spin" />
                </div>
              ) : attendanceList.map(player => (
                <div key={player.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: '#31353c' }}>
                      {player.photo_url ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" /> : player.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">{player.name}</p>
                      {player.nickname && <p className="text-[10px] text-white/30">"{player.nickname}"</p>}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleAttendanceChange(player.id, 'Voy')}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all ${player.attendanceStatus === 'Voy' ? 'bg-soccer-green text-black' : 'bg-soccer-green/10 text-soccer-green/50 hover:bg-soccer-green/20'}`}
                    >Voy</button>
                    <button
                      onClick={() => handleAttendanceChange(player.id, 'No voy')}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all ${player.attendanceStatus === 'No voy' ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-400/50 hover:bg-red-500/20'}`}
                    >No voy</button>
                    {player.attendanceStatus !== 'Pendiente' && (
                      <button
                        onClick={() => handleAttendanceChange(player.id, 'Pendiente')}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-white/5 text-white/30 hover:bg-white/10 transition-all"
                        title="Quitar respuesta"
                      ><X size={10} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
