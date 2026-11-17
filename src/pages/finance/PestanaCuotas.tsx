import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Check, CheckCircle2, Search, X } from 'lucide-react';
import type { FilaCuota, FiltroEstado } from '../../lib/api/finanzas';
import { MONTHS, clp } from '../../lib/formato';
import { Capa } from '../../components/Capa';
import { METODOS_PAGO, esMesSinCuota, iniciales } from './cuotasMes';

interface Props {
  isAdmin: boolean;
  payments: FilaCuota[];
  quotaAmount: number;
  customAmounts: Record<string, number>;
  setCustomAmounts: Dispatch<SetStateAction<Record<string, number>>>;
  paymentMethods: Record<string, string>;
  setPaymentMethods: Dispatch<SetStateAction<Record<string, string>>>;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  statusFilter: FiltroEstado;
  setStatusFilter: Dispatch<SetStateAction<FiltroEstado>>;
  selectedMonth: number;
  selectedYear: number;
  filteredPayments: FilaCuota[];
  handleSetExempt: (fila: FilaCuota) => void | Promise<void>;
  handleUnsetExempt: (fila: FilaCuota) => void | Promise<void>;
  handleCancelPayment: (fila: FilaCuota) => void | Promise<void>;
  handlePaymentToggle: (fila: FilaCuota) => void | Promise<void>;
}

type Estado = 'pagado' | 'abonado' | 'pendiente' | 'exento' | 'sin-cuota';

function estadoDe(p: FilaCuota, mes: number): Estado {
  if (p.isExempt) return 'exento';
  if (esMesSinCuota(mes)) return 'sin-cuota';
  if (p.status === 'Pagado') return 'pagado';
  return p.amount > 0 ? 'abonado' : 'pendiente';
}

