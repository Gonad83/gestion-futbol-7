import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, Users, CalendarDays, Calculator, LogOut, Menu, X, ShieldAlert, Settings, UserCircle, Globe, Crown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

const SUPER_ADMIN_EMAIL = 'garaosd@gmail.com';

export default function Layout() {
  const { isAdmin, setIsAdmin, user, teamId } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoZoomed, setIsLogoZoomed] = useState(false);
  const [teamSettings, setTeamSettings] = useState({ team_name: '', logo_url: '', join_code: '' });

  useEffect(() => {
    if (!teamId) return;
    const fetchTeamSettings = async () => {
      try {
        const { data } = await supabase.from('team_settings').select('*').eq('id', teamId).maybeSingle();
        if (data) {
          setTeamSettings({ 
            team_name: data.team_name, 
            logo_url: data.logo_url || '',
            join_code: data.join_code || ''
          });
        }
      } catch (e) {
        console.error('Error fetching team settings:', e);
      }
    };
    fetchTeamSettings();
  }, [teamId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Caja', path: '/finance', icon: <Calculator size={18} /> },
    { name: 'Plantilla', path: '/players', icon: <Users size={18} /> },
    { name: 'Calendario', path: '/calendar', icon: <CalendarDays size={18} /> },
    { name: 'Matchmaking', path: '/matchmaking', icon: <ShieldAlert size={18} /> },
    ...(isSuperAdmin ? [{ name: 'Arena', path: '/arena', icon: <Globe size={18} /> }] : []),
    { name: 'Mi Perfil', path: '/profile', icon: <UserCircle size={18} /> },
    ...(isAdmin ? [
      { name: 'Admin', path: '/admin', icon: <Users size={18} />, adminOnly: true },
      { name: 'Configuración', path: '/settings', icon: <Settings size={18} />, adminOnly: true }
    ] : []),
    ...(isSuperAdmin ? [{ name: 'Super Admin', path: '/superadmin', icon: <Crown size={18} />, superOnly: true }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: '#10141a' }}>
      {/* Mobile Navbar */}
      <div
        className="md:hidden flex items-center justify-between px-5 py-4 z-50 sticky top-0"
        style={{ background: 'rgba(10, 14, 20, 0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden cursor-pointer"
            style={{ background: 'rgba(68, 243, 169, 0.15)', border: '1.5px solid rgba(68, 243, 169, 0.4)' }}
            onClick={() => teamSettings.logo_url && setIsLogoZoomed(true)}
          >
            {teamSettings.logo_url ? (
              <img src={teamSettings.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : null}
          </div>
          <span className="font-headline font-bold text-lg tracking-tight text-white">{teamSettings.team_name}</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white/60 hover:text-white transition-colors">
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-40 w-64 flex flex-col transform transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0 mt-[57px] md:mt-0 h-[calc(100vh-57px)] md:h-auto" : "-translate-x-full h-screen md:h-auto"
      )}
        style={{ background: '#0a0e14', borderRight: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Logo Section */}
        <div className="hidden md:flex flex-col items-center gap-5 px-6 py-10 relative">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(68,243,169,0.08) 0%, transparent 70%)' }} />

          <div
            className="relative w-24 h-24 rounded-full flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-500 hover:scale-105"
            style={{
              background: 'rgba(28, 32, 38, 0.8)',
              border: '2px solid rgba(68, 243, 169, 0.25)',
              boxShadow: '0 0 40px rgba(68, 243, 169, 0.08), inset 0 1px 0 rgba(255,255,255,0.05)'
            }}
            onClick={() => teamSettings.logo_url && setIsLogoZoomed(true)}
          >
            {teamSettings.logo_url ? (
              <img src={teamSettings.logo_url} alt="Logo" className="w-full h-full object-cover scale-110" />
            ) : null}
            <div
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black"
              style={{ background: '#44f3a9', color: '#003822', border: '2.5px solid #0a0e14' }}
            >
              FC
            </div>
          </div>

          <div className="text-center relative z-10">
            <h2 className="font-headline font-black text-xl tracking-tight text-white uppercase">{teamSettings.team_name || ''}</h2>
            <div className="h-px w-12 mx-auto mt-3 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(68,243,169,0.5), transparent)' }} />
            {user?.email && (
              <p className="text-[10px] text-white/30 mt-2 truncate max-w-[180px] font-medium" title={user.email}>
                {user.email}
              </p>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/20 px-3 mb-3">Navegación</p>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isAdminItem = (item as any).adminOnly;
            const isSuperItem = (item as any).superOnly;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group/nav relative overflow-hidden",
                  isActive && isSuperItem
                    ? "text-amber-300"
                    : isActive && isAdminItem
                    ? "text-violet-300"
                    : isActive
                    ? "text-white"
                    : "text-white/40 hover:text-white/80"
                )}
                style={
                  isActive && isSuperItem
                    ? { background: 'rgba(251, 191, 36, 0.1)', boxShadow: 'inset 0 0 0 1px rgba(251, 191, 36, 0.25)' }
                    : isActive && isAdminItem
                    ? { background: 'rgba(139, 92, 246, 0.1)', boxShadow: 'inset 0 0 0 1px rgba(139, 92, 246, 0.2)' }
                    : isActive
                    ? { background: 'rgba(68, 243, 169, 0.1)', boxShadow: 'inset 0 0 0 1px rgba(68, 243, 169, 0.2)' }
                    : {}
                }
              >
                {isActive && !isAdminItem && !isSuperItem && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: '#44f3a9' }} />
                )}
                {isActive && isSuperItem && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: '#fbbf24' }} />
                )}
                <div className={cn(
                  "transition-all duration-200 flex-shrink-0",
                  isActive && isSuperItem ? "text-amber-400" : isActive ? "opacity-100" : "opacity-60 group-hover/nav:opacity-100"
                )}>
                  {item.icon}
                </div>
                <span className={cn("font-body font-semibold text-sm tracking-tight", isActive ? "text-white" : "")}>
                  {item.name}
                </span>
                {isActive && !isAdminItem && !isSuperItem && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#44f3a9' }} />
                )}
                {isSuperItem && !isActive && (
                  <div className="ml-auto text-amber-500/50 text-[9px] font-bold uppercase tracking-widest">owner</div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div
            onClick={() => user?.email === SUPER_ADMIN_EMAIL && setIsAdmin(!isAdmin)}
            className={cn(
              "mb-3 w-full text-left px-4 py-3 rounded-xl transition-all",
              user?.email === SUPER_ADMIN_EMAIL ? "cursor-pointer hover:bg-white/5" : "cursor-default"
            )}
            title={user?.email === SUPER_ADMIN_EMAIL ? "Click para alternar rol" : undefined}
          >
            <p className="text-[9px] text-white/25 font-bold uppercase tracking-[0.2em] mb-1.5">Tu Rango</p>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-500",
                isAdmin ? "bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.8)]" : "shadow-[0_0_6px_rgba(68,243,169,0.8)]"
              )} style={isAdmin ? {} : { background: '#44f3a9' }} />
              <p className={cn("text-xs font-bold uppercase tracking-wider transition-colors duration-500", isAdmin ? "text-violet-400" : "text-soccer-green")}>
                {isAdmin ? 'Capitán' : 'Jugador'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-red-400/60 hover:text-red-400 rounded-xl transition-all duration-200 hover:bg-red-500/8 group/logout"
          >
            <div className="transition-transform group-hover/logout:-translate-x-0.5">
              <LogOut size={16} />
            </div>
            <span className="font-body font-semibold text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full h-[calc(100vh-57px)] md:h-screen relative">
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-30 md:hidden"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Logo Zoom Modal */}
      {isLogoZoomed && teamSettings.logo_url && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 fade-in"
          style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }}
          onClick={() => setIsLogoZoomed(false)}
        >
          <button
            className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setIsLogoZoomed(false); }}
          >
            <X size={36} strokeWidth={1.5} />
          </button>
          <div
            className="relative max-w-xl w-full aspect-square overflow-hidden scale-in"
            style={{ borderRadius: '2.5rem', border: '1px solid rgba(68,243,169,0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(68,243,169,0.06) 0%, transparent 60%)' }} />
            <img src={teamSettings.logo_url} alt="Logo" className="w-full h-full object-contain p-10" />
          </div>
        </div>
      )}
    </div>
  );
}
