import { useEffect, useState } from 'react';
import { Copy, Check, Maximize2, ShieldCheck, X } from 'lucide-react';
import { Capa } from '../../components/Capa';

interface Props {
  nombre: string;
  rol: string;
  /** Código para que los jugadores se unan; solo lo ve el capitán. */
  codigo?: string | null;
  /** Foto de portada del equipo (Ajustes). Si hay, va de fondo detrás del saludo. */
  portada?: string | null;
}

/** La foto de portada a pantalla completa; se cierra con la X, tocando fuera o con Escape. */
function FotoCompleta({ foto, cerrar }: { foto: string; cerrar: () => void }) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    window.addEventListener('keydown', alTeclear);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', alTeclear); document.body.style.overflow = antes; };
  }, [cerrar]);

  return (
    <Capa>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 fade-in" style={{ background: 'rgba(0,0,0,0.92)' }}
        onClick={cerrar} role="dialog" aria-modal="true" aria-label="Foto del equipo">
        <img src={foto} alt="Foto del equipo" className="max-w-full max-h-full object-contain rounded-xl scale-in" onClick={e => e.stopPropagation()} />
        <button type="button" onClick={cerrar} aria-label="Cerrar"
          className="absolute top-[calc(0.75rem+env(safe-area-inset-top))] right-3 w-11 h-11 rounded-full flex items-center justify-center text-white cursor-pointer"
          style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <X size={20} />
        </button>
      </div>
    </Capa>
  );
}

/** "Hola, Gonzalo" con el rol y, para el capitán, el código de invitación a mano para copiarlo. */
export function SaludoInicio({ nombre, rol, codigo, portada }: Props) {
  const [copiado, setCopiado] = useState(false);
  const [fotoAbierta, setFotoAbierta] = useState(false);
  const primerNombre = nombre.trim().split(/\s+/)[0] || 'crack';

  const copiar = async () => {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* el navegador no deja copiar: el código igual está a la vista */ }
  };

  return (
    <div className={portada ? 'relative rounded-[20px] overflow-hidden p-4 pt-16' : undefined}>
      {portada && (
        <>
          <img src={portada} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(16,20,26,0.15) 0%, rgba(16,20,26,0.92) 75%)' }} />
          {/* Toda la portada abre la foto; el saludo va encima y deja pasar el toque. */}
          <button type="button" onClick={() => setFotoAbierta(true)} aria-label="Ver la foto del equipo en grande" className="absolute inset-0 cursor-zoom-in" />
          <span className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white/85 pointer-events-none" aria-hidden="true"
            style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.18)' }}>
            <Maximize2 size={14} />
          </span>
        </>
      )}
      <div className={portada ? 'relative pointer-events-none' : undefined}>
      <p className="text-sm text-white/70">Bienvenido de nuevo</p>
      <h1 className="font-headline text-3xl font-black text-white tracking-tight truncate">Hola, {primerNombre}</h1>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-bold text-soccer-green"
          style={{ border: '1px solid rgba(68,243,169,0.4)', background: 'rgba(68,243,169,0.06)' }}>
          <ShieldCheck size={13} /> {rol}
        </span>
        {codigo && (
          <button type="button" onClick={copiar} title="Copiar el código para invitar jugadores"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold text-white/70 hover:text-white cursor-pointer pointer-events-auto"
            style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.08)' }}>
            Código para invitar <span className="font-headline font-bold tracking-[0.15em] text-white">{codigo}</span>
            {copiado ? <Check size={12} className="text-soccer-green" /> : <Copy size={12} />}
          </button>
        )}
      </div>
      </div>
      {portada && fotoAbierta && <FotoCompleta foto={portada} cerrar={() => setFotoAbierta(false)} />}
    </div>
  );
}
