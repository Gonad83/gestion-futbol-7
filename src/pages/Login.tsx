import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, ArrowLeft, ArrowRight, KeyRound, PlusCircle, ShieldCheck } from 'lucide-react';
import { BotonGoogle } from '../components/BotonGoogle';

type Modo = 'entrar' | 'olvido' | 'codigo' | 'registro';

const POSICIONES = [
  'Portero',
  'Defensa Central', 'Lateral Izquierdo', 'Lateral Derecho',
  'Medio Defensivo (MCD)', 'Medio Mixto (MC)', 'Enganche / 10 (MCO)', 'Volante Izquierdo', 'Volante Derecho',
  'Delantero Centro (9)', 'Segundo Delantero', 'Extremo Izquierdo', 'Extremo Derecho',
];

/**
 * "Olvidé mi contraseña" ya no usa el correo de Supabase: ese servicio solo
 * alcanza a unos pocos destinatarios y la mayoría de los jugadores nunca
 * recibía el link. Ahora lo arma y lo envía nuestro servidor, con el mismo
 * correo que ya reciben las citaciones. Responde igual exista o no la cuenta,
 * para no revelar quién está registrado.
 */
async function pedirRestablecimiento(email: string) {
  const { data, error } = await supabase.functions.invoke('request-password-reset', {
    body: { email: email.trim().toLowerCase() },
  });
  if (error || !data?.ok) {
    throw new Error(data?.error || 'No pudimos enviar el correo. Intenta de nuevo en unos minutos.');
  }
}

function mensajeDe(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err ?? '');
  if (/invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/email not confirmed/i.test(m)) return 'Aún no confirmas tu correo. Revisa tu bandeja (y el spam) y toca el link que te enviamos.';
  if (/rate limit|too many/i.test(m)) return 'Demasiados intentos seguidos. Espera un minuto.';
  return m || 'Algo salió mal. Intenta de nuevo.';
}

const etiqueta = 'block text-[11px] font-bold uppercase tracking-wider text-white/60 mb-1.5';

