import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { BotonGoogle } from '../components/BotonGoogle';
import { Eye, EyeOff, ArrowRight, Users, KeyRound } from 'lucide-react';

const POSICIONES = [
  'Portero',
  'Defensa Central', 'Lateral Izquierdo', 'Lateral Derecho',
  'Medio Defensivo (MCD)', 'Medio Mixto (MC)', 'Enganche / 10 (MCO)', 'Volante Izquierdo', 'Volante Derecho',
  'Delantero Centro (9)', 'Segundo Delantero', 'Extremo Izquierdo', 'Extremo Derecho',
];

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/** Traduce los errores más comunes de Supabase a algo que se entienda. */
function mensajeDe(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err ?? '');
  if (/already registered|already been registered/i.test(m)) return 'Este correo ya tiene una cuenta. Entra con "Iniciar sesión".';
  if (/password should be at least/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/invalid email|unable to validate email/i.test(m)) return 'Revisa el correo: parece que no es válido.';
  if (/rate limit|too many/i.test(m)) return 'Demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.';
  if (/Código inválido/i.test(m)) return 'Ese código no existe. Pídeselo de nuevo a tu capitán.';
  return m || 'Algo salió mal. Intenta de nuevo.';
}

const etiqueta = 'block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1.5';

/**
 * Crear cuenta de capitán. Tres casos:
 *  - sin sesión: Google (si está activado) o correo + contraseña + nombre del equipo;
 *  - con sesión pero sin equipo (volvió de Google, o entró y nunca creó uno):
 *    solo falta crear el equipo, o unirse a uno con el código del capitán;
 *  - con sesión y con equipo: va directo a su panel.
 * El perfil Arena (ciudad, comuna, formato) ya no se pide aquí: se completa en Ajustes.
 */
