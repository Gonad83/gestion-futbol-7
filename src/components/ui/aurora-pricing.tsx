import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, Zap, Users, Shield } from 'lucide-react';

type Cycle = 'mensual' | 'anual';
type PlanId = 'free' | 'pro' | 'elite';

interface AuroraPricingProps {
  onSelectPlan: (plan: PlanId) => void;
}

const PLANS = [
  {
    id: 'free' as PlanId,
    name: 'Starter',
    badge: 'GRATIS',
    price: { mensual: '$0', anual: '$0' },
    subtext: { mensual: 'Sin tarjeta · Sin compromiso', anual: 'Sin tarjeta · Sin compromiso' },
    highlight: false,
    icon: <Users size={18} />,
    accentColor: 'rgba(255,255,255,0.45)',
    glowColor: 'rgba(255,255,255,0.07)',
    limits: { equipos: 1, jugadores: 7 },
    features: [
      '1 equipo activo',
      'Hasta 7 jugadores',
      'Calendario y eventos',
      'Armado de equipos',
      'Caja y cuotas',
      'Votación MVP',
    ],
    cta: 'Empezar gratis',
  },
  {
    id: 'pro' as PlanId,
    name: 'Pro',
    badge: 'POPULAR',
    price: { mensual: '$2.990', anual: '$1.495' },
    subtext: { mensual: 'Incluye 1 mes de prueba', anual: '$17.940/año · 50% OFF' },
    highlight: false,
    icon: <Shield size={18} />,
    accentColor: '#9acbff',
    glowColor: 'rgba(154,203,255,0.18)',
    limits: { equipos: 3, jugadores: 14 },
    features: [
      'Hasta 3 equipos activos',
      'Hasta 14 jugadores por equipo',
      'Calendario y eventos',
      'Armado automático de equipos',
      'Caja y cuotas',
      'Votación MVP',
      'Soporte por WhatsApp',
    ],
    cta: 'Elegir Pro',
  },
  {
    id: 'elite' as PlanId,
    name: 'Elite',
    badge: '50% OFF',
    price: { mensual: '$4.990', anual: '$2.495' },
    subtext: { mensual: 'Incluye 1 mes de prueba', anual: '$29.940/año · Ahorras $29.940' },
    highlight: true,
    icon: <Zap size={18} />,
    accentColor: '#44f3a9',
    glowColor: 'rgba(68,243,169,0.2)',
    limits: { equipos: 5, jugadores: 24 },
    features: [
      'Hasta 5 equipos activos',
      'Hasta 24 jugadores por equipo',
      'Calendario y eventos',
      'Armado automático de equipos',
      'Caja y cuotas',
      'Votación MVP',
      'Estadísticas avanzadas',
      'Soporte prioritario',
      'Acceso anticipado a funciones',
    ],
    cta: 'Elegir Elite',
  },
];

const hoverVariants = {
  rest: { y: 0, scale: 1 },
  hover: { y: -10, scale: 1.025 },
};

const glowVariants = {
  rest: { opacity: 0 },
  hover: { opacity: 1 },
};

