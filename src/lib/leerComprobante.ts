/**
 * Lectura automática (OCR) del monto de un comprobante de transferencia.
 *
 * Corre en el teléfono del jugador con tesseract.js: la foto no sale del
 * navegador. La librería pesa, así que se carga recién cuando hay una imagen
 * que leer. El monto leído es solo una sugerencia: el jugador lo confirma y
 * el capitán sigue viendo la imagen al aprobar.
 */

import type { PSM } from 'tesseract.js';

const MONTO_MINIMO = 500;
const MONTO_MAXIMO = 10_000_000;

/** Palabras que en un comprobante chileno acompañan al monto transferido. */
const CLAVES = /monto|total|transferi|pagaste|enviaste|valor|abono|importe/i;

/** Montos que salen en el comprobante pero no son lo pagado. */
const AJENOS = /saldo|disponible|comisi[oó]n|cupo|l[ií]nea de cr[eé]dito/i;

/** "$8.000", "$ 16.000", "S8.000" (el OCR confunde $ con S), "8.000" o "8000". */
const CON_SIGNO = /[$S]\s?(\d{1,3}(?:[.,\s]\d{3})+|\d{3,8})(?![\d-])/g;
const CON_MILES = /(?<![\d.,-])(\d{1,3}(?:\.\d{3})+)(?![\d.,-]|\s?-)/g;

const aNumero = (texto: string) => {
  const n = Number(texto.replace(/\D/g, ''));
  return n >= MONTO_MINIMO && n <= MONTO_MAXIMO ? n : null;
};

function montosDe(linea: string, patron: RegExp): number[] {
  return [...linea.matchAll(patron)].map((m) => aNumero(m[1])).filter((n): n is number => n !== null);
}

/**
 * Busca el monto pagado en el texto de un comprobante.
 *  1. Un monto en la línea de "Monto", "Total", "Transferiste"… o en la siguiente.
 *  2. Si no, el monto con signo $ que más se repite (el primero si empatan).
 * Devuelve null si no hay nada confiable: es mejor no sugerir que sugerir mal.
 */
export function montoDelTexto(texto: string): number | null {
  const todas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // Fuera el saldo de la cuenta, comisiones y similares: la línea que lo nombra
  // y, si el valor quedó en la línea de abajo, también esa.
  const lineas = todas.filter((linea, i) => {
    if (AJENOS.test(linea)) return false;
    const anterior = todas[i - 1] ?? '';
    return !(AJENOS.test(anterior) && !/\d{3}/.test(anterior));
  });

  for (let i = 0; i < lineas.length; i++) {
    if (!CLAVES.test(lineas[i])) continue;
    for (const linea of [lineas[i], lineas[i + 1] ?? '']) {
      const [monto] = [...montosDe(linea, CON_SIGNO), ...montosDe(linea, CON_MILES)];
      if (monto) return monto;
    }
  }

  const conSigno = lineas.flatMap((l) => montosDe(l, CON_SIGNO));
  if (conSigno.length === 0) return null;
  const veces = new Map<number, number>();
  for (const n of conSigno) veces.set(n, (veces.get(n) ?? 0) + 1);
  return [...veces.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** Las fotos HEIC del iPhone y los PDF no se pueden leer en el navegador. */
export const sePuedeLeer = (archivo: File) => archivo.type.startsWith('image/') && !/hei[cf]/.test(archivo.type);

/** Lee la imagen y devuelve el monto encontrado, o null si no se pudo. */
export async function leerMonto(archivo: File): Promise<number | null> {
  if (!sePuedeLeer(archivo)) return null;
  const { createWorker } = await import('tesseract.js');
  const lector = await createWorker('spa');
  try {
    // Modo 4 (una columna, tamaños variados): lee el monto en letra grande, que el
    // modo por defecto se salta. Si no encuentra nada, modo 11 (texto disperso).
    for (const modo of ['4', '11']) {
      await lector.setParameters({ tessedit_pageseg_mode: modo as PSM });
      const { data } = await lector.recognize(archivo);
      const monto = montoDelTexto(data.text);
      if (monto) return monto;
    }
    return null;
  } finally {
    await lector.terminate();
  }
}
