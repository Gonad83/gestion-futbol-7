import { supabase } from './supabase';

/**
 * Notificaciones push en el celular. Cada jugador las activa en su teléfono
 * (el navegador pide permiso); quedan guardadas en push_suscripciones y el
 * servidor manda: partido nuevo, recordatorio y "se liberó un cupo".
 */

export type EstadoPush =
  | 'activas'
  | 'inactivas'
  | 'bloqueadas'    // el usuario negó el permiso: se cambia en los ajustes del navegador
  | 'instalar'      // iPhone/iPad: solo funciona con la app instalada en la pantalla de inicio
  | 'no-soportado';

const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const instalada = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export async function estadoPush(): Promise<EstadoPush> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return esIOS() && !instalada() ? 'instalar' : 'no-soportado';
  }
  if (Notification.permission === 'denied') return 'bloqueadas';
  const registro = await navigator.serviceWorker.getRegistration();
  const sub = await registro?.pushManager.getSubscription();
  return sub ? 'activas' : 'inactivas';
}

const base64aBytes = (texto: string) => {
  const relleno = '='.repeat((4 - (texto.length % 4)) % 4);
  const crudo = atob((texto + relleno).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
};

/** Pide permiso, suscribe el celular y lo guarda a nombre del jugador. */
export async function activarPush(): Promise<EstadoPush> {
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') return permiso === 'denied' ? 'bloqueadas' : 'inactivas';

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-llave`);
  const { publicKey } = await res.json();
  if (!publicKey) throw new Error('No se pudo preparar el aviso. Intenta de nuevo.');

  const registro = await navigator.serviceWorker.ready;
  const sub = await registro.pushManager.getSubscription()
    ?? await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64aBytes(publicKey) });
  const datos = sub.toJSON();
  const { error } = await supabase.rpc('registrar_push', {
    p_endpoint: sub.endpoint, p_p256dh: datos.keys?.p256dh ?? '', p_auth: datos.keys?.auth ?? '',
  });
  if (error) {
    await sub.unsubscribe().catch(() => {});
    throw new Error(error.message);
  }
  return 'activas';
}

export async function desactivarPush(): Promise<EstadoPush> {
  const registro = await navigator.serviceWorker.getRegistration();
  const sub = await registro?.pushManager.getSubscription();
  if (sub) {
    await supabase.from('push_suscripciones').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  }
  return 'inactivas';
}
