import { useState } from 'react';
import { Globe, MapPin, Clock, Users, Zap, Trophy, CheckCircle2, Bell } from 'lucide-react';

const FEATURES = [
  {
    icon: <Globe size={22} />,
    color: '#44f3a9',
    colorBg: 'rgba(68,243,169,0.08)',
    colorBorder: 'rgba(68,243,169,0.15)',
    title: 'Buscar Rivales',
    desc: 'Encuentra equipos cercanos con nivel similar al tuyo. Filtra por zona, formato (5vs5, 7vs7, 11vs11) y horario disponible.',
  },
  {
    icon: <Clock size={22} />,
    color: '#9acbff',
    colorBg: 'rgba(154,203,255,0.08)',
    colorBorder: 'rgba(154,203,255,0.15)',
    title: 'Postear Disponibilidad',
    desc: 'Publica los horarios en que tu equipo tiene cancha libre y los rivales pueden aceptar el reto directamente.',
  },
  {
    icon: <MapPin size={22} />,
    color: '#ffd08b',
    colorBg: 'rgba(255,208,139,0.08)',
    colorBorder: 'rgba(255,208,139,0.15)',
    title: 'Cancha y Ubicación',
    desc: 'Indica el recinto, dirección y condiciones de la cancha. El rival sabe exactamente dónde presentarse.',
  },
  {
    icon: <Trophy size={22} />,
    color: '#c084fc',
    colorBg: 'rgba(192,132,252,0.08)',
    colorBorder: 'rgba(192,132,252,0.15)',
    title: 'Historial de Amistosos',
    desc: 'Registro de todos los partidos amistosos jugados, resultados y estadísticas contra cada equipo rival.',
  },
  {
    icon: <Users size={22} />,
    color: '#fb923c',
    colorBg: 'rgba(251,146,60,0.08)',
    colorBorder: 'rgba(251,146,60,0.15)',
    title: 'Perfiles de Equipos',
    desc: 'Cada equipo tiene su página pública: escudo, zona, nivel de juego y disponibilidad para amistosos.',
  },
  {
    icon: <Zap size={22} />,
    color: '#44f3a9',
    colorBg: 'rgba(68,243,169,0.08)',
    colorBorder: 'rgba(68,243,169,0.15)',
    title: 'Notificaciones Instantáneas',
    desc: 'Recibe un aviso cuando otro equipo acepta tu desafío o te propone un amistoso en tus horarios libres.',
  },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Tu equipo publica disponibilidad', desc: 'Horario, cancha y formato de juego.' },
  { step: '02', title: 'Otros equipos ven tu reto', desc: 'Los equipos de tu zona lo encuentran en Arena.' },
  { step: '03', title: 'Aceptan y confirman', desc: 'Notificación inmediata. El partido queda en el calendario.' },
];

export default function Arena() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
    setEmail('');
  };

  return (
    <div className="fade-in pb-24 md:pb-8 space-y-12 max-w-4xl mx-auto">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 text-center"
        style={{
          background: 'linear-gradient(135deg, #0a0e14 0%, #0f1a0f 40%, #0a0e14 100%)',
          border: '1px solid rgba(68,243,169,0.12)',
        }}
      >
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(68,243,169,0.12) 0%, transparent 65%)' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(68,243,169,0.5) 0%, transparent 100%)' }} />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6 text-[10px] font-black uppercase tracking-widest"
          style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.25)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-soccer-green animate-pulse" />
          Próximamente
        </div>

        {/* Title */}
        <h1 className="font-headline text-6xl md:text-8xl font-black text-white tracking-tighter uppercase italic mb-4"
          style={{ textShadow: '0 0 80px rgba(68,243,169,0.15)' }}>
          Arena
        </h1>
        <p className="text-white/50 text-lg md:text-xl max-w-xl mx-auto leading-relaxed mb-2">
          El lugar donde los equipos se encuentran.
        </p>
        <p className="text-white/30 text-sm max-w-lg mx-auto">
          Busca rivales, propón amistosos y coordina horarios y canchas — todo desde la app.
        </p>

        {/* Pitch mockup */}
        <div className="relative mt-10 mx-auto max-w-sm h-32 rounded-2xl overflow-hidden opacity-40"
          style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', border: '3px solid #0f172a' }}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10%, rgba(255,255,255,0.05) 10%, rgba(255,255,255,0.05) 20%)' }} />
          <div className="absolute inset-4 border border-white/20 rounded-xl" />
          <div className="absolute left-1/2 top-4 bottom-4 w-px bg-white/20" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white/20 rounded-full" />

          {/* Team A label */}
          <div className="absolute left-3 top-3 text-[9px] font-black text-white/40 uppercase tracking-widest">Tu Equipo</div>
          {/* VS */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-black text-white/60 uppercase tracking-widest bg-black/40 px-2 py-1 rounded-lg" style={{ zIndex: 10 }}>VS</div>
          {/* Team B label */}
          <div className="absolute right-3 top-3 text-[9px] font-black text-white/40 uppercase tracking-widest">Rival</div>
        </div>
      </div>

      {/* How it works */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-soccer-green/60 mb-4">Cómo funcionará</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} className="relative p-5 rounded-2xl"
              style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="text-[40px] font-black italic leading-none mb-3"
                style={{ color: 'rgba(68,243,169,0.08)', fontFamily: 'Lexend, sans-serif' }}>
                {step.step}
              </div>
              <h3 className="font-headline font-bold text-white text-sm mb-1">{step.title}</h3>
              <p className="text-white/35 text-xs leading-relaxed">{step.desc}</p>
              {i < HOW_IT_WORKS.length - 1 && (
                <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 text-white/10 text-xl font-black">→</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Feature grid */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-soccer-green/60 mb-4">Qué incluirá</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="p-5 rounded-2xl transition-all hover:translate-y-[-2px]"
              style={{ background: '#1c2026', border: `1px solid ${f.colorBorder}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 flex-shrink-0"
                style={{ background: f.colorBg, color: f.color, border: `1px solid ${f.colorBorder}` }}>
                {f.icon}
              </div>
              <h3 className="font-headline font-bold text-white text-sm mb-1.5">{f.title}</h3>
              <p className="text-white/35 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Interest form */}
      <div className="p-8 rounded-3xl text-center"
        style={{ background: 'rgba(68,243,169,0.04)', border: '1px solid rgba(68,243,169,0.12)' }}>
        {submitted ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 size={40} className="text-soccer-green" />
            <h3 className="font-headline text-xl font-black text-white">¡Anotado!</h3>
            <p className="text-white/40 text-sm">Te avisaremos cuando Arena esté disponible.</p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}>
              <Bell size={22} />
            </div>
            <h3 className="font-headline text-2xl font-black text-white mb-2">¿Quieres ser el primero en probarlo?</h3>
            <p className="text-white/40 text-sm mb-6 max-w-sm mx-auto">
              Deja tu email y te notificamos cuando Arena abra para equipos.
            </p>
            <form onSubmit={handleInterest} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                required
                className="input-field flex-1"
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <button type="submit" className="btn-primary whitespace-nowrap">
                Notifícame
              </button>
            </form>
          </>
        )}
      </div>

    </div>
  );
}
