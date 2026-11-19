import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Receipt, ChevronRight, X, Loader2, ExternalLink, Check, Ban, FileText, ScanText } from 'lucide-react';
import { Capa } from '../../components/Capa';
import { useAuth } from '../../hooks/useAuth';
import { aviso } from '../../lib/avisos';
import { clp } from '../../lib/formato';
import {
  aprobarComprobante, comprobantesPorRevisar, enlaceDelArchivo, rechazarComprobante, type Comprobante,
} from '../../lib/api/comprobantes';

/**
 * Aviso en Caja con los comprobantes que subieron los jugadores. Al tocarlo se
 * revisan uno por uno: se ve la imagen, se puede corregir el monto y se
 * aprueba (registra el pago) o se rechaza con un motivo que ve el jugador.
 */
export function ComprobantesPorRevisar({ teamId, cuota, alCambiar }: { teamId: number; cuota: number; alCambiar: () => void }) {
  const [lista, setLista] = useState<Comprobante[]>([]);
  const [abierto, setAbierto] = useState(false);

  const cargar = useCallback(async () => {
    let nueva: Comprobante[] = [];
    try { nueva = await comprobantesPorRevisar(teamId); } catch { /* sin red: no se muestra el aviso */ }
    setLista(nueva);
  }, [teamId]);
  useEffect(() => { comprobantesPorRevisar(teamId).then(setLista, () => setLista([])); }, [teamId]);

  if (lista.length === 0) return null;
  const total = lista.reduce((s, c) => s + Number(c.amount), 0);

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)}
        className="w-full mb-4 p-3 pl-4 rounded-2xl flex items-center gap-3 text-left cursor-pointer"
        style={{ background: 'rgba(255,208,139,0.08)', border: '1px solid rgba(255,208,139,0.3)' }}>
        <span className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,208,139,0.15)', color: '#ffd08b' }}>
          <Receipt size={20} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-headline font-bold text-white">
            {lista.length === 1 ? '1 comprobante por revisar' : `${lista.length} comprobantes por revisar`}
          </span>
          <span className="block text-xs text-white/60">{clp(total)} en transferencias de tus jugadores</span>
        </span>
        <ChevronRight size={18} className="text-[#ffd08b] shrink-0" />
      </button>

      {abierto && (
        <HojaRevision lista={lista} cuota={cuota} cerrar={() => setAbierto(false)}
          revisado={async () => { await cargar(); alCambiar(); }} />
      )}
    </>
  );
}

