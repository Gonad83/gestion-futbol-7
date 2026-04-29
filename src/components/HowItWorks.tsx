import { useState, useEffect, useCallback, type MouseEvent } from 'react';
import { motion, AnimatePresence, useMotionValue, useMotionTemplate, type MotionStyle, type MotionValue } from 'framer-motion';
import { Users, CalendarDays, ShieldAlert, DollarSign } from 'lucide-react';

type WrapperStyle = MotionStyle & { '--x': MotionValue<string>; '--y': MotionValue<string> };

const STEPS = [
  {
    id: '1', tag: 'Paso 1',
    title: 'Registra tu squad',
    description: 'Agrega jugadores con foto, posición y rating. Controla activos, lesionados e inactivos desde un solo panel.',
    accent: '#44f3a9', Icon: Users,
  },
  {
    id: '2', tag: 'Paso 2',
    title: 'Programa tus partidos',
    description: 'Crea eventos en el calendario. Los jugadores confirman asistencia por email con un clic — sin llamar a nadie.',
    accent: '#9acbff', Icon: CalendarDays,
  },
  {
    id: '3', tag: 'Paso 3',
    title: 'Arma equipos equilibrados',
    description: 'El sistema divide automáticamente a los confirmados en equipos balanceados por rating y posición. Exporta a WhatsApp.',
    accent: '#44f3a9', Icon: ShieldAlert,
  },
  {
    id: '4', tag: 'Paso 4',
    title: 'Gestiona la caja',
    description: 'Registra cuotas, egresos e ingresos. Detecta morosos al instante sin conversaciones incómodas.',
    accent: '#ffd08b', Icon: DollarSign,
  },
] as const;

function useNumberCycler(total = 4, interval = 5000) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setCurrent(p => (p + 1) % total), interval);
    return () => clearTimeout(t);
  }, [current, total, interval]);
  const setStep = useCallback((i: number) => setCurrent(i % total), [total]);
  return { current, setStep };
}

// ── Mockups ──────────────────────────────────────────────────────────────────

function MockPlayers() {
  const players = [
    { init: 'CR', name: 'Carlos Rojas', pos: 'Delantero', r: 7, c: '#44f3a9', active: true },
    { init: 'DG', name: 'Diego García', pos: 'Portero', r: 6, c: '#9acbff', active: true },
    { init: 'MF', name: 'Marco Fuentes', pos: 'Defensa', r: 5, c: '#ffd08b', active: false },
    { init: 'PL', name: 'Pablo Lagos', pos: 'Mediocampo', r: 6, c: '#44f3a9', active: true },
    { init: 'RV', name: 'Roberto Vega', pos: 'Delantero', r: 5, c: '#9acbff', active: true },
  ];
  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.3)' }}>Plantilla · 10 jugadores</p>
        <span className="text-[9px] px-2 py-0.5 rounded-full font-black" style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9' }}>8 activos</span>
      </div>
      {players.map((p, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
            style={{ background: `${p.c}18`, color: p.c, border: `1px solid ${p.c}30` }}>{p.init}</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-bold truncate leading-none mb-0.5">{p.name}</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{p.pos}</p>
          </div>
          <div className="flex items-center gap-1 mr-2">
            <span className="text-yellow-400 text-[10px]">★</span>
            <span className="text-white text-xs font-black">{p.r}</span>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
            style={{ background: p.active ? 'rgba(68,243,169,0.1)' : 'rgba(239,68,68,0.1)', color: p.active ? '#44f3a9' : '#f87171' }}>
            {p.active ? 'Activo' : 'Lesionado'}
          </span>
        </div>
      ))}
    </div>
  );
}

