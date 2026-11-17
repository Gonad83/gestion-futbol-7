import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, Lock, Loader2 } from 'lucide-react';

const MP_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-mp-preference`;
const FLOW_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-flow-preference`;

type PlanId = 'pro' | 'elite';
type Cycle = 'mensual' | 'anual';

const PLAN_INFO: Record<PlanId, Record<Cycle, {
  label: string; price: string; period: string; subtext: string;
  amount: number; color: string; features: string[];
}>> = {
  pro: {
    mensual: {
      label: 'Plan Pro Mensual',
      price: '$9.990',
      period: '/mes',
      subtext: 'Facturación mensual · Cancela cuando quieras',
      amount: 9990,
      color: '#9acbff',
      features: [
        'Hasta 14 jugadores — titulares y suplentes',
        'Matchmaking inteligente por posición y nivel',
        'Confirmación automática de asistencia por email',
        'Caja del equipo: detecta morosos al instante',
        'Exporta alineaciones y equipos a WhatsApp',
        'Estadísticas de asistencia por jugador',
        'Votación MVP al finalizar cada partido',
        'Soporte por WhatsApp en horario hábil',
      ],
    },
    anual: {
      label: 'Plan Pro Anual',
      price: '$95.880',
      period: '/año',
      subtext: '$7.990/mes · Ahorras $24.000 vs mensual',
      amount: 95880,
      color: '#9acbff',
      features: [
        'Hasta 14 jugadores — titulares y suplentes',
        'Matchmaking inteligente por posición y nivel',
        'Confirmación automática de asistencia por email',
        'Caja del equipo: detecta morosos al instante',
        'Exporta alineaciones y equipos a WhatsApp',
        'Estadísticas de asistencia por jugador',
        'Votación MVP al finalizar cada partido',
        'Soporte por WhatsApp en horario hábil',
      ],
    },
  },
  elite: {
    mensual: {
      label: 'Plan Elite Mensual',
      price: '$19.990',
      period: '/mes',
      subtext: 'Facturación mensual · Cancela cuando quieras',
      amount: 19990,
      color: '#44f3a9',
      features: [
        'Todo lo del plan Pro incluido',
        'Jugadores ilimitados en tu squad',
        'Gestiona toda tu liga desde un panel',
        'Dashboard con ranking MVP histórico',
        'Arena: genera fixtures automáticos',
        'Soporte prioritario (respuesta < 1h)',
        'Acceso anticipado a nuevas funciones',
      ],
    },
    anual: {
      label: 'Plan Elite Anual',
      price: '$191.880',
      period: '/año',
      subtext: '$15.990/mes · Ahorras $48.000 vs mensual',
      amount: 191880,
      color: '#44f3a9',
      features: [
        'Todo lo del plan Pro incluido',
        'Jugadores ilimitados en tu squad',
        'Gestiona toda tu liga desde un panel',
        'Dashboard con ranking MVP histórico',
        'Arena: genera fixtures automáticos',
        'Soporte prioritario (respuesta < 1h)',
        'Acceso anticipado a nuevas funciones',
      ],
    },
  },
};

