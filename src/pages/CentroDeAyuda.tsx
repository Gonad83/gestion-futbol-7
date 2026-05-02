import { Link } from 'react-router-dom';
import { Users, CalendarDays, DollarSign, Zap, Star, Settings } from 'lucide-react';
import StaticLayout from '../components/StaticLayout';

const TOPICS = [
  { icon: <Users size={22} />, color: '#44f3a9', title: 'Gestión de jugadores', desc: 'Cómo agregar, editar y administrar tu plantilla.' },
  { icon: <CalendarDays size={22} />, color: '#9acbff', title: 'Calendario y eventos', desc: 'Crear partidos, eventos recreacionales y ver cumpleaños.' },
  { icon: <Zap size={22} />, color: '#ffd08b', title: 'Matchmaking', desc: 'Armar equipos equilibrados y exportar a WhatsApp.' },
  { icon: <DollarSign size={22} />, color: '#44f3a9', title: 'Caja y cuotas', desc: 'Registrar pagos, egresos e identificar morosos.' },
  { icon: <Star size={22} />, color: '#ffd08b', title: 'Votación MVP', desc: 'Cómo funciona la votación y el ranking histórico.' },
  { icon: <Settings size={22} />, color: '#9acbff', title: 'Configuración', desc: 'Perfil del equipo, roles y ajustes generales.' },
];

export default function CentroDeAyuda() {
  return (
    <StaticLayout>
      <span className="inline-block text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full mb-6"
        style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}>
        Soporte
      </span>
      <h1 className="font-headline font-black text-4xl sm:text-5xl text-white mb-4 leading-tight">
        Centro de ayuda
      </h1>
      <p className="text-base mb-12" style={{ color: 'rgba(255,255,255,0.45)' }}>
        Encuentra respuestas rápidas sobre cada función de MiClubPro.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {TOPICS.map(t => (
          <div key={t.title} className="flex items-start gap-4 p-5 rounded-2xl"
            style={{ background: 'rgba(28,32,38,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="p-2 rounded-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)', color: t.color }}>{t.icon}</div>
            <div>
              <p className="font-bold text-white text-sm mb-1">{t.title}</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{t.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-2xl text-center" style={{ background: 'rgba(68,243,169,0.07)', border: '1px solid rgba(68,243,169,0.15)' }}>
        <p className="text-white font-semibold mb-2">¿No encontraste lo que buscabas?</p>
        <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>Nuestro equipo responde en menos de 2 horas por WhatsApp.</p>
        <Link to="/contacto" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #44f3a9, #00d68f)', color: '#003822' }}>
          Contactar soporte →
        </Link>
      </div>
    </StaticLayout>
  );
}
