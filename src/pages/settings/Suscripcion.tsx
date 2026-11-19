import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { aviso, confirmar } from '../../lib/avisos';

type Estado =
  | { activa: true; tier: 'pro' | 'elite'; proximoCobro: string | null; vence: string | null }
  | { activa: false; cancelada?: boolean; vence: string | null };

// Flow entrega las fechas como "2026-12-19 00:00:00", hora de Chile.
const fecha = (valor: string | null) => {
  if (!valor) return null;
  const d = new Date(valor.includes('T') ? valor : valor.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : format(d, "d 'de' MMMM", { locale: es });
};

/**
 * Suscripción mensual con Flow, en Ajustes. Solo aparece si el dueño del equipo
 * tiene una activa (o la acaba de cancelar). Cancelar no corta el plan al
 * instante: sigue hasta el fin del mes pagado y después vuelve al plan gratis.
 */
export function Suscripcion() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    let vivo = true;
    supabase.functions.invoke('flow-suscripcion-gestionar', { body: { accion: 'estado' } })
      .then(({ data }) => { if (vivo && data && !data.error) setEstado(data as Estado); });
    return () => { vivo = false; };
  }, []);

  if (!estado || (!estado.activa && !estado.cancelada)) return null;

  const cancelar = async () => {
    const hasta = fecha(estado.vence);
    const ok = await confirmar(
      `¿Cancelar la suscripción? Flow no te volverá a cobrar.${hasta ? ` Tu plan sigue activo hasta el ${hasta}` : ' Tu plan sigue activo hasta el fin del mes pagado'} y después el equipo pasa al plan gratis, sin perder nada.`,
      { textoConfirmar: 'Cancelar suscripción', textoCancelar: 'Mantenerla', peligro: true },
    );
    if (!ok) return;
    setCancelando(true);
    const { data, error } = await supabase.functions.invoke('flow-suscripcion-gestionar', { body: { accion: 'cancelar' } });
    setCancelando(false);
    if (error || !data?.cancelada) { aviso.error(data?.error || 'No se pudo cancelar. Inténtalo de nuevo en un rato.'); return; }
    setEstado(data as Estado);
    aviso.ok('Suscripción cancelada. Flow no te volverá a cobrar.');
  };

  const vence = fecha(estado.vence);
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-white/60 mb-2 px-1">Tu suscripción</h2>
      <div className="rounded-[20px] p-4 space-y-3" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>
        {estado.activa ? (
          <>
            <div>
              <p className="font-semibold text-white">Plan {estado.tier === 'elite' ? 'Elite' : 'Pro'} mensual con Flow</p>
              <p className="text-xs text-white/55 mt-0.5">
                Se cobra solo a tu tarjeta cada mes.{fecha(estado.proximoCobro) ? ` Próximo cobro: ${fecha(estado.proximoCobro)}.` : ''}
              </p>
            </div>
            <button type="button" onClick={cancelar} disabled={cancelando}
              className="h-11 px-4 rounded-full text-sm font-bold cursor-pointer disabled:opacity-60"
              style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
              {cancelando ? 'Cancelando…' : 'Cancelar suscripción'}
            </button>
          </>
        ) : (
          <div>
            <p className="font-semibold text-white">Suscripción cancelada</p>
            <p className="text-xs text-white/55 mt-0.5">
              Flow no te volverá a cobrar. {vence ? `Tu plan sigue activo hasta el ${vence}.` : 'Tu plan sigue activo hasta el fin del mes pagado.'} Después el equipo pasa al plan gratis, sin perder nada.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
