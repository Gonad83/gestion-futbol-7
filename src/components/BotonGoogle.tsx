import { useEffect, useState } from 'react';
import { entrarConGoogle, googleDisponible } from '../lib/accesoGoogle';

interface Props {
  /** Ruta de la app a la que se vuelve después de Google. */
  destino: string;
  texto?: string;
  onError?: (mensaje: string) => void;
  /** Línea divisoria "o con tu correo" debajo del botón. */
  conSeparador?: boolean;
}

/** Botón "Continuar con Google". No se dibuja si Google no está activado en Supabase. */
export function BotonGoogle({ destino, texto = 'Continuar con Google', onError, conSeparador = true }: Props) {
  const [visible, setVisible] = useState(false);
  const [yendo, setYendo] = useState(false);

  useEffect(() => {
    let vivo = true;
    googleDisponible().then(si => { if (vivo) setVisible(si); });
    return () => { vivo = false; };
  }, []);

  if (!visible) return null;

  const ir = async () => {
    setYendo(true);
    try {
      await entrarConGoogle(destino);
    } catch (err) {
      setYendo(false);
      onError?.(err instanceof Error ? err.message : 'No se pudo abrir Google. Intenta de nuevo.');
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={ir}
        disabled={yendo}
        className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-bold text-sm transition-all hover:brightness-95 disabled:opacity-60 cursor-pointer"
        style={{ background: '#fff', color: '#1f1f1f', border: '1px solid rgba(0,0,0,0.1)' }}
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {yendo ? 'Abriendo Google...' : texto}
      </button>
      {conSeparador && (
        <div className="flex items-center gap-3" aria-hidden="true">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>o con tu correo</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>
      )}
    </div>
  );
}
