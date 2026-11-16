import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';

// Aquí llega el comprador después de pagar con Flow (pasando por la función flow-return).
// Pagar no crea la cuenta: falta registrarse con el mismo correo del pago, y el plan se
// activa solo cuando Flow confirma el pago (ver register_new_captain y flow-webhook).
export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const tier = params.get('plan') === 'elite' ? 'elite' : 'pro';
  const cycle = params.get('cycle') === 'anual' ? 'anual' : 'mensual';
  const nombrePlan = `${tier === 'elite' ? 'Elite' : 'Pro'} ${cycle === 'anual' ? 'Anual' : 'Mensual'}`;

  const registro = new URLSearchParams({ plan: tier, cycle, status: 'approved' });
  for (const campo of ['email', 'name', 'team']) {
    const valor = params.get(campo);
    if (valor) registro.set(campo, valor);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#10141a', fontFamily: 'Manrope, sans-serif' }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
          style={{ background: 'rgba(68,243,169,0.1)', border: '2px solid rgba(68,243,169,0.3)' }}
        >
          <CheckCircle2 size={40} style={{ color: '#44f3a9' }} />
        </div>

        <div>
          <h1 className="font-headline font-black text-4xl text-white tracking-tight mb-3">
            ¡Pago recibido!
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            Falta un paso: crea tu cuenta para activar el <strong className="text-white">plan {nombrePlan}</strong>.
          </p>
        </div>

        <div
          className="p-6 rounded-2xl text-left space-y-2"
          style={{ background: '#1c2026', border: '1px solid rgba(68,243,169,0.15)' }}
        >
          <p className="text-white/60 text-sm leading-relaxed">
            Regístrate con el mismo correo que usaste para pagar. Flow puede tardar unos minutos en confirmarnos el pago; si entras antes, tu plan se activa solo cuando llegue la confirmación.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            to={`/register-captain?${registro.toString()}`}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-black text-sm transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #44f3a9, #00d68f)', color: '#003822', boxShadow: '0 4px 20px rgba(68,243,169,0.3)' }}
          >
            Crear mi cuenta <ArrowRight size={16} />
          </Link>
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Ya tengo cuenta: iniciar sesión
          </Link>
          <Link to="/contacto" className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            ¿Algún problema con tu pago? Escríbenos
          </Link>
        </div>
      </div>
    </div>
  );
}
