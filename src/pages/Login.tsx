import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState(localStorage.getItem('remember_email') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('remember_email'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const [teamSettings, setTeamSettings] = useState({ team_name: 'Fútbol 7', logo_url: '' });

  useEffect(() => {
    if (user) navigate('/');
    const loadSettings = async () => {
      try {
        const { data } = await supabase.from('team_settings').select('*').eq('id', 1).single();
        if (data) setTeamSettings(data);
      } catch (e) {
        console.error('Error loading team settings:', e);
      }
    };
    loadSettings();
  }, [user, navigate]);

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (rememberMe) {
      localStorage.setItem('remember_email', email);
    } else {
      localStorage.removeItem('remember_email');
    }

    const loginTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 10000)
    );

    try {
      const loginPromise = supabase.auth.signInWithPassword({ email, password });
      const { error: loginError }: any = await Promise.race([loginPromise, loginTimeout]);
      if (loginError) throw loginError;
      navigate('/');
    } catch (err: any) {
      if (err.message === 'timeout') {
        setError('El servidor de autenticación no responde. Revisa tu conexión.');
      } else {
        setError(err.message || 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      // Verify a player profile with this email exists (registered by admin)
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('id, name')
        .ilike('email', email.trim())
        .maybeSingle();

      if (playerError) throw playerError;

      if (!playerData) {
        setError('Este email no está registrado en el equipo. Pídele al administrador que agregue tu perfil con este correo.');
        return;
      }

      // Create the auth account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) {
        if (
          signUpError.message.toLowerCase().includes('already registered') ||
          signUpError.message.toLowerCase().includes('already been registered') ||
          signUpError.message.toLowerCase().includes('user already registered')
        ) {
          setError('Este email ya tiene una cuenta registrada. Intenta iniciar sesión.');
        } else {
          throw signUpError;
        }
        return;
      }

      if (signUpData.user && !signUpData.session) {
        // Email confirmation required by Supabase project settings
        setSuccess(
          `¡Cuenta creada para ${playerData.name}! Revisa tu correo "${email}" para confirmar tu cuenta y luego inicia sesión.`
        );
      } else {
        // Auto-confirmed — session created immediately
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="glass-card w-full max-w-md fade-in">

        {/* Team logo + name */}
        <div className="text-center mb-7">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden"
            style={{ background: 'rgba(68,243,169,0.1)', border: '2px solid rgba(68,243,169,0.25)' }}
          >
            {teamSettings.logo_url
              ? <img src={teamSettings.logo_url} alt="Logo" className="w-full h-full object-cover" />
              : <span className="text-3xl">⚽</span>
            }
          </div>
          <h1 className="font-headline text-3xl font-black text-white mb-1">{teamSettings.team_name}</h1>
          <p className="text-white/35 text-sm">Gestión de Equipo</p>
        </div>

        {/* Toggle tabs */}
        <div
          className="flex p-1 mb-6 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
              style={mode === m
                ? { background: '#44f3a9', color: '#003822', boxShadow: '0 2px 12px rgba(68,243,169,0.3)' }
                : { color: 'rgba(255,255,255,0.35)' }}
            >
              {m === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </button>
          ))}
        </div>

        {/* Feedback messages */}
        {error && (
          <div
            className="mb-5 px-4 py-3 rounded-xl text-sm leading-snug"
            style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            className="mb-5 px-4 py-3 rounded-xl text-sm leading-snug"
            style={{ background: 'rgba(68,243,169,0.08)', border: '1px solid rgba(68,243,169,0.2)', color: '#44f3a9' }}
          >
            {success}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="tu@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-11"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded"
                style={{ accentColor: '#44f3a9' }}
              />
              <label htmlFor="remember" className="text-sm text-white/35 cursor-pointer select-none">
                Recordar mi email
              </label>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Entrando...' : 'Iniciar Sesión'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">
                Tu Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="tu@email.com"
                required
              />
              <p className="text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Debe coincidir con el email que el administrador ingresó en tu perfil.
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-11"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">
                Confirmar Contraseña
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Verificando...' : 'Crear Cuenta'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