function MockCalendar() {
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const dates = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  const highlights: Record<number, string> = { 9: '#44f3a9', 14: '#9acbff', 17: '#ffd08b' };
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-white text-sm font-black">Mayo 2026</p>
        <span className="text-[9px] text-white/30 font-bold">3 eventos</span>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {days.map(d => <div key={d} className="text-center text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.25)' }}>{d}</div>)}
        {dates.map((d, i) => (
          <div key={i} className="flex items-center justify-center h-7 rounded-lg text-[10px] font-bold transition-all"
            style={highlights[d]
              ? { background: `${highlights[d]}25`, color: highlights[d], border: `1px solid ${highlights[d]}40` }
              : { color: 'rgba(255,255,255,0.45)' }}>
            {d}
          </div>
        ))}
      </div>
      <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'rgba(68,243,169,0.07)', border: '1px solid rgba(68,243,169,0.2)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ background: 'rgba(68,243,169,0.12)' }}>⚽</div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-bold">vs. Los Leones FC</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Vie 9 · 21:00 · Cancha Norte</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Confirmados</p>
          <p className="text-sm font-black" style={{ color: '#44f3a9' }}>9/13</p>
        </div>
      </div>
      <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'rgba(154,203,255,0.06)', border: '1px solid rgba(154,203,255,0.15)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ background: 'rgba(154,203,255,0.1)' }}>🎉</div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-bold">Asado del equipo</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Mié 14 · 20:00 · Casa de Rodrigo</p>
        </div>
      </div>
    </div>
  );
}

function MockMatchmaking() {
  const teamA = [
    { init: 'DG', r: 6, c: '#9acbff' }, { init: 'CR', r: 7, c: '#44f3a9' },
    { init: 'AB', r: 5, c: '#44f3a9' }, { init: 'MF', r: 6, c: '#9acbff' },
    { init: 'RV', r: 5, c: '#44f3a9' }, { init: 'PQ', r: 6, c: '#9acbff' },
    { init: 'JL', r: 6, c: '#44f3a9' },
  ];
  const teamB = [
    { init: 'GH', r: 6, c: '#f87171' }, { init: 'NK', r: 7, c: '#f87171' },
    { init: 'TP', r: 5, c: '#f87171' }, { init: 'WR', r: 6, c: '#f87171' },
    { init: 'SM', r: 5, c: '#f87171' }, { init: 'LB', r: 6, c: '#f87171' },
    { init: 'YC', r: 6, c: '#f87171' },
  ];
  const avg = (t: typeof teamA) => (t.reduce((a, p) => a + p.r, 0) / t.length).toFixed(1);
  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      {[
        { label: 'Equipo A', accent: '#44f3a9', players: teamA },
        { label: 'Equipo B', accent: '#f87171', players: teamB },
      ].map(team => (
        <div key={team.label} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${team.accent}20` }}>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: team.accent }} />
              <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: team.accent }}>{team.label}</p>
            </div>
            <span className="text-[9px] font-black" style={{ color: team.accent }}>★ {avg(team.players)}</span>
          </div>
          <div className="space-y-1.5">
            {team.players.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0"
                  style={{ background: `${p.c}18`, color: p.c }}>{p.init}</div>
                <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${(p.r / 7) * 100}%`, background: team.accent + '70' }} />
                </div>
                <span className="text-[8px] font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>{p.r}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MockFinance() {
  const payments = [
    { init: 'CR', name: 'Carlos Rojas', month: 'Abril', paid: true },
    { init: 'DG', name: 'Diego García', month: 'Abril', paid: true },
    { init: 'MF', name: 'Marco Fuentes', month: 'Marzo', paid: false },
    { init: 'PL', name: 'Pablo Lagos', month: 'Febrero', paid: false },
    { init: 'AB', name: 'Andrés Bravo', month: 'Abril', paid: true },
  ];
  return (
    <div className="w-full space-y-2">
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'Caja', value: '$84.500', c: '#44f3a9' },
          { label: 'Cobrado', value: '$45.000', c: '#9acbff' },
          { label: 'Pendiente', value: '$20.000', c: '#f87171' },
        ].map(k => (
          <div key={k.label} className="p-2 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[8px] font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{k.label}</p>
            <p className="text-xs font-black" style={{ color: k.c }}>{k.value}</p>
          </div>
        ))}
      </div>
      <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Cuotas · Abril 2026</p>
      {payments.map((p, i) => (
        <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
            style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9' }}>{p.init}</div>
          <span className="text-xs font-bold text-white flex-1 truncate">{p.name}</span>
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{p.month}</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full font-black"
            style={{ background: p.paid ? 'rgba(68,243,169,0.12)' : 'rgba(239,68,68,0.12)', color: p.paid ? '#44f3a9' : '#f87171' }}>
            {p.paid ? 'Pagado' : 'Debe'}
          </span>
        </div>
      ))}
    </div>
  );
}

