import type { Dispatch, SetStateAction } from 'react';
import { format } from 'date-fns';
import { RefreshCw, Users } from 'lucide-react';
import { esPartidoPorJugar, type PartidoMM } from '../../lib/matchmaking';

interface Props {
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  matches: PartidoMM[];
  selectedMatch: string;
  setSelectedMatch: Dispatch<SetStateAction<string>>;
  isPastMatch: boolean;
}

export function EncabezadoPartido({ loading, setLoading, matches, selectedMatch, setSelectedMatch, isPastMatch }: Props) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-soccer-green/10 rounded-xl border border-soccer-green/20">
          <Users className="text-soccer-green" size={22} />
        </div>
        <div>
          <p className="text-[11px] font-black text-soccer-green uppercase tracking-[0.2em] mb-0.5">Estrategia</p>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Matchmaking</h1>
        </div>
      </div>

      <div className="relative group w-full md:w-auto">
        <select 
          className="input-field bg-slate-900/40 backdrop-blur-xl border-glass-border min-w-[280px] appearance-none cursor-pointer hover:border-soccer-green/30 transition-all pr-10"
          value={selectedMatch}
          onChange={(e) => {
            setLoading(true);
            setSelectedMatch(e.target.value);
          }}
        >
          {matches.length === 0 && <option value="">No hay partidos ni formaciones guardadas</option>}
          {matches.map(m => (
            <option key={m.id} value={m.id} className="bg-slate-900 text-white">
              {esPartidoPorJugar(m) ? '⚽ Próximo' : '📅 Pasado'} · {format(new Date(m.date), 'dd/MM/yyyy')} — {m.location}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
          <RefreshCw size={14} className={loading ? 'animate-spin text-soccer-green' : ''} />
        </div>
      </div>
      {isPastMatch && (
        <span className="text-[11px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest" style={{ background: 'rgba(148,163,184,0.1)', color: 'rgba(148,163,184,0.7)', border: '1px solid rgba(148,163,184,0.2)' }}>
          👁 Solo vista
        </span>
      )}
    </div>
  );
}
