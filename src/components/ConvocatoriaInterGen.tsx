import { useEffect, useState } from 'react';
import { Check, Copy, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { Capa } from './Capa';
import { aviso } from '../lib/avisos';
import { copiarTexto } from '../lib/copiarTexto';
import {
  contarConvocatoria, textoConvocatoria, type EstadoConvocatoria, type JugadorPlantel,
} from '../lib/convocatoria';

/**
 * Convocatoria de un partido del Inter Generaciones: quién va y quién no puede.
 * Cada jugador marca la suya; los capitanes pueden marcar por cualquiera.
 */

const VERDE = '#44f3a9';
const ROJO = '#f87171';

type Props = {
  titulo: string;
  cuando: string;
  plantel: JugadorPlantel[];
  respuestas: Map<string, EstadoConvocatoria>;
  miJugadorId: string | null;
  puedeEditar: boolean;
  onMarcar: (jugadorId: string, estado: EstadoConvocatoria | null) => void;
  onCerrar: () => void;
};

export default function ConvocatoriaInterGen({ titulo, cuando, plantel, respuestas, miJugadorId, puedeEditar, onMarcar, onCerrar }: Props) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCerrar]);

  const { van, noVan, sinResponder } = contarConvocatoria(plantel, respuestas);
  const yo = plantel.find(j => j.id === miJugadorId);
  const miRespuesta = yo ? respuestas.get(yo.id) : undefined;

  // Primero los que van, después los que faltan por responder y al final los que no pueden.
  const orden = (j: JugadorPlantel) => { const r = respuestas.get(j.id); return r === 'va' ? 0 : r === 'no_va' ? 2 : 1; };
  const lista = [...plantel].sort((a, b) => orden(a) - orden(b) || a.name.localeCompare(b.name));

  const copiar = async () => {
    if (await copiarTexto(textoConvocatoria(titulo, cuando, plantel, respuestas))) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } else {
      aviso.error('No se pudo copiar la convocatoria');
    }
  };

  /** Tocar la respuesta ya marcada la borra (vuelve a "sin responder"). */
  const alternar = (jugadorId: string, estado: EstadoConvocatoria) =>
    onMarcar(jugadorId, respuestas.get(jugadorId) === estado ? null : estado);

  return (
    <Capa>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4"
        style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onCerrar}>
        <div role="dialog" aria-modal="true" aria-label={`Convocatoria: ${titulo}`}
          className="w-full sm:max-w-md max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
          style={{ background: '#181c22' }} onClick={e => e.stopPropagation()}>
          <div className="px-5 pt-5 pb-4" style={{ background: '#0a0e14' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-soccer-green">Convocatoria</p>
                <h2 className="font-headline font-bold text-lg text-white leading-tight">{titulo}</h2>
                <p className="text-xs text-white/60 mt-0.5">{cuando}</p>
              </div>
              <button onClick={onCerrar} aria-label="Cerrar" className="p-2 rounded-full text-white/70 hover:text-white shrink-0"
                style={{ background: 'rgba(255,255,255,0.08)' }}>
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <Contador n={van} texto="Van" color={VERDE} />
              <Contador n={noVan} texto="No pueden" color={ROJO} />
              <Contador n={sinResponder} texto="Sin responder" color="rgba(255,255,255,0.7)" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
            {yo && (
              <div className="rounded-2xl p-3" style={{ background: 'rgba(68,243,169,0.08)' }}>
                <p className="text-sm font-semibold text-white mb-2">
                  {miRespuesta === 'va' ? 'Estás convocado. ¡Nos vemos!' : miRespuesta === 'no_va' ? 'Avisaste que no puedes.' : '¿Puedes ir a este partido?'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => alternar(yo.id, 'va')} aria-pressed={miRespuesta === 'va'}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                    style={miRespuesta === 'va' ? { background: VERDE, color: '#003822' } : { background: '#262a31', color: '#fff' }}>
                    <ThumbsUp size={16} /> Voy
                  </button>
                  <button onClick={() => alternar(yo.id, 'no_va')} aria-pressed={miRespuesta === 'no_va'}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                    style={miRespuesta === 'no_va' ? { background: ROJO, color: '#3b0a0a' } : { background: '#262a31', color: '#fff' }}>
                    <ThumbsDown size={16} /> No puedo
                  </button>
                </div>
              </div>
            )}

            {plantel.length === 0 ? (
              <p className="text-sm text-white/60 text-center py-8 px-4">
                Todavía no hay jugadores inscritos. Agrégalos en la pestaña Jugadores para convocarlos.
              </p>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ background: '#1c2026' }}>
                {lista.map((j, i) => {
                  const r = respuestas.get(j.id);
                  const editable = puedeEditar || j.id === miJugadorId;
                  return (
                    <div key={j.id} className="flex items-center gap-3 px-3 py-2" style={i % 2 ? { background: 'rgba(255,255,255,0.03)' } : undefined}>
                      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 text-[10px] font-bold"
                        style={{ background: 'rgba(68,243,169,0.12)', color: VERDE }}>
                        {j.photo_url
                          ? <img src={j.photo_url} alt="" className="w-full h-full object-cover" />
                          : j.name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('')}
                      </div>
                      <span className={`flex-1 min-w-0 truncate text-sm ${r === 'no_va' ? 'text-white/50 line-through' : 'text-white'}`}>
                        {j.name}{j.id === miJugadorId && <span className="text-soccer-green font-bold"> (tú)</span>}
                      </span>
                      {editable ? (
                        <span className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => alternar(j.id, 'va')} aria-pressed={r === 'va'}
                            aria-label={`${j.name} va`} title="Va"
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                            style={r === 'va' ? { background: VERDE, color: '#003822' } : { background: '#262a31', color: 'rgba(255,255,255,0.6)' }}>
                            <Check size={15} />
                          </button>
                          <button onClick={() => alternar(j.id, 'no_va')} aria-pressed={r === 'no_va'}
                            aria-label={`${j.name} no puede`} title="No puede"
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                            style={r === 'no_va' ? { background: ROJO, color: '#3b0a0a' } : { background: '#262a31', color: 'rgba(255,255,255,0.6)' }}>
                            <X size={15} />
                          </button>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shrink-0"
                          style={r === 'va' ? { background: 'rgba(68,243,169,0.12)', color: VERDE }
                            : r === 'no_va' ? { background: 'rgba(248,113,113,0.12)', color: ROJO }
                            : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                          {r === 'va' ? 'Va' : r === 'no_va' ? 'No puede' : 'Sin responder'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {plantel.length > 0 && (
            <div className="p-3" style={{ background: '#0a0e14' }}>
              <button onClick={copiar}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:brightness-110 active:scale-95"
                style={copiado
                  ? { background: 'rgba(68,243,169,0.15)', color: VERDE }
                  : { background: 'linear-gradient(135deg,#44f3a9,#00d68f)', color: '#003822' }}>
                {copiado ? <Check size={17} /> : <Copy size={17} />}
                {copiado ? 'Convocatoria copiada' : 'Copiar para WhatsApp'}
              </button>
            </div>
          )}
        </div>
      </div>
    </Capa>
  );
}

function Contador({ n, texto, color }: { n: number; texto: string; color: string }) {
  return (
    <div className="rounded-xl py-2" style={{ background: '#1c2026' }}>
      <p className="font-headline font-black text-xl tabular-nums" style={{ color }}>{n}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">{texto}</p>
    </div>
  );
}
