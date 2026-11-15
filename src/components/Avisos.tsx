import { useEffect, useRef } from 'react';
import { CircleCheck, CircleAlert, Info, X, TriangleAlert, CircleHelp, type LucideIcon } from 'lucide-react';
import { cerrarAviso, useAvisos, type Pregunta, type TonoAviso } from '../lib/avisos';
import { cn } from '../lib/utils';

const ESTILO: Record<TonoAviso, { icono: LucideIcon; color: string; borde: string }> = {
  ok: { icono: CircleCheck, color: 'text-soccer-green', borde: 'border-soccer-green/30' },
  error: { icono: CircleAlert, color: 'text-red-400', borde: 'border-red-400/35' },
  info: { icono: Info, color: 'text-neon-blue', borde: 'border-neon-blue/30' },
};

/** Dibuja los avisos y la pregunta de confirmación. Va una sola vez, en App. */
export function Avisos() {
  const { avisos, pregunta } = useAvisos();

  return (
    <>
      <div
        className="fixed z-[120] inset-x-0 top-0 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] flex flex-col items-center gap-2 pointer-events-none sm:inset-x-auto sm:right-0 sm:items-end sm:pr-6 sm:pt-6"
      >
        {avisos.map((a) => {
          const { icono: Icono, color, borde } = ESTILO[a.tono];
          return (
            <div
              key={a.id}
              role={a.tono === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto fade-in w-full max-w-sm flex items-start gap-3 rounded-xl border bg-surface-high/95 backdrop-blur-xl pl-4 pr-2 py-3 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.7)]',
                borde,
              )}
            >
              <Icono size={18} className={cn('shrink-0 mt-0.5', color)} />
              <p className="flex-1 text-sm leading-snug text-white/90 whitespace-pre-line break-words">{a.mensaje}</p>
              <button
                type="button"
                aria-label="Cerrar aviso"
                onClick={() => cerrarAviso(a.id)}
                className="shrink-0 -my-1.5 w-9 h-9 flex items-center justify-center rounded-lg text-white/45 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>

      {pregunta && <DialogoConfirmar pregunta={pregunta} />}
    </>
  );
}

function DialogoConfirmar({ pregunta }: { pregunta: Pregunta }) {
  const botonCancelar = useRef<HTMLButtonElement>(null);
  const botonConfirmar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const focoAnterior = document.activeElement as HTMLElement | null;
    // En lo que no se puede deshacer, el foco parte en "Cancelar": un Enter
    // apurado no borra nada.
    (pregunta.peligro ? botonCancelar : botonConfirmar).current?.focus();

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        pregunta.responder(false);
      }
      // El foco no sale del diálogo mientras está abierto.
      if (e.key === 'Tab') {
        e.preventDefault();
        const otro = document.activeElement === botonConfirmar.current ? botonCancelar : botonConfirmar;
        otro.current?.focus();
      }
    };
    window.addEventListener('keydown', alTeclear, true);
    return () => {
      window.removeEventListener('keydown', alTeclear, true);
      focoAnterior?.focus?.();
    };
  }, [pregunta]);

  const Icono = pregunta.peligro ? TriangleAlert : CircleHelp;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-black/70 backdrop-blur-sm"
      onClick={() => pregunta.responder(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmar-mensaje"
        className="fade-in w-full max-w-sm rounded-2xl bg-surface-high border border-white/[0.08] p-5 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-5">
          <span
            className={cn(
              'shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
              pregunta.peligro ? 'bg-red-500/10 text-red-400' : 'bg-soccer-green/10 text-soccer-green',
            )}
          >
            <Icono size={20} />
          </span>
          <p id="confirmar-mensaje" className="flex-1 pt-1.5 text-[15px] leading-snug text-white whitespace-pre-line break-words">
            {pregunta.mensaje}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button ref={botonCancelar} type="button" className="btn-secondary !px-3" onClick={() => pregunta.responder(false)}>
            {pregunta.textoCancelar}
          </button>
          {pregunta.peligro ? (
            <button
              ref={botonConfirmar}
              type="button"
              onClick={() => pregunta.responder(true)}
              className="flex items-center justify-center rounded-xl py-2.5 px-3 font-bold text-white bg-red-500 hover:bg-red-400 transition-colors duration-200 active:scale-95"
            >
              {pregunta.textoConfirmar}
            </button>
          ) : (
            <button ref={botonConfirmar} type="button" className="btn-primary !px-3" onClick={() => pregunta.responder(true)}>
              {pregunta.textoConfirmar}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