const MOCKS = [MockPlayers, MockCalendar, MockMatchmaking, MockFinance];

const slideVariants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function HowItWorks() {
  const { current, setStep } = useNumberCycler(4, 5000);
  const step = STEPS[current];
  const Mock = MOCKS[current];

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = ({ currentTarget, clientX, clientY }: MouseEvent<HTMLDivElement>) => {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  };

  return (
    <section id="how-it-works" className="px-4 sm:px-6 pb-24 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: '#ffd08b' }}>Proceso simple</p>
        <h2 className="font-headline font-black text-3xl sm:text-4xl text-white tracking-tight">Listo en 5 minutos</h2>
        <p className="text-white/40 text-base mt-3 max-w-md mx-auto">Sin configuraciones complicadas. Solo crea el equipo y empieza.</p>
      </div>

      <div className="flex flex-col gap-8">
        {/* Main Card */}
        <motion.div
          className="relative w-full rounded-3xl overflow-hidden cursor-default"
          onMouseMove={handleMouseMove}
          style={{ '--x': useMotionTemplate`${mouseX}px`, '--y': useMotionTemplate`${mouseY}px` } as WrapperStyle}
        >
          {/* Hover glow */}
          <div className="pointer-events-none absolute inset-0 z-10 rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: 'radial-gradient(600px circle at var(--x) var(--y), rgba(68,243,169,0.04), transparent 50%)' }} />

          <div className="relative rounded-3xl p-1" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)' }}>
            <div className="rounded-[22px] overflow-hidden" style={{ background: '#131820', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex flex-col md:flex-row min-h-[420px]">

                {/* Left — Text */}
                <div className="md:w-[42%] flex-shrink-0 p-8 md:p-10 flex flex-col justify-center" style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                  <AnimatePresence mode="wait">
                    <motion.div key={current}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${step.accent}15`, color: step.accent }}>
                          <step.Icon size={14} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: step.accent }}>
                          {step.tag}
                        </span>
                      </div>
                      <h3 className="font-headline font-black text-2xl md:text-3xl text-white tracking-tight mb-4 leading-tight">
                        {step.title}
                      </h3>
                      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        {step.description}
                      </p>
                    </motion.div>
                  </AnimatePresence>

                  {/* Progress bar */}
                  <div className="mt-8 flex gap-1.5">
                    {STEPS.map((_, i) => (
                      <div key={i} className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        {i === current && (
                          <motion.div className="h-full rounded-full"
                            style={{ background: step.accent }}
                            initial={{ width: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 5, ease: 'linear' }}
                          />
                        )}
                        {i < current && (
                          <div className="h-full w-full rounded-full" style={{ background: step.accent + '60' }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right — Mock */}
                <div className="flex-1 p-6 md:p-8 flex items-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <AnimatePresence mode="wait">
                    <motion.div key={current} className="w-full"
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.5 }}
                    >
                      <Mock />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Step Pills Nav */}
        <nav className="flex items-center justify-center gap-2 flex-wrap">
          {STEPS.map((s, i) => {
            const isActive = i === current;
            const isDone = i < current;
            return (
              <motion.button key={s.id}
                onClick={() => setStep(i)}
                initial={{ scale: 0.92 }}
                animate={{ scale: isActive ? 1 : 0.92 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 outline-none"
                style={isActive
                  ? { background: `${s.accent}18`, color: s.accent, border: `1px solid ${s.accent}40` }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 transition-all"
                  style={isDone
                    ? { background: s.accent, color: '#003822' }
                    : isActive
                      ? { background: `${s.accent}30`, color: s.accent }
                      : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                  {isDone ? '✓' : i + 1}
                </span>
                <span className="hidden sm:inline">{s.tag}</span>
              </motion.button>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
