import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, CalendarDays, DollarSign, Star, Zap,
  CheckCircle2, ArrowRight, MessageCircle, Shield,
  BarChart3, Smartphone, Loader2, X, Menu
} from 'lucide-react';
import AuroraPricing from '../components/ui/aurora-pricing';

const MP_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-mp-preference`;

type Plan = 'free' | 'pro' | 'elite' | 'monthly' | 'annual';

const MONTHLY = 4990;
const ANNUAL_MES = 2495;   // 50% off
const ANNUAL_TOTAL = ANNUAL_MES * 12; // 29.940
const ANNUAL_SAVINGS = MONTHLY * 12 - ANNUAL_TOTAL; // 29.940

const FEATURES = [
  { icon: <Users size={22} />, color: '#44f3a9', title: 'Gestión de Plantilla', desc: 'Registra jugadores con foto, posición, apodo, rating y estado. Controla activos, lesionados e inactivos.' },
  { icon: <CalendarDays size={22} />, color: '#9acbff', title: 'Calendario Inteligente', desc: 'Programa partidos y eventos. Visualiza cumpleaños de jugadores. Dos tipos de evento: Deportivo y Recreacional.' },
  { icon: <CheckCircle2 size={22} />, color: '#44f3a9', title: 'Confirmación de Asistencia', desc: 'Los jugadores confirman su asistencia por mail o de forma manual. Ve en tiempo real cuántos van.' },
  { icon: <Zap size={22} />, color: '#ffd08b', title: 'Armado Automático de Equipos', desc: 'El sistema divide los jugadores confirmados en equipos balanceados por rating y posición. Exporta a WhatsApp.' },
  { icon: <DollarSign size={22} />, color: '#44f3a9', title: 'Caja y Cuotas', desc: 'Registra cuotas, egresos e ingresos. Identifica morosos al instante. Filtra por estado de pago.' },
  { icon: <Star size={22} />, color: '#ffd700', title: 'Votación MVP Semanal', desc: 'Vota al mejor jugador de cada partido Deportivo. El sistema genera un historial de MVPs y ranking.' },
  { icon: <BarChart3 size={22} />, color: '#9acbff', title: 'Estadísticas de Participación', desc: 'Seguimiento anual de partidos jugados y % de asistencia por jugador, con indicador visual de color.' },
  { icon: <Shield size={22} />, color: '#44f3a9', title: 'Roles Admin / Jugador', desc: 'El administrador gestiona todo. Los jugadores ven su perfil, confirman asistencia y votan al MVP.' },
  { icon: <Smartphone size={22} />, color: '#9acbff', title: 'Diseño Mobile-First', desc: 'Funciona perfecto en el celular. Comparte listas de asistencia y equipos directo a WhatsApp.' },
];

const PLANS: {
  id: Plan;
  label: string;
  badge: string | null;
  accentColor: string;
  price: string;
  period: string;
  subtext: string;
  highlight: boolean;
  features: string[];
  cta: string;
}[] = [
  {
    id: 'free',
    label: 'Prueba Gratis',
    badge: '1 MES',
    accentColor: 'rgba(255,255,255,0.45)',
    price: '$0',
    period: '',
    subtext: 'Sin tarjeta de crédito · Sin compromiso',
    highlight: false,
    features: [
      'Hasta 14 jugadores',
      'Calendario y eventos',
      'Armado de equipos',
      'Caja y cuotas',
      'Votación MVP',
      'Estadísticas de participación',
    ],
    cta: 'Empezar gratis',
  },
  {
    id: 'monthly',
    label: 'Mensual',
    badge: null,
    accentColor: '#9acbff',
    price: `$${MONTHLY.toLocaleString('es-CL')}`,
    period: '/mes',
    subtext: 'Incluye 1 mes de prueba · Sin compromiso',
    highlight: false,
    features: [
      'Jugadores ilimitados',
      'Calendario y eventos',
      'Armado de equipos',
      'Caja y cuotas',
      'Votación MVP',
      'Estadísticas de participación',
      'Soporte por WhatsApp',
    ],
    cta: 'Elegir mensual',
  },
  {
    id: 'annual',
    label: 'Anual',
    badge: '50% OFF',
    accentColor: '#44f3a9',
    price: `$${ANNUAL_MES.toLocaleString('es-CL')}`,
    period: '/mes',
    subtext: `$${ANNUAL_TOTAL.toLocaleString('es-CL')}/año · Ahorras $${ANNUAL_SAVINGS.toLocaleString('es-CL')}`,
    highlight: true,
    features: [
      'Jugadores ilimitados',
      'Calendario y eventos',
      'Armado de equipos',
      'Caja y cuotas',
      'Votación MVP',
      'Estadísticas de participación',
      'Soporte prioritario',
      'Acceso anticipado a nuevas funciones',
    ],
    cta: 'Elegir anual',
  },
];

export default function Landing() {
  const [billing, setBilling] = useState<Plan>('annual');
  const [showModal, setShowModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', teamName: '' });
  const whatsappLink = 'https://wa.me/56900000000?text=Hola%2C%20quiero%20info%20sobre%20la%20app%20de%20gesti%C3%B3n%20de%20f%C3%BAtbol';

  const openModal = (plan: Plan) => {
    setBilling(plan);
    setPayError('');
    setShowModal(true);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (billing === 'free') {
      const params = new URLSearchParams({
        plan: 'free', email: form.email, name: form.name, team: form.teamName, status: 'approved',
      });
      window.location.href = `/register-captain?${params.toString()}`;
      return;
    }

    setPaying(true);
    setPayError('');
    try {
      const res = await fetch(MP_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          plan: billing,
          origin: window.location.origin,
          payer: { name: form.name, email: form.email, teamName: form.teamName },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Error al crear el pago');
      window.location.href = data.url;
    } catch (err: any) {
      setPayError(err.message || 'Error al conectar con Mercado Pago');
      setPaying(false);
    }
  };

  const selectedPlan = PLANS.find(p => p.id === billing)!;

  return (
    <div className="min-h-screen" style={{ background: '#10141a', fontFamily: 'Manrope, sans-serif', color: '#fff' }}>

      {/* NAV */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: 'rgba(10,14,20,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link to="/" className="flex items-center gap-3 flex-shrink-0">
          <img src="/logo.png" alt="Club Pro Logo" className="w-9 h-9 object-contain" />
          <span className="font-headline font-black text-white text-lg tracking-tight uppercase">Club Pro</span>
        </Link>
        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7">
          {[
            { label: 'Funcionalidades', href: '#features' },
            { label: 'Cómo funciona', href: '#how-it-works' },
            { label: 'Precios', href: '#pricing' },
          ].map(l => (
            <a key={l.label} href={l.href}
              className="text-sm font-semibold text-white/50 hover:text-white transition-colors">
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-white/50 hover:text-white transition-colors">
            Iniciar sesión
          </Link>
          <Link to="/login"
            className="flex items-center gap-1.5 text-sm font-black px-4 py-2 rounded-xl transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #44f3a9, #00d68f)', color: '#003822' }}>
            Ingresar a la app <ArrowRight size={13} />
          </Link>
          <button className="md:hidden p-2 text-white/40 hover:text-white" onClick={() => setMobileMenuOpen(v => !v)}>
            <Menu size={20} />
          </button>
        </div>
      </nav>
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden sticky top-[65px] z-40 px-6 py-4 space-y-2" style={{ background: 'rgba(10,14,20,0.97)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { label: 'Funcionalidades', href: '#features' },
            { label: 'Cómo funciona', href: '#how-it-works' },
            { label: 'Precios', href: '#pricing' },
            { label: 'Iniciar sesión', href: '/login' },
          ].map(l => (
            <a key={l.label} href={l.href} onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-white/60 hover:text-white py-2 transition-colors">
              {l.label}
            </a>
          ))}
        </div>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden px-6 pt-24 pb-28 text-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(68,243,169,0.08) 0%, transparent 70%)' }} />
        </div>
        <div className="relative max-w-3xl mx-auto">
          <span className="inline-block text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full mb-6"
            style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}>
            Para equipos de Fútbol 7
          </span>
          <h1 className="font-headline font-black text-5xl sm:text-6xl md:text-7xl text-white tracking-tight leading-[1.05] mb-6">
            Gestiona tu equipo<br />
            <span style={{ color: '#44f3a9' }}>como un profesional</span>
          </h1>
          <p className="text-white/50 text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
            Asistencia, equipos balanceados, caja, votación MVP y más — todo en una sola app para tu equipo de Fútbol 7.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#pricing"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-base transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #44f3a9, #00d68f)', color: '#003822', boxShadow: '0 8px 32px rgba(68,243,169,0.3)' }}>
              Ver planes <ArrowRight size={16} />
            </a>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-base transition-all hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <MessageCircle size={16} /> Consultar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* APP PREVIEW */}
      <section className="px-4 sm:px-6 pb-24 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: '#9acbff' }}>Vista previa</p>
          <h2 className="font-headline font-black text-3xl sm:text-4xl text-white tracking-tight">La app por dentro</h2>
          <p className="text-white/40 text-base mt-3 max-w-md mx-auto">Todo lo que necesita tu club, en una interfaz limpia y rápida.</p>
        </div>

        <div className="relative mx-auto" style={{ perspective: '1400px' }}>
          <div style={{ transform: 'rotateX(5deg)', transformOrigin: 'center top', transformStyle: 'preserve-3d' }}>
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 48px 140px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)' }}>
              {/* Browser bar */}
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#080c10', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex gap-1.5 flex-shrink-0">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 max-w-xs mx-auto rounded-md px-3 py-1 text-[11px]" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
                    <span>🔒</span> app.clubpro.cl/dashboard
                  </div>
                </div>
              </div>

              {/* App layout */}
              <div className="flex" style={{ background: '#10141a', height: '420px' }}>
                {/* Sidebar */}
                <div className="hidden sm:flex flex-col w-52 flex-shrink-0" style={{ background: '#0a0e14', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex flex-col items-center gap-2 px-4 pt-6 pb-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-black" style={{ background: 'rgba(68,243,169,0.15)', border: '2px solid rgba(68,243,169,0.3)', color: '#44f3a9' }}>FC</div>
                    <p className="text-white font-headline font-bold text-xs text-center">Los Cóndores FC</p>
                    <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>capitan@ejemplo.cl</p>
                  </div>
                  <div className="px-3 space-y-0.5 flex-1">
                    <p className="text-[8px] font-bold uppercase tracking-[0.2em] px-3 mb-2 mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Navegación</p>
                    {[
                      { label: 'Dashboard', active: true, color: '#44f3a9' },
                      { label: 'Caja', active: false },
                      { label: 'Plantilla', active: false },
                      { label: 'Calendario', active: false },
                      { label: 'Matchmaking', active: false },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                        style={item.active ? { background: 'rgba(68,243,169,0.1)', boxShadow: 'inset 0 0 0 1px rgba(68,243,169,0.2)' } : {}}>
                        <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: item.active ? '#44f3a9' : 'rgba(255,255,255,0.2)' }} />
                        <span className="text-xs font-semibold" style={{ color: item.active ? '#fff' : 'rgba(255,255,255,0.35)' }}>{item.label}</span>
                        {item.active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#44f3a9' }} />}
                      </div>
                    ))}
                  </div>
                  <div className="p-3 mx-2 mb-3 rounded-xl" style={{ background: 'rgba(255,208,139,0.07)', border: '1px solid rgba(255,208,139,0.2)' }}>
                    <p className="text-[8px] font-black uppercase tracking-wider mb-1" style={{ color: '#ffd08b' }}>Plan Gratuito</p>
                    <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Actualiza para desbloquear todo.</p>
                  </div>
                </div>

                {/* Main content */}
                <div className="flex-1 p-5 overflow-hidden">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Bienvenido</p>
                      <h3 className="font-headline font-black text-white text-xl">Dashboard</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs" style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9' }}>⚽</div>
                    </div>
                  </div>

                  {/* KPI grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Jugadores', value: '14', sub: 'activos', color: '#44f3a9' },
                      { label: 'Próximo partido', value: 'Vie 16', sub: 'mayo', color: '#9acbff' },
                      { label: 'Caja', value: '$84.500', sub: 'disponible', color: '#ffd08b' },
                      { label: 'Asistencia', value: '78%', sub: 'promedio', color: '#44f3a9' },
                    ].map(kpi => (
                      <div key={kpi.label} className="p-3 rounded-xl" style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p className="text-[8px] text-white/30 font-bold uppercase tracking-wider mb-1">{kpi.label}</p>
                        <p className="font-headline font-black text-lg leading-none" style={{ color: kpi.color }}>{kpi.value}</p>
                        <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>{kpi.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Match card + players row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl" style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[8px] font-black uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Próximo Partido</p>
                        <span className="text-[8px] px-2 py-0.5 rounded-full font-black" style={{ background: 'rgba(68,243,169,0.15)', color: '#44f3a9' }}>Viernes</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ background: 'rgba(68,243,169,0.1)' }}>⚽</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-bold truncate">vs. Los Leones FC</p>
                          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Cancha Norte · 21:00</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Confirmados</p>
                          <p className="text-sm font-black" style={{ color: '#44f3a9' }}>9 / 14</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl" style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p className="text-[8px] font-black uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Plantilla</p>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { init: 'CR', c: '68,243,169' }, { init: 'DG', c: '154,203,255' }, { init: 'AB', c: '68,243,169' },
                          { init: 'MF', c: '255,208,139' }, { init: 'PL', c: '154,203,255' }, { init: 'RV', c: '68,243,169' },
                        ].map((p, i) => (
                          <div key={i} className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
                            style={{ background: `rgba(${p.c},0.15)`, color: `rgb(${p.c})`, border: `1px solid rgba(${p.c},0.3)` }}>
                            {p.init}
                          </div>
                        ))}
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>+8</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Glow */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-2/3 h-20 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(68,243,169,0.1) 0%, transparent 70%)', filter: 'blur(24px)' }} />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: '#ffd08b' }}>Proceso simple</p>
          <h2 className="font-headline font-black text-3xl sm:text-4xl text-white tracking-tight">Listo en 5 minutos</h2>
          <p className="text-white/40 text-base mt-3 max-w-md mx-auto">Sin configuraciones complicadas. Solo crea el equipo y empieza.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(68,243,169,0.25) 30%, rgba(68,243,169,0.25) 70%, transparent)' }} />
          {[
            { step: '01', color: '#44f3a9', textColor: '#003822', icon: <Users size={26} />, title: 'Crea tu equipo', desc: 'Registra el club, sube el logo y agrega a tus jugadores con foto, posición y rating.' },
            { step: '02', color: '#9acbff', textColor: '#001a33', icon: <CalendarDays size={26} />, title: 'Organiza tus partidos', desc: 'Programa eventos, confirma asistencia y arma equipos balanceados automáticamente.' },
            { step: '03', color: '#ffd08b', textColor: '#1a0e00', icon: <BarChart3 size={26} />, title: 'Controla todo', desc: 'Gestiona la caja, vota al MVP de la semana y sigue las estadísticas del equipo.' },
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-center text-center p-8 rounded-2xl relative" style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                style={{ background: item.color, color: item.textColor }}>
                {item.step}
              </div>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mt-4"
                style={{ background: `${item.color}18`, color: item.color, border: `1px solid ${item.color}22` }}>
                {item.icon}
              </div>
              <h3 className="font-headline font-bold text-white text-lg mb-2">{item.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="px-6 pb-24 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: '#44f3a9' }}>Funcionalidades</p>
          <h2 className="font-headline font-black text-3xl sm:text-4xl text-white tracking-tight">Todo lo que necesita tu equipo</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-6 rounded-2xl transition-all hover:translate-y-[-2px]"
              style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${f.color}15`, color: f.color, border: `1px solid ${f.color}20` }}>
                {f.icon}
              </div>
              <h3 className="font-headline font-bold text-white text-base mb-2">{f.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <AuroraPricing onSelectPlan={openModal} />

      {/* BOTTOM CTA */}
      <section className="px-6 pb-24">
        <div className="max-w-2xl mx-auto text-center p-12 rounded-3xl relative overflow-hidden"
          style={{ background: '#1c2026', border: '1px solid rgba(68,243,169,0.12)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(68,243,169,0.07) 0%, transparent 70%)' }} />
          <h2 className="font-headline font-black text-3xl sm:text-4xl text-white tracking-tight mb-4 relative">
            ¿Listo para ordenar<br />tu equipo?
          </h2>
          <p className="text-white/40 text-base mb-8 relative">
            Empieza hoy con un mes gratis. Sin compromisos.
          </p>
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-base transition-all hover:brightness-110 relative"
            style={{ background: 'linear-gradient(135deg, #44f3a9, #00d68f)', color: '#003822', boxShadow: '0 8px 32px rgba(68,243,169,0.3)' }}>
            <MessageCircle size={18} /> Contáctanos por WhatsApp
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-8 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-center gap-3 mb-4">
          <img src="/logo.png" alt="Club Pro Logo" className="w-8 h-8 object-contain" />
          <span className="font-headline font-black text-white text-lg uppercase">Club Pro</span>
        </div>
        <p className="text-white/20 text-xs">Gestión de Equipos de Fútbol 7 · Hecho con ❤️ en Chile</p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <Link to="/login" className="text-white/30 hover:text-white/60 text-xs transition-colors">Iniciar sesión</Link>
        </div>
      </footer>

      {/* CHECKOUT MODAL */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="w-full max-w-md rounded-3xl p-7 relative"
            style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>

            <button onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
              <X size={15} />
            </button>

            {/* Plan summary */}
            <div className="flex items-center justify-between p-4 rounded-2xl mb-6"
              style={selectedPlan.highlight
                ? { background: 'rgba(68,243,169,0.06)', border: '1px solid rgba(68,243,169,0.2)' }
                : billing === 'monthly'
                  ? { background: 'rgba(154,203,255,0.06)', border: '1px solid rgba(154,203,255,0.15)' }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest mb-0.5"
                  style={{ color: selectedPlan.accentColor }}>
                  Plan {selectedPlan.label}
                </p>
                <p className="font-headline font-black text-white text-xl">
                  {billing === 'annual'
                    ? `$${ANNUAL_TOTAL.toLocaleString('es-CL')}`
                    : billing === 'monthly'
                      ? `$${MONTHLY.toLocaleString('es-CL')}`
                      : '$0'}
                  <span className="text-sm font-normal text-white/40 ml-1">
                    {billing === 'annual' ? '/año' : billing === 'monthly' ? '/mes' : ''}
                  </span>
                </p>
                {billing === 'annual' && (
                  <p className="text-[10px] mt-0.5" style={{ color: '#44f3a9' }}>50% OFF · Ahorras ${ANNUAL_SAVINGS.toLocaleString('es-CL')}</p>
                )}
                {billing === 'free' && (
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>1 mes gratis · Sin tarjeta</p>
                )}
              </div>
              {selectedPlan.badge && billing !== 'free' && (
                <span className="text-[9px] font-black px-2 py-1 rounded-full"
                  style={{ background: selectedPlan.accentColor, color: selectedPlan.highlight ? '#003822' : '#0a0e14' }}>
                  {selectedPlan.badge}
                </span>
              )}
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">Tus datos</p>

            <form onSubmit={handleCheckout} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Nombre completo</label>
                <input type="text" required placeholder="Ej. Carlos Pérez"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input-field" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Email</label>
                <input type="email" required placeholder="tu@email.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="input-field" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Nombre del equipo</label>
                <input type="text" required placeholder="Ej. Los Cóndores FC"
                  value={form.teamName} onChange={e => setForm(f => ({ ...f, teamName: e.target.value }))}
                  className="input-field" />
              </div>

              {payError && <p className="text-xs text-red-400 pt-1">{payError}</p>}

              <button
                type="submit"
                disabled={paying}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-black text-sm transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                style={selectedPlan.highlight
                  ? { background: 'linear-gradient(135deg, #44f3a9, #00d68f)', color: '#003822', boxShadow: '0 4px 20px rgba(68,243,169,0.3)' }
                  : billing === 'monthly'
                    ? { background: 'rgba(154,203,255,0.15)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.25)' }
                    : { background: 'rgba(255,255,255,0.1)', color: '#fff' }}
              >
                {paying
                  ? <><Loader2 size={15} className="animate-spin" /> Preparando pago...</>
                  : billing === 'free'
                    ? <>Crear cuenta gratis <ArrowRight size={15} /></>
                    : <>Ir a pagar con Mercado Pago <ArrowRight size={15} /></>
                }
              </button>

              <p className="text-[10px] text-white/20 text-center pt-1">
                {billing === 'free'
                  ? 'Sin tarjeta de crédito requerida'
                  : 'Serás redirigido a Mercado Pago de forma segura'}
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
