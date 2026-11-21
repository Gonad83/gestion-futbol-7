import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Titulos = Record<string, number>;

/** Cuenta cuántas veces fue MVP cada jugador a partir de la lista de ganadores. */
export function contarTitulos(ganadores: { player_id: string | null }[]): Titulos {
  const titulos: Titulos = {};
  for (const g of ganadores) if (g.player_id) titulos[g.player_id] = (titulos[g.player_id] || 0) + 1;
  return titulos;
}

const VIGENCIA_MS = 60_000;
let guardado: { pedido: Promise<Titulos>; hasta: number } | null = null;

/** Una sola consulta para todas las láminas en pantalla; la base ya entrega solo los MVP de mi equipo. */
function pedirTitulos(): Promise<Titulos> {
  if (guardado && guardado.hasta > Date.now()) return guardado.pedido;
  const pedido = Promise.resolve(supabase.from('mvp_winners').select('player_id'))
    .then(({ data, error }) => {
      if (error) throw error;
      return contarTitulos(data || []);
    })
    .catch(() => { guardado = null; return {} as Titulos; });
  guardado = { pedido, hasta: Date.now() + VIGENCIA_MS };
  return pedido;
}

/** Títulos de MVP de los jugadores de mi equipo, por id de jugador. Vacío mientras carga o si falla. */
export function useTitulosMvp(): Titulos {
  const [titulos, setTitulos] = useState<Titulos>({});
  useEffect(() => {
    let vivo = true;
    pedirTitulos().then(t => { if (vivo) setTitulos(t); });
    return () => { vivo = false; };
  }, []);
  return titulos;
}