export default function Checkout() {
  const [params] = useSearchParams();
  const planId = (params.get('plan') as PlanId) === 'elite' ? 'elite' : 'pro';
  const cycle = (params.get('cycle') as Cycle) === 'anual' ? 'anual' : 'mensual';
  const info = PLAN_INFO[planId][cycle];

  // Quien renueva desde el panel llega con su correo y su equipo en el enlace. El pago se asocia
  // al equipo por el correo, así que debe ser el mismo de la cuenta.
  const [form, setForm] = useState({ name: params.get('name') || '', email: params.get('email') || '', teamName: params.get('team') || '' });
  const [loadingMP, setLoadingMP] = useState(false);
  const [loadingFlow, setLoadingFlow] = useState(false);
  const [error, setError] = useState('');

  const isValid = form.name.trim() && form.email.trim() && form.teamName.trim();

  const handleMP = async () => {
    if (!isValid) { setError('Completa todos los campos antes de continuar.'); return; }
    setError('');
    setLoadingMP(true);
    try {
      const res = await fetch(MP_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          plan: planId,
          cycle,
          amount: info.amount,
          planLabel: info.label,
          origin: window.location.origin,
          payer: { name: form.name, email: form.email, teamName: form.teamName },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Error al crear el pago');
      window.open(data.url, '_blank', 'noopener,noreferrer');
      setLoadingMP(false);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con Mercado Pago');
      setLoadingMP(false);
    }
  };

  const handleFlow = async () => {
    if (!isValid) { setError('Completa todos los campos antes de continuar.'); return; }
    setError('');
    setLoadingFlow(true);
    try {
      const res = await fetch(FLOW_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          plan: planId,
          cycle,
          amount: info.amount,
          planLabel: info.label,
          origin: window.location.origin,
          payer: { name: form.name, email: form.email, teamName: form.teamName },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Error al crear el pago con Flow');
      window.open(data.url, '_blank', 'noopener,noreferrer');
      setLoadingFlow(false);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con Flow');
      setLoadingFlow(false);
    }
  };

  return (
    <div style={{ background: 'radial-gradient(ellipse at 60% 0%, #0e1e35 0%, #0d1520 35%, #0b1018 100%)', minHeight: '100vh', fontFamily: 'Manrope, sans-serif', color: '#fff' }}>

      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="MiClubPro" className="w-8 h-8 object-contain" />
          <span className="font-headline font-black text-white text-base uppercase tracking-tight">MiClubPro</span>
        </Link>
        <Link to="/#pricing" className="flex items-center gap-2 text-sm font-semibold transition-colors"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <ArrowLeft size={15} /> Volver a planes
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-8 items-start">

        {/* Left — Plan summary */}
        <div className="rounded-2xl p-6 md:sticky md:top-8" style={{ background: 'rgba(28,32,38,0.7)', border: `1px solid ${info.color}30` }}>
          <p className="text-xs font-black uppercase tracking-[0.2em] mb-1" style={{ color: info.color }}>Resumen del pedido</p>
          <h2 className="font-headline font-black text-2xl text-white mb-1">{info.label}</h2>
          <div className="flex items-end gap-1 mb-1">
            <span className="font-headline font-black text-4xl text-white">{info.price}</span>
            <span className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{info.period}</span>
          </div>
          <p className="text-xs mb-5" style={{ color: info.color }}>{info.subtext}</p>
          <div className="space-y-2 mb-6">
            {info.features.map(f => (
              <div key={f} className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                <CheckCircle2 size={15} style={{ color: info.color, flexShrink: 0 }} />
                {f}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}>
            <Lock size={13} style={{ flexShrink: 0 }} />
            Pago 100% seguro · Sin guardar datos de tarjeta
          </div>
        </div>

        {/* Right — Form + payment */}
        <div>
          <h3 className="font-headline font-bold text-xl text-white mb-5">Tus datos</h3>

          <div className="space-y-3 mb-7">
            {[
              { key: 'name', label: 'Nombre completo', placeholder: 'Juan Pérez', type: 'text' },
              { key: 'email', label: 'Email', placeholder: 'juan@ejemplo.cl', type: 'email' },
              { key: 'teamName', label: 'Nombre del equipo', placeholder: 'Los Cóndores FC', type: 'text' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={form[field.key as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
            ))}
          </div>

          {error && (
            <p className="text-sm mb-4 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,80,80,0.1)', color: '#ff8080', border: '1px solid rgba(255,80,80,0.2)' }}>
              {error}
            </p>
          )}

          <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Elige tu método de pago
          </p>

          {/* Botones de pago: mismo formato para las dos pasarelas, logo oficial a la izquierda */}
          {[
            { id: 'flow', onClick: handleFlow, loading: loadingFlow, logo: '/pagos/flow.svg', alt: 'Flow', w: 64, h: 28,
              titulo: 'Pagar con Flow', detalle: 'Webpay, tarjetas de crédito y débito, Mach y más' },
            { id: 'mp', onClick: handleMP, loading: loadingMP, logo: '/pagos/mercado-pago.png', alt: 'Mercado Pago', w: 96, h: 25,
              titulo: 'Pagar con Mercado Pago', detalle: 'Tarjetas o saldo de tu cuenta Mercado Pago' },
          ].map(p => (
            <button
              key={p.id}
              onClick={p.onClick}
              disabled={loadingMP || loadingFlow}
              aria-busy={p.loading}
              className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 rounded-xl mb-3 text-left transition-all hover:-translate-y-px active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0"
              style={{ background: '#fff', minHeight: 72, boxShadow: '0 1px 0 rgba(255,255,255,0.06), 0 6px 18px rgba(0,0,0,0.25)' }}
            >
              <span className="flex items-center justify-center shrink-0 w-[84px] sm:w-[104px]">
                <img src={p.logo} alt={p.alt} width={p.w} height={p.h} style={{ width: p.w, maxWidth: '100%', height: 'auto', objectFit: 'contain' }} />
              </span>
              <span className="flex-1 min-w-0 pl-3 sm:pl-4" style={{ borderLeft: '1px solid #e6e8eb' }}>
                <span className="block text-sm font-bold" style={{ color: '#101923' }}>{p.titulo}</span>
                <span className="block text-xs mt-0.5" style={{ color: '#5b6573' }}>{p.detalle}</span>
              </span>
              {p.loading
                ? <Loader2 size={18} className="animate-spin shrink-0" style={{ color: '#101923' }} />
                : <Lock size={15} className="shrink-0" style={{ color: '#8a939f' }} />}
            </button>
          ))}

          <p className="text-xs text-center mt-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Al pagar aceptas los{' '}
            <Link to="/terminos-de-servicio" className="underline" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Términos de servicio
            </Link>{' '}
            y la{' '}
            <Link to="/politica-de-privacidad" className="underline" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Política de privacidad
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