function CampoClave({ id, valor, cambiar, autoComplete, placeholder }: { id: string; valor: string; cambiar: (v: string) => void; autoComplete: string; placeholder?: string }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={ver ? 'text' : 'password'} required value={valor} onChange={e => cambiar(e.target.value)}
        autoComplete={autoComplete} className="input-field pr-12" placeholder={placeholder ?? '••••••••'} />
      <button type="button" onClick={() => setVer(v => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/50 hover:text-white cursor-pointer">
        {ver ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

/**
 * Entrar. Capitanes y jugadores entran igual (correo y contraseña, o Google);
 * antes había que elegir pestaña "Capitán / Jugador" para hacer lo mismo.
 * Diseño basado en el concepto de Stitch (docs/diseno/login-movil-stitch.png).
 */
export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [modo, setModo] = useState<Modo>('entrar');

  const [email, setEmail] = useState(params.get('email') || localStorage.getItem('remember_email') || '');
  const [password, setPassword] = useState('');
  const [recordar, setRecordar] = useState(!!localStorage.getItem('remember_email'));

  const [codigo, setCodigo] = useState('');
  const [equipo, setEquipo] = useState<{ name: string; id: number } | null>(null);
  const [nombre, setNombre] = useState('');
  const [correoNuevo, setCorreoNuevo] = useState('');
  const [claveNueva, setClaveNueva] = useState('');
  const [posicion, setPosicion] = useState('Medio Mixto (MC)');

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  // Al crear la cuenta con correo, RegisterCaptain manda aquí con ?registered=1: hay que confirmar el correo.
  const [exito, setExito] = useState(params.get('registered') === '1'
    ? `¡Tu equipo está creado! Te enviamos un correo a ${params.get('email') || 'tu casilla'} para confirmar la cuenta. Ábrelo, toca el link y luego entra aquí. Si no llega, revisa el spam.`
    : '');

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const ir = (m: Modo) => { setModo(m); setError(''); setExito(''); };

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    if (recordar) localStorage.setItem('remember_email', email);
    else localStorage.removeItem('remember_email');
    const limite = new Promise<never>((_, r) => setTimeout(() => r(new Error('timeout')), 10000));
    try {
      const { error: err } = await Promise.race([supabase.auth.signInWithPassword({ email: email.trim(), password }), limite]);
      if (err) throw err;
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error && err.message === 'timeout' ? 'El servidor no responde. Revisa tu conexión.' : mensajeDe(err));
    } finally {
      setCargando(false);
    }
  };

  const recuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      await pedirRestablecimiento(email);
      setModo('entrar');
      setExito(`Si ${email} tiene una cuenta, te llegará un link en unos minutos. Revisa también el spam.`);
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setCargando(false);
    }
  };

  const verificarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      // Sin sesión no se pueden leer los equipos: el código se valida en la
      // base, que solo devuelve el nombre del equipo si el código existe.
      const { data, error: err } = await supabase.rpc('buscar_equipo_por_codigo', { p_codigo: codigo.trim() });
      if (err) throw err;
      const encontrado = (data as { id: number; team_name: string }[] | null)?.[0];
      if (!encontrado) { setError('Ese código no existe. Pídeselo de nuevo a tu capitán.'); return; }
      setEquipo({ name: encontrado.team_name, id: encontrado.id });
      ir('registro');
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setCargando(false);
    }
  };

  const unirme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (claveNueva.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setCargando(true);
    setError('');
    try {
      const correo = correoNuevo.trim().toLowerCase();
      // Si el correo ya existe en Auth, Supabase lo indica con identities vacío.
      const { data, error: errAlta } = await supabase.auth.signUp({
        email: correo,
        password: claveNueva,
        options: { emailRedirectTo: `${window.location.origin}/login`, data: { full_name: nombre.trim() } },
      });
      if (errAlta) throw errAlta;
      if (data.user?.identities?.length === 0) throw new Error('Ese correo ya tiene cuenta: entra con él en "Entrar".');

      // Crea la ficha en el equipo del código. Si el capitán ya lo tenía en la
      // plantilla con ese correo, no se duplica: la cuenta se vincula sola.
      const { error: errUnion } = await supabase.rpc('unirse_con_codigo', {
        p_codigo: codigo.trim(), p_name: nombre.trim(), p_email: correo, p_position: posicion,
      });
      if (errUnion) throw new Error('No se pudo crear tu perfil en el equipo. Avísale a tu capitán.');

      if (data.user && !data.session) {
        setEmail(correo);
        ir('entrar');
        setExito(`¡Listo! Te enviamos un correo a ${correo} para confirmar la cuenta. Tócalo y luego entra aquí. Si no llega, usa "¿Olvidaste tu contraseña?": ese link también activa la cuenta.`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setCargando(false);
    }
  };

  const volver = (
    <button type="button" onClick={() => ir('entrar')}
      className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white py-1 -mt-1 mb-1 cursor-pointer">
      <ArrowLeft size={15} /> Volver
    </button>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5 py-8"
      style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(68,243,169,0.12) 0%, transparent 55%), #10141a' }}>
      <div className="w-full max-w-md fade-in">
        <Link to="/" className="flex flex-col items-center mb-7" aria-label="MiClubPro, inicio">
          <span className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
            style={{ background: '#181c22', border: '1px solid rgba(68,243,169,0.25)', boxShadow: '0 0 30px -8px rgba(68,243,169,0.5)' }}>
            <img src="/logo.png" alt="" className="w-11 h-11 object-contain" />
          </span>
          <span className="font-headline text-2xl font-black text-white tracking-tight">MiClub<span className="text-soccer-green">Pro</span></span>
          <span className="text-sm text-white/60 mt-0.5">Organiza tu equipo de fútbol 7</span>
        </Link>

        <div className="rounded-[24px] p-5 sm:p-6 space-y-4" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.06)' }}>
          {error && (
            <p role="alert" className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5' }}>
              {error}
            </p>
          )}
          {exito && (
            <p role="status" className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(68,243,169,0.08)', border: '1px solid rgba(68,243,169,0.25)', color: '#44f3a9' }}>
              {exito}
            </p>
          )}

          {modo === 'entrar' && (
            <>
              <h1 className="sr-only">Entrar a MiClubPro</h1>
              <BotonGoogle destino="/dashboard" onError={setError} />
              <form onSubmit={entrar} className="space-y-4">
                <div>
                  <label htmlFor="lg-correo" className={etiqueta}>Correo</label>
                  <input id="lg-correo" type="email" required inputMode="email" autoComplete="email" value={email}
                    onChange={e => setEmail(e.target.value)} className="input-field" placeholder="tu@correo.cl" />
                </div>
                <div>
                  <label htmlFor="lg-clave" className={etiqueta}>Contraseña</label>
                  <CampoClave id="lg-clave" valor={password} cambiar={setPassword} autoComplete="current-password" />
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <label className="flex items-center gap-2 text-white/70 cursor-pointer select-none py-1">
                    <input type="checkbox" checked={recordar} onChange={e => setRecordar(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: '#44f3a9' }} />
                    Recordar correo
                  </label>
                  <button type="button" onClick={() => ir('olvido')} className="text-soccer-green hover:underline py-1 cursor-pointer">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <button type="submit" disabled={cargando} className="btn-primary w-full h-12 flex items-center justify-center gap-2">
                  {cargando ? 'Entrando...' : <>Entrar <ArrowRight size={16} /></>}
                </button>
              </form>
            </>
          )}

          {modo === 'olvido' && (
            <form onSubmit={recuperar} className="space-y-4">
              {volver}
              <div>
                <h1 className="font-headline font-bold text-xl text-white">Recuperar contraseña</h1>
                <p className="text-sm text-white/60 mt-1">Te enviamos un link para crear una nueva. También sirve para activar tu cuenta si no te llegó el correo de confirmación.</p>
              </div>
              <div>
                <label htmlFor="lg-recup" className={etiqueta}>Tu correo</label>
                <input id="lg-recup" type="email" required inputMode="email" autoComplete="email" autoFocus value={email}
                  onChange={e => setEmail(e.target.value)} className="input-field" placeholder="tu@correo.cl" />
              </div>
              <button type="submit" disabled={cargando} className="btn-primary w-full h-12">
                {cargando ? 'Enviando...' : 'Enviar link'}
              </button>
            </form>
          )}

          {modo === 'codigo' && (
            <form onSubmit={verificarCodigo} className="space-y-4">
              {volver}
              <div>
                <h1 className="font-headline font-bold text-xl text-white">Únete a tu equipo</h1>
                <p className="text-sm text-white/60 mt-1">Escribe el código de 6 letras que te dio tu capitán.</p>
              </div>
              <input aria-label="Código del equipo" type="text" required maxLength={6} autoFocus autoComplete="off" autoCapitalize="characters"
                value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())}
                className="input-field text-center font-headline font-black text-2xl tracking-[0.4em] uppercase" placeholder="XXXXXX" />
              <button type="submit" disabled={cargando || codigo.trim().length < 4} className="btn-primary w-full h-12">
                {cargando ? 'Verificando...' : 'Continuar'}
              </button>
            </form>
          )}

          {modo === 'registro' && equipo && (
            <form onSubmit={unirme} className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'rgba(68,243,169,0.06)', border: '1px solid rgba(68,243,169,0.2)' }}>
                <ShieldCheck size={20} className="text-soccer-green shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-soccer-green">Equipo encontrado</p>
                  <p className="font-headline font-bold text-white truncate">{equipo.name}</p>
                </div>
                <button type="button" onClick={() => { setEquipo(null); ir('codigo'); }} aria-label="Cambiar código"
                  className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white cursor-pointer">
                  <ArrowLeft size={16} />
                </button>
              </div>
              <BotonGoogle destino={`/register-captain?codigo=${encodeURIComponent(codigo.trim())}`} texto="Unirme con Google" onError={setError} />
              <div>
                <label htmlFor="rg-nombre" className={etiqueta}>Tu nombre</label>
                <input id="rg-nombre" type="text" required autoComplete="name" value={nombre} onChange={e => setNombre(e.target.value)} className="input-field" placeholder="Nombre y apellido" />
              </div>
              <div>
                <label htmlFor="rg-correo" className={etiqueta}>Correo</label>
                <input id="rg-correo" type="email" required inputMode="email" autoComplete="email" value={correoNuevo} onChange={e => setCorreoNuevo(e.target.value)} className="input-field" placeholder="tu@correo.cl" />
              </div>
              <div>
                <label htmlFor="rg-pos" className={etiqueta}>Posición</label>
                <select id="rg-pos" value={posicion} onChange={e => setPosicion(e.target.value)} className="input-field bg-slate-900">
                  {POSICIONES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="rg-clave" className={etiqueta}>Contraseña</label>
                <CampoClave id="rg-clave" valor={claveNueva} cambiar={setClaveNueva} autoComplete="new-password" placeholder="Mínimo 6 caracteres" />
              </div>
              <button type="submit" disabled={cargando} className="btn-primary w-full h-12">
                {cargando ? 'Creando tu cuenta...' : 'Unirme al equipo'}
              </button>
            </form>
          )}
        </div>

        {modo === 'entrar' && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button type="button" onClick={() => ir('codigo')}
              className="text-left p-4 rounded-[20px] hover:bg-[#1c2026] transition-colors cursor-pointer"
              style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-[#9acbff]" style={{ background: 'rgba(154,203,255,0.1)' }}>
                <KeyRound size={18} />
              </span>
              <span className="block font-headline font-bold text-white text-sm">Soy jugador nuevo</span>
              <span className="block text-xs text-white/55 mt-0.5">Tengo el código de mi capitán</span>
            </button>
            <Link to="/register-captain"
              className="block p-4 rounded-[20px] hover:bg-[#1c2026] transition-colors"
              style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-soccer-green" style={{ background: 'rgba(68,243,169,0.1)' }}>
                <PlusCircle size={18} />
              </span>
              <span className="block font-headline font-bold text-white text-sm">Crear mi equipo</span>
              <span className="block text-xs text-white/55 mt-0.5">Prueba gratis 1 mes</span>
            </Link>
          </div>
        )}

        <Link to="/" className="flex items-center justify-center gap-1.5 text-sm text-white/55 hover:text-white mt-6 py-2">
          <ArrowLeft size={14} /> Volver al inicio
        </Link>
      </div>
    </div>
  );
}