function detalle(p: FilaCuota, estado: Estado, cuota: number): { texto: string; color: string } {
  switch (estado) {
    case 'pagado': return { texto: ['Pagado', p.payment_method, clp(p.amount)].filter(Boolean).join(' · '), color: 'rgba(255,255,255,0.6)' };
    case 'abonado': return { texto: `Abonó ${clp(p.amount)} · falta ${clp(Math.max(0, cuota - p.amount))}`, color: '#9acbff' };
    case 'pendiente': return {
      texto: `Pendiente · ${p.notified_at ? `aviso enviado ${new Date(p.notified_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}` : 'sin aviso'}`,
      color: '#fca5a5',
    };
    case 'exento': return { texto: p.isManualExempt ? 'No aplica este mes' : 'Aún no era parte del equipo', color: 'rgba(255,255,255,0.5)' };
    default: return { texto: 'Mes sin cuota', color: 'rgba(255,255,255,0.5)' };
  }
}

/**
 * Lista de cuotas del mes en tarjetas (antes una tabla de 5 columnas que en el
 * celular había que deslizar de lado). Cada fila tiene una sola acción visible;
 * el monto, el medio de pago y las demás acciones van en una hoja inferior.
 */
export function PestanaCuotas({ isAdmin, payments, quotaAmount, customAmounts, setCustomAmounts, paymentMethods, setPaymentMethods, search, setSearch, statusFilter, setStatusFilter, selectedMonth, selectedYear, filteredPayments, handleSetExempt, handleUnsetExempt, handleCancelPayment, handlePaymentToggle }: Props) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const fila = payments.find(p => p.player_id === abierta) ?? null;

  const cuenta = {
    todos: payments.length,
    pendiente: payments.filter(p => p.status !== 'Pagado' && p.status !== 'Exento').length,
    pagado: payments.filter(p => p.status === 'Pagado').length,
  };

  return (
    <div>
      <div className="relative mb-3">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
        <input
          type="search"
          aria-label="Buscar jugador"
          placeholder="Buscar jugador..."
          className="w-full h-12 pl-11 pr-4 rounded-2xl text-[15px] text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-soccer-green/50"
          style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.07)' }}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto -mx-1 px-1 pb-1" role="group" aria-label="Filtrar por estado">
        {(['todos', 'pendiente', 'pagado'] as const).map(f => (
          <button key={f} type="button" onClick={() => setStatusFilter(f)} aria-pressed={statusFilter === f}
            className="shrink-0 h-9 px-4 rounded-full text-sm font-bold transition-colors cursor-pointer tabular-nums"
            style={statusFilter === f
              ? { background: '#44f3a9', color: '#003822' }
              : { background: '#262a31', color: 'rgba(255,255,255,0.7)' }}>
            {f === 'todos' ? 'Todos' : f === 'pendiente' ? 'Pendiente' : 'Pagado'} ({cuenta[f]})
          </button>
        ))}
      </div>

      {filteredPayments.length === 0 ? (
        <p className="text-center text-sm text-white/50 py-10">
          {payments.length === 0 ? 'Todavía no hay jugadores activos.' : 'Nadie coincide con la búsqueda.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {filteredPayments.map(p => {
            const estado = estadoDe(p, selectedMonth);
            const { texto, color } = detalle(p, estado, quotaAmount);
            const sePuedeAbrir = isAdmin && (estado === 'pendiente' || estado === 'abonado' || estado === 'pagado' || (estado === 'exento' && p.isManualExempt));
            return (
              <li key={p.player_id} className="flex items-center gap-3 p-3 pr-3 rounded-2xl min-h-[72px]"
                style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)', opacity: estado === 'exento' || estado === 'sin-cuota' ? 0.75 : 1 }}>
                <span className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center font-headline font-bold text-sm text-[#9acbff]"
                  style={{ background: '#10141a', border: '1px solid #262a31' }} aria-hidden="true">
                  {iniciales(p.name)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">
                    {p.name}{p.nickname && <span className="text-white/45 font-normal"> "{p.nickname}"</span>}
                  </p>
                  <p className="text-[13px] truncate" style={{ color }}>
                    {(estado === 'pendiente' || estado === 'abonado') && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: color }} />}
                    {texto}
                  </p>
                </div>

                {isAdmin && (estado === 'pendiente' || estado === 'abonado') ? (
                  <button type="button" onClick={() => setAbierta(p.player_id)} aria-label={`Registrar pago de ${p.name}`}
                    className="shrink-0 h-11 px-3.5 rounded-full flex items-center gap-1.5 text-sm font-bold text-soccer-green cursor-pointer hover:bg-soccer-green/10 transition-colors"
                    style={{ border: '1.5px solid rgba(68,243,169,0.6)' }}>
                    <Check size={15} /> Cobrar
                  </button>
                ) : estado === 'pagado' ? (
                  <button type="button" disabled={!sePuedeAbrir} onClick={() => setAbierta(p.player_id)}
                    className="shrink-0 h-9 px-3 rounded-full flex items-center gap-1.5 text-xs font-bold enabled:cursor-pointer"
                    style={{ background: '#44f3a9', color: '#003822' }}
                    aria-label={sePuedeAbrir ? `Pago de ${p.name}: ver o anular` : 'Pagado'}>
                    <CheckCircle2 size={14} /> Pagado
                  </button>
                ) : estado === 'exento' ? (
                  <button type="button" disabled={!sePuedeAbrir} onClick={() => setAbierta(p.player_id)}
                    className="shrink-0 h-9 px-3 rounded-full text-xs font-bold text-white/60 enabled:cursor-pointer"
                    style={{ background: '#262a31' }}>
                    Exento
                  </button>
                ) : estado !== 'sin-cuota' && (
                  <span className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(248,113,113,0.12)', color: '#fca5a5' }}>
                    {estado === 'abonado' ? 'Abonado' : 'Pendiente'}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {fila && (
        <HojaPago
          fila={fila}
          estado={estadoDe(fila, selectedMonth)}
          mes={`${MONTHS[selectedMonth - 1]} ${selectedYear}`}
          quotaAmount={quotaAmount}
          monto={customAmounts[fila.player_id] ?? Math.max(0, quotaAmount - Number(fila.amount || 0))}
          setMonto={n => setCustomAmounts(prev => ({ ...prev, [fila.player_id]: n }))}
          metodo={paymentMethods[fila.player_id] || 'Transferencia'}
          setMetodo={m => setPaymentMethods(prev => ({ ...prev, [fila.player_id]: m }))}
          cerrar={() => setAbierta(null)}
          pagar={() => handlePaymentToggle(fila)}
          noAplica={() => handleSetExempt(fila)}
          quitarExencion={() => handleUnsetExempt(fila)}
          anular={() => handleCancelPayment(fila)}
        />
      )}
    </div>
  );
}

interface HojaProps {
  fila: FilaCuota;
  estado: Estado;
  mes: string;
  quotaAmount: number;
  monto: number;
  setMonto: (n: number) => void;
  metodo: string;
  setMetodo: (m: string) => void;
  cerrar: () => void;
  pagar: () => void | Promise<void>;
  noAplica: () => void | Promise<void>;
  quitarExencion: () => void | Promise<void>;
  anular: () => void | Promise<void>;
}

/** Hoja inferior para registrar o corregir el pago de un jugador. */
function HojaPago({ fila, estado, mes, quotaAmount, monto, setMonto, metodo, setMetodo, cerrar, pagar, noAplica, quitarExencion, anular }: HojaProps) {
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [cerrar]);

  const hacer = (accion: () => void | Promise<void>) => async () => {
    setOcupado(true);
    try { await accion(); } finally { setOcupado(false); cerrar(); }
  };

  const debe = estado === 'pendiente' || estado === 'abonado';

  return (
    <Capa>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="hoja-pago-titulo">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm fade-in" onClick={cerrar} />
        <div className="relative w-full sm:max-w-md rounded-t-[24px] sm:rounded-[24px] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] scale-in"
          style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-4 sm:hidden" aria-hidden="true" />
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 id="hoja-pago-titulo" className="font-headline font-bold text-lg text-white truncate">{fila.name}</h2>
              <p className="text-sm text-white/55">Cuota de {mes}</p>
            </div>
            <button type="button" onClick={cerrar} aria-label="Cerrar" className="w-10 h-10 -mr-2 -mt-1 rounded-full flex items-center justify-center text-white/50 hover:text-white cursor-pointer">
              <X size={18} />
            </button>
          </div>

          {debe && (
            <div className="space-y-4">
              <div>
                <label htmlFor="hoja-monto" className="block text-[11px] font-bold uppercase tracking-wider text-white/55 mb-1.5">Monto recibido</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-bold">$</span>
                  <input id="hoja-monto" type="number" inputMode="numeric" min={1}
                    className="w-full h-12 pl-8 pr-4 rounded-xl text-lg font-headline font-bold text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-soccer-green/60"
                    style={{ background: '#10141a', border: '1.5px solid #262a31' }}
                    value={Number.isFinite(monto) ? monto : ''} onChange={e => setMonto(Number(e.target.value))} />
                </div>
                <p className="text-xs text-white/50 mt-1.5">
                  Cuota {clp(quotaAmount)}{fila.amount > 0 && ` · ya abonó ${clp(fila.amount)}`}. Si pone menos, queda como abono.
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/55 mb-1.5">Cómo pagó</p>
                <div className="grid grid-cols-3 gap-2">
                  {METODOS_PAGO.map(m => (
                    <button key={m} type="button" onClick={() => setMetodo(m)} aria-pressed={metodo === m}
                      className="h-11 rounded-xl text-sm font-bold cursor-pointer transition-colors"
                      style={metodo === m
                        ? { background: 'rgba(68,243,169,0.15)', color: '#44f3a9', border: '1.5px solid rgba(68,243,169,0.6)' }
                        : { background: '#10141a', color: 'rgba(255,255,255,0.7)', border: '1.5px solid #262a31' }}>
                      {m === 'Link de Pago' ? 'Link' : m}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" disabled={ocupado || !(monto > 0)} onClick={hacer(pagar)}
                className="btn-primary w-full h-12 flex items-center justify-center gap-2 disabled:opacity-50">
                <Check size={17} /> Registrar pago de {clp(monto > 0 ? monto : 0)}
              </button>
              <div className="flex gap-2">
                <button type="button" disabled={ocupado} onClick={hacer(noAplica)}
                  className="flex-1 h-11 rounded-xl text-sm font-semibold text-white/70 cursor-pointer" style={{ background: '#262a31' }}>
                  No aplica este mes
                </button>
                {fila.amount > 0 && (
                  <button type="button" disabled={ocupado} onClick={hacer(anular)}
                    className="flex-1 h-11 rounded-xl text-sm font-semibold text-red-300 cursor-pointer" style={{ background: 'rgba(248,113,113,0.1)' }}>
                    Anular abono
                  </button>
                )}
              </div>
            </div>
          )}

          {estado === 'pagado' && (
            <div className="space-y-4">
              <p className="text-sm text-white/70">
                Pagó <span className="font-bold text-white">{clp(fila.amount)}</span>{fila.payment_method && <> con {fila.payment_method.toLowerCase()}</>}.
              </p>
              <button type="button" disabled={ocupado} onClick={hacer(anular)}
                className="w-full h-12 rounded-xl text-sm font-bold text-red-300 cursor-pointer" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}>
                Anular este pago
              </button>
            </div>
          )}

          {estado === 'exento' && (
            <div className="space-y-4">
              <p className="text-sm text-white/70">Este mes está marcado como «no aplica» para este jugador.</p>
              <button type="button" disabled={ocupado} onClick={hacer(quitarExencion)}
                className="w-full h-12 rounded-xl text-sm font-bold text-white cursor-pointer" style={{ background: '#262a31' }}>
                Volver a cobrarle este mes
              </button>
            </div>
          )}
        </div>
      </div>
    </Capa>
  );
}
