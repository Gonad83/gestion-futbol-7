import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff, ArrowLeft, ArrowRight } from 'lucide-react';

type Tab = 'captain' | 'player';
type PlayerMode = 'choose' | 'new' | 'returning';

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('captain');

  // Captain login
  const [email, setEmail] = useState(localStorage.getItem('remember_email') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('remember_email'));
  const [showPassword, setShowPassword] = useState(false);

  // Player mode
  const [playerMode, setPlayerMode] = useState<PlayerMode>('choose');

  // Returning player login
  const [returningEmail, setReturningEmail] = useState('');
  const [returningPassword, setReturningPassword] = useState('');
  const [showReturningPassword, setShowReturningPassword] = useState(false);

  // New player join
  const [joinCode, setJoinCode] = useState('');
  const [joinStep, setJoinStep] = useState<1 | 2>(1);
  const [joinTeam, setJoinTeam] = useState<{ name: string; id: number } | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerEmail, setPlayerEmail] = useState('');
  const [playerPassword, setPlayerPassword] = useState('');
  const [playerConfirm, setPlayerConfirm] = useState('');
  const [playerPosition, setPlayerPosition] = useState('Medio Mixto (MC)');
  const [showPlayerPassword, setShowPlayerPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setError('');
    setSuccess('');
    setPlayerMode('choose');
    setJoinStep(1);
    setJoinCode('');
    setJoinTeam(null);
    setPassword('');
  };

  const resetPlayerMode = () => {
    setPlayerMode('choose');
    setError('');
    setSuccess('');
    setJoinStep(1);
    setJoinCode('');
    setJoinTeam(null);
    setReturningEmail('');
    setReturningPassword('');
  };

  // ─── Recuperar contraseña ────────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw err;
      setSuccess(`Enviamos un link a ${resetEmail}. Revisa tu correo.`);
      setForgotMode(false);
      setResetEmail('');
    } catch (err: any) {
      setError(err.message || 'Error al enviar el correo');
    } finally {
      setLoading(false);
    }
  };

  // ─── Capitán login ───────────────────────────────────────────────────────────
  const handleCaptainLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (rememberMe) localStorage.setItem('remember_email', email);
    else localStorage.removeItem('remember_email');

    const timeout = new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 10000));
    try {
      const { error: err }: any = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeout,
      ]);
      if (err) throw err;
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message === 'timeout'
        ? 'El servidor no responde. Revisa tu conexión.'
        : err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  // ─── Jugador registrado: login ────────────────────────────────────────────────
  const handleReturningLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: returningEmail.trim(),
        password: returningPassword,
      });
      if (err) throw err;
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Email o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  // ─── Jugador nuevo: verificar código ─────────────────────────────────────────
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('team_settings')
        .select('id, team_name, join_code')
        .ilike('join_code', joinCode.trim())
        .maybeSingle();

      if (err) throw err;
      if (!data) { setError('Código inválido. Pídele el código a tu capitán.'); return; }

      setJoinTeam({ name: data.team_name, id: data.id });
      setJoinStep(2);
    } catch (err: any) {
      setError(err.message || 'Error al verificar el código');
    } finally {
      setLoading(false);
    }
  };

  // ─── Jugador nuevo: crear cuenta ──────────────────────────────────────────────
  const handlePlayerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (playerPassword !== playerConfirm) { setError('Las contraseñas no coinciden.'); return; }
    if (playerPassword.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }

    setLoading(true);
    setError('');
    try {
      const { data: existing } = await supabase
        .from('players')
        .select('id')
        .ilike('email', playerEmail.trim())
        .maybeSingle();
      if (existing) { setError('Este email ya tiene un perfil. Usa "Ya tengo cuenta" para entrar.'); return; }

      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: playerEmail.trim(),
        password: playerPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (signUpErr) throw signUpErr;
      if (signUpData.user?.identities?.length === 0) {
        throw new Error('Este email ya tiene una cuenta. Usa "Ya tengo cuenta" para entrar.');
      }

      const { error: playerErr } = await supabase.rpc('register_new_player', {
        p_team_id: joinTeam!.id,
        p_name: playerName.trim(),
        p_email: playerEmail.trim(),
        p_position: playerPosition,
      });
      if (playerErr) throw playerErr;

      if (signUpData.user && !signUpData.session) {
        setSuccess(`¡Cuenta creada! Revisa tu correo "${playerEmail}" para confirmarla y luego entra con "Ya tengo cuenta".`);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const POSITIONS = [
    'Portero',
    'Defensa Central', 'Lateral Izquierdo', 'Lateral Derecho',
    'Medio Defensivo (MCD)', 'Medio Mixto (MC)', 'Enganche / 10 (MCO)', 'Volante Izquierdo', 'Volante Derecho',
    'Delantero Centro (9)', 'Segundo Delantero', 'Extremo Izquierdo', 'Extremo Derecho',
  ];

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="glass-card w-full max-w-md fade-in">

        {/* Branding */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl flex items-center justify-center p-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-headline text-4xl font-black text-white mb-1 uppercase italic tracking-tight">
            Club <span className="text-soccer-green">Pro</span>
          </h1>
          <p className="text-white/30 text-sm">Plataforma de Gestión Deportiva</p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 mb-6 rounded-xl gap-1"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={() => switchTab('captain')}
            className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider"
            style={tab === 'captain'
              ? { background: '#44f3a9', color: '#003822', boxShadow: '0 2px 12px rgba(68,243,169,0.3)' }
              : { color: 'rgba(255,255,255,0.35)' }}
          >
            🏆 Capitán
          </button>
          <button
            onClick={() => switchTab('player')}
            className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider"
            style={tab === 'player'
              ? { background: '#44f3a9', color: '#003822', boxShadow: '0 2px 12px rgba(68,243,169,0.3)' }
              : { color: 'rgba(255,255,255,0.35)' }}
          >
            ⚽ Jugador
          </button>
        </div>

        {/* Feedback */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(68,243,169,0.08)', border: '1px solid rgba(68,243,169,0.2)', color: '#44f3a9' }}>
            {success}
          </div>
        )}

        {/* ─── CAPITÁN TAB ─────────────────────────────────────────────────────── */}
        {tab === 'captain' && !forgotMode && (
          <form onSubmit={handleCaptainLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-field" placeholder="capitan@club.com" required />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Contraseña</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} className="input-field pr-11"
                  placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button type="button" onClick={() => { setForgotMode(true); setError(''); setSuccess(''); }}
                className="mt-1.5 text-xs text-white/30 hover:text-soccer-green transition-colors">
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input id="remember" type="checkbox" checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded" style={{ accentColor: '#44f3a9' }} />
              <label htmlFor="remember" className="text-sm text-white/35 cursor-pointer select-none">Recordar email</label>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Entrando...' : 'Entrar como Capitán'}
            </button>
            <div className="pt-3 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs text-white/30 mb-2">¿No tienes equipo aún?</p>
              <Link to="/landing"
                className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{ background: 'rgba(68,243,169,0.08)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.15)' }}>
                Crear mi equipo <ArrowRight size={13} />
              </Link>
            </div>
          </form>
        )}

        {tab === 'captain' && forgotMode && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Tu email</label>
              <input type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                className="input-field" placeholder="capitan@club.com" autoFocus />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Enviando...' : 'Enviar link de recuperación'}
            </button>
            <button type="button" onClick={() => { setForgotMode(false); setError(''); }}
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white transition-colors mx-auto">
              <ArrowLeft size={13} /> Volver al login
            </button>
          </form>
        )}

        {/* ─── JUGADOR TAB ─────────────────────────────────────────────────────── */}
        {tab === 'player' && playerMode === 'choose' && (
          <div className="space-y-3">
            <p className="text-center text-white/40 text-sm pb-1">¿Cómo quieres entrar?</p>

            {/* Ya tengo cuenta */}
            <button
              onClick={() => setPlayerMode('returning')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all group hover:translate-y-[-1px]"
              style={{ background: 'rgba(68,243,169,0.07)', border: '1px solid rgba(68,243,169,0.2)' }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                style={{ background: 'rgba(68,243,169,0.1)' }}>
                🔑
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="font-bold text-white text-sm">Ya tengo cuenta</p>
                <p className="text-[11px] text-white/35 mt-0.5">Entra con tu email y contraseña</p>
              </div>
              <ArrowRight size={15} className="text-soccer-green/50 group-hover:text-soccer-green transition-colors flex-shrink-0" />
            </button>

            {/* Soy nuevo */}
            <button
              onClick={() => setPlayerMode('new')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all group hover:translate-y-[-1px]"
              style={{ background: 'rgba(154,203,255,0.07)', border: '1px solid rgba(154,203,255,0.2)' }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                style={{ background: 'rgba(154,203,255,0.1)' }}>
                ⚽
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="font-bold text-white text-sm">Soy nuevo</p>
                <p className="text-[11px] text-white/35 mt-0.5">Tengo el código de mi capitán</p>
              </div>
              <ArrowRight size={15} className="text-[#9acbff]/50 group-hover:text-[#9acbff] transition-colors flex-shrink-0" />
            </button>
          </div>
        )}

        {/* ─── JUGADOR REGISTRADO ───────────────────────────────────────────────── */}
        {tab === 'player' && playerMode === 'returning' && (
          <form onSubmit={handleReturningLogin} className="space-y-4">
            <button type="button" onClick={resetPlayerMode}
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors mb-2">
              <ArrowLeft size={13} /> Volver
            </button>

            <div className="flex items-center gap-3 p-3 rounded-xl mb-2"
              style={{ background: 'rgba(68,243,169,0.06)', border: '1px solid rgba(68,243,169,0.15)' }}>
              <span className="text-lg">🔑</span>
              <p className="text-xs text-white/50">Ingresa con el email y contraseña que usaste al registrarte.</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Email</label>
              <input type="email" value={returningEmail} onChange={e => setReturningEmail(e.target.value)}
                className="input-field" placeholder="tu@email.com" required />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Contraseña</label>
              <div className="relative">
                <input type={showReturningPassword ? 'text' : 'password'} value={returningPassword}
                  onChange={e => setReturningPassword(e.target.value)} className="input-field pr-11"
                  placeholder="••••••••" required />
                <button type="button" onClick={() => setShowReturningPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {showReturningPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Entrando...' : 'Entrar al equipo'}
            </button>
          </form>
        )}

        {/* ─── JUGADOR NUEVO: código ────────────────────────────────────────────── */}
        {tab === 'player' && playerMode === 'new' && joinStep === 1 && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <button type="button" onClick={resetPlayerMode}
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors mb-2">
              <ArrowLeft size={13} /> Volver
            </button>

            <div className="text-center pb-1">
              <p className="text-white/40 text-sm">Ingresa el código que te dio tu capitán</p>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Código del equipo</label>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                className="input-field text-center font-black tracking-[0.4em] uppercase"
                style={{ fontSize: '1.5rem', letterSpacing: '0.4em' }}
                placeholder="XXXXXX"
                maxLength={6}
                required
              />
              <p className="text-[10px] mt-2 text-center text-white/25">6 caracteres · ejemplo: EB0L0F</p>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Verificando...' : 'Verificar código'}
            </button>
          </form>
        )}

        {/* ─── JUGADOR NUEVO: registro ──────────────────────────────────────────── */}
        {tab === 'player' && playerMode === 'new' && joinStep === 2 && (
          <form onSubmit={handlePlayerRegister} className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl mb-2"
              style={{ background: 'rgba(68,243,169,0.06)', border: '1px solid rgba(68,243,169,0.2)' }}>
              <span className="text-lg">⚽</span>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-soccer-green/70">Equipo verificado</p>
                <p className="font-bold text-white text-sm truncate">{joinTeam?.name}</p>
              </div>
              <button type="button" onClick={() => { setJoinStep(1); setJoinTeam(null); setError(''); }}
                className="text-white/30 hover:text-white transition-colors">
                <ArrowLeft size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Nombre completo</label>
                <input type="text" required value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  className="input-field" placeholder="Tu nombre" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Email</label>
                <input type="email" required value={playerEmail}
                  onChange={e => setPlayerEmail(e.target.value)}
                  className="input-field" placeholder="tu@email.com" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Posición</label>
                <select value={playerPosition} onChange={e => setPlayerPosition(e.target.value)}
                  className="input-field" style={{ background: 'rgba(49,53,60,0.8)' }}>
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Contraseña</label>
                <div className="relative">
                  <input type={showPlayerPassword ? 'text' : 'password'} required
                    value={playerPassword} onChange={e => setPlayerPassword(e.target.value)}
                    className="input-field pr-9" placeholder="Min. 6 caracteres" />
                  <button type="button" onClick={() => setShowPlayerPassword(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {showPlayerPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Confirmar</label>
                <input type={showPlayerPassword ? 'text' : 'password'} required
                  value={playerConfirm} onChange={e => setPlayerConfirm(e.target.value)}
                  className="input-field" placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
              {loading ? 'Creando cuenta...' : 'Unirme al equipo'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
