import { useEffect, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { activarPush, desactivarPush, estadoPush, type EstadoPush } from '../lib/push';
import { aviso } from '../lib/avisos';

const CLAVE_DESCARTE = 'miclubpro:avisos-descartado';

const textos: Record<EstadoPush, string> = {
  activas: 'Te avisamos en este celular de partidos nuevos, recordatorios y cupos liberados.',
  inactivas: 'Recibe en el celular los partidos nuevos, el recordatorio del día antes y si se libera un cupo.',
  bloqueadas: 'Bloqueaste las notificaciones de MiClubPro. Actívalas en los ajustes del navegador para este sitio.',
  instalar: 'En iPhone, primero instala la app: toca Compartir → "Agregar a inicio", ábrela desde ahí y activa los avisos.',
  'no-soportado': 'Este navegador no permite notificaciones. Prueba con Chrome o con la app instalada.',
};

/**
 * Activar o desactivar los avisos en este celular.
 * `modo="tarjeta"`: aviso en el Inicio, que se puede descartar y no vuelve a salir.
 * `modo="ajuste"`: fila en Mi perfil, siempre visible.
 */
export function AvisosCelular({ modo }: { modo: 'tarjeta' | 'ajuste' }) {
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [descartado, setDescartado] = useState(() => {
    try { return localStorage.getItem(CLAVE_DESCARTE) === '1'; } catch { return false; }
  });

  useEffect(() => { estadoPush().then(setEstado).catch(() => setEstado('no-soportado')); }, []);

  if (!estado) return null;
  if (modo === 'tarjeta' && (descartado || estado === 'activas' || estado === 'no-soportado' || estado === 'bloqueadas')) return null;

  const cambiar = async () => {
    setTrabajando(true);
    try {
      const nuevo = estado === 'activas' ? await desactivarPush() : await activarPush();
      setEstado(nuevo);
      if (nuevo === 'activas') aviso.ok('Listo: te avisaremos en este celular.');
      if (nuevo === 'bloqueadas') aviso.info(textos.bloqueadas);
    } catch (e) {
      aviso.error('No se pudieron activar los avisos: ' + (e as Error).message);
    } finally {
      setTrabajando(false);
    }
  };
  const descartar = () => {
    setDescartado(true);
    try { localStorage.setItem(CLAVE_DESCARTE, '1'); } catch { /* sin almacenamiento: solo por esta vez */ }
  };
  const puedeCambiar = estado === 'activas' || estado === 'inactivas';

  if (modo === 'tarjeta') {
    return (
      <section className="relative flex items-start gap-3 p-4 rounded-[20px]" style={{ background: 'rgba(154,203,255,0.07)', border: '1px solid rgba(154,203,255,0.25)' }}>
        <span className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-[#9acbff]" style={{ background: 'rgba(154,203,255,0.12)' }}><Bell size={18} /></span>
        <div className="flex-1 min-w-0 pr-6">
          <p className="font-semibold text-white text-sm">Avisos en tu celular</p>
          <p className="text-xs text-white/65 mt-0.5">{textos[estado]}</p>
          {puedeCambiar && (
            <button type="button" onClick={cambiar} disabled={trabajando}
              className="mt-3 h-11 px-5 rounded-full text-sm font-bold cursor-pointer disabled:opacity-60" style={{ background: '#9acbff', color: '#0b2236' }}>
              {trabajando ? 'Activando…' : 'Activar avisos'}
            </button>
          )}
        </div>
        <button type="button" onClick={descartar} aria-label="No mostrar este aviso" className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center text-white/50 cursor-pointer">
          <X size={16} />
        </button>
      </section>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-semibold text-white flex items-center gap-2">{estado === 'activas' ? <Bell size={16} /> : <BellOff size={16} />} Avisos en este celular</p>
        <p className="text-xs text-white/55 mt-0.5">{textos[estado]}</p>
      </div>
      {puedeCambiar && (
        <button type="button" role="switch" aria-checked={estado === 'activas'} aria-label="Avisos en este celular" onClick={cambiar} disabled={trabajando}
          className="shrink-0 relative w-[52px] h-8 rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-60"
          style={{ background: estado === 'activas' ? '#44f3a9' : '#31353c' }}>
          <span className="absolute top-1 left-1 w-6 h-6 rounded-full shadow transition-transform duration-200"
            style={{ background: estado === 'activas' ? '#003822' : '#fff', transform: estado === 'activas' ? 'translateX(20px)' : 'translateX(0)' }} />
        </button>
      )}
    </div>
  );
}
