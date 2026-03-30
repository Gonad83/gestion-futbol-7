import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LayoutDashboard, Users, CalendarDays, Calculator, LogOut, Menu, X, ShieldAlert, Settings, UserCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

const SUPER_ADMIN_EMAIL = 'garaosd@gmail.com';

export default function Layout() {
  const { isAdmin, setIsAdmin, user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoZoomed, setIsLogoZoomed] = useState(false);
  const [teamSettings, setTeamSettings] = useState({ team_name: 'Fútbol 7', logo_url: '' });

  useEffect(() => {
    const fetchTeamSettings = async () => {
      try {
        const { data } = await supabase.from('team_settings').select('*').eq('id', 1).maybeSingle();
        if (data) setTeamSettings({ team_name: data.team_name, logo_url: data.logo_url || '' });
      } catch (e) {
        console.error('Error fetching team settings:', e);
      }
    };
    fetchTeamSettings();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={16} /> },
    { name: 'Caja', path: '/finance', icon: <Calculator size={16} /> },
    { name: 'Plantilla', path: '/players', icon: <Users size={16} /> },
    { name: 'Calendario', path: '/calendar', icon: <CalendarDays size={16} /> },
    { name: 'Matchmaking', path: '/matchmaking', icon: <ShieldAlert size={16} /> },
    { name: 'Mi Perfil', path: '/profile', icon: <UserCircle size={16} /> },
    ...(isAdmin ? [{ name: 'Admin', path: '/admin', icon: <Settings size={16} />, adminOnly: true }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#10141a' }}>
      {/* Top Navbar */}
      <header
        className="sticky top-0 z-50 w-full"
        style={{ background: 'rgba(10,14,20,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-14 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden cursor-pointer flex-shrink-0"
              style={{ background: 'rgba(68,243,169,0.15)', border: '1.5px solid rgba(68,243,169,0.4)' }}
              onClick={() => teamSettings.logo_url && setIsLogoZoomed(true)}
            >
              {teamSettings.logo_url
                ? <img src={teamSettings.logo_url} alt="Logo" className="w-full h-full object-cover" />
                : <span className="text-base">⚽</span>
              }
            </div>
            <span className="font-headline font-black text-white tracking-tight uppercase text-sm hidden sm:block">
              {teamSettings.team_name}
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const isAdminItem = (item as any).adminOnly;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all duration-200",
                    isActive && isAdminItem
                      ? "bg-violet-500/10 text-violet-300 border border-violet-500/20"
                      : isActive
                      ? "text-white border border-soccer-green/20"
                      : "text-white/40 hover:text-white/80 hover:bg-white/5"
                  )}
                  style={isActive && !isAdminItem ? { background: 'rgba(68,243,169,0.1)' } : {}}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: role + logout (desktop) / burger (mobile) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className={cn(
                "hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all",
                isAdmin ? "text-violet-400 bg-violet-500/10" : "text-soccer-green bg-soccer-green/10"
              )}
              onClick={() => user?.email === SUPER_ADMIN_EMAIL && setIsAdmin(!isAdmin)}
              title={user?.email === SUPER_ADMIN_EMAIL ? "Click para alternar rol" : undefined}
            >
              <div className={cn("w-1.5 h-1.5 rounded-full", isAdmin ? "bg-violet-400" : "bg-soccer-green")} />
              {isAdmin ? 'Admin' : 'Jugador'}
            </div>

            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/8 transition-all text-xs font-bold"
            >
              <LogOut size={14} />
            </button>

            {/* Mobile burger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-white/60 hover:text-white transition-colors p-1"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {isMobileMenuOpen && (
          <div
            className="md:hidden border-t fade-in"
            style={{ background: '#0a0e14', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <nav className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const isAdminItem = (item as any).adminOnly;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                      isActive && isAdminItem
                        ? "bg-violet-500/10 text-violet-300"
                        : isActive
                        ? "text-white"
                        : "text-white/40"
                    )}
                    style={isActive && !isAdminItem ? { background: 'rgba(68,243,169,0.1)' } : {}}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="px-4 pb-4 flex items-center justify-between">
              <div
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer",
                  isAdmin ? "text-violet-400 bg-violet-500/10" : "text-soccer-green bg-soccer-green/10"
                )}
                onClick={() => { user?.email === SUPER_ADMIN_EMAIL && setIsAdmin(!isAdmin); setIsMobileMenuOpen(false); }}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full", isAdmin ? "bg-violet-400" : "bg-soccer-green")} />
                {isAdmin ? 'Admin' : 'Jugador'}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-400/60 hover:text-red-400 text-sm font-semibold transition-all"
              >
                <LogOut size={15} /> Salir
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
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
            <img src={teamSettings.logo_url} alt="Logo" className="w-full h-full object-contain p-10" />
          </div>
        </div>
      )}
    </div>
  );
}
