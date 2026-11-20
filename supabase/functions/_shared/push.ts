// Llaves VAPID de las notificaciones push. Se generan una sola vez, la primera
// vez que se necesitan, y quedan en push_config (sin acceso desde la app).
import webpush from 'npm:web-push@3.6.7';
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- cliente de Supabase sin tipos generados
type Db = any;

export { webpush };

export async function llavesVapid(db: Db): Promise<{ public_key: string; private_key: string }> {
  const { data } = await db.from('push_config').select('public_key, private_key').eq('id', 1).maybeSingle();
  if (data) return data;
  const nuevas = webpush.generateVAPIDKeys();
  // Si dos pedidos llegan juntos, gana el primero y el otro lee esas mismas llaves.
  await db.from('push_config').insert({ id: 1, public_key: nuevas.publicKey, private_key: nuevas.privateKey });
  const { data: guardadas, error } = await db.from('push_config').select('public_key, private_key').eq('id', 1).single();
  if (error) throw new Error(error.message);
  return guardadas;
}
