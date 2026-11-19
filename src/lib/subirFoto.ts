import { supabase } from './supabase';

const BUCKET = 'foto jugadores';

/**
 * Achica una imagen a `lado` píxeles por su lado mayor y la pasa a JPEG. Una
 * foto del celular pesa varios MB; para una ficha o un logo basta con ~200 KB.
 * Si el navegador no puede leerla (por ejemplo HEIC fuera de Safari), se sube tal cual.
 */
export async function reducirImagen(archivo: File, lado = 1280): Promise<Blob> {
  if (!archivo.type.startsWith('image/') || archivo.type === 'image/gif') return archivo;
  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(bitmap.width * escala);
    lienzo.height = Math.round(bitmap.height * escala);
    lienzo.getContext('2d')?.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, 'image/jpeg', 0.85));
    return blob && blob.size < archivo.size ? blob : archivo;
  } catch {
    return archivo;
  }
}

/**
 * Sube una foto (jugador, logo o portada) y devuelve su dirección pública.
 * Cada subida usa un nombre nuevo e imposible de adivinar, así nunca pisa la
 * foto de otro (la base además solo deja reemplazar lo que uno mismo subió).
 */
export async function subirFoto(archivo: File, prefijo = 'foto'): Promise<string> {
  const contenido = await reducirImagen(archivo);
  const esJpeg = contenido !== archivo || archivo.type === 'image/jpeg';
  const ext = esJpeg ? 'jpg' : (archivo.name.split('.').pop() || 'img').toLowerCase().replace(/[^a-z0-9]/g, '');
  const nombre = `${prefijo}_${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(nombre, contenido, {
    upsert: false,
    contentType: esJpeg ? 'image/jpeg' : archivo.type || undefined,
  });
  if (error) {
    throw new Error(/size|exceeded|too large/i.test(error.message)
      ? 'La imagen es muy pesada (máximo 5 MB). Prueba con otra o recórtala.'
      : /mime|type/i.test(error.message) ? 'Ese archivo no es una imagen válida.' : error.message);
  }
  return supabase.storage.from(BUCKET).getPublicUrl(nombre).data.publicUrl;
}
