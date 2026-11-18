/**
 * Comprobantes de pago de cuotas (tabla comprobantes + bucket privado
 * "comprobantes", ver supabase/migrations/20261118_comprobantes.sql).
 *
 * El jugador sube su comprobante desde Mi perfil y queda "por_revisar". El
 * capitán lo revisa en Caja: al aprobarlo se registra el pago con la misma
 * lógica que usa Caja al anotarlo a mano (primero el mes más antiguo).
 */
import { supabase } from '../supabase';
import { applyRebalancePlan, planRebalance } from '../paymentLedger';

export const BUCKET_COMPROBANTES = 'comprobantes';
export const TAMANO_MAXIMO = 5 * 1024 * 1024;
export const TIPOS_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];

export type EstadoComprobante = 'por_revisar' | 'aprobado' | 'rechazado';

export interface Comprobante {
  id: string;
  team_id: number;
  player_id: string;
  amount: number;
  file_path: string;
  nota: string | null;
  status: EstadoComprobante;
  motivo: string | null;
  monto_aprobado: number | null;
  reviewed_at: string | null;
  created_at: string;
  players?: { name: string; photo_url: string | null; created_at: string | null } | null;
}

/** Revisa el archivo antes de subirlo; devuelve el problema o '' si está bien. */
export function problemaDelArchivo(archivo: File): string {
  const esImagen = archivo.type.startsWith('image/');
  if (!TIPOS_ACEPTADOS.includes(archivo.type) && !(esImagen && !archivo.type)) {
    return 'Sube una foto (JPG, PNG) o un PDF del comprobante.';
  }
  if (archivo.size > TAMANO_MAXIMO) return 'El archivo pesa más de 5 MB. Prueba con una captura de pantalla.';
  return '';
}

const extension = (archivo: File) => {
  const porNombre = archivo.name.split('.').pop()?.toLowerCase();
  if (porNombre && /^[a-z0-9]{2,5}$/.test(porNombre)) return porNombre;
  return archivo.type === 'application/pdf' ? 'pdf' : 'jpg';
};

/** Sube el archivo y crea el comprobante "por revisar". Si falla el registro, borra el archivo. */
export async function subirComprobante(datos: { teamId: number; playerId: string; monto: number; nota: string; archivo: File }) {
  const ruta = `${datos.teamId}/${datos.playerId}/${crypto.randomUUID()}.${extension(datos.archivo)}`;
  const { error: errArchivo } = await supabase.storage.from(BUCKET_COMPROBANTES)
    .upload(ruta, datos.archivo, { contentType: datos.archivo.type || undefined, upsert: false });
  if (errArchivo) throw new Error('No se pudo subir el archivo: ' + errArchivo.message);

  const { error } = await supabase.from('comprobantes').insert([{
    team_id: datos.teamId, player_id: datos.playerId, amount: datos.monto,
    file_path: ruta, nota: datos.nota.trim() || null,
  }]);
  if (error) {
    await supabase.storage.from(BUCKET_COMPROBANTES).remove([ruta]);
    throw new Error('No se pudo guardar el comprobante: ' + error.message);
  }
}

export async function misComprobantes(playerId: string): Promise<Comprobante[]> {
  const { data, error } = await supabase.from('comprobantes').select('*')
    .eq('player_id', playerId).order('created_at', { ascending: false }).limit(12);
  if (error) throw error;
  return (data ?? []) as Comprobante[];
}

/** Retira un comprobante que aún no se revisa (el jugador se equivocó). */
export async function retirarComprobante(c: Comprobante) {
  const { error } = await supabase.from('comprobantes').delete().eq('id', c.id).eq('status', 'por_revisar');
  if (error) throw error;
  await supabase.storage.from(BUCKET_COMPROBANTES).remove([c.file_path]);
}

export async function comprobantesPorRevisar(teamId: number): Promise<Comprobante[]> {
  const { data, error } = await supabase.from('comprobantes')
    .select('*, players(name, photo_url, created_at)')
    .eq('team_id', teamId).eq('status', 'por_revisar').order('created_at');
  if (error) throw error;
  return (data ?? []) as Comprobante[];
}

/** Enlace temporal (10 min) para ver el archivo: el bucket es privado. */
export async function enlaceDelArchivo(ruta: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET_COMPROBANTES).createSignedUrl(ruta, 600);
  if (error || !data) throw error ?? new Error('Sin enlace');
  return data.signedUrl;
}

/**
 * Aprueba y registra el pago. Primero se marca aprobado solo si seguía por
 * revisar (así dos capitanes no lo cobran dos veces); si registrar el pago
 * falla, vuelve a quedar por revisar.
 */
export async function aprobarComprobante(c: Comprobante, monto: number, cuota: number, revisor: string | null) {
  const { data: marcado, error } = await supabase.from('comprobantes')
    .update({ status: 'aprobado', monto_aprobado: monto, reviewed_at: new Date().toISOString(), reviewed_by: revisor, motivo: null })
    .eq('id', c.id).eq('status', 'por_revisar').select('id');
  if (error) throw error;
  if (!marcado?.length) throw new Error('Este comprobante ya fue revisado.');

  try {
    const { data: filas, error: errFilas } = await supabase.from('payments').select('*').eq('player_id', c.player_id);
    if (errFilas) throw errFilas;
    await applyRebalancePlan(supabase, planRebalance(filas ?? [], c.player_id, c.players?.created_at, cuota, monto, 'Transferencia'));
  } catch (e) {
    await supabase.from('comprobantes')
      .update({ status: 'por_revisar', monto_aprobado: null, reviewed_at: null, reviewed_by: null }).eq('id', c.id);
    throw e;
  }
}

export async function rechazarComprobante(c: Comprobante, motivo: string, revisor: string | null) {
  const { error } = await supabase.from('comprobantes')
    .update({ status: 'rechazado', motivo: motivo.trim() || null, reviewed_at: new Date().toISOString(), reviewed_by: revisor })
    .eq('id', c.id).eq('status', 'por_revisar');
  if (error) throw error;
}
