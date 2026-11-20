/**
 * Tarjetas en imagen (1080×1350, el formato vertical de WhatsApp e Instagram)
 * para compartir un resultado o la temporada. Se dibujan en un canvas, en el
 * propio celular: no pasan por ningún servidor.
 */

export interface Tarjeta {
  equipo: string;          // arriba, chico
  titulo: string;          // "Resultado", "Mi temporada 2026"
  destacado: string;       // el dato grande: "3 – 2", el nombre del jugador
  bajada?: string;         // debajo del destacado
  filas: { etiqueta: string; valor: string }[];
}

const ANCHO = 1080;
const ALTO = 1350;
const VERDE = '#44f3a9';

function recortar(ctx: CanvasRenderingContext2D, texto: string, max: number) {
  if (ctx.measureText(texto).width <= max) return texto;
  let t = texto;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

/** Achica la letra hasta que el texto quepa en `max` px. */
function ajustar(ctx: CanvasRenderingContext2D, texto: string, peso: number, tamano: number, minimo: number, max: number) {
  let t = tamano;
  ctx.font = `${peso} ${t}px Lexend, sans-serif`;
  while (t > minimo && ctx.measureText(texto).width > max) {
    t -= 4;
    ctx.font = `${peso} ${t}px Lexend, sans-serif`;
  }
}

export async function dibujarTarjeta(t: Tarjeta): Promise<Blob> {
  // Las fuentes de la app vienen de Google Fonts; sin esto el canvas usaría otra.
  await Promise.all([
    document.fonts?.load('900 120px Lexend'),
    document.fonts?.load('700 40px Lexend'),
    document.fonts?.load('600 36px Manrope'),
  ].filter(Boolean)).catch(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Este navegador no puede crear la imagen.');

  // Fondo con un brillo verde arriba.
  ctx.fillStyle = '#10141a';
  ctx.fillRect(0, 0, ANCHO, ALTO);
  const brillo = ctx.createRadialGradient(ANCHO / 2, 0, 50, ANCHO / 2, 0, 900);
  brillo.addColorStop(0, 'rgba(68,243,169,0.28)');
  brillo.addColorStop(1, 'rgba(68,243,169,0)');
  ctx.fillStyle = brillo;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  const margen = 90;
  const util = ANCHO - margen * 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '700 34px Lexend, sans-serif';
  ctx.fillText(recortar(ctx, t.equipo.toUpperCase(), util), ANCHO / 2, 150);

  ctx.fillStyle = VERDE;
  ctx.font = '700 44px Lexend, sans-serif';
  ctx.fillText(recortar(ctx, t.titulo, util), ANCHO / 2, 220);

  ctx.fillStyle = '#ffffff';
  ajustar(ctx, t.destacado, 900, 150, 60, util);
  ctx.fillText(t.destacado, ANCHO / 2, 410);

  let y = 410;
  if (t.bajada) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '600 36px Manrope, sans-serif';
    ctx.fillText(recortar(ctx, t.bajada, util), ANCHO / 2, 480);
    y = 480;
  }

  // Filas: etiqueta a la izquierda, valor a la derecha, en una caja.
  const filas = t.filas.slice(0, 8);
  const inicio = Math.max(y + 70, 560);
  // Las filas se achican para que la caja termine antes del pie.
  const alto = Math.min(96, Math.floor((ALTO - 170 - inicio - 40) / Math.max(1, filas.length)));
  ctx.fillStyle = '#181c22';
  ctx.beginPath();
  ctx.roundRect(margen - 20, inicio - 20, util + 40, filas.length * alto + 40, 36);
  ctx.fill();
  filas.forEach((f, i) => {
    const base = inicio + i * alto + Math.round(alto * 0.62);
    if (i > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(margen + 10, inicio + i * alto, util - 20, 2);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 40px Lexend, sans-serif';
    const valor = recortar(ctx, f.valor, util * 0.55);
    ctx.fillText(valor, ANCHO - margen - 10, base);
    const anchoValor = ctx.measureText(valor).width;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '600 36px Manrope, sans-serif';
    ctx.fillText(recortar(ctx, f.etiqueta, util - anchoValor - 50), margen + 10, base);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '700 30px Lexend, sans-serif';
  ctx.fillText('miclubpro.cl', ANCHO / 2, ALTO - 70);

  return new Promise((ok, mal) => canvas.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo crear la imagen.'))), 'image/png'));
}

/**
 * Comparte la imagen con el menú del celular (WhatsApp, Instagram…). Si el
 * navegador no lo permite, la descarga.
 */
export async function compartirImagen(blob: Blob, nombre: string, texto: string): Promise<'compartida' | 'descargada' | 'cancelada'> {
  const archivo = new File([blob], nombre, { type: 'image/png' });
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], text: texto });
      return 'compartida';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'cancelada';
      // Otro error: se descarga.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'descargada';
}
