import { useEffect, useRef, useState } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';

interface Props {
  isAdmin: boolean;
  exportToPDF: () => void;
  exportToCSV: () => void;
}

/** Título de Caja. Exportar (solo capitán) va en un menú para no competir con el título en el celular. */
export function EncabezadoCaja({ isAdmin, exportToPDF, exportToCSV }: Props) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    document.addEventListener('keydown', cerrar);
    return () => { document.removeEventListener('mousedown', cerrar); document.removeEventListener('keydown', cerrar); };
  }, [abierto]);

  const opcion = (accion: () => void) => () => { setAbierto(false); accion(); };

  return (
    <div className="flex justify-between items-end mb-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-soccer-green mb-1">Finanzas</p>
        <h1 className="font-headline text-3xl font-black text-white tracking-tight">Caja</h1>
      </div>
      {isAdmin && (
        <div className="relative" ref={caja}>
          <button
            type="button"
            onClick={() => setAbierto(v => !v)}
            aria-haspopup="menu"
            aria-expanded={abierto}
            aria-label="Exportar la caja"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white/80 hover:text-soccer-green transition-colors cursor-pointer"
            style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Download size={18} />
          </button>
          {abierto && (
            <div role="menu" className="absolute right-0 top-full mt-2 z-30 w-52 p-1.5 rounded-xl scale-in"
              style={{ background: '#262a31', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 40px -12px rgba(0,0,0,0.7)' }}>
              <button type="button" role="menuitem" onClick={opcion(exportToPDF)} title="Exportar como PDF"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-white hover:bg-white/5 cursor-pointer">
                <FileText size={16} className="text-red-400" /> Exportar como PDF
              </button>
              <button type="button" role="menuitem" onClick={opcion(exportToCSV)} title="Exportar a Excel"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-white hover:bg-white/5 cursor-pointer">
                <FileSpreadsheet size={16} className="text-soccer-green" /> Exportar a Excel (CSV)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
