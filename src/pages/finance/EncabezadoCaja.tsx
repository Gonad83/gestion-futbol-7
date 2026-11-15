import { Calculator, Download, FileText } from 'lucide-react';

interface Props {
  isAdmin: boolean;
  exportToPDF: () => void;
  exportToCSV: () => void;
}

export function EncabezadoCaja({ isAdmin, exportToPDF, exportToCSV }: Props) {
  return (
    <div className="flex justify-between items-end mb-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-soccer-green/70 mb-1">Finanzas</p>
        <h1 className="font-headline text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9' }}>
            <Calculator size={18} />
          </div>
          Caja
        </h1>
      </div>
      {isAdmin && (
        <div className="flex gap-2">
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:brightness-110"
            style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
            title="Exportar como PDF"
          >
            <FileText size={15} />
            PDF
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:brightness-110"
            style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}
            title="Exportar datos actuales a Excel/CSV"
          >
            <Download size={15} />
            CSV / Excel
          </button>
        </div>
      )}
    </div>
  );
}
