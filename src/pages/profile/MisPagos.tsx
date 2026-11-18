import { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Receipt, Upload, X, Loader2, FileText, CheckCircle2, Clock, XCircle, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Capa } from '../../components/Capa';
import { aviso, confirmar } from '../../lib/avisos';
import { clp } from '../../lib/formato';
import {
  misComprobantes, problemaDelArchivo, retirarComprobante, subirComprobante, type Comprobante, type EstadoComprobante,
} from '../../lib/api/comprobantes';

const ESTADO: Record<EstadoComprobante, { texto: string; color: string; fondo: string; Icono: typeof Clock }> = {
  por_revisar: { texto: 'Por revisar', color: '#ffd08b', fondo: 'rgba(255,208,139,0.12)', Icono: Clock },
  aprobado: { texto: 'Aprobado', color: '#44f3a9', fondo: 'rgba(68,243,169,0.12)', Icono: CheckCircle2 },
  rechazado: { texto: 'Rechazado', color: '#fca5a5', fondo: 'rgba(248,113,113,0.12)', Icono: XCircle },
};

/**
 * "Mis pagos" en Mi perfil: el jugador sube la foto o el PDF de su
 * transferencia y ve si el capitán ya la aprobó. El pago se registra en Caja
 * recién al aprobarlo (ver lib/api/comprobantes.ts).
 */
