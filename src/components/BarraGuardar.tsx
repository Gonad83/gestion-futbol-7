import { Save } from 'lucide-react';
import { Capa } from './Capa';

interface Props {
  visible: boolean;
  guardando: boolean;
  guardar: () => void;
}

/**
 * Barra "Cambios sin guardar · Guardar": aparece solo cuando hay algo que
 * guardar, sobre la barra de navegación en el celular y abajo a la derecha en
 * pantallas grandes. La usan Ajustes y Mi perfil.
 */
export function BarraGuardar({ visible, guardando, guardar }: Props) {
  if (!visible) return null;
  return (
    <Capa>
      <div className="fixed inset-x-0 z-30 px-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6 md:left-auto md:right-8 md:w-[26rem] scale-in">
        <div className="flex items-center justify-between gap-3 p-2 pl-4 rounded-full"
          style={{ background: '#262a31', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 40px -10px rgba(0,0,0,0.8)' }}>
          <span className="flex items-center gap-2 text-sm text-white/80"><span className="w-2 h-2 rounded-full bg-soccer-green" /> Cambios sin guardar</span>
          <button type="button" onClick={guardar} disabled={guardando}
            className="h-11 px-6 rounded-full flex items-center gap-2 font-headline font-bold text-[#003822] cursor-pointer disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #44f3a9, #00d68f)' }}>
            <Save size={16} /> {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </Capa>
  );
}
