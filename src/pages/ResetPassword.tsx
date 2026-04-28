import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase maneja el token de recovery automáticamente via onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    if (password.length < 6) { setError('Mínimo 6 caracteres.'); return; }
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#10141a', fontFamily: 'Manrope, sans-serif' }}>
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(68,243,169,0.1)', border: '2px solid rgba(68,243,169,0.3)' }}>
            {done ? <CheckCircle2 size={32} style={{ color: '#44f3a9' }} /> : <KeyRound size={32} style={{ color: '#44f3a9' }} />}
          </div>
          <h1 className="font-headline font-black text-3xl text-white tracking-tight">
            {done ? '¡Listo!' : 'Nueva contraseña'}
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {done ? 'Redirigiendo al login...' : 'Elige una contraseña segura'}
          </p>
        </div>

        {!done && (
          <div className="p-6 rounded-2xl space-y-4"
            style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.07)' }}>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                {error}
              </div>
            )}

            {!sessionReady && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(255,208,139,0.08)', border: '1px solid rgba(255,208,139,0.2)', color: '#ffd08b' }}>
                Cargando sesión de recuperación...
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Nueva contraseña</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)} className="input-field pr-11"
                    placeholder="Mínimo 6 caracteres" disabled={!sessionReady} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Confirmar contraseña</label>
                <input type={showPassword ? 'text' : 'password'} required value={confirm}
                  onChange={e => setConfirm(e.target.value)} className="input-field"
                  placeholder="••••••••" disabled={!sessionReady} />
              </div>
              <button type="submit" disabled={loading || !sessionReady} className="btn-primary w-full py-3.5">
                {loading ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
