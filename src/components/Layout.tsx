import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, Users, CalendarDays, Calculator, LogOut, Menu, X, ShieldAlert, Settings,
  UserCircle, Globe, Crown, Zap, Trophy, Shield, UserCog, type LucideIcon,
} from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { esSuperAdmin } from '../lib/config';
import { diasParaVencer, planVigente } from '../lib/plan';
import { ErrorBoundary } from './ErrorBoundary';

type NavTone = 'default' | 'admin' | 'super';

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  tone?: NavTone;
}

/** Colores del ítem activo según a quién pertenece la sección. */
const ACTIVE_TONE: Record<NavTone, { item: string; bar: string }> = {
  default: { item: 'bg-soccer-green/10 ring-1 ring-inset ring-soccer-green/20 text-white', bar: 'bg-soccer-green' },
  admin: { item: 'bg-violet-500/10 ring-1 ring-inset ring-violet-500/20 text-violet-200', bar: 'bg-violet-400' },
  super: { item: 'bg-amber-400/10 ring-1 ring-inset ring-amber-400/25 text-amber-200', bar: 'bg-amber-400' },
};

/** Las cuatro pantallas de uso diario: van en la barra inferior del celular. */
const TAB_ITEMS: NavItem[] = [
  { name: 'Inicio', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Caja', path: '/finance', icon: Calculator },
  { name: 'Plantilla', path: '/players', icon: Users },
  { name: 'Calendario', path: '/calendar', icon: CalendarDays },
];

export default function Layout() {
  const { isAdmin, setIsAdmin, user, teamId } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoZoomed, setIsLogoZoomed] = useState(false);
  const [teamSettings, setTeamSettings] = useState({ team_name: '', logo_url: '', join_code: '', plan: '', planGuardado: '', tier: '', venceEl: '' });

  useEffect(() => {
    if (!teamId) return;
    const fetchTeamSettings = async () => {
      try {
        const { data } = await supabase
          .from('team_settings')
          .select('*')
          .eq('id', teamId)
          .maybeSingle();
        if (data) {
          setTeamSettings({
            team_name: data.team_name,
            logo_url: data.logo_url || '',
            join_code: data.join_code || '',
            // plan es el que rige hoy; planGuardado, el que se pagó (sirve para ofrecer la renovación).
            plan: planVigente(data.plan, data.plan_expires_at),
            planGuardado: data.plan || 'free',
            tier: data.tier || '',
            venceEl: data.plan_expires_at || '',
          });
        }
      } catch (e) {
        console.error('Error fetching team settings:', e);
      }
    };
    fetchTeamSettings();
  }, [teamId]);

  // Renovación: se avisa desde 7 días antes del vencimiento y mientras el plan siga vencido.
  const diasPlan = teamSettings.planGuardado !== 'free' ? diasParaVencer(teamSettings.venceEl || null) : null;
  const avisoRenovacion = isAdmin && !esSuperAdmin(user?.email) && diasPlan !== null && diasPlan <= 7;
  const enlaceRenovar = `/checkout?${new URLSearchParams({
    plan: teamSettings.tier === 'elite' ? 'elite' : 'pro',
    cycle: teamSettings.planGuardado === 'annual' ? 'anual' : 'mensual',
    email: user?.email || '',
    team: teamSettings.team_name,
  })}`;

  // Con el menú o el logo abiertos, Escape los cierra.
  useEffect(() => {
    if (!isMobileMenuOpen && !isLogoZoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsLogoZoomed(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobileMenuOpen, isLogoZoomed]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isSuperAdmin = esSuperAdmin(user?.email);

  const navItems: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Caja', path: '/finance', icon: Calculator },
    { name: 'Plantilla', path: '/players', icon: Users },
    { name: 'Calendario', path: '/calendar', icon: CalendarDays },
    { name: 'Matchmaking', path: '/matchmaking', icon: ShieldAlert },
    { name: 'Inter Generaciones', path: '/inter-generaciones', icon: Trophy },
    ...(isSuperAdmin ? [{ name: 'Arena', path: '/arena', icon: Globe }] : []),
    { name: 'Mi Perfil', path: '/profile', icon: UserCircle },
    ...(isAdmin ? [
      { name: 'Admin', path: '/admin', icon: UserCog, tone: 'admin' as const },
      { name: 'Configuración', path: '/settings', icon: Settings, tone: 'admin' as const },
    ] : []),
    ...(isSuperAdmin ? [{ name: 'Super Admin', path: '/superadmin', icon: Crown, tone: 'super' as const }] : []),
  ];

  const enTabPrincipal = TAB_ITEMS.some((t) => t.path === location.pathname);
  const logoClickable = Boolean(teamSettings.logo_url);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-dark-bg">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[110] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-soccer-green focus:text-[#003822] focus:font-bold"
      >
        Saltar al contenido
      </a>

      {/* Barra superior (celular) */}
      <header className="md:hidden flex items-center justify-between px-4 h-[57px] z-50 sticky top-0 bg-surface-lowest/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            disabled={!logoClickable}
            onClick={() => setIsLogoZoomed(true)}
            aria-label="Ver escudo del equipo"
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center overflow-hidden bg-soccer-green/15 border-[1.5px] border-soccer-green/40 text-soccer-green"
          >
            {teamSettings.logo_url ? (
              <img src={teamSettings.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Shield size={16} />
            )}
          </button>
          <span className="font-headline font-bold text-lg tracking-tight text-white truncate">{teamSettings.team_name}</span>
        </div>
        <Link
          to="/profile"
          aria-label="Mi perfil"
          className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full text-white/60 hover:text-white transition-colors"
        >
          <UserCircle size={22} />
        </Link>
      </header>

      {/* Menú lateral: fijo en escritorio, cajón en celular */}
      <aside
        id="menu-lateral"
        aria-label="Menú principal"
        className={cn(
          'fixed md:static left-0 z-30 w-64 flex flex-col bg-surface-lowest border-r border-white/5',
          'top-[57px] bottom-[calc(4rem+env(safe-area-inset-bottom))] md:top-auto md:bottom-auto md:h-screen',
          'transition-[transform,visibility] duration-300 ease-out md:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full invisible md:visible',
        )}
      >
        {/* Escudo y nombre */}
        <div className="hidden md:flex flex-col items-center gap-5 px-6 py-10 relative">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_0%,rgba(68,243,169,0.08)_0%,transparent_70%)]" />

          <button
            type="button"
            disabled={!logoClickable}
            onClick={() => setIsLogoZoomed(true)}
            aria-label="Ver escudo del equipo"
            className="relative w-24 h-24 rounded-full flex items-center justify-center bg-surface/80 border-2 border-soccer-green/25 text-soccer-green/60 shadow-[0_0_40px_rgba(68,243,169,0.08)] transition-transform duration-300 enabled:hover:scale-105"
          >
            <span className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
              {teamSettings.logo_url ? (
                <img src={teamSettings.logo_url} alt="" className="w-full h-full object-cover scale-110" />
              ) : (
                <Shield size={36} strokeWidth={1.5} />
              )}
            </span>
            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black bg-soccer-green text-[#003822] border-[2.5px] border-surface-lowest">
              FC
            </span>
          </button>

          <div className="text-center relative z-10">
            <h2 className="font-headline font-black text-xl tracking-tight text-white uppercase">{teamSettings.team_name || ''}</h2>
            <div className="h-px w-12 mx-auto mt-3 rounded-full bg-gradient-to-r from-transparent via-soccer-green/50 to-transparent" />
            {user?.email && (
              <p className="text-[11px] text-white/45 mt-2 truncate max-w-[180px] font-medium" title={user.email}>
                {user.email}
              </p>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar" aria-label="Secciones">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50 px-3 mb-3">Navegación</p>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const tone = item.tone ?? 'default';
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 relative overflow-hidden',
                  isActive ? ACTIVE_TONE[tone].item : 'text-white/55 hover:text-white hover:bg-white/[0.04]',
                )}
              >
                {isActive && (
                  <span className={cn('absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full', ACTIVE_TONE[tone].bar)} />
                )}
                <Icon size={18} className="shrink-0" />
                <span className="font-body font-semibold text-sm tracking-tight">{item.name}</span>
                {tone === 'super' && !isActive && (
                  <span className="ml-auto text-amber-500/70 text-[11px] font-bold uppercase tracking-widest">owner</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Plan pagado por vencer o vencido: se ofrece renovar el mismo plan */}
        {avisoRenovacion && (
          <div className="mx-3 mb-2 p-3 rounded-xl bg-gradient-to-br from-neon-gold/10 to-neon-gold/5 border border-neon-gold/25">
            <p className="text-[11px] font-black uppercase tracking-widest text-neon-gold mb-1">
              {diasPlan! <= 0 ? 'Tu plan venció' : diasPlan === 1 ? 'Tu plan vence mañana' : `Tu plan vence en ${diasPlan} días`}
            </p>
            <p className="text-[11px] text-white/55 mb-2 leading-snug">
              {diasPlan! <= 0 ? 'El equipo volvió a los límites del plan gratis. Tus datos siguen guardados.' : 'Renueva para no volver a los límites del plan gratis.'}
            </p>
            <Link
              to={enlaceRenovar}
              className="flex items-center justify-center gap-1 text-[11px] font-black py-2 px-3 rounded-lg uppercase tracking-wider transition hover:brightness-110 active:scale-95 bg-gradient-to-br from-neon-gold to-[#ffb830] text-[#1a0e00]"
            >
              <Zap size={11} />
              Renovar plan
            </Link>
          </div>
        )}

        {/* Aviso de plan gratuito (no se muestra al dueño de la plataforma) */}
        {isAdmin && teamSettings.plan === 'free' && !isSuperAdmin && !avisoRenovacion && (
          <div className="mx-3 mb-2 p-3 rounded-xl bg-gradient-to-br from-neon-gold/10 to-neon-gold/5 border border-neon-gold/25">
            <div className="flex items-center gap-1.5 mb-1 text-neon-gold">
              <Zap size={12} />
              <p className="text-[11px] font-black uppercase tracking-widest">Plan Gratuito</p>
            </div>
            <p className="text-[11px] text-white/55 mb-2 leading-snug">Actualiza para desbloquear todas las funciones del club.</p>
            <Link
              to="/#pricing"
              className="flex items-center justify-center gap-1 text-[11px] font-black py-2 px-3 rounded-lg uppercase tracking-wider transition hover:brightness-110 active:scale-95 bg-gradient-to-br from-neon-gold to-[#ffb830] text-[#1a0e00]"
            >
              <Zap size={11} />
              Ver planes
            </Link>
          </div>
        )}

        <div className="p-4 border-t border-white/5">
          {isSuperAdmin ? (
            <button
              type="button"
              onClick={() => setIsAdmin(!isAdmin)}
              title="Alternar entre vista de capitán y de jugador"
              className="mb-3 w-full text-left px-4 py-3 rounded-xl transition-colors hover:bg-white/5"
            >
              <RangoActual isAdmin={isAdmin} />
            </button>
          ) : (
            <div className="mb-3 px-4 py-3">
              <RangoActual isAdmin={isAdmin} />
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-red-400/80 hover:text-red-400 rounded-xl transition-colors duration-200 hover:bg-red-500/10"
          >
            <LogOut size={16} />
            <span className="font-body font-semibold text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Fondo oscuro detrás del cajón (celular) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 md:hidden bg-black/60 backdrop-blur-sm"
          aria-hidden="true"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <main
        id="contenido"
        className="flex-1 w-full overflow-y-auto relative p-4 md:p-8 h-[calc(100dvh-57px)] md:h-screen pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8"
      >
        <div className="max-w-7xl mx-auto">
          {/* Al cambiar de pantalla se queda el menú: solo el contenido espera
              a que baje la pantalla nueva. Un error en una pantalla tampoco
              tumba el menú, y al navegar a otra se limpia. */}
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-soccer-green" /></div>}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      {/* Barra inferior (celular): lo de todos los días a un toque del pulgar.
          Va en z-40 para que los modales de las pantallas (z-50) la tapen. */}
      <nav
        aria-label="Navegación rápida"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-lowest/95 backdrop-blur-xl border-t border-white/[0.06] pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-5 h-16">
          {TAB_ITEMS.map((item) => {
            const isActive = !isMobileMenuOpen && location.pathname === item.path;
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'relative h-full flex flex-col items-center justify-center gap-1 transition-colors duration-200',
                    isActive ? 'text-soccer-green' : 'text-white/55 active:text-white',
                  )}
                >
                  {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-soccer-green" />}
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                  <span className="text-[11px] font-semibold leading-none">{item.name}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-expanded={isMobileMenuOpen}
              aria-controls="menu-lateral"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className={cn(
                'relative w-full h-full flex flex-col items-center justify-center gap-1 transition-colors duration-200',
                isMobileMenuOpen || !enTabPrincipal ? 'text-soccer-green' : 'text-white/55 active:text-white',
              )}
            >
              {(isMobileMenuOpen || !enTabPrincipal) && <span className="absolute top-0 h-0.5 w-8 rounded-b-full bg-soccer-green" />}
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              <span className="text-[11px] font-semibold leading-none">{isMobileMenuOpen ? 'Cerrar' : 'Más'}</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Escudo ampliado */}
      {isLogoZoomed && teamSettings.logo_url && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Escudo del equipo"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 fade-in bg-black/90 backdrop-blur-xl"
          onClick={() => setIsLogoZoomed(false)}
        >
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full text-white/60 hover:text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setIsLogoZoomed(false); }}
          >
            <X size={32} strokeWidth={1.5} />
          </button>
          <div
            className="relative max-w-xl w-full aspect-square overflow-hidden scale-in rounded-[2.5rem] border border-soccer-green/15"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-soccer-green/[0.06] to-transparent" />
            <img src={teamSettings.logo_url} alt={`Escudo de ${teamSettings.team_name}`} className="w-full h-full object-contain p-10" />
          </div>
        </div>
      )}
    </div>
  );
}

function RangoActual({ isAdmin }: { isAdmin: boolean }) {
  return (
    <>
      <p className="text-[11px] text-white/50 font-bold uppercase tracking-[0.2em] mb-1.5">Tu Rango</p>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            isAdmin ? 'bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.8)]' : 'bg-soccer-green shadow-[0_0_6px_rgba(68,243,169,0.8)]',
          )}
        />
        <p className={cn('text-xs font-bold uppercase tracking-wider', isAdmin ? 'text-violet-400' : 'text-soccer-green')}>
          {isAdmin ? 'Capitán' : 'Jugador'}
        </p>
      </div>
    </>
  );
}
