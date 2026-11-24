import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

type Titulos = Record<string, number>;

/** Cuenta cuántas veces fue MVP cada jugador a partir de la lista de ganadores. */
export function contarTitulos(ganadores: { player_id: string | null }[]): Titulos {
  const titulos: Titulos = {};
  for (const g of ganadores) if (g.player_id) titulos[g.player_id] = (titulos[g.player_id] || 0) + 1;
  return titulos;
}

const VIGENCIA_MS = 60_000;
let guardado: { equipo: number; pedido: Promise<Titulos>; hasta: number } | null = null;

/** Una sola consulta para todas las láminas en pantalla: los MVP de los partidos de mi equipo. */
function pedirTitulos(equipo: number): Promise<Titulos> {
  if (guardado && guardado.equipo === equipo && guardado.hasta > Date.now()) return guardado.pedido;
  const pedido = Promise.resolve(supabase.from('mvp_winners').select('player_id, matches!inner(team_id)').eq('matches.team_id', equipo))
    .then(({ data, error }) => {
      if (error) throw error;
      return contarTitulos(data || []);
    })
    .catch(() => { guardado = null; return {} as Titulos; });
  guardado = { equipo, pedido, hasta: Date.now() + VIGENCIA_MS };
  return pedido;
}

/** Títulos de MVP de los jugadores de mi equipo, por id de jugador. Vacío mientras carga o si falla. */
export function useTitulosMvp(): Titulos {
  const { teamId } = useAuth();
  const [titulos, setTitulos] = useState<Titulos>({});
  useEffect(() => {
    if (!teamId) return;
    let vivo = true;
    pedirTitulos(teamId).then(t => { if (vivo) setTitulos(t); });
    return () => { vivo = false; };
  }, [teamId]);
  return titulos;
}
