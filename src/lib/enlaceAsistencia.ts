import { supabase } from './supabase';

/**
 * Enlaces "Voy / No voy" de los correos. Cada uno lleva una clave que la base
 * calcula para ese jugador en ese partido (tokens_asistencia), así nadie puede
 * responder por otro cambiando los identificadores de la dirección.
 */
export type Enlaces = (playerId: string, estado: 'Voy' | 'No voy') => string;

export function urlConfirmar(origen: string, playerId: string, matchId: string, estado: string, token: string): string {
  const q = new URLSearchParams({ player_id: playerId, match_id: matchId, status: estado, t: token });
  return `${origen}/confirmar?${q.toString()}`;
}

/** Pide las claves del partido (solo capitán o subcapitán) y devuelve con qué armar cada enlace. */
export async function enlacesDelPartido(matchId: string): Promise<Enlaces> {
  const { data, error } = await supabase.rpc('tokens_asistencia', { p_match: matchId });
  if (error) throw error;
  const claves = new Map(((data ?? []) as { player_id: string; token: string }[]).map(f => [f.player_id, f.token]));
  if (claves.size === 0) throw new Error('No se pudieron generar los enlaces de confirmación');
  return (playerId, estado) => {
    const token = claves.get(playerId);
    if (!token) throw new Error('El jugador no es de este equipo');
    return urlConfirmar(window.location.origin, playerId, matchId, estado, token);
  };
}
