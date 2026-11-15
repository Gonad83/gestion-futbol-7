import { ShieldAlert } from 'lucide-react';

export function SinPartido() {
  return (
    <div className="glass-card p-16 text-center flex flex-col items-center gap-6 border-dashed border-2 border-glass-border/40 bg-white/2">
      <div className="w-20 h-20 rounded-3xl bg-slate-800/50 flex items-center justify-center text-slate-500 shadow-inner">
        <ShieldAlert size={40} className="opacity-40" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-black text-white uppercase italic">Calendario Vacío</h3>
        <p className="text-slate-400 max-w-xs mx-auto text-sm leading-relaxed">Primero debes agendar un partido en el calendario para poder organizar los equipos tácticos.</p>
      </div>
    </div>
  );
}
