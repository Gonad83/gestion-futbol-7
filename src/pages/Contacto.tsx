import { MessageCircle, Mail, Clock } from 'lucide-react';
import StaticLayout from '../components/StaticLayout';

export default function Contacto() {
  const whatsapp = 'https://wa.me/56900000000?text=Hola%2C%20necesito%20ayuda%20con%20MiClubPro';

  return (
    <StaticLayout>
      <span className="inline-block text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full mb-6"
        style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}>
        Contáctanos
      </span>
      <h1 className="font-headline font-black text-4xl sm:text-5xl text-white mb-4 leading-tight">
        Estamos aquí<br /><span style={{ color: '#44f3a9' }}>para ayudarte</span>
      </h1>
      <p className="text-base mb-12" style={{ color: 'rgba(255,255,255,0.45)' }}>
        ¿Tienes dudas, sugerencias o necesitas soporte? Escríbenos.
      </p>

      <div className="grid sm:grid-cols-2 gap-5 mb-10">
        <a href={whatsapp} target="_blank" rel="noopener noreferrer"
          className="flex flex-col gap-4 p-6 rounded-2xl transition-all hover:brightness-110"
          style={{ background: 'rgba(68,243,169,0.08)', border: '1px solid rgba(68,243,169,0.2)' }}>
          <MessageCircle size={28} style={{ color: '#44f3a9' }} />
          <div>
            <p className="font-bold text-white text-base mb-1">WhatsApp</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Respuesta en menos de 2 horas en horario hábil.</p>
          </div>
          <span className="text-sm font-bold" style={{ color: '#44f3a9' }}>Chatear ahora →</span>
        </a>

        <a href="mailto:hola@miclubpro.cl"
          className="flex flex-col gap-4 p-6 rounded-2xl transition-all hover:brightness-110"
          style={{ background: 'rgba(154,203,255,0.08)', border: '1px solid rgba(154,203,255,0.2)' }}>
          <Mail size={28} style={{ color: '#9acbff' }} />
          <div>
            <p className="font-bold text-white text-base mb-1">Email</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>hola@miclubpro.cl — respondemos en 24 horas.</p>
          </div>
          <span className="text-sm font-bold" style={{ color: '#9acbff' }}>Enviar email →</span>
        </a>
      </div>

      <div className="flex items-start gap-4 p-5 rounded-2xl" style={{ background: 'rgba(255,208,139,0.07)', border: '1px solid rgba(255,208,139,0.15)' }}>
        <Clock size={20} style={{ color: '#ffd08b', flexShrink: 0, marginTop: 2 }} />
        <div>
          <p className="font-semibold text-white text-sm mb-1">Horario de atención</p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.6 }}>
            Lunes a viernes · 9:00 a 19:00 hrs (Chile) · Sábados 10:00 a 14:00 hrs
          </p>
        </div>
      </div>
    </StaticLayout>
  );
}
