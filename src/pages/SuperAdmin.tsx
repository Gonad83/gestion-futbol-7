import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
  Crown, RefreshCw, Users, TrendingUp, DollarSign,
  Clock, Shield, Building2, Zap, Star
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const SUPER_ADMIN_EMAIL = 'garaosd@gmail.com';

const PRICE_MONTHLY = 4990;
const PRICE_ANNUAL_YEAR = 29940;
const PRICE_ANNUAL_MONTH = 2495;

const PLAN_META: Record<string, { label: string; color: string; bg: string; price: number; period: string }> = {
  free:    { label: 'Prueba',  color: '#ffffff50', bg: 'rgba(255,255,255,0.06)', price: 0, period: '' },
  monthly: { label: 'Mensual', color: '#9acbff',   bg: 'rgba(154,203,255,0.1)', price: PRICE_MONTHLY, period: '/mes' },
  annual:  { label: 'Anual',   color: '#44f3a9',   bg: 'rgba(68,243,169,0.1)',  price: PRICE_ANNUAL_MONTH, period: '/mes' },
};

interface Team {
  id: number;
  team_name: string;
  join_code: string;
  plan: string;
  created_at: string;
  logo_url?: string;
  captain_name?: string;
  captain_email?: string;
  player_count?: number;
}

interface PlatformStats {
  totalTeams: number;
  payingTeams: number;
  freeTeams: number;
  monthlyTeams: number;
  annualTeams: number;
  mrr: number;
  arr: number;
  conversionRate: number;
  teams: Team[];
  captains: { name: string; email: string; team: string; plan: string }[];
}

function KpiCard({
  icon, label, value, sub, color = '#44f3a9', badge
}: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
  color?: string; badge?: string;
}) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{ background: 'rgba(28,32,38,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="absolute top-0 right-0 w-28 h-28 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}14 0%, transparent 70%)`, transform: 'translate(35%,-35%)' }} />
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {badge && (
          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: `${color}18`, color }}>
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-white/35 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
        <p className="font-headline font-black text-3xl text-white leading-none">{value}</p>
        {sub && <p className="text-white/30 text-[11px] mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const meta = PLAN_META[plan] || PLAN_META.free;
  return (
    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
      style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}>
      {meta.label}
    </span>
  );
}

