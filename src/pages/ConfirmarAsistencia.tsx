import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type PageState = 'loading' | 'success' | 'error';

export default function ConfirmarAsistencia() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<PageState>('loading');
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const player_id = searchParams.get('player_id');
  const match_id = searchParams.get('match_id');
  const status = searchParams.get('status');

  useEffect(() => {
    const confirm = async () => {
      if (!player_id || !match_id || !status) {
        setErrorMsg('Enlace inválido. Faltan parámetros.');
        setState('error');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('confirm-attendance', {
          body: { player_id, match_id, status },
        });

        if (error || !data?.ok) {
          throw new Error(data?.error || error?.message || 'Error al registrar');
        }

        setResult(data);
        setState('success');
      } catch (err: any) {
        setErrorMsg(err.message || 'No se pudo registrar la asistencia.');
        setState('error');
      }
    };

    confirm();
  }, []);

  const isGoing = status === 'Voy';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#10141a', fontFamily: 'Manrope, sans-serif' }}
    >
      <div className="w-full max-w-sm text-center space-y-6">

        {/* Logo / app name */}
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">MiClubPro</p>

        {state === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 size={40} className="animate-spin" style={{ color: '#44f3a9' }} />
            <p className="text-white/40 text-sm">Registrando tu respuesta...</p>
          </div>
        )}

        {state === 'success' && (
          <div
            className="p-8 rounded-2xl space-y-5"
            style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{
                background: isGoing ? 'rgba(68,243,169,0.1)' : 'rgba(248,113,113,0.1)',
                border: `2px solid ${isGoing ? 'rgba(68,243,169,0.3)' : 'rgba(248,113,113,0.3)'}`,
              }}
            >
              {isGoing
                ? <CheckCircle2 size={40} style={{ color: '#44f3a9' }} />
                : <XCircle size={40} style={{ color: '#f87171' }} />
              }
            </div>

            <div>
              <h1
                className="text-2xl font-black text-white mb-1"
                style={{ fontFamily: 'Lexend, sans-serif' }}
              >
                {isGoing ? '¡Confirmado!' : 'Declinado'}
              </h1>
              {result?.player_name && (
                <p className="text-white/50 text-sm">
                  {result.player_name}, tu respuesta fue registrada.
                </p>
              )}
            </div>

            {result?.match_date && (
              <div
                className="px-4 py-3 rounded-xl text-xs"
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.35)',
                }}
              >
                <p className="capitalize">
                  {format(new Date(result.match_date), "EEEE d 'de' MMMM · HH:mm", { locale: es })}
                </p>
                {result.match_location && (
                  <p className="mt-0.5">{result.match_location}</p>
                )}
              </div>
            )}

            <Link
              to="/login"
              className="block py-3 px-6 rounded-xl font-bold text-sm transition-all hover:brightness-110"
              style={{
                background: isGoing ? '#44f3a9' : 'rgba(248,113,113,0.12)',
                color: isGoing ? '#003822' : '#f87171',
                border: isGoing ? 'none' : '1px solid rgba(248,113,113,0.2)',
              }}
            >
              Abrir la app →
            </Link>
          </div>
        )}

        {state === 'error' && (
          <div
            className="p-8 rounded-2xl space-y-5"
            style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'rgba(251,191,36,0.1)', border: '2px solid rgba(251,191,36,0.3)' }}
            >
              <AlertTriangle size={40} style={{ color: '#fbbf24' }} />
            </div>

            <div>
              <h1 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Lexend, sans-serif' }}>
                Error
              </h1>
              <p className="text-white/40 text-sm">{errorMsg}</p>
            </div>

            <Link
              to="/login"
              className="block py-3 px-6 rounded-xl font-bold text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
            >
              Ir a la app
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