function HojaRevision({ lista, cuota, cerrar, revisado }: { lista: Comprobante[]; cuota: number; cerrar: () => void; revisado: () => Promise<void> }) {
  const { user } = useAuth();
  const c = lista[0];
  const [enlace, setEnlace] = useState('');
  const [monto, setMonto] = useState('');
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [trabajando, setTrabajando] = useState<'aprobar' | 'rechazar' | null>(null);
  const esPdf = c?.file_path.toLowerCase().endsWith('.pdf');

  // Cuando la lista se vacía (se revisó el último) la hoja se cierra sola.
  useEffect(() => { if (!c) cerrar(); }, [c, cerrar]);

  // Al pasar al siguiente comprobante: su archivo y su monto (solo cambia con el id,
  // para no borrar lo que el capitán está escribiendo si la Caja se recarga).
  const id = c?.id;
  const ruta = c?.file_path;
  const montoSubido = c ? String(Number(c.amount)) : '';
  useEffect(() => {
    if (!id || !ruta) return;
    let vigente = true;
    setEnlace('');
    setMonto(montoSubido);
    setRechazando(false);
    setMotivo('');
    enlaceDelArchivo(ruta).then(u => vigente && setEnlace(u)).catch(() => vigente && setEnlace('error'));
    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !trabajando) cerrar(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [cerrar, trabajando]);

  if (!c) return null;
  const valor = Number(monto.replace(/\D/g, ''));
  const nombre = c.players?.name ?? 'Jugador';

  const aprobar = async () => {
    if (!valor) { aviso.info('Escribe el monto a registrar.'); return; }
    setTrabajando('aprobar');
    try {
      await aprobarComprobante(c, valor, cuota, user?.id ?? null);
      aviso.ok(`Pago de ${clp(valor)} registrado a ${nombre}.`);
      await revisado();
    } catch (e) { aviso.error(e instanceof Error ? e.message : 'No se pudo aprobar.'); }
    setTrabajando(null);
  };

  const rechazar = async () => {
    setTrabajando('rechazar');
    try {
      await rechazarComprobante(c, motivo, user?.id ?? null);
      aviso.ok('Comprobante rechazado. El jugador verá el motivo en su perfil.');
      await revisado();
    } catch (e) { aviso.error(e instanceof Error ? e.message : 'No se pudo rechazar.'); }
    setTrabajando(null);
  };

  return (
    <Capa>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="hoja-revision">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm fade-in" onClick={() => !trabajando && cerrar()} />
        <div className="relative w-full sm:max-w-md max-h-[94dvh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4 scale-in"
          style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <h2 id="hoja-revision" className="font-headline font-bold text-lg text-white truncate">{nombre}</h2>
              <p className="text-xs text-white/55">
                Subido el {format(new Date(c.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                {lista.length > 1 && ` · quedan ${lista.length}`}
              </p>
            </div>
            <button type="button" onClick={cerrar} disabled={!!trabajando} aria-label="Cerrar" className="w-11 h-11 rounded-full flex items-center justify-center text-white/60 cursor-pointer" style={{ background: '#262a31' }}>
              <X size={18} />
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden flex items-center justify-center" style={{ minHeight: 160, background: '#10141a' }}>
            {!enlace ? <Loader2 className="animate-spin text-white/40" />
              : enlace === 'error' ? <p className="text-sm text-white/55 p-6 text-center">No se pudo cargar el archivo.</p>
              : esPdf ? (
                <a href={enlace} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-8 text-soccer-green font-semibold">
                  <FileText size={36} /> Abrir PDF
                </a>
              ) : (
                <a href={enlace} target="_blank" rel="noopener noreferrer" aria-label="Ver comprobante en grande">
                  <img src={enlace} alt={`Comprobante de ${nombre}`} className="max-h-[32dvh] w-auto object-contain" />
                </a>
              )}
          </div>
          {enlace && enlace !== 'error' && !esPdf && (
            <a href={enlace} target="_blank" rel="noopener noreferrer" className="-mt-2 h-9 flex items-center justify-center gap-1.5 text-xs font-semibold text-white/60">
              <ExternalLink size={13} /> Ver en grande
            </a>
          )}

          {c.nota && <p className="text-sm text-white/75 p-3 rounded-xl" style={{ background: '#10141a' }}>“{c.nota}”</p>}

          <div>
            <label htmlFor="rv-monto" className="block text-xs font-bold text-white/65 mb-1.5">Monto a registrar</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-bold">$</span>
              <input id="rv-monto" inputMode="numeric" value={valor ? valor.toLocaleString('es-CL') : ''} onChange={e => setMonto(e.target.value)}
                className="w-full h-14 pl-8 pr-4 rounded-2xl text-lg font-bold text-white tabular-nums outline-none focus:ring-2 focus:ring-soccer-green/50"
                style={{ background: '#10141a', border: '1.5px solid #262a31' }} />
            </div>
            {c.monto_leido != null && (Number(c.monto_leido) === valor ? (
              <p className="text-xs text-soccer-green mt-1.5 flex items-center gap-1.5"><ScanText size={13} /> La lectura automática del comprobante también dice {clp(Number(c.monto_leido))}.</p>
            ) : (
              <button type="button" onClick={() => setMonto(String(Number(c.monto_leido)))}
                className="mt-1.5 min-h-9 text-left text-xs text-[#ffd08b] flex items-center gap-1.5 cursor-pointer">
                <ScanText size={13} className="shrink-0" /> Ojo: en la imagen se lee {clp(Number(c.monto_leido))}. Toca para usar ese monto.
              </button>
            ))}
            <p className="text-xs text-white/50 mt-1.5">Corrígelo si no coincide con la transferencia. Se aplica primero al mes pendiente más antiguo.</p>
          </div>

          {rechazando ? (
            <div className="space-y-2">
              <label htmlFor="rv-motivo" className="block text-xs font-bold text-white/65">Motivo (lo verá el jugador)</label>
              <input id="rv-motivo" maxLength={300} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. No se ve el monto" autoFocus
                className="w-full h-12 px-4 rounded-2xl text-[15px] text-white outline-none focus:ring-2 focus:ring-red-400/50"
                style={{ background: '#10141a', border: '1.5px solid #262a31' }} />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setRechazando(false)} disabled={!!trabajando} className="h-12 rounded-full text-sm font-bold text-white/70 cursor-pointer" style={{ background: '#262a31' }}>Volver</button>
                <button type="button" onClick={rechazar} disabled={!!trabajando} className="h-12 rounded-full flex items-center justify-center gap-2 text-sm font-bold text-white cursor-pointer disabled:opacity-60" style={{ background: '#b91c1c' }}>
                  {trabajando === 'rechazar' ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />} Rechazar
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <button type="button" onClick={() => setRechazando(true)} disabled={!!trabajando} className="h-14 px-5 rounded-full text-sm font-bold text-red-300 cursor-pointer" style={{ background: '#262a31' }}>
                Rechazar
              </button>
              <button type="button" onClick={aprobar} disabled={!!trabajando || !valor}
                className="h-14 rounded-full flex items-center justify-center gap-2 font-headline font-bold text-[#003822] cursor-pointer disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #44f3a9, #00d68f)' }}>
                {trabajando === 'aprobar' ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Aprobar {valor ? clp(valor) : ''}
              </button>
            </div>
          )}
        </div>
      </div>
    </Capa>
  );
}
