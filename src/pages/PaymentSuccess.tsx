import { useSearchParams, Link } from 'react-router-dom';
import { Check, Clock, ArrowRight, MessageCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const WHATSAPP = 'https://wa.me/56957561136?text=' + encodeURIComponent('Hola, tengo un problema con mi pago en MiClubPro');

type Paso = { titulo: string; detalle: string; estado: 'hecho' | 'ahora' | 'luego' };

/**
 * Aquí llega el comprador después de pagar con Flow (pasando por la función flow-return).
 * Pagar no crea la cuenta: falta registrarse con el mismo correo del pago, y el plan se
 * activa solo cuando Flow confirma el pago (ver register_new_captain y flow-webhook).
 *
 * Diseño basado en el concepto de Stitch (docs/diseno/pago-recibido-movil-stitch.png):
 * comprobante y tres pasos con el que falta resaltado. Quien ya tiene sesión (renovó
 * desde el panel) no ve "Crear mi cuenta", que no le corresponde.
 */
export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const { user, teamId, sinEquipo, loading } = useAuth();
  const tier = params.get('plan') === 'elite' ? 'elite' : 'pro';
  const cycle = params.get('cycle') === 'anual' ? 'anual' : 'mensual';
  const nombrePlan = `${tier === 'elite' ? 'Elite' : 'Pro'} ${cycle === 'anual' ? 'Anual' : 'Mensual'}`;
  const correo = params.get('email') || '';
  // flow-return manda estado=pendiente cuando Flow aún no confirma el pago (o no pudo consultarlo).
  const pendiente = params.get('estado') === 'pendiente';
  const color = pendiente ? '#ffd08b' : '#44f3a9';

  const registro = new URLSearchParams({ plan: tier, cycle, status: 'approved' });
  for (const campo of ['email', 'name', 'team']) {
    const valor = params.get(campo);
    if (valor) registro.set(campo, valor);
  }
  const enlaceRegistro = `/register-captain?${registro.toString()}`;

  const conEquipo = !loading && !!user && !!teamId && !sinEquipo;
  const sinEquipoAun = !loading && !!user && sinEquipo;

  const primerPaso: Paso = pendiente
    ? { titulo: 'Flow está confirmando tu pago', detalle: 'Suele tardar unos minutos. Si no se completa, no se te cobra nada.', estado: 'ahora' }
    : { titulo: 'Pagaste', detalle: 'Recibimos tu pago sin problemas.', estado: 'hecho' };
  const pasos: Paso[] = conEquipo
    ? [primerPaso, { titulo: 'Tu plan se actualiza solo', detalle: 'Apenas Flow nos confirme, lo verás en tu panel.', estado: pendiente ? 'luego' : 'ahora' }]
    : [
        primerPaso,
        {
          titulo: sinEquipoAun ? 'Crea tu equipo' : 'Crea tu cuenta con este mismo correo',
          detalle: 'Así enlazamos el pago con tu equipo.',
          estado: pendiente ? 'luego' : 'ahora',
        },
        { titulo: 'Tu plan se activa solo', detalle: 'No tienes que hacer nada más.', estado: 'luego' },
      ];
  // Mientras Flow confirma, el registro igual se puede hacer: se resalta como el siguiente paso útil.
  if (pendiente && !conEquipo) pasos[1].estado = 'ahora';

  return (
    <div className="min-h-[100dvh] flex flex-col text-white" style={{ background: '#10141a', fontFamily: 'Manrope, sans-serif' }}>
      <header className="h-16 flex items-center justify-center">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="w-7 h-7 object-contain" />
          <span className="font-headline font-black text-lg text-soccer-green tracking-tight">MiClubPro</span>
        </Link>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 pb-6">
        <div className="flex flex-col items-center text-center pt-4">
          <div className="w-[88px] h-[88px] rounded-full flex items-center justify-center scale-in"
            style={{ background: `${color}1f`, border: `2px solid ${color}`, boxShadow: `0 0 36px ${color}40` }}>
            {pendiente ? <Clock size={40} style={{ color }} /> : <Check size={44} strokeWidth={2.5} style={{ color }} />}
          </div>
          <h1 className="font-headline font-black text-[32px] leading-tight tracking-tight mt-5">
            {pendiente ? 'Pago en proceso' : '¡Pago recibido!'}
          </h1>
          <p className="text-white/65 mt-1.5">
            {conEquipo ? 'Gracias por seguir con MiClubPro' : 'Te falta un paso para activar tu plan'}
          </p>
        </div>

        <dl className="mt-6 rounded-[20px] px-4" style={{ background: '#181c22', border: '1px solid #262a31' }}>
          {[
            ['Plan', nombrePlan],
            ['Pagaste con', 'Flow'],
            ...(correo ? [['Correo', correo]] : []),
          ].map(([k, v], i) => (
            <div key={k} className="flex items-center justify-between gap-4 py-3.5" style={i ? { borderTop: '1px solid #262a31' } : undefined}>
              <dt className="text-sm text-white/60">{k}</dt>
              <dd className={`text-sm font-bold truncate ${k === 'Correo' ? 'text-soccer-green' : 'text-white'}`}>{v}</dd>
            </div>
          ))}
        </dl>

        <ol className="mt-5 space-y-2.5">
          {pasos.map((p, i) => (
            <li key={p.titulo} className="flex items-start gap-3 p-4 rounded-2xl"
              aria-current={p.estado === 'ahora' ? 'step' : undefined}
              style={p.estado === 'ahora'
                ? { background: '#1c2026', border: `1.5px solid ${color}80` }
                : { background: p.estado === 'hecho' ? '#181c22' : 'transparent', border: '1px solid #1f242b' }}>
              <span className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-black"
                style={p.estado === 'luego' ? { background: '#262a31', color: 'rgba(255,255,255,0.5)' } : { background: color, color: '#10141a' }}>
                {p.estado === 'hecho' ? <Check size={16} strokeWidth={3} /> : i + 1}
              </span>
              <span className={p.estado === 'luego' ? 'opacity-55' : ''}>
                <span className="block font-headline font-bold leading-snug" style={p.estado === 'ahora' ? { color } : undefined}>{p.titulo}</span>
                <span className="block text-sm text-white/60 mt-0.5">{p.detalle}</span>
              </span>
            </li>
          ))}
        </ol>
      </main>

      <div className="sticky bottom-0 w-full px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        style={{ background: 'rgba(16,20,26,0.92)', backdropFilter: 'blur(16px)', borderTop: '1px solid #1f242b' }}>
        <div className="max-w-md mx-auto flex flex-col items-center gap-1">
          {loading ? (
            <div className="w-full h-14 rounded-full animate-pulse" style={{ background: '#1c2026' }} />
          ) : (
            <Link to={conEquipo ? '/dashboard' : enlaceRegistro}
              className="w-full h-14 rounded-full flex items-center justify-center gap-2 font-headline font-bold text-base text-[#003822] transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #44f3a9, #00d68f)', boxShadow: '0 4px 20px rgba(68,243,169,0.25)' }}>
              {conEquipo ? 'Ir a mi panel' : sinEquipoAun ? 'Crear mi equipo' : 'Crear mi cuenta'} <ArrowRight size={18} />
            </Link>
          )}
          {!loading && !user && (
            <Link to="/login" className="h-11 px-4 flex items-center text-sm font-bold text-soccer-green">
              Ya tengo cuenta: iniciar sesión
            </Link>
          )}
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="h-10 px-3 flex items-center gap-1.5 text-xs text-white/55 hover:text-white">
            <MessageCircle size={14} /> ¿Problemas con tu pago? Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
