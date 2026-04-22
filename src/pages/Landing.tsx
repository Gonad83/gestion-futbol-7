import { Link } from 'react-router-dom';
import {
  Users, CalendarDays, DollarSign, Trophy, Star, Zap,
  CheckCircle2, ArrowRight, MessageCircle, Shield,
  BarChart3, Smartphone
} from 'lucide-react';

const FEATURES = [
  {
    icon: <Users size={22} />,
    color: '#44f3a9',
    title: 'Gestión de Plantilla',
    desc: 'Registra jugadores con foto, posición, apodo, rating y estado. Controla activos, lesionados e inactivos.',
  },
  {
    icon: <CalendarDays size={22} />,
    color: '#9acbff',
    title: 'Calendario Inteligente',
    desc: 'Programa partidos y eventos. Visualiza cumpleaños de jugadores. Dos tipos de evento: Deportivo y Recreacional.',
  },
  {
    icon: <CheckCircle2 size={22} />,
    color: '#44f3a9',
    title: 'Confirmación de Asistencia',
    desc: 'Los jugadores confirman su asistencia por mail o de forma manual. Ve en tiempo real cuántos van.',
  },
  {
    icon: <Zap size={22} />,
    color: '#ffd08b',
    title: 'Armado Automático de Equipos',
    desc: 'El sistema divide los jugadores confirmados en equipos balanceados por rating y posición. Exporta a WhatsApp.',
  },
  {
    icon: <DollarSign size={22} />,
    color: '#44f3a9',
    title: 'Caja y Cuotas',
    desc: 'Registra cuotas, egresos e ingresos. Identifica morosos al instante. Filtra por estado de pago.',
  },
  {
    icon: <Star size={22} />,
    color: '#ffd700',
    title: 'Votación MVP Semanal',
    desc: 'Vota al mejor jugador de cada partido Deportivo. El sistema genera un historial de MVPs y ranking.',
  },
  {
    icon: <BarChart3 size={22} />,
    color: '#9acbff',
    title: 'Estadísticas de Participación',
    desc: 'Seguimiento anual de partidos jugados y % de asistencia por jugador, con indicador visual de color.',
  },
  {
    icon: <Shield size={22} />,
    color: '#44f3a9',
    title: 'Roles Admin / Jugador',
    desc: 'El administrador gestiona todo. Los jugadores ven su perfil, confirman asistencia y votan al MVP.',
  },
  {
    icon: <Smartphone size={22} />,
    color: '#9acbff',
    title: 'Diseño Mobile-First',
    desc: 'Funciona perfecto en el celular. Comparte listas de asistencia y equipos directo a WhatsApp.',
  },
];

