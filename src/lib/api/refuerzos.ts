/**
 * Refuerzos para completar un partido: los invitados de confianza del equipo y
 * el banco de jugadores de otros equipos que se ofrecen (ver la migración
 * 20261120j_banco_de_refuerzos.sql).
 */
import { supabase } from '../supabase';

export const REGIONES = [
  'Región Metropolitana', 'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso',
  "O'Higgins", 'Maule', 'Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes',
];

export interface InvitadoFrecuente { nombre: string; veces: number; ultima: string; rating: number | null; posicion: string | null }
export interface RefuerzoBanco {
  player_id: string; nombre: string; apodo: string | null; foto: string | null; posicion: string | null; posicion2: string | null;
  rating: number | null; region: string; comuna: string | null; nota: string | null; equipo: string | null; estado: string | null;
}
export interface PedidoDelPartido { id: string; player_id: string; nombre: string; estado: string; equipo: string | null }
export interface MiPedido { id: string; estado: 'Pendiente' | 'Aceptada'; fecha: string; lugar: string | null; formato: string | null; equipo: string | null; pedido: string }
export interface MiDisponibilidad { region: string; comuna: string | null; nota: string | null; activo: boolean }

async function rpc<T>(nombre: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nombre, args);
  if (error) throw new Error(error.message);
  return data as T;
}

/** Invitados que ya jugaron con el equipo, los que más vinieron primero. */
export const invitadosFrecuentes = (teamId: number) => rpc<InvitadoFrecuente[]>('invitados_frecuentes', { p_team: teamId });

/** Suma un invitado de confianza al partido con su último nivel y posición. */
export async function sumarInvitadoFrecuente(matchId: string, i: InvitadoFrecuente) {
  const { data, error } = await supabase.from('match_guests')
    .insert({ match_id: matchId, name: i.nombre, rating: i.rating ?? 5, position: i.posicion || 'Invitado' })
    .select('id, name').single();
  if (error) throw new Error(error.message);
  return data as { id: string; name: string };
}

export const buscarRefuerzos = (matchId: string, region: string | null) =>
  rpc<RefuerzoBanco[]>('buscar_refuerzos', { p_match: matchId, p_region: region });
export const pedirRefuerzo = (matchId: string, playerId: string) => rpc<string>('pedir_refuerzo', { p_match: matchId, p_player: playerId });
export const cancelarRefuerzo = (id: string) => rpc<void>('cancelar_refuerzo', { p_solicitud: id });
export const pedidosDelPartido = (matchId: string) => rpc<PedidoDelPartido[]>('pedidos_del_partido', { p_match: matchId });

export const misPedidosRefuerzo = () => rpc<MiPedido[]>('mis_pedidos_refuerzo');
export const responderRefuerzo = (id: string, acepta: boolean) => rpc<string>('responder_refuerzo', { p_solicitud: id, p_acepta: acepta });

export async function miDisponibilidad(playerId: string): Promise<MiDisponibilidad | null> {
  const { data, error } = await supabase.from('refuerzos_disponibles').select('region, comuna, nota, activo').eq('player_id', playerId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function guardarDisponibilidad(playerId: string, d: MiDisponibilidad) {
  const { error } = await supabase.from('refuerzos_disponibles').upsert({
    player_id: playerId,
    region: d.region,
    comuna: d.comuna?.trim() || null,
    nota: d.nota?.trim().slice(0, 140) || null,
    activo: d.activo,
    actualizado: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}