export default function RegisterCaptain() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: cargandoSesion, sinEquipo, teamId, refreshProfile } = useAuth();

  const planParam = params.get('plan') || 'free';
  // El enlace trae lo comprado (pro / elite) y el ciclo (mensual / anual). La base guarda el
  // ciclo como plan (monthly / annual) y solo lo acepta si existe un pago confirmado de ese correo.
  const esPagado = planParam === 'pro' || planParam === 'elite';
  const esAnual = params.get('cycle') === 'anual';
  const planBase = esPagado ? (esAnual ? 'annual' : 'monthly') : planParam;
  const planLabel = esPagado
    ? `${planParam === 'elite' ? 'Elite' : 'Pro'} ${esAnual ? 'Anual' : 'Mensual'}`
    : planParam === 'annual' ? 'Anual' : planParam === 'monthly' ? 'Mensual' : 'Prueba gratis de 1 mes';

  const nombreGoogle = (user?.user_metadata?.full_name || user?.user_metadata?.name || '') as string;

  const [name, setName] = useState(params.get('name') || '');
  const [email, setEmail] = useState(params.get('email') || '');
  const [teamName, setTeamName] = useState(params.get('team') || '');
  const [password, setPassword] = useState('');
  const [verClave, setVerClave] = useState(false);
  // Si viene del login con el código de un equipo (?codigo=), parte en «Tengo un código» con el código puesto.
  const [modo, setModo] = useState<'crear' | 'unirme'>(params.get('codigo') ? 'unirme' : 'crear');
  const [codigo, setCodigo] = useState((params.get('codigo') || '').toUpperCase());
  const [posicion, setPosicion] = useState('Medio Mixto (MC)');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  // Quien ya tiene equipo no tiene nada que hacer aquí.
  useEffect(() => {
    if (!cargandoSesion && user && !sinEquipo && teamId) navigate('/dashboard', { replace: true });
  }, [cargandoSesion, user, sinEquipo, teamId, navigate]);

  // Al volver de Google se completa el nombre con el de la cuenta.
  useEffect(() => {
    if (nombreGoogle && !name) setName(nombreGoogle);
  }, [nombreGoogle, name]);

  const crearEquipo = (ownerId: string, correo: string) => supabase.rpc('register_new_captain', {
    p_team_name: teamName.trim(),
    p_join_code: generateJoinCode(),
    p_plan: planBase,
    p_captain_name: name.trim() || correo.split('@')[0],
    p_captain_email: correo,
    p_owner_id: ownerId,
  });

  // ─── Sin sesión: cuenta nueva con correo ───────────────────────────────────
  const registrarConCorreo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (!teamName.trim()) { setError('Escribe el nombre de tu equipo.'); return; }
    setEnviando(true);
    setError('');
    try {
      const correo = email.trim().toLowerCase();
      const { data, error: errAlta } = await supabase.auth.signUp({
        email: correo,
        password,
        options: { emailRedirectTo: `${window.location.origin}/login`, data: { full_name: name.trim() } },
      });
      if (errAlta) throw errAlta;
      if (!data.user) throw new Error('No se pudo crear la cuenta');
      if (data.user.identities?.length === 0) throw new Error('already registered');

      const { error: errEquipo } = await crearEquipo(data.user.id, correo);
      if (errEquipo) throw errEquipo;

      if (!data.session) {
        navigate(`/login?registered=1&email=${encodeURIComponent(correo)}`);
        return;
      }
      await refreshProfile();
      navigate('/dashboard');
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setEnviando(false);
    }
  };

  // ─── Con sesión y sin equipo: crear el equipo ──────────────────────────────
  const completarEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    if (!teamName.trim()) { setError('Escribe el nombre de tu equipo.'); return; }
    setEnviando(true);
    setError('');
    try {
      const { error: errEquipo } = await crearEquipo(user.id, user.email.toLowerCase());
      if (errEquipo) throw errEquipo;
      await refreshProfile();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setEnviando(false);
    }
  };

  // ─── Con sesión y sin equipo: unirse con el código del capitán ─────────────
  const unirmeConCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    setEnviando(true);
    setError('');
    try {
      const { error: errUnion } = await supabase.rpc('unirse_con_codigo', {
        p_codigo: codigo.trim(),
        p_name: name.trim() || user.email.split('@')[0],
        p_email: user.email.toLowerCase(),
        p_position: posicion,
      });
      if (errUnion) throw errUnion;
      await refreshProfile();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setEnviando(false);
    }
  };

  const salir = async () => {
    await supabase.auth.signOut();
    setError('');
  };

  const conSesion = !!user && sinEquipo;

  if (cargandoSesion || (user && !sinEquipo && teamId)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#10141a' }}>
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-soccer-green" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-5 sm:p-6"
      style={{ background: '#10141a', fontFamily: 'Manrope, sans-serif' }}>
      <div className="max-w-md w-full space-y-6">

        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6" aria-label="MiClubPro, inicio">
            <img src="/logo.png" alt="" className="w-9 h-9" />
            <span className="font-headline font-black text-white text-lg tracking-tight">MiClub<span className="text-soccer-green">Pro</span></span>
          </Link>
          <h1 className="font-headline font-black text-3xl text-white tracking-tight">
            {conSesion ? 'Último paso: tu equipo' : 'Crea tu equipo'}
          </h1>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {conSesion
              ? <>Entraste como <span className="text-white font-semibold">{user?.email}</span></>
              : <>Plan <span className="font-bold text-soccer-green">{planLabel}</span>{!esPagado && ' · sin tarjeta'}</>}
          </p>
        </div>

        <div className="p-6 rounded-2xl space-y-5" style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.07)' }}>

          {error && (
            <div role="alert" className="px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          {!conSesion && (
            <>
              <BotonGoogle
                destino={`${location.pathname}${location.search}`}
                texto="Crear cuenta con Google"
                onError={setError}
              />
              {esPagado && (
                <p className="text-xs -mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Usa el mismo correo con el que pagaste para que el plan {planLabel} se active.
                </p>
              )}

              <form onSubmit={registrarConCorreo} className="space-y-4">
                <div>
                  <label htmlFor="reg-nombre" className={etiqueta}>Tu nombre</label>
                  <input id="reg-nombre" type="text" required autoComplete="name" value={name}
                    onChange={e => setName(e.target.value)} className="input-field" placeholder="Nombre y apellido" />
                </div>
                <div>
                  <label htmlFor="reg-correo" className={etiqueta}>Correo</label>
                  <input id="reg-correo" type="email" required autoComplete="email" inputMode="email" value={email}
                    onChange={e => setEmail(e.target.value)} className="input-field" placeholder="tu@correo.com" />
                </div>
                <div>
                  <label htmlFor="reg-equipo" className={etiqueta}>Nombre del equipo</label>
                  <input id="reg-equipo" type="text" required autoComplete="organization" value={teamName}
                    onChange={e => setTeamName(e.target.value)} className="input-field" placeholder="Ej: Los Cóndores FC" />
                </div>
                <div>
                  <label htmlFor="reg-clave" className={etiqueta}>Contraseña</label>
                  <div className="relative">
                    <input id="reg-clave" type={verClave ? 'text' : 'password'} required minLength={6} autoComplete="new-password"
                      value={password} onChange={e => setPassword(e.target.value)} className="input-field pr-12"
                      placeholder="Mínimo 6 caracteres" />
                    <button type="button" onClick={() => setVerClave(v => !v)}
                      aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center cursor-pointer"
                      style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {verClave ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={enviando}
                  className="btn-primary w-full py-3.5 flex items-center justify-center gap-2">
                  {enviando ? 'Creando tu equipo...' : <><span>Crear mi equipo</span><ArrowRight size={15} /></>}
                </button>
                <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Te enviaremos un correo para confirmar tu cuenta.
                </p>
              </form>
            </>
          )}

          {conSesion && (
            <>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl" role="tablist"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {([['crear', 'Crear un equipo', Users], ['unirme', 'Tengo un código', KeyRound]] as const).map(([valor, texto, Icono]) => (
                  <button key={valor} type="button" role="tab" aria-selected={modo === valor}
                    onClick={() => { setModo(valor); setError(''); }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    style={modo === valor ? { background: '#44f3a9', color: '#003822' } : { color: 'rgba(255,255,255,0.6)' }}>
                    <Icono size={14} /> {texto}
                  </button>
                ))}
              </div>

              <div>
                <label htmlFor="com-nombre" className={etiqueta}>Tu nombre</label>
                <input id="com-nombre" type="text" required autoComplete="name" value={name}
                  onChange={e => setName(e.target.value)} className="input-field" placeholder="Nombre y apellido" />
              </div>

              {modo === 'crear' ? (
                <form onSubmit={completarEquipo} className="space-y-4">
                  <div>
                    <label htmlFor="com-equipo" className={etiqueta}>Nombre del equipo</label>
                    <input id="com-equipo" type="text" required autoComplete="organization" value={teamName}
                      onChange={e => setTeamName(e.target.value)} className="input-field" placeholder="Ej: Los Cóndores FC" />
                  </div>
                  <button type="submit" disabled={enviando}
                    className="btn-primary w-full py-3.5 flex items-center justify-center gap-2">
                    {enviando ? 'Creando tu equipo...' : <><span>Crear mi equipo</span><ArrowRight size={15} /></>}
                  </button>
                  <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Plan {planLabel}. Serás el capitán y podrás invitar a tus jugadores.
                  </p>
                </form>
              ) : (
                <form onSubmit={unirmeConCodigo} className="space-y-4">
                  <div>
                    <label htmlFor="com-codigo" className={etiqueta}>Código del equipo</label>
                    <input id="com-codigo" type="text" required autoComplete="off" autoCapitalize="characters" maxLength={12}
                      value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())}
                      className="input-field tracking-[0.3em] font-bold" placeholder="ABC123" />
                    <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Te lo da tu capitán desde su panel.</p>
                  </div>
                  <div>
                    <label htmlFor="com-posicion" className={etiqueta}>Tu posición</label>
                    <select id="com-posicion" className="input-field bg-slate-900" value={posicion} onChange={e => setPosicion(e.target.value)}>
                      {POSICIONES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={enviando}
                    className="btn-primary w-full py-3.5 flex items-center justify-center gap-2">
                    {enviando ? 'Uniéndote...' : <><span>Unirme al equipo</span><ArrowRight size={15} /></>}
                  </button>
                </form>
              )}

              <button type="button" onClick={salir}
                className="w-full text-xs cursor-pointer" style={{ color: 'rgba(255,255,255,0.5)' }}>
                No soy yo: usar otra cuenta
              </button>
            </>
          )}
        </div>

        {!conSesion && (
          <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-semibold text-soccer-green underline underline-offset-2">Iniciar sesión</Link>
          </p>
        )}
        <p className="text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Al crear tu cuenta aceptas los <Link to="/terminos-de-servicio" className="underline">Términos</Link> y
          la <Link to="/politica-de-privacidad" className="underline">Política de privacidad</Link>.
        </p>
      </div>
    </div>
  );
}
