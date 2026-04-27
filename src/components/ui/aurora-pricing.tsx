import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, Zap } from 'lucide-react';

const MONTHLY = 4990;
const ANNUAL_MES = 2495;
const ANNUAL_TOTAL = ANNUAL_MES * 12;
const ANNUAL_SAVINGS = MONTHLY * 12 - ANNUAL_TOTAL;

type Cycle = 'mensual' | 'anual';
type PlanId = 'free' | 'monthly' | 'annual';

interface AuroraPricingProps {
  onSelectPlan: (plan: PlanId) => void;
}

const PLANS = [
  {
    id: 'free' as PlanId,
    label: 'Prueba Gratis',
    badge: '1 MES',
    price: { mensual: 0, anual: 0 },
    priceLabel: { mensual: '$0', anual: '$0' },
    period: '',
    subtext: 'Sin tarjeta · Sin compromiso',
    highlight: false,
    accentColor: 'rgba(255,255,255,0.4)',
    features: [
      'Hasta 10 jugadores',
      'Calendario y eventos',
      'Armado de equipos',
      'Caja y cuotas',
      'Votación MVP',
      'Estadísticas de participación',
    ],
    cta: 'Empezar gratis',
  },
  {
    id: 'monthly' as PlanId,
    label: 'Mensual',
    badge: null,
    price: { mensual: MONTHLY, anual: MONTHLY },
    priceLabel: { mensual: `$${MONTHLY.toLocaleString('es-CL')}`, anual: `$${MONTHLY.toLocaleString('es-CL')}` },
    period: '/mes',
    subtext: 'Incluye 1 mes de prueba',
    highlight: false,
    accentColor: '#9acbff',
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
    id: 'annual' as PlanId,
    label: 'Anual',
    badge: '50% OFF',
    price: { mensual: MONTHLY, anual: ANNUAL_MES },
    priceLabel: { mensual: `$${MONTHLY.toLocaleString('es-CL')}`, anual: `$${ANNUAL_MES.toLocaleString('es-CL')}` },
    period: '/mes',
    subtext: `$${ANNUAL_TOTAL.toLocaleString('es-CL')}/año · Ahorras $${ANNUAL_SAVINGS.toLocaleString('es-CL')}`,
    highlight: true,
    accentColor: '#44f3a9',
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

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12 + 0.2, duration: 0.55, ease: 'easeOut' },
  }),
};

export default function AuroraPricing({ onSelectPlan }: AuroraPricingProps) {
  const [cycle, setCycle] = useState<Cycle>('anual');

  return (
    <section id="pricing" className="relative px-6 pb-28 overflow-hidden">
      {/* Aurora background */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-25">
        <div style={{ position: 'absolute', inset: 0, filter: 'blur(120px)' }}>
          <div style={{
            position: 'absolute', borderRadius: '50%',
            width: 700, height: 700,
            background: 'rgba(68,243,169,0.35)',
            top: '5%', left: '15%',
            animation: 'auroraMove1 22s infinite alternate ease-in-out',
          }} />
          <div style={{
            position: 'absolute', borderRadius: '50%',
            width: 550, height: 550,
            background: 'rgba(154,203,255,0.3)',
            bottom: '5%', right: '10%',
            animation: 'auroraMove2 28s infinite alternate ease-in-out',
          }} />
        </div>
      </div>

      <style>{`
        @keyframes auroraMove1 {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(80px, 60px) scale(1.1); }
        }
        @keyframes auroraMove2 {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(-80px,-50px) scale(1.08); }
        }
      `}</style>

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
            style={{ background: 'rgba(68,243,169,0.08)', border: '1px solid rgba(68,243,169,0.2)' }}>
            <Zap size={13} style={{ color: '#44f3a9' }} />
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
          <span className="text-base font-semibold" style={{ color: cycle === 'mensual' ? '#fff' : 'rgba(255,255,255,0.3)' }}>
            Mensual
          </span>
          <div
            className="w-14 h-8 flex items-center rounded-full p-1 cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={() => setCycle(c => c === 'mensual' ? 'anual' : 'mensual')}
          >
            <motion.div
              className="w-6 h-6 rounded-full"
              layout
              transition={{ type: 'spring', stiffness: 700, damping: 30 }}
              style={{
                marginLeft: cycle === 'anual' ? 'auto' : '0',
                background: 'linear-gradient(135deg, #44f3a9, #00d68f)',
              }}
            />
          </div>
          <span className="text-base font-semibold" style={{ color: cycle === 'anual' ? '#fff' : 'rgba(255,255,255,0.3)' }}>
            Anual
          </span>
          <span className="text-xs font-black px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(68,243,169,0.12)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}>
            50% OFF
          </span>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="relative rounded-3xl p-7 flex flex-col overflow-hidden"
              style={plan.highlight
                ? { background: 'linear-gradient(145deg, #0f2a1e 0%, #1c2026 60%)', border: '1px solid rgba(68,243,169,0.3)', boxShadow: '0 0 60px rgba(68,243,169,0.12)' }
                : { background: 'rgba(28,32,38,0.85)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)' }}
            >
              {/* Card aurora glow (visible on hover via parent whileHover) */}
              <div className="absolute inset-0 rounded-3xl pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                style={{
                  background: plan.highlight
                    ? 'radial-gradient(ellipse at 50% 0%, rgba(68,243,169,0.25) 0%, transparent 70%)'
                    : 'radial-gradient(ellipse at 50% 0%, rgba(154,203,255,0.15) 0%, transparent 70%)',
                }} />

              {/* Badge */}
              {plan.badge && (
                <div className="absolute top-0 right-0">
                  <span className="inline-block text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl"
                    style={plan.highlight
                      ? { background: '#44f3a9', color: '#003822' }
                      : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan label */}
              <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-4" style={{ color: plan.accentColor }}>
                {plan.label}
              </p>

              {/* Price */}
              <div className="flex items-end gap-1.5 mb-1">
                <span className="font-headline font-black text-white" style={{ fontSize: '2.75rem', lineHeight: 1 }}>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={cycle + plan.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="inline-block"
                    >
                      {plan.priceLabel[cycle]}
                    </motion.span>
                  </AnimatePresence>
                </span>
                {plan.period && (
                  <span className="text-white/35 text-sm mb-1">{plan.period}</span>
                )}
              </div>
              <p className="text-white/30 text-xs mb-5 leading-relaxed">
                {cycle === 'anual' && plan.id === 'annual' ? plan.subtext : plan.subtext.split('·')[0]}
              </p>

              <div className="mb-5" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

              {/* Features */}
              <ul className="space-y-2.5 mb-7 flex-1">
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
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-black text-sm transition-all hover:brightness-110"
                style={plan.highlight
                  ? { background: 'linear-gradient(135deg, #44f3a9, #00d68f)', color: '#003822', boxShadow: '0 4px 24px rgba(68,243,169,0.25)' }
                  : plan.id === 'monthly'
                    ? { background: 'rgba(154,203,255,0.1)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.2)' }
                    : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {plan.cta} <ArrowRight size={14} />
              </button>
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
