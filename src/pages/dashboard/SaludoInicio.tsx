import { useState } from 'react';
import { Copy, Check, ShieldCheck } from 'lucide-react';

interface Props {
  nombre: string;
  rol: string;
  /** Código para que los jugadores se unan; solo lo ve el capitán. */
  codigo?: string | null;
  /** Foto de portada del equipo (Ajustes). Si hay, va de fondo detrás del saludo. */
  portada?: string | null;
}

/** "Hola, Gonzalo" con el rol y, para el capitán, el código de invitación a mano para copiarlo. */
export function SaludoInicio({ nombre, rol, codigo, portada }: Props) {
  const [copiado, setCopiado] = useState(false);
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
        </>
      )}
      <div className={portada ? 'relative' : undefined}>
      <p className="text-sm text-white/70">Bienvenido de nuevo</p>
      <h1 className="font-headline text-3xl font-black text-white tracking-tight truncate">Hola, {primerNombre}</h1>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-bold text-soccer-green"
          style={{ border: '1px solid rgba(68,243,169,0.4)', background: 'rgba(68,243,169,0.06)' }}>
          <ShieldCheck size={13} /> {rol}
        </span>
        {codigo && (
          <button type="button" onClick={copiar} title="Copiar el código para invitar jugadores"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold text-white/70 hover:text-white cursor-pointer"
            style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.08)' }}>
            Código para invitar <span className="font-headline font-bold tracking-[0.15em] text-white">{codigo}</span>
            {copiado ? <Check size={12} className="text-soccer-green" /> : <Copy size={12} />}
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
