import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, MessageCircle } from 'lucide-react';

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const plan = params.get('plan') === 'annual' ? 'anual' : 'mensual';
  const isAnnual = plan === 'anual';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#10141a', fontFamily: 'Manrope, sans-serif' }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
          style={{ background: 'rgba(68,243,169,0.1)', border: '2px solid rgba(68,243,169,0.3)' }}
        >
          <CheckCircle2 size={40} style={{ color: '#44f3a9' }} />
        </div>

        {/* Title */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: '#44f3a9' }}>
            Pago exitoso
          </p>
          <h1 className="font-headline font-black text-4xl text-white tracking-tight mb-3">
            ¡Bienvenido a Club Pro!
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            Tu suscripción al <strong className="text-white">plan {plan}</strong> está activa.{' '}
            {isAnnual && <span style={{ color: '#ffd700' }}>Recuerda que tu primer mes es gratis.</span>}
          </p>
        </div>

        {/* Card */}
        <div
          className="p-6 rounded-2xl text-left space-y-3"
          style={{ background: '#1c2026', border: '1px solid rgba(68,243,169,0.15)' }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Próximos pasos</p>
          {[
            'Te contactaremos por WhatsApp para configurar tu equipo',
            'Recibirás acceso a la plataforma en menos de 24 horas',
            isAnnual ? 'Tu facturación anual inicia después del mes gratis' : 'Tu próximo cobro es en 30 días',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black mt-0.5"
                style={{ background: 'rgba(68,243,169,0.15)', color: '#44f3a9' }}
              >
                {i + 1}
              </div>
              <p className="text-white/60 text-sm leading-relaxed">{step}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <a
            href="https://wa.me/56900000000?text=Hola%2C%20acabo%20de%20suscribirme%20a%20Club%20Pro"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-black text-sm transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #44f3a9, #00d68f)', color: '#003822', boxShadow: '0 4px 20px rgba(68,243,169,0.3)' }}
          >
            <MessageCircle size={16} /> Contactar por WhatsApp
          </a>
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Ir al inicio de sesión <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