export default function Landing() {
  const whatsappLink = 'https://wa.me/56900000000?text=Hola%2C%20quiero%20info%20sobre%20la%20app%20de%20gesti%C3%B3n%20de%20f%C3%BAtbol';

  return (
    <div className="min-h-screen" style={{ background: '#10141a', fontFamily: 'Manrope, sans-serif', color: '#fff' }}>

      {/* NAV */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4" style={{ background: 'rgba(10,14,20,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: 'rgba(68,243,169,0.15)', border: '1px solid rgba(68,243,169,0.25)' }}>⚽</div>
          <span className="font-headline font-black text-white text-lg tracking-tight">EboloApp</span>
        </div>
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl transition-all"
          style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}
        >
          Iniciar sesión <ArrowRight size={14} />
        </Link>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden px-6 pt-24 pb-28 text-center">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(68,243,169,0.08) 0%, transparent 70%)' }} />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <span className="inline-block text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full mb-6" style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}>
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
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-base transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #44f3a9, #00d68f)', color: '#003822', boxShadow: '0 8px 32px rgba(68,243,169,0.3)' }}
            >
              Ver planes <ArrowRight size={16} />
            </a>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-base transition-all hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <MessageCircle size={16} /> Consultar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 pb-24 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: '#44f3a9' }}>Funcionalidades</p>
          <h2 className="font-headline font-black text-3xl sm:text-4xl text-white tracking-tight">Todo lo que necesita tu equipo</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl transition-all hover:translate-y-[-2px]"
              style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: `${f.color}15`, color: f.color, border: `1px solid ${f.color}20` }}>
                {f.icon}
              </div>
              <h3 className="font-headline font-bold text-white text-base mb-2">{f.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 pb-28 max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: '#44f3a9' }}>Precios</p>
          <h2 className="font-headline font-black text-3xl sm:text-4xl text-white tracking-tight mb-3">Planes simples y transparentes</h2>
          <p className="text-white/40 text-base">Sin costos ocultos. Cancela cuando quieras.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">

          {/* Monthly */}
          <div
            className="p-8 rounded-3xl"
            style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 mb-4">Plan Mensual</p>
            <div className="flex items-end gap-2 mb-2">
              <span className="font-headline font-black text-5xl text-white tracking-tight">$2.990</span>
              <span className="text-white/35 text-base mb-1.5">/mes</span>
            </div>
            <p className="text-white/30 text-sm mb-8">Facturación mensual. Sin compromisos.</p>

            <ul className="space-y-3 mb-10">
              {['Jugadores ilimitados', 'Calendario y eventos', 'Armado de equipos', 'Caja y cuotas', 'Votación MVP', 'Soporte por WhatsApp'].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-white/60">
                  <CheckCircle2 size={15} className="flex-shrink-0" style={{ color: '#44f3a9' }} />
                  {item}
                </li>
              ))}
            </ul>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Empezar mensual
            </a>
          </div>

          {/* Annual */}
          <div
            className="p-8 rounded-3xl relative overflow-hidden"
            style={{ background: 'linear-gradient(145deg, #0f2a1e 0%, #1c2026 60%)', border: '1px solid rgba(68,243,169,0.25)', boxShadow: '0 0 40px rgba(68,243,169,0.08)' }}
          >
            {/* Badge */}
            <div className="absolute top-5 right-5">
              <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: '#44f3a9', color: '#003822' }}>
                Más popular
              </span>
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-4" style={{ color: '#44f3a9' }}>Plan Anual</p>

            {/* Pricing */}
            <div className="flex items-end gap-2 mb-1">
              <span className="font-headline font-black text-5xl text-white tracking-tight">$1.495</span>
              <span className="text-white/40 text-base mb-1.5">/mes</span>
            </div>
            <p className="text-white/35 text-sm mb-1">
              <span className="line-through">$35.880</span>
              <span className="font-bold ml-2" style={{ color: '#44f3a9' }}>$17.940/año · 50% de descuento</span>
            </p>

            {/* Free month badge */}
            <div className="inline-flex items-center gap-1.5 mt-2 mb-8 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)' }}>
              <Star size={12} style={{ color: '#ffd700' }} />
              <span className="text-[11px] font-black" style={{ color: '#ffd700' }}>Primer mes GRATIS</span>
            </div>

            <ul className="space-y-3 mb-10">
              {[
                'Todo lo del plan mensual',
                'Primer mes sin costo',
                '50% de descuento vs mensual',
                'Ahorro de $17.940 al año',
                'Soporte prioritario',
                'Acceso a nuevas funciones primero',
              ].map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-white/70">
                  <CheckCircle2 size={15} className="flex-shrink-0" style={{ color: '#44f3a9' }} />
                  {item}
                </li>
              ))}
            </ul>

            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-black text-sm transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #44f3a9, #00d68f)', color: '#003822', boxShadow: '0 4px 20px rgba(68,243,169,0.3)' }}
            >
              Empezar con 1 mes gratis <ArrowRight size={15} />
            </a>
          </div>
        </div>

        {/* Guarantee note */}
        <p className="text-center text-white/25 text-xs mt-8">
          ✅ Sin tarjeta de crédito requerida para el mes gratis · Precios en pesos chilenos (CLP)
        </p>
      </section>

      {/* BOTTOM CTA */}
      <section className="px-6 pb-24">
        <div className="max-w-2xl mx-auto text-center p-12 rounded-3xl relative overflow-hidden" style={{ background: '#1c2026', border: '1px solid rgba(68,243,169,0.12)' }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(68,243,169,0.07) 0%, transparent 70%)' }} />
          <h2 className="font-headline font-black text-3xl sm:text-4xl text-white tracking-tight mb-4 relative">
            ¿Listo para ordenar<br />tu equipo?
          </h2>
          <p className="text-white/40 text-base mb-8 relative">
            Empieza hoy con un mes gratis. Sin compromisos.
          </p>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-base transition-all hover:brightness-110 relative"
            style={{ background: 'linear-gradient(135deg, #44f3a9, #00d68f)', color: '#003822', boxShadow: '0 8px 32px rgba(68,243,169,0.3)' }}
          >
            <MessageCircle size={18} /> Contáctanos por WhatsApp
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 py-8 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-lg">⚽</span>
          <span className="font-headline font-black text-white">EboloApp</span>
        </div>
        <p className="text-white/20 text-xs">
          Gestión de Equipos de Fútbol 7 · Hecho con ❤️ en Chile
        </p>
        <div className="flex items-center justify-center gap-4 mt-4">
          <Link to="/login" className="text-white/30 hover:text-white/60 text-xs transition-colors">Iniciar sesión</Link>
        </div>
      </footer>
    </div>
  );
}