export default function SuperAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (user && user.email !== SUPER_ADMIN_EMAIL) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (user?.email === SUPER_ADMIN_EMAIL) loadStats();
  }, [user]);

  const loadStats = async () => {
    setRefreshing(true);
    try {
      // All registered teams (all rows in team_settings)
      const { data: teams } = await supabase
        .from('team_settings')
        .select('id, team_name, join_code, plan, created_at, logo_url')
        .order('created_at', { ascending: false });

      // All admin players (captains)
      const { data: captains } = await supabase
        .from('players')
        .select('name, email, position, status')
        .or('is_admin.eq.true,position.eq.Capitán');

      // Count players per team — approximate: total players in single-tenant
      // In future multi-tenant this would be grouped by team_id
      const { count: totalPlayers } = await supabase
        .from('players')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Activo');

      const allTeams: Team[] = (teams || []).map((t, i) => ({
        ...t,
        plan: t.plan || 'free',
        captain_name: captains?.[i]?.name,
        captain_email: captains?.[i]?.email,
        player_count: i === 0 ? (totalPlayers || 0) : undefined,
      }));

      const freeTeams     = allTeams.filter(t => !t.plan || t.plan === 'free').length;
      const monthlyTeams  = allTeams.filter(t => t.plan === 'monthly').length;
      const annualTeams   = allTeams.filter(t => t.plan === 'annual').length;
      const payingTeams   = monthlyTeams + annualTeams;
      const mrr           = monthlyTeams * PRICE_MONTHLY + annualTeams * PRICE_ANNUAL_MONTH;
      const arr           = mrr * 12;
      const conversionRate = allTeams.length > 0 ? Math.round((payingTeams / allTeams.length) * 100) : 0;

      setStats({
        totalTeams: allTeams.length,
        payingTeams,
        freeTeams,
        monthlyTeams,
        annualTeams,
        mrr,
        arr,
        conversionRate,
        teams: allTeams,
        captains: (captains || []).map((c, i) => ({
          name: c.name,
          email: c.email,
          team: allTeams[i]?.team_name || '—',
          plan: allTeams[i]?.plan || 'free',
        })),
      });

      setLastUpdated(new Date());
    } catch (e) {
      console.error('SuperAdmin error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (!user || user.email !== SUPER_ADMIN_EMAIL) return null;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crown size={14} className="text-amber-400" />
            <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest">Propietario · Club Pro</span>
          </div>
          <h1 className="font-headline font-black text-3xl text-white">Estadísticas de Plataforma</h1>
          <p className="text-white/25 text-sm mt-0.5">Equipos suscritos · Ingresos · Capitanes</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-white/20 text-xs">
              {format(lastUpdated, "d MMM · HH:mm", { locale: es })}
            </span>
          )}
          <button onClick={loadStats} disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: 'rgba(68,243,169,0.08)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-40">
          <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
            style={{ borderTopColor: '#44f3a9' }} />
        </div>
      ) : stats ? (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={<Building2 size={16} />}
              label="Equipos registrados"
              value={stats.totalTeams}
              sub={`${stats.payingTeams} de pago · ${stats.freeTeams} en prueba`}
              color="#9acbff"
            />
            <KpiCard
              icon={<DollarSign size={16} />}
              label="MRR"
              value={`$${stats.mrr.toLocaleString('es-CL')}`}
              sub="Ingreso mensual recurrente"
              color="#44f3a9"
              badge="mes"
            />
            <KpiCard
              icon={<TrendingUp size={16} />}
              label="ARR"
              value={`$${stats.arr.toLocaleString('es-CL')}`}
              sub="Ingreso anual proyectado"
              color="#ffd08b"
              badge="año"
            />
            <KpiCard
              icon={<Zap size={16} />}
              label="Conversión"
              value={`${stats.conversionRate}%`}
              sub={`${stats.payingTeams} equipos pagan · ${stats.freeTeams} gratis`}
              color={stats.conversionRate >= 60 ? '#44f3a9' : stats.conversionRate >= 30 ? '#ffd08b' : '#f87171'}
            />
          </div>

          {/* Plan breakdown + Teams list */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Plan breakdown */}
            <div className="rounded-2xl p-6 space-y-4"
              style={{ background: 'rgba(28,32,38,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="font-headline font-bold text-white text-lg">Planes activos</h3>

              {/* Free */}
              <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <Clock size={14} className="text-white/40" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm font-semibold">Prueba gratis</p>
                    <p className="text-white/25 text-[10px]">$0 · Sin cobro</p>
                  </div>
                </div>
                <span className="font-headline font-black text-2xl text-white/40">{stats.freeTeams}</span>
              </div>

              {/* Monthly */}
              <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ background: 'rgba(154,203,255,0.07)', border: '1px solid rgba(154,203,255,0.15)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(154,203,255,0.12)' }}>
                    <Shield size={14} style={{ color: '#9acbff' }} />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm font-semibold">Plan Mensual</p>
                    <p className="text-[10px]" style={{ color: '#9acbff80' }}>
                      ${PRICE_MONTHLY.toLocaleString('es-CL')}/mes
                      {stats.monthlyTeams > 0 && ` · $${(stats.monthlyTeams * PRICE_MONTHLY).toLocaleString('es-CL')} MRR`}
                    </p>
                  </div>
                </div>
                <span className="font-headline font-black text-2xl" style={{ color: '#9acbff' }}>{stats.monthlyTeams}</span>
              </div>

              {/* Annual */}
              <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ background: 'rgba(68,243,169,0.07)', border: '1px solid rgba(68,243,169,0.2)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(68,243,169,0.12)' }}>
                    <Star size={14} style={{ color: '#44f3a9' }} />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm font-semibold">Plan Anual</p>
                    <p className="text-[10px]" style={{ color: '#44f3a980' }}>
                      ${PRICE_ANNUAL_MONTH.toLocaleString('es-CL')}/mes · 50% OFF
                      {stats.annualTeams > 0 && ` · $${(stats.annualTeams * PRICE_ANNUAL_YEAR).toLocaleString('es-CL')}/año`}
                    </p>
                  </div>
                </div>
                <span className="font-headline font-black text-2xl" style={{ color: '#44f3a9' }}>{stats.annualTeams}</span>
              </div>

              {/* Revenue summary */}
              <div className="pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/30">MRR total</span>
                  <span className="text-white font-bold">${stats.mrr.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/30">ARR proyectado</span>
                  <span className="font-bold" style={{ color: '#44f3a9' }}>${stats.arr.toLocaleString('es-CL')}</span>
                </div>
              </div>
            </div>

            {/* Teams list */}
            <div className="lg:col-span-2 rounded-2xl p-6"
              style={{ background: 'rgba(28,32,38,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline font-bold text-white text-lg">Equipos registrados</h3>
                <span className="text-white/25 text-xs">{stats.teams.length} equipos</span>
              </div>

              {stats.teams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-white/20">
                  <Building2 size={32} strokeWidth={1} className="mb-3" />
                  <p className="text-sm">Sin equipos registrados aún</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {stats.teams.map((team) => (
                    <div key={team.id}
                      className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group/team"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>

                      {/* Logo or initial */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={{ background: 'rgba(68,243,169,0.08)', border: '1px solid rgba(68,243,169,0.15)' }}>
                        {team.logo_url
                          ? <img src={team.logo_url} alt="" className="w-full h-full object-cover" />
                          : <span className="font-black text-sm text-white/50">{team.team_name?.charAt(0) || '?'}</span>}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{team.team_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-white/25 text-[10px] font-mono">{team.join_code}</span>
                          {team.player_count !== undefined && (
                            <span className="text-white/20 text-[10px]">· {team.player_count} jugadores</span>
                          )}
                        </div>
                      </div>

                      {/* Plan */}
                      <PlanBadge plan={team.plan} />

                      {/* Date */}
                      <div className="text-right flex-shrink-0 hidden sm:block">
                        <p className="text-white/25 text-[10px]">
                          {team.created_at
                            ? format(new Date(team.created_at), "d MMM yy", { locale: es })
                            : '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Captains */}
          <div className="rounded-2xl p-6"
            style={{ background: 'rgba(28,32,38,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(192,132,252,0.12)' }}>
                <Users size={14} className="text-purple-400" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-white text-lg leading-none">Capitanes</h3>
                <p className="text-white/25 text-[10px] mt-0.5">Administradores de cada equipo</p>
              </div>
              <span className="ml-auto text-purple-400 font-black text-lg">{stats.captains.length}</span>
            </div>

            {stats.captains.length === 0 ? (
              <p className="text-white/20 text-center py-10 text-sm">No se encontraron capitanes</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.captains.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm"
                      style={{ background: 'rgba(192,132,252,0.12)', color: '#c084fc' }}>
                      {c.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-sm font-semibold truncate">{c.name}</p>
                      <p className="text-white/25 text-[10px] truncate">{c.email}</p>
                    </div>
                    <PlanBadge plan={c.plan} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="rounded-2xl px-6 py-4 flex flex-wrap items-center gap-4"
            style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.05) 0%, rgba(251,191,36,0.02) 100%)', border: '1px solid rgba(251,191,36,0.12)' }}>
            <Crown size={16} className="text-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-amber-300 font-bold text-sm">Gonzalo Araos · Propietario de Club Pro</p>
              <p className="text-white/20 text-[10px]">{SUPER_ADMIN_EMAIL} · Acceso total a estadísticas de plataforma</p>
            </div>
            <div className="flex items-center gap-5 flex-shrink-0">
              {[
                { label: 'Equipos', value: stats.totalTeams, color: '#9acbff' },
                { label: 'Pagando', value: stats.payingTeams, color: '#44f3a9' },
                { label: 'MRR', value: `$${stats.mrr.toLocaleString('es-CL')}`, color: '#ffd08b' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className="font-headline font-black text-base" style={{ color }}>{value}</p>
                  <p className="text-white/20 text-[9px] uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="text-white/30 text-center py-20">No se pudieron cargar las estadísticas.</p>
      )}
    </div>
  );
}