export default function AuroraPricing({ onSelectPlan }: AuroraPricingProps) {
  const [cycle, setCycle] = useState<Cycle>('anual');

  return (
    <section id="pricing" className="relative px-6 pb-28 overflow-hidden">
      {/* Aurora blobs */}
      <div className="absolute inset-0 pointer-events-none z-0" style={{ opacity: 0.18 }}>
        <div style={{ position: 'absolute', inset: 0, filter: 'blur(130px)' }}>
          <div style={{
            position: 'absolute', borderRadius: '50%',
            width: 680, height: 680,
            background: 'rgba(68,243,169,0.5)',
            top: '0%', left: '8%',
            animation: 'auroraA 24s infinite alternate ease-in-out',
          }} />
          <div style={{
            position: 'absolute', borderRadius: '50%',
            width: 580, height: 580,
            background: 'rgba(154,203,255,0.4)',
            bottom: '0%', right: '6%',
            animation: 'auroraB 30s infinite alternate ease-in-out',
          }} />
        </div>
      </div>

      <style>{`
        @keyframes auroraA {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(70px,55px) scale(1.12); }
        }
        @keyframes auroraB {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(-70px,-55px) scale(1.1); }
        }
      `}</style>

      <div className="relative z-10 max-w-5xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
            style={{ background: 'rgba(68,243,169,0.08)', border: '1px solid rgba(68,243,169,0.2)' }}>
            <Zap size={12} style={{ color: '#44f3a9' }} />
            <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: '#44f3a9' }}>Precios</span>
          </div>
          <h2 className="font-headline font-black text-3xl sm:text-4xl text-white tracking-tight mb-3">
            Planes simples y transparentes
          </h2>
          <p className="text-white/40 text-base">1 mes gratis para todos · Sin costos ocultos · Cancela cuando quieras</p>
        </motion.div>

        {/* Toggle mensual / anual */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="flex items-center justify-center gap-4 mb-12"
        >
          <span className="text-base font-semibold transition-colors duration-300"
            style={{ color: cycle === 'mensual' ? '#fff' : 'rgba(255,255,255,0.3)' }}>
            Mensual
          </span>
          <div
            className="w-14 h-8 flex items-center rounded-full p-1 cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={() => setCycle(c => c === 'mensual' ? 'anual' : 'mensual')}
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 700, damping: 30 }}
              className="w-6 h-6 rounded-full"
              style={{
                marginLeft: cycle === 'anual' ? 'auto' : '0',
                background: 'linear-gradient(135deg, #44f3a9, #00d68f)',
              }}
            />
          </div>
          <span className="text-base font-semibold transition-colors duration-300"
            style={{ color: cycle === 'anual' ? '#fff' : 'rgba(255,255,255,0.3)' }}>
            Anual
          </span>
          <span className="text-xs font-black px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}>
            50% OFF
          </span>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan, i) => (
            /* Outer: entrance animation */
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 + 0.15, duration: 0.55, ease: 'easeOut' }}
            >
              {/* Inner: hover animation (propagates variants to children) */}
              <motion.div
                variants={hoverVariants}
                initial="rest"
                whileHover="hover"
                animate="rest"
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="relative rounded-3xl p-7 flex flex-col overflow-hidden h-full"
                style={plan.highlight
                  ? { background: 'linear-gradient(145deg, #0c2219 0%, #1c2026 65%)', border: '1px solid rgba(68,243,169,0.3)', boxShadow: '0 0 60px rgba(68,243,169,0.1)' }
                  : { background: 'rgba(28,32,38,0.85)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(14px)' }}
              >
                {/* Glow overlay — inherits hover from parent variants */}
                <motion.div
                  variants={glowVariants}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 rounded-3xl pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at 50% 0%, ${plan.glowColor} 0%, transparent 65%)`,
                  }}
                />

                {/* Badge */}
                <div className="absolute top-0 right-0 z-10">
                  <span className="inline-block text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl rounded-tr-3xl"
                    style={plan.highlight
                      ? { background: '#44f3a9', color: '#003822' }
                      : plan.id === 'pro'
                        ? { background: 'rgba(154,203,255,0.15)', color: '#9acbff' }
                        : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                    {plan.badge}
                  </span>
                </div>

                {/* Icon + name */}
                <div className="flex items-center gap-2.5 mb-5 relative z-10">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${plan.accentColor === 'rgba(255,255,255,0.45)' ? 'rgba(255,255,255,0.06)' : plan.accentColor + '15'}`, color: plan.accentColor }}>
                    {plan.icon}
                  </div>
                  <span className="font-headline font-black text-xl text-white">{plan.name}</span>
                </div>

                {/* Limit pills */}
                <div className="flex items-center gap-2 mb-5 flex-wrap relative z-10">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{
                      background: plan.highlight ? 'rgba(68,243,169,0.12)' : 'rgba(255,255,255,0.06)',
                      color: plan.highlight ? '#44f3a9' : plan.id === 'pro' ? '#9acbff' : 'rgba(255,255,255,0.4)',
                      border: `1px solid ${plan.highlight ? 'rgba(68,243,169,0.2)' : plan.id === 'pro' ? 'rgba(154,203,255,0.15)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                    {plan.limits.equipos === 1 ? '1 equipo' : `Hasta ${plan.limits.equipos} equipos`}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {plan.id === 'free' ? `${plan.limits.jugadores} jugadores` : `${plan.limits.jugadores} jug./equipo`}
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-end gap-1.5 mb-1 relative z-10">
                  <span className="font-headline font-black text-white" style={{ fontSize: '2.6rem', lineHeight: 1 }}>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={cycle + plan.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.22 }}
                        className="inline-block"
                      >
                        {plan.price[cycle]}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  {plan.id !== 'free' && (
                    <span className="text-white/35 text-sm mb-1">/mes</span>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  <motion.p
                    key={cycle + plan.id + 'sub'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-white/30 text-xs mb-5 leading-relaxed relative z-10"
                  >
                    {plan.subtext[cycle]}
                  </motion.p>
                </AnimatePresence>

                <div className="mb-5 relative z-10" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

                {/* Features */}
                <ul className="space-y-2.5 mb-7 flex-1 relative z-10">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm"
                      style={{ color: plan.highlight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)' }}>
                      <CheckCircle2 size={13} className="flex-shrink-0" style={{ color: plan.accentColor }} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => onSelectPlan(plan.id)}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-black text-sm transition-all hover:brightness-110 relative z-10"
                  style={plan.highlight
                    ? { background: 'linear-gradient(135deg, #44f3a9, #00d68f)', color: '#003822', boxShadow: '0 4px 24px rgba(68,243,169,0.25)' }
                    : plan.id === 'pro'
                      ? { background: 'rgba(154,203,255,0.1)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.2)' }
                      : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {plan.cta} <ArrowRight size={14} />
                </button>
              </motion.div>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-white/20 text-xs mt-8">
          Precios en pesos chilenos (CLP) · IVA incluido
        </p>
      </div>
    </section>
  );
}
