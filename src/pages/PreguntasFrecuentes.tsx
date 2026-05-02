import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import StaticLayout from '../components/StaticLayout';

const FAQS = [
  { q: '¿Qué es MiClubPro?', a: 'MiClubPro es una plataforma de gestión para equipos de Fútbol 7. Te permite administrar jugadores, confirmar asistencia, armar equipos equilibrados, controlar la caja del equipo y votar al MVP de cada partido.' },
  { q: '¿Necesito instalar algo?', a: 'No. MiClubPro funciona 100% desde el navegador de tu celular o computador. Solo necesitas crear una cuenta y ya puedes empezar.' },
  { q: '¿Cómo funciona el período de prueba?', a: 'Al registrarte obtienes 1 mes completamente gratis con hasta 10 jugadores registrados y 4 invitados. Sin tarjeta de crédito requerida.' },
  { q: '¿Cuántos jugadores puedo tener en el plan gratuito?', a: 'El plan gratuito permite hasta 10 jugadores registrados en tu squad y hasta 4 jugadores invitados para el Matchmaking, ideal para partidos de 7vs7.' },
  { q: '¿Cómo confirman asistencia los jugadores?', a: 'Los jugadores reciben un email con un link único. Con un clic confirman o rechazan su asistencia. El capitán también puede confirmar manualmente desde el panel admin.' },
  { q: '¿Cómo funciona el armado automático de equipos?', a: 'El sistema toma los jugadores confirmados, analiza su rating y posición, y los divide en dos equipos lo más equilibrados posible. El resultado se puede exportar directo a WhatsApp.' },
  { q: '¿Puedo cancelar cuando quiera?', a: 'Sí, sin preguntas ni penalidades. Tu equipo y datos quedan guardados por 90 días después de cancelar.' },
  { q: '¿Mis datos están seguros?', a: 'Sí. Usamos Supabase con cifrado en tránsito y en reposo. No vendemos ni compartimos datos de tu equipo con terceros.' },
];

export default function PreguntasFrecuentes() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <StaticLayout>
      <span className="inline-block text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full mb-6"
        style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}>
        FAQ
      </span>
      <h1 className="font-headline font-black text-4xl sm:text-5xl text-white mb-4 leading-tight">
        Preguntas frecuentes
      </h1>
      <p className="text-base mb-12" style={{ color: 'rgba(255,255,255,0.45)' }}>
        Todo lo que necesitas saber antes de empezar.
      </p>

      <div className="space-y-3">
        {FAQS.map((faq, i) => (
          <div key={i} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(28,32,38,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              className="w-full flex items-center justify-between px-6 py-5 text-left"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span className="font-semibold text-white text-base">{faq.q}</span>
              <ChevronDown size={18} style={{ color: '#44f3a9', flexShrink: 0, transform: open === i ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </button>
            {open === i && (
              <div className="px-6 pb-5" style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.75 }}>
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </StaticLayout>
  );
}