export function MisPagos({ playerId, teamId }: { playerId: string; teamId: number }) {
  const [lista, setLista] = useState<Comprobante[]>([]);
  const [cuota, setCuota] = useState(0);
  const [abierta, setAbierta] = useState(false);

  const cargar = useCallback(async () => {
    let nueva: Comprobante[] = [];
    try { nueva = await misComprobantes(playerId); } catch { /* sin red: la lista queda vacía */ }
    setLista(nueva);
  }, [playerId]);

  useEffect(() => {
    misComprobantes(playerId).then(setLista, () => setLista([]));
    supabase.from('team_settings').select('quota_amount').eq('id', teamId).single()
      .then(({ data }) => setCuota(Number(data?.quota_amount) || 0));
  }, [playerId, teamId]);

  const retirar = async (c: Comprobante) => {
    if (!(await confirmar('¿Retirar este comprobante? Podrás subir otro.'))) return;
    try { await retirarComprobante(c); await cargar(); } catch { aviso.error('No se pudo retirar.'); }
  };

  return (
    <section className="rounded-[20px] p-4" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-soccer-green">Mis pagos</h2>
        {cuota > 0 && <span className="text-xs text-white/55">Cuota {clp(cuota)}</span>}
      </div>

      <button type="button" onClick={() => setAbierta(true)}
        className="w-full h-12 rounded-full flex items-center justify-center gap-2 font-headline font-bold text-[#003822] cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #44f3a9, #00d68f)' }}>
        <Upload size={18} /> Subir comprobante
      </button>
      <p className="text-xs text-white/50 mt-2 text-center">¿Pagaste por transferencia? Sube la captura y tu capitán la aprueba.</p>

      {lista.length > 0 && (
        <ul className="mt-4 space-y-2">
          {lista.map(c => {
            const e = ESTADO[c.status];
            return (
              <li key={c.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#10141a' }}>
                <span className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center" style={{ background: e.fondo, color: e.color }}>
                  <e.Icono size={18} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-white tabular-nums">{clp(Number(c.monto_aprobado ?? c.amount))}</span>
                  <span className="block text-xs text-white/55 truncate">
                    {format(new Date(c.created_at), "d MMM", { locale: es })} · <span style={{ color: e.color }}>{e.texto}</span>
                    {c.status === 'rechazado' && c.motivo ? ` · ${c.motivo}` : ''}
                  </span>
                </span>
                {c.status === 'por_revisar' && (
                  <button type="button" onClick={() => retirar(c)} aria-label="Retirar comprobante"
                    className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-white/45 hover:text-red-300 cursor-pointer">
                    <Trash2 size={16} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {abierta && (
        <HojaSubir playerId={playerId} teamId={teamId} cuota={cuota} cerrar={() => setAbierta(false)}
          listo={() => { setAbierta(false); cargar(); aviso.ok('Comprobante enviado. Tu capitán lo revisará en Caja.'); }} />
      )}
    </section>
  );
}

function HojaSubir({ playerId, teamId, cuota, cerrar, listo }: { playerId: string; teamId: number; cuota: number; cerrar: () => void; listo: () => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState('');
  const [monto, setMonto] = useState(cuota > 0 ? String(cuota) : '');
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !enviando) cerrar(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [cerrar, enviando]);
  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista); }, [vista]);

  const elegir = (f: File | undefined) => {
    if (!f) return;
    const problema = problemaDelArchivo(f);
    if (problema) { setError(problema); return; }
    setError('');
    setArchivo(f);
    setVista(f.type.startsWith('image/') && !/hei[cf]/.test(f.type) ? URL.createObjectURL(f) : '');
  };

  const valor = Number(monto.replace(/\D/g, ''));
  const enviar = async () => {
    if (!archivo) { setError('Elige la foto o el PDF del comprobante.'); return; }
    if (!valor) { setError('Escribe cuánto pagaste.'); return; }
    setEnviando(true);
    setError('');
    try {
      await subirComprobante({ teamId, playerId, monto: valor, nota, archivo });
      listo();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar.');
      setEnviando(false);
    }
  };

  return (
    <Capa>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="hoja-comprobante">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm fade-in" onClick={() => !enviando && cerrar()} />
        <div className="relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4 scale-in"
          style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between">
            <h2 id="hoja-comprobante" className="font-headline font-bold text-lg text-white flex items-center gap-2"><Receipt size={20} className="text-soccer-green" /> Subir comprobante</h2>
            <button type="button" onClick={cerrar} disabled={enviando} aria-label="Cerrar" className="w-11 h-11 rounded-full flex items-center justify-center text-white/60 cursor-pointer" style={{ background: '#262a31' }}>
              <X size={18} />
            </button>
          </div>

          <input ref={input} type="file" accept="image/*,application/pdf" className="sr-only" aria-label="Archivo del comprobante"
            onChange={e => { elegir(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" onClick={() => input.current?.click()}
            className="w-full rounded-2xl flex flex-col items-center justify-center gap-2 text-center cursor-pointer overflow-hidden"
            style={{ minHeight: 160, background: '#10141a', border: `1.5px dashed ${archivo ? '#44f3a9' : '#31353c'}` }}>
            {vista ? (
              <img src={vista} alt="Vista previa del comprobante" className="max-h-56 w-auto object-contain" />
            ) : archivo ? (
              <><FileText size={32} className="text-soccer-green" /><span className="text-sm font-semibold text-white px-4 truncate max-w-full">{archivo.name}</span></>
            ) : (
              <><Upload size={28} className="text-white/50" /><span className="text-sm font-semibold text-white">Elegir foto o PDF</span><span className="text-xs text-white/50">Captura de la transferencia · hasta 5 MB</span></>
            )}
          </button>
          {archivo && (
            <button type="button" onClick={() => input.current?.click()} className="w-full h-10 text-sm font-semibold text-soccer-green cursor-pointer">Cambiar archivo</button>
          )}

          <div>
            <label htmlFor="cp-monto" className="block text-xs font-bold text-white/65 mb-1.5">¿Cuánto pagaste?</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-bold">$</span>
              <input id="cp-monto" inputMode="numeric" autoComplete="off" value={valor ? valor.toLocaleString('es-CL') : ''}
                onChange={e => setMonto(e.target.value)} placeholder="8.000"
                className="w-full h-14 pl-8 pr-4 rounded-2xl text-lg font-bold text-white tabular-nums outline-none focus:ring-2 focus:ring-soccer-green/50"
                style={{ background: '#10141a', border: '1.5px solid #262a31' }} />
            </div>
            {cuota > 0 && valor > cuota && <p className="text-xs text-white/55 mt-1.5">Cubre más de un mes: el saldo pasa a los meses siguientes.</p>}
          </div>

          <div>
            <label htmlFor="cp-nota" className="block text-xs font-bold text-white/65 mb-1.5">Nota para el capitán (opcional)</label>
            <input id="cp-nota" maxLength={300} value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej. Abril y mayo"
              className="w-full h-12 px-4 rounded-2xl text-[15px] text-white outline-none focus:ring-2 focus:ring-soccer-green/50"
              style={{ background: '#10141a', border: '1.5px solid #262a31' }} />
          </div>

          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

          <button type="button" onClick={enviar} disabled={enviando}
            className="w-full h-14 rounded-full flex items-center justify-center gap-2 font-headline font-bold text-[#003822] cursor-pointer disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #44f3a9, #00d68f)' }}>
            {enviando ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : 'Enviar al capitán'}
          </button>
        </div>
      </div>
    </Capa>
  );
}
