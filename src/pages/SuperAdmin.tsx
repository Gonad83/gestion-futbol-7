import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
  Users, TrendingUp, DollarSign, Activity, CheckCircle2, XCircle,
  Clock, RefreshCw, Crown, Shield, Calendar, Swords, Star, ChevronUp, ChevronDown
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const SUPER_ADMIN_EMAIL = 'garaosd@gmail.com';

interface Stats {
  totalPlayers: number;
  activePlayers: number;
  inactivePlayers: number;
  totalMatches: number;
  matchesThisMonth: number;
  matchesPrevMonth: number;
  totalIncome: number;
  incomeThisMonth: number;
  incomePrevMonth: number;
  totalExpenses: number;
  expensesThisMonth: number;
  balance: number;
  payersThisMonth: string[];
  adminCount: number;
  captainCount: number;
  subcaptainCount: number;
  avgRating: number;
  teamName: string;
  teamLogo: string;
  recentPlayers: { name: string; created_at: string; status: string; position: string }[];
  paymentsByPlayer: { id: string; name: string; paid: boolean; amount: number }[];
  mvpWinners: { name: string; count: number }[];
}

function StatCard({
  icon, label, value, sub, color = '#44f3a9', trend, trendLabel
}: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
  color?: string; trend?: number; trendLabel?: string;
}) {
  const trendUp = trend !== undefined && trend >= 0;
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{ background: 'rgba(28,32,38,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}12 0%, transparent 70%)`, transform: 'translate(30%,-30%)' }} />
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {trendUp ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-1">{label}</p>
        <p className="font-headline font-black text-3xl text-white leading-none">{value}</p>
        {(sub || trendLabel) && (
          <p className="text-white/30 text-[11px] mt-1.5">{trendLabel || sub}</p>
        )}
      </div>
    </div>
  );
}

export default function SuperAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (user && user.email !== SUPER_ADMIN_EMAIL) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.email === SUPER_ADMIN_EMAIL) loadStats();
  }, [user]);

  const loadStats = async () => {
    setRefreshing(true);
    try {
      const now = new Date();
      const thisMonthStart = startOfMonth(now).toISOString();
      const thisMonthEnd = endOfMonth(now).toISOString();
      const prevMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
      const prevMonthEnd = endOfMonth(subMonths(now, 1)).toISOString();

      const [
        playersRes, matchesRes, matchesThisRes, matchesPrevRes,
        paymentsRes, paymentsThisRes, paymentsPrevRes,
        expensesRes, expensesThisRes,
        teamRes, recentRes, usersRes,
      ] = await Promise.all([
        supabase.from('players').select('id, name, status, position, rating, match_role, created_at, email'),
        supabase.from('matches').select('id, status').eq('status', 'Jugado'),
        supabase.from('matches').select('id').eq('status', 'Jugado').gte('date', thisMonthStart).lte('date', thisMonthEnd),
        supabase.from('matches').select('id').eq('status', 'Jugado').gte('date', prevMonthStart).lte('date', prevMonthEnd),
        supabase.from('payments').select('player_id, amount, status, created_at'),
        supabase.from('payments').select('player_id, amount, status').gte('created_at', thisMonthStart).eq('status', 'Pagado'),
        supabase.from('payments').select('player_id, amount, status').gte('created_at', prevMonthStart).lte('created_at', prevMonthEnd).eq('status', 'Pagado'),
        supabase.from('expenses').select('amount, date'),
        supabase.from('expenses').select('amount').gte('date', thisMonthStart),
        supabase.from('team_settings').select('team_name, logo_url').eq('id', 1).maybeSingle(),
        supabase.from('players').select('name, created_at, status, position').order('created_at', { ascending: false }).limit(6),
        supabase.from('users').select('id, role'),
      ]);

      const players = playersRes.data || [];
      const activePlayers = players.filter(p => p.status === 'Activo');
      const inactivePlayers = players.filter(p => p.status !== 'Activo');
      const avgRating = players.length
        ? +(players.reduce((s, p) => s + (p.rating || 0), 0) / players.length).toFixed(2) : 0;

      const allPaid = (paymentsRes.data || []).filter(p => p.status === 'Pagado');
      const totalIncome = allPaid.reduce((s, p) => s + (p.amount || 0), 0);
      const incomeThis = (paymentsThisRes.data || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const incomePrev = (paymentsPrevRes.data || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const totalExpenses = (expensesRes.data || []).reduce((s, e) => s + (e.amount || 0), 0);
      const expensesThis = (expensesThisRes.data || []).reduce((s: number, e: any) => s + (e.amount || 0), 0);

      const payersThisMonth = [...new Set((paymentsThisRes.data || []).map((p: any) => p.player_id as string))];

      const paymentsByPlayer = players
        .filter(p => p.status === 'Activo')
        .map(p => ({
          id: p.id,
          name: p.name,
          paid: payersThisMonth.includes(p.id),
          amount: (paymentsThisRes.data || [])
            .filter((pay: any) => pay.player_id === p.id)
            .reduce((s: number, pay: any) => s + (pay.amount || 0), 0),
        }))
        .sort((a, b) => (b.paid ? 1 : 0) - (a.paid ? 1 : 0));

      const matchTrend = matchesPrevRes.data?.length
        ? Math.round(((matchesThisRes.data?.length || 0) - matchesPrevRes.data.length) / matchesPrevRes.data.length * 100)
        : 0;
      const incomeTrend = incomePrev
        ? Math.round((incomeThis - incomePrev) / incomePrev * 100) : 0;

      setStats({
        totalPlayers: players.length,
        activePlayers: activePlayers.length,
        inactivePlayers: inactivePlayers.length,
        totalMatches: matchesRes.data?.length || 0,
        matchesThisMonth: matchesThisRes.data?.length || 0,
        matchesPrevMonth: matchesPrevRes.data?.length || 0,
        totalIncome,
        incomeThisMonth: incomeThis,
        incomePrevMonth: incomePrev,
        totalExpenses,
        expensesThisMonth: expensesThis,
        balance: totalIncome - totalExpenses,
        payersThisMonth,
        adminCount: (usersRes.data || []).filter((u: any) => u.role === 'admin').length,
        captainCount: players.filter(p => p.match_role === 'captain').length,
        subcaptainCount: players.filter(p => p.match_role === 'subcaptain').length,
        avgRating,
        teamName: teamRes.data?.team_name || '',
        teamLogo: teamRes.data?.logo_url || '',
        recentPlayers: recentRes.data || [],
        paymentsByPlayer,
        mvpWinners: [],
        ...(matchTrend !== undefined ? { _matchTrend: matchTrend } : {}),
        ...(incomeTrend !== undefined ? { _incomeTrend: incomeTrend } : {}),
      } as any);

      setLastUpdated(new Date());
    } catch (e) {
      console.error('SuperAdmin stats error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (!user || user.email !== SUPER_ADMIN_EMAIL) return null;

  const compliancePct = stats && stats.activePlayers > 0
    ? Math.round((stats.payersThisMonth.length / stats.activePlayers) * 100) : 0;

  const incomeChange = stats
    ? stats.incomePrevMonth ? Math.round((stats.incomeThisMonth - stats.incomePrevMonth) / stats.incomePrevMonth * 100) : 0
    : 0;
  const matchChange = stats
    ? stats.matchesPrevMonth ? Math.round((stats.matchesThisMonth - stats.matchesPrevMonth) / stats.matchesPrevMonth * 100) : 0
    : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.15)' }}>
              <Crown size={16} className="text-amber-400" />
            </div>
            <span className="text-amber-400 text-xs font-bold uppercase tracking-widest">Super Admin</span>
          </div>
          <h1 className="font-headline font-black text-3xl text-white">Panel de Control</h1>
          <p className="text-white/30 text-sm mt-1">
            {stats?.teamName || 'Club Pro'} · Vista exclusiva del propietario
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-white/20 text-xs">
              Actualizado {format(lastUpdated, 'HH:mm')}
            </span>
          )}
          <button
            onClick={loadStats}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: '#44f3a9' }} />
        </div>
      ) : stats ? (
        <>
          {/* Top KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Users size={16} />}
              label="Jugadores totales"
              value={stats.totalPlayers}
              sub={`${stats.activePlayers} activos · ${stats.inactivePlayers} inactivos`}
              color="#44f3a9"
            />
            <StatCard
              icon={<Swords size={16} />}
              label="Partidos jugados"
              value={stats.totalMatches}
              trend={matchChange}
              trendLabel={`${stats.matchesThisMonth} este mes`}
              color="#9acbff"
            />
            <StatCard
              icon={<DollarSign size={16} />}
              label="Ingresos totales"
              value={`$${stats.totalIncome.toLocaleString('es-CL')}`}
              trend={incomeChange}
              trendLabel={`$${stats.incomeThisMonth.toLocaleString('es-CL')} este mes`}
              color="#ffd08b"
            />
            <StatCard
              icon={<TrendingUp size={16} />}
              label="Balance neto"
              value={`$${stats.balance.toLocaleString('es-CL')}`}
              sub={`Gastos: $${stats.totalExpenses.toLocaleString('es-CL')}`}
              color={stats.balance >= 0 ? '#44f3a9' : '#f87171'}
            />
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Star size={16} />} label="Rating promedio" value={`${stats.avgRating}★`} sub="del plantel" color="#ffd08b" />
            <StatCard icon={<Shield size={16} />} label="Capitanes" value={stats.captainCount} sub={`${stats.subcaptainCount} subcapitanes`} color="#c084fc" />
            <StatCard icon={<Activity size={16} />} label="Gastos este mes" value={`$${stats.expensesThisMonth.toLocaleString('es-CL')}`} color="#f87171" />
            <StatCard icon={<Calendar size={16} />} label="Partidos este mes" value={stats.matchesThisMonth} sub={`vs ${stats.matchesPrevMonth} el mes pasado`} color="#9acbff" />
          </div>

          {/* Payment Compliance + Recent Players */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Payment Compliance */}
            <div className="rounded-2xl p-6" style={{ background: 'rgba(28,32,38,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-headline font-bold text-white text-lg">Cuotas del Mes</h3>
                  <p className="text-white/30 text-xs mt-0.5">{format(new Date(), 'MMMM yyyy', { locale: es })}</p>
                </div>
                <div className="text-right">
                  <p className="font-headline font-black text-2xl" style={{ color: compliancePct >= 70 ? '#44f3a9' : compliancePct >= 40 ? '#ffd08b' : '#f87171' }}>
                    {compliancePct}%
                  </p>
                  <p className="text-white/30 text-xs">{stats.payersThisMonth.length}/{stats.activePlayers} pagaron</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full mb-5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${compliancePct}%`,
                    background: compliancePct >= 70
                      ? 'linear-gradient(90deg, #44f3a9, #00d68f)'
                      : compliancePct >= 40
                      ? 'linear-gradient(90deg, #ffd08b, #f59e0b)'
                      : 'linear-gradient(90deg, #f87171, #ef4444)',
                  }}
                />
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {stats.paymentsByPlayer.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${p.paid ? 'bg-emerald-500/15' : 'bg-red-500/10'}`}>
                      {p.paid
                        ? <CheckCircle2 size={13} className="text-emerald-400" />
                        : <XCircle size={13} className="text-red-400/70" />}
                    </div>
                    <span className="text-white/70 text-sm font-medium flex-1 truncate">{p.name}</span>
                    {p.paid && p.amount > 0 && (
                      <span className="text-emerald-400 text-xs font-bold">${p.amount.toLocaleString('es-CL')}</span>
                    )}
                    {!p.paid && (
                      <span className="text-red-400/50 text-[10px] font-semibold uppercase tracking-wide">pendiente</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Joins + Team Health */}
            <div className="flex flex-col gap-5">
              {/* Recent players */}
              <div className="rounded-2xl p-6 flex-1" style={{ background: 'rgba(28,32,38,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="font-headline font-bold text-white text-lg mb-4">Últimos Ingresos</h3>
                <div className="space-y-2">
                  {stats.recentPlayers.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white/60 flex-shrink-0"
                        style={{ background: 'rgba(68,243,169,0.1)', border: '1px solid rgba(68,243,169,0.15)' }}>
                        {p.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 text-sm font-semibold truncate">{p.name}</p>
                        <p className="text-white/30 text-[11px]">{p.position || '—'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'Activo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
                          {p.status}
                        </div>
                        <p className="text-white/20 text-[10px] mt-0.5">
                          {format(new Date(p.created_at), 'd MMM', { locale: es })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team health summary */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(28,32,38,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="font-headline font-bold text-white text-base mb-4">Estado del Equipo</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Activos', value: stats.activePlayers, color: '#44f3a9' },
                    { label: 'Inactivos', value: stats.inactivePlayers, color: '#f87171' },
                    { label: 'Rating ★', value: stats.avgRating, color: '#ffd08b' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p className="font-headline font-black text-xl" style={{ color }}>{value}</p>
                      <p className="text-white/30 text-[10px] mt-0.5 uppercase tracking-wide">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Owner badge */}
          <div className="rounded-2xl px-6 py-4 flex items-center gap-4"
            style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.06) 0%, rgba(251,191,36,0.02) 100%)', border: '1px solid rgba(251,191,36,0.15)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.15)' }}>
              <Crown size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-amber-300 font-bold text-sm">Gonzalo Araos · Propietario de la plataforma</p>
              <p className="text-white/25 text-xs">{SUPER_ADMIN_EMAIL} · Acceso total a todos los equipos y datos</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-xs font-semibold">Online</span>
            </div>
          </div>
        </>
      ) : (
        <p className="text-white/30 text-center py-20">No se pudieron cargar las estadísticas.</p>
      )}
    </div>
  );
}
