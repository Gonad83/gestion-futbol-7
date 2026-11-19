import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, Lock, Loader2, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { PRECIOS, MONTOS } from '../lib/contenidoPublico';

const MP_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-mp-preference`;
const FLOW_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-flow-preference`;
// El plan mensual con Flow es una suscripción: se inscribe la tarjeta y Flow cobra solo cada mes.
const FLOW_SUSCRIPCION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flow-suscripcion`;

type PlanId = 'pro' | 'elite';
type Cycle = 'mensual' | 'anual';
type Pasarela = 'flow' | 'mp';

const PLANES: Record<PlanId, { nombre: string; color: string; features: string[] }> = {
  pro: {
    nombre: 'Pro',
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
  elite: {
    nombre: 'Elite',
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
};

const PASARELAS: { id: Pasarela; url: string; logo: string; alt: string; w: number; h: number; titulo: string; detalle: string }[] = [
  { id: 'flow', url: FLOW_FUNCTION_URL, logo: '/pagos/flow.svg', alt: 'Flow', w: 60, h: 26, titulo: 'Flow', detalle: 'Webpay, tarjetas de crédito y débito, Mach' },
  { id: 'mp', url: MP_FUNCTION_URL, logo: '/pagos/mercado-pago.png', alt: 'Mercado Pago', w: 84, h: 22, titulo: 'Mercado Pago', detalle: 'Tarjeta o saldo de tu cuenta' },
];

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pago de un plan. Diseño basado en el concepto de Stitch
 * (docs/diseno/pago-movil-stitch.png): plan y precio arriba con el cambio
 * mensual/anual a mano, lo que incluye plegado, los datos y las dos pasarelas.
 * Los precios salen de contenidoPublico.ts, igual que en la portada.
 */
export default function Checkout() {
  const [params, setParams] = useSearchParams();
  const planId: PlanId = params.get('plan') === 'elite' ? 'elite' : 'pro';
  const cycle: Cycle = params.get('cycle') === 'anual' ? 'anual' : 'mensual';
  const plan = PLANES[planId];
  const monto = MONTOS[planId][cycle];
  const etiqueta = `Plan ${plan.nombre} ${cycle === 'anual' ? 'Anual' : 'Mensual'}`;
  const otroPlan: PlanId = planId === 'pro' ? 'elite' : 'pro';

  // Cambiar plan o ciclo reescribe el enlace (sin sumar pasos al "atrás"), así
  // se conservan el correo y el equipo que trae quien renueva desde el panel.
  const cambiar = (clave: 'plan' | 'cycle', valor: string) => {
    const nuevos = new URLSearchParams(params);
    nuevos.set(clave, valor);
    nuevos.delete('pago');
    setParams(nuevos, { replace: true });
  };

  // Quien renueva desde el panel llega con su correo y su equipo en el enlace. El pago se asocia
  // al equipo por el correo, así que debe ser el mismo de la cuenta.
  const [form, setForm] = useState({ name: params.get('name') || '', email: params.get('email') || '', teamName: params.get('team') || '' });
  const [cargando, setCargando] = useState<Pasarela | null>(null);
  const [verIncluye, setVerIncluye] = useState(false);
  const [intento, setIntento] = useState(false);
  // Al volver de Flow sin pagar (ver la función flow-return) se avisa aquí, con el formulario lleno.
  const [error, setError] = useState(() => {
    const pago = params.get('pago');
    if (pago === 'rechazado') return 'El pago fue rechazado y no se te cobró nada. Puedes intentarlo de nuevo con otro medio de pago.';
    if (pago === 'cancelado') return 'No se completó el pago y no se te cobró nada. Cuando quieras, vuelve a intentarlo.';
    return '';
  });

  const faltas = {
    name: !form.name.trim() ? 'Escribe tu nombre.' : '',
    email: !form.email.trim() ? 'Escribe tu correo.' : !CORREO.test(form.email.trim()) ? 'Revisa el correo, parece incompleto.' : '',
    teamName: !form.teamName.trim() ? 'Escribe el nombre del equipo.' : '',
  };
  const valido = !faltas.name && !faltas.email && !faltas.teamName;

  const pagar = async (p: (typeof PASARELAS)[number]) => {
    setIntento(true);
    if (!valido) { setError(''); document.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus(); return; }
    setError('');
    setCargando(p.id);
    try {
      const url = p.id === 'flow' && cycle === 'mensual' ? FLOW_SUSCRIPCION_URL : p.url;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          plan: planId, cycle, amount: monto, planLabel: etiqueta, origin: window.location.origin,
          payer: { name: form.name.trim(), email: form.email.trim(), teamName: form.teamName.trim() },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'No se pudo crear el pago.');
      // En la misma pestaña: abrir una nueva después de esperar la respuesta lo
      // bloquean los celulares (Safari sobre todo) y el botón parecía no hacer nada.
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Error al conectar con ${p.alt}.`);
      setCargando(null);
    }
  };

  const campos = [
    { key: 'name', label: 'Tu nombre', placeholder: 'Juan Pérez', type: 'text', auto: 'name', ayuda: '' },
    { key: 'email', label: 'Correo', placeholder: 'juan@ejemplo.cl', type: 'email', auto: 'email', ayuda: 'Usa el mismo correo de tu cuenta: así el plan queda en tu equipo.' },
    { key: 'teamName', label: 'Nombre del equipo', placeholder: 'Los Cóndores FC', type: 'text', auto: 'organization', ayuda: '' },
  ] as const;

  return (
    <div className="min-h-[100dvh] text-white" style={{ background: '#10141a', fontFamily: 'Manrope, sans-serif' }}>
      <nav className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/#pricing" className="h-11 -ml-2 px-2 flex items-center gap-2 font-headline font-bold text-soccer-green">
          <ArrowLeft size={18} /> Planes
        </Link>
        <span className="h-9 px-3 rounded-full flex items-center gap-1.5 text-xs font-bold text-white/70" style={{ background: '#181c22', border: '1px solid #262a31' }}>
          <Lock size={13} /> Pago seguro
        </span>
      </nav>

      <main className="max-w-4xl mx-auto px-4 pb-10 md:pt-6 grid md:grid-cols-2 gap-6 md:gap-8 items-start">
        <section aria-label="Tu plan" className="rounded-[20px] p-5 md:sticky md:top-6" style={{ background: '#181c22', border: '1px solid #262a31' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">Tu plan</p>
              <h1 className="font-headline font-black text-3xl mt-0.5" style={{ color: plan.color }}>{plan.nombre}</h1>
              <button type="button" onClick={() => cambiar('plan', otroPlan)} className="mt-1 py-1 text-xs font-semibold text-white/55 underline underline-offset-2 cursor-pointer">
                Cambiar a {PLANES[otroPlan].nombre}
              </button>
            </div>
            <div className="text-right">
              <p className="font-headline font-black text-[34px] leading-none tabular-nums">
                {PRECIOS[planId][cycle]}<span className="text-sm font-semibold text-white/55 ml-0.5">/mes</span>
              </p>
              <p className="text-xs text-white/60 mt-1.5">{cycle === 'anual' ? PRECIOS[planId].notaAnual : 'Cancela cuando quieras'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl mt-4" style={{ background: '#10141a' }} role="radiogroup" aria-label="Forma de pago">
            {(['mensual', 'anual'] as const).map(c => (
              <button key={c} type="button" role="radio" aria-checked={cycle === c} onClick={() => cambiar('cycle', c)}
                className="h-11 rounded-lg text-sm font-bold transition-colors cursor-pointer"
                style={cycle === c ? { background: '#44f3a9', color: '#003822' } : { color: 'rgba(255,255,255,0.7)' }}>
                {c === 'mensual' ? 'Mensual' : <>Anual <span style={{ color: cycle === c ? '#003822' : '#44f3a9' }}>-20%</span></>}
              </button>
            ))}
          </div>

          <button type="button" onClick={() => setVerIncluye(v => !v)} aria-expanded={verIncluye}
            className="w-full h-12 mt-3 flex items-center justify-between text-sm font-semibold text-white/80 cursor-pointer md:hidden" style={{ borderTop: '1px solid #262a31' }}>
            Ver lo que incluye ({plan.features.length})
            <ChevronDown size={18} className="transition-transform" style={{ transform: verIncluye ? 'rotate(180deg)' : 'none' }} />
          </button>
          <ul className={`${verIncluye ? 'block' : 'hidden'} md:block space-y-2 pt-1 md:pt-4 md:mt-4 md:border-t md:border-[#262a31]`}>
            {plan.features.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" style={{ color: plan.color }} /> {f}
              </li>
            ))}
          </ul>
        </section>

        <div>
          <h2 className="font-headline font-bold text-xl mb-3">Tus datos</h2>
          <div className="space-y-3">
            {campos.map(c => {
              const falta = intento ? faltas[c.key] : '';
              return (
                <div key={c.key}>
                  <label htmlFor={`pago-${c.key}`} className="block text-xs font-bold text-white/65 mb-1.5">{c.label}</label>
                  <input id={`pago-${c.key}`} type={c.type} autoComplete={c.auto} placeholder={c.placeholder}
                    inputMode={c.type === 'email' ? 'email' : undefined} autoCapitalize={c.type === 'email' ? 'none' : 'words'}
                    value={form[c.key]} onChange={e => setForm(p => ({ ...p, [c.key]: e.target.value }))}
                    aria-invalid={!!falta} aria-describedby={falta || c.ayuda ? `pago-${c.key}-nota` : undefined}
                    className="w-full h-14 rounded-2xl px-4 text-base text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-soccer-green/50"
                    style={{ background: '#181c22', border: `1.5px solid ${falta ? '#f87171' : '#262a31'}` }} />
                  {(falta || c.ayuda) && (
                    <p id={`pago-${c.key}-nota`} className={`text-xs mt-1.5 ${falta ? 'text-red-300' : 'text-white/50'}`}>{falta || c.ayuda}</p>
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <p role="alert" className="flex gap-2 text-sm mt-5 px-4 py-3 rounded-xl text-red-200" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}>
              <AlertCircle size={17} className="shrink-0 mt-0.5" /> {error}
            </p>
          )}

          <h2 className="font-headline font-bold text-xl mt-7 mb-1">Paga con</h2>
          <p className="text-sm text-white/55 mb-3">
            {etiqueta} · <span className="font-bold text-white">${monto.toLocaleString('es-CL')}</span>{cycle === 'anual' ? ' en un pago' : ' este mes'}
          </p>
          <div className="space-y-3">
            {PASARELAS.map(p => (
              <button key={p.id} type="button" onClick={() => pagar(p)} disabled={cargando !== null} aria-busy={cargando === p.id}
                className="w-full min-h-[76px] flex items-center gap-3 pl-3 pr-4 py-3 rounded-2xl text-left transition-transform active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                style={{ background: '#fff', boxShadow: '0 6px 18px rgba(0,0,0,0.3)' }}>
                <span className="w-[92px] h-12 shrink-0 flex items-center justify-center rounded-xl" style={{ background: '#f3f5f7' }}>
                  <img src={p.logo} alt={p.alt} width={p.w} height={p.h} style={{ width: p.w, height: 'auto', objectFit: 'contain' }} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-headline font-bold text-[#101923]">Pagar con {p.titulo}</span>
                  <span className="block text-xs mt-0.5 text-[#5b6573]">{cycle === 'mensual'
                    ? (p.id === 'flow' ? 'Inscribes tu tarjeta y se cobra solo cada mes' : 'Pagas este mes; para el siguiente vuelves a pagar')
                    : p.detalle}</span>
                </span>
                {cargando === p.id
                  ? <Loader2 size={20} className="animate-spin shrink-0 text-[#101923]" />
                  : <ChevronRight size={20} className="shrink-0 text-[#8a939f]" />}
              </button>
            ))}
          </div>

          <p className="flex items-center justify-center gap-1.5 text-xs text-white/55 mt-5">
            <Lock size={12} /> No guardamos datos de tu tarjeta
          </p>
          <p className="text-xs text-center mt-2 text-white/50">
            Al pagar aceptas los{' '}
            <Link to="/terminos-de-servicio" className="underline text-white/70">Términos de servicio</Link>{' '}y la{' '}
            <Link to="/politica-de-privacidad" className="underline text-white/70">Política de privacidad</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
