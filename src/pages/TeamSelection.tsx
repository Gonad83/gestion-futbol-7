import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Shield, Plus, ArrowRight, Loader2, Users, Search, Trophy, Sparkles, ChevronRight } from 'lucide-react';

const MP_FUNCTION_URL = import.meta.env.VITE_N8N_PAYMENT_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-mp-preference`;

export default function TeamSelection() {
  const { user, teamId } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [payError, setPayError] = useState('');
  const [searchCode, setSearchCode] = useState('');

  useEffect(() => {
    const fetchRealTeams = async () => {
      try {
        // En Multi-Tenant acá buscaríamos en la tabla team_members usando el userId.
        // Pero para "conectar de vuelta" sin borrar nada, mostraremos su equipo real activo de team_settings
        const { data: settings } = await supabase.from('team_settings').select('*').eq('id', teamId ?? 1).single();
        const { count } = await supabase.from('players').select('*', { count: 'exact', head: true }).eq('status', 'Activo');

        if (settings) {
          setTeams([
            { 
              id: '1', // El ID real se usará cuando se migre a multi-tenant real
              name: settings.team_name || 'Real Ebolo FC', 
              role: 'admin', 
              players: count || 0,
              logo: settings.logo_url
            }
          ]);
        }
      } catch (e) {
        console.error("Error al cargar equipos", e);
      } finally {
        setLoading(false);
      }
    };
    fetchRealTeams();
  }, [user]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    
    setCreating(true);
    setPayError('');
    
    try {
      // Connect to Mercado Pago
      const res = await fetch(MP_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'annual', origin: window.location.origin }),
      });
      const data = await res.json();
      
      if (!res.ok || !data.url) throw new Error(data.error || 'Error al crear el pago en Mercado Pago');
      
      // Redirect to MP
      window.location.href = data.url;
    } catch (err: any) {
      setPayError(err.message);
      setCreating(false);
    }
  };

  const handleSelectTeam = (teamId: string) => {
    // Save current team in local storage for later when multi-tenant is active
    localStorage.setItem('currentTeamId', teamId);
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e14]">
        <div className="w-12 h-12 rounded-full border-2 border-t-[#44f3a9] border-r-[#44f3a9]/20 border-b-[#44f3a9]/10 border-l-[#44f3a9]/5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0e14] font-['Manrope'] text-white">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#44f3a9] mix-blend-screen filter blur-[150px] opacity-[0.03]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[50%] rounded-full bg-[#44f3a9] mix-blend-screen filter blur-[150px] opacity-[0.02]" />

      <div className="max-w-6xl mx-auto px-6 py-12 lg:py-20 flex flex-col min-h-screen relative z-10">
        
        {/* Header Section */}
        <header className="mb-12 text-center lg:text-left flex flex-col lg:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4 backdrop-blur-md">
              <Sparkles size={14} className="text-[#44f3a9]" />
              <span className="text-xs font-bold uppercase tracking-wider text-white/70">Gestiona tu pasión</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-4 font-headline">
              Tus Equipos
            </h1>
            <p className="text-lg text-white/50 max-w-xl mx-auto lg:mx-0">
              Bienvenido de vuelta. Selecciona tu club para entrar al Dashboard o crea un nuevo equipo Premium.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
          
          {/* Main Content Area (Left / Top) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Search Team Section */}
            <div className="p-1 rounded-2xl bg-gradient-to-r from-white/10 to-transparent">
              <div className="bg-[#121820] p-6 rounded-xl flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-1 w-full relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search size={18} className="text-white/30" />
                  </div>
                  <input
                    type="text"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    placeholder="Código de invitación de equipo..."
                    className="w-full bg-[#0a0e14] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-[#44f3a9]/50 transition-colors"
                  />
                </div>
                <button className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all border border-white/10 whitespace-nowrap">
                  Unirme al Equipo
                </button>
              </div>
            </div>

            {/* List of active teams */}
            <div className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-[#44f3a9] pl-2">Equipos Activos</h2>
              
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => handleSelectTeam(team.id)}
                  className="w-full group text-left relative overflow-hidden rounded-2xl bg-[#121820] border border-white/5 hover:border-[#44f3a9]/30 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#44f3a9]/0 via-[#44f3a9]/0 to-[#44f3a9]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="p-6 flex items-center gap-6">
                    {/* Logo */}
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#1c2431] flex items-center justify-center border border-white/10 flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-500">
                      {team.logo ? (
                        <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">⚽</span>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-headline font-black text-2xl text-white truncate">{team.name}</h3>
                        {team.role === 'admin' && (
                          <span className="bg-[#44f3a9]/10 text-[#44f3a9] text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border border-[#44f3a9]/20">
                            Admin
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center mt-3 gap-5">
                        <div className="flex items-center gap-2 text-white/50 text-sm">
                          <Users size={16} className="text-[#44f3a9]/70" />
                          <span className="font-semibold">{team.players} Plantilla</span>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 text-white/50 text-sm">
                          <Trophy size={16} className="text-yellow-400/70" />
                          <span className="font-semibold">Dashboard Elite</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Arrow */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-[#44f3a9] group-hover:text-black transition-all duration-300 shadow-[0_0_20px_rgba(68,243,169,0)] group-hover:shadow-[0_0_20px_rgba(68,243,169,0.3)]">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </button>
              ))}
            </div>

          </div>

          {/* Marketing & Creation Area (Right / Bottom) */}
          <div className="lg:col-span-5 relative mt-6 lg:mt-0">
            {/* Sticky Container */}
            <div className="sticky top-8 space-y-6">
              
              <div className="p-[1px] rounded-3xl bg-gradient-to-b from-[#44f3a9]/40 via-[#44f3a9]/5 to-transparent">
                <div className="bg-[#10141a] rounded-[23px] overflow-hidden relative">
                  
                  {/* Decorative mesh */}
                  <div className="absolute top-0 right-0 w-full h-32 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, #44f3a9 0%, transparent 60%)' }} />

                  <div className="p-8 relative z-10">
                    <div className="flex items-center justify-between mb-8">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#44f3a9] to-[#00b06b] flex items-center justify-center shadow-[0_0_30px_rgba(68,243,169,0.3)]">
                        <Plus size={24} className="text-[#0a0e14] font-black" />
                      </div>
                      <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-bold text-white/50 border border-white/10 uppercase tracking-widest">
                        Nuevos Desafíos
                      </span>
                    </div>

                    <h3 className="font-headline font-black text-3xl mb-3 leading-none">
                      Funda tu propio club
                    </h3>
                    <p className="text-white/50 mb-8 text-sm leading-relaxed">
                      Lleva a tu equipo al siguiente nivel con nuestro plan Anual Elite. Gestiona pagos, alineaciones, estadísticas con IA y notificaciones automáticas vía WhatsApp.
                    </p>

                    <form onSubmit={handleCreateTeam} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Nombre del Club</label>
                        <input
                          type="text"
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          placeholder="Ej: Los Mágicos FC"
                          className="w-full bg-[#1c2431] border border-white/10 focus:border-[#44f3a9]/50 rounded-xl px-4 py-3.5 text-white placeholder-white/20 transition-colors focus:outline-none"
                          required
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={creating || !teamName.trim()}
                        className="w-full group relative flex items-center justify-center gap-2 py-4 rounded-xl font-black bg-white text-[#0a0e14] hover:bg-[#44f3a9] transition-all duration-300 disabled:opacity-50 overflow-hidden"
                      >
                        <div className="absolute inset-0 flex items-center justify-center w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[150%] skew-x-[-20deg] group-hover:animate-[shine_1.5s_ease-out_infinite]" />
                        {creating ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <>
                            Crear y Suscribirse <span className="opacity-50">| Año Elite</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>
                      
                      {payError && (
                        <div className="p-3 mt-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                          {payError}
                        </div>
                      )}
                    </form>
                    
                    <div className="mt-6 flex items-center justify-center gap-4 text-xs font-semibold text-white/30">
                      <span className="flex items-center gap-1"><Shield size={12} /> Seguro</span>
                      <span className="w-1 h-1 rounded-full bg-white/20" />
                      <span>Mercado Pago</span>
                    </div>

                  </div>
                </div>
              </div>

            </div>
          </div>
          
        </div>
      </div>
      
      {/* Global specific animation styles inline */}
      <style>{`
        @keyframes shine {
          100% { transform: translateX(150%) skewX(-20deg); }
        }
      `}</style>
    </div>
  );
}
