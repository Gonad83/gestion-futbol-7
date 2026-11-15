/**
 * Avisos y confirmaciones propias de la app.
 *
 * Reemplazan a alert() y confirm() del navegador, que cortan todo, se ven
 * distinto en cada teléfono y en la app instalada muestran la dirección web.
 *
 *   aviso.ok('Pago registrado');
 *   aviso.error('Error al guardar: ' + error.message);
 *   if (!(await confirmar('¿Eliminar este gasto?'))) return;
 *
 * Se pueden llamar desde cualquier parte; quien los dibuja es <Avisos />,
 * montado una sola vez en App.
 */
import { useSyncExternalStore } from 'react';

export type TonoAviso = 'ok' | 'error' | 'info';

export interface Aviso {
  id: number;
  tono: TonoAviso;
  mensaje: string;
}

export interface OpcionesConfirmar {
  /** Botón rojo, para lo que no se puede deshacer. Si no se indica, se deduce del texto. */
  peligro?: boolean;
  textoConfirmar?: string;
  textoCancelar?: string;
}

export interface Pregunta {
  mensaje: string;
  peligro: boolean;
  textoConfirmar: string;
  textoCancelar: string;
  responder: (acepta: boolean) => void;
}

interface Estado {
  avisos: Aviso[];
  pregunta: Pregunta | null;
}

const MAX_VISIBLES = 3;
const DURACION_MS: Record<TonoAviso, number> = { ok: 4000, info: 5000, error: 8000 };
const ES_DESTRUCTIVO = /eliminar|borrar|anular|quitar|sacar a|retirar|cancelar solicitud/i;

let estado: Estado = { avisos: [], pregunta: null };
let siguienteId = 1;
const oyentes = new Set<() => void>();

function cambiar(nuevo: Estado) {
  estado = nuevo;
  oyentes.forEach((avisar) => avisar());
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function cerrarAviso(id: number) {
  cambiar({ ...estado, avisos: estado.avisos.filter((a) => a.id !== id) });
}

function mostrar(tono: TonoAviso, mensaje: unknown) {
  const id = siguienteId++;
  const texto = typeof mensaje === 'string' ? mensaje : String(mensaje);
  cambiar({ ...estado, avisos: [...estado.avisos, { id, tono, mensaje: texto }].slice(-MAX_VISIBLES) });
  setTimeout(() => cerrarAviso(id), DURACION_MS[tono]);
}

export const aviso = {
  ok: (mensaje: unknown) => mostrar('ok', mensaje),
  error: (mensaje: unknown) => mostrar('error', mensaje),
  info: (mensaje: unknown) => mostrar('info', mensaje),
};

/** Pregunta sí o no. Devuelve true solo si la persona acepta. */
export function confirmar(mensaje: string, opciones: OpcionesConfirmar = {}): Promise<boolean> {
  // Si quedó una pregunta anterior sin responder, cuenta como "no".
  estado.pregunta?.responder(false);

  return new Promise((resolve) => {
    const peligro = opciones.peligro ?? ES_DESTRUCTIVO.test(mensaje);
    const pregunta: Pregunta = {
      mensaje,
      peligro,
      textoConfirmar: opciones.textoConfirmar ?? 'Confirmar',
      textoCancelar: opciones.textoCancelar ?? 'Cancelar',
      responder: (acepta) => {
        if (estado.pregunta === pregunta) cambiar({ ...estado, pregunta: null });
        resolve(acepta);
      },
    };
    cambiar({ ...estado, pregunta });
  });
}

export function useAvisos() {
  return useSyncExternalStore(suscribir, () => estado);
}
