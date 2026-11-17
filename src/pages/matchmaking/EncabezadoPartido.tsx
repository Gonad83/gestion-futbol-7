import type { Dispatch, SetStateAction } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, ChevronDown, Eye, RefreshCw } from 'lucide-react';
import { esPartidoPorJugar, type PartidoMM } from '../../lib/matchmaking';

interface Props {
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  matches: PartidoMM[];
  selectedMatch: string;
  setSelectedMatch: Dispatch<SetStateAction<string>>;
  isPastMatch: boolean;
}

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Título y selector del partido, como una tarjeta que se toca para cambiar de partido. */
export function EncabezadoPartido({ loading, setLoading, matches, selectedMatch, setSelectedMatch, isPastMatch }: Props) {
  const actual = matches.find(m => m.id === selectedMatch);
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-soccer-green mb-1">Matchmaking</p>
          <h1 className="font-headline text-3xl font-black text-white tracking-tight">Armar equipos</h1>
        </div>
        {isPastMatch && (
          <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-bold text-white/65" style={{ background: '#262a31' }}>
            <Eye size={13} /> Solo vista
          </span>
        )}
      </div>

      <label className="relative flex items-center gap-3 p-3 pr-10 rounded-[18px] cursor-pointer" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-soccer-green" style={{ background: 'rgba(68,243,169,0.1)' }}>
          {loading ? <RefreshCw size={18} className="animate-spin" /> : <CalendarDays size={18} />}
        </span>
        <span className="flex-1 min-w-0">
          {actual ? (
            <>
              <span className="flex items-center gap-2">
                <span className="font-headline font-bold text-white truncate">{mayuscula(format(new Date(actual.date), "EEEE d MMM '·' HH:mm", { locale: es }))}</span>
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold"
                  style={esPartidoPorJugar(actual) ? { background: 'rgba(68,243,169,0.15)', color: '#44f3a9' } : { background: '#262a31', color: 'rgba(255,255,255,0.6)' }}>
                  {esPartidoPorJugar(actual) ? 'Próximo' : 'Pasado'}
                </span>
              </span>
              <span className="block text-sm text-white/60 truncate">{actual.location || 'Sin cancha'}</span>
            </>
          ) : (
            <span className="text-sm text-white/60">{matches.length === 0 ? 'No hay partidos ni formaciones guardadas' : 'Elige un partido'}</span>
          )}
        </span>
        <ChevronDown size={18} className="absolute right-4 text-white/50 pointer-events-none" />
        {/* El selector nativo queda encima, invisible: en el celular abre la lista del sistema. */}
        <select
          aria-label="Partido"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          value={selectedMatch}
          onChange={(e) => { setLoading(true); setSelectedMatch(e.target.value); }}
        >
          {matches.length === 0 && <option value="">No hay partidos ni formaciones guardadas</option>}
          {matches.map(m => (
            <option key={m.id} value={m.id}>
              {esPartidoPorJugar(m) ? 'Próximo' : 'Pasado'} · {format(new Date(m.date), 'dd/MM/yyyy HH:mm')} — {m.location}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
