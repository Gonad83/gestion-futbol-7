/* Cómo se reparte una plantilla en la cancha de la Arena. */

export const isGK  = (p: any) => /portero|arco|arquero/i.test(p.position || '');
export const isDef = (p: any) => /defensa|lateral|central|stopper/i.test(p.position || '');
export const isMid = (p: any) => /medio|volante|enganche|interior/i.test(p.position || '');
export const isFwd = (p: any) => /delantero|extremo|punta|ariete/i.test(p.position || '');

/** Los mejores por estrellas en su puesto para una formación; el arquero va primero. */
export function buildBest(players: any[], formation: string) {
  const parts = formation.split('-').map(Number);
  const slots = { gk: 1, def: parts[0] || 0, mid: parts[1] || 0, fwd: parts[2] || 0 };
  const pool  = [...players].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const sel: any[] = [];
  const used = new Set<string>();
  const pick = (test: (p: any) => boolean, n: number) =>
    pool.filter(p => !used.has(p.id) && test(p)).slice(0, n)
        .forEach(p => { used.add(p.id); sel.push(p); });
  pick(isGK, slots.gk); pick(isDef, slots.def); pick(isMid, slots.mid); pick(isFwd, slots.fwd);
  const total = slots.gk + slots.def + slots.mid + slots.fwd;
  pool.filter(p => !used.has(p.id)).slice(0, total - sel.length)
      .forEach(p => { used.add(p.id); sel.push(p); });
  return sel;
}

/** Formaciones que se ofrecen según el formato del partido. */
export const FORMACIONES_POR_FORMATO: Record<string, string[]> = {
  '5vs5':   ['2-1-1', '1-2-1'],
  '7vs7':   ['3-2-1', '2-3-1', '3-1-2', '4-1-1'],
  '11vs11': ['4-3-3', '4-4-2'],
};

export const COLORES_CAMISETA = [
  { name: 'Negro',    value: 'black',     cls: 'bg-slate-900 border-white/20' },
  { name: 'Blanco',   value: 'white',     cls: 'bg-white border-slate-300' },
  { name: 'Azul',     value: 'blue',      cls: 'bg-blue-600' },
  { name: 'Verde',    value: 'emerald',   cls: 'bg-emerald-600' },
  { name: 'Amarillo', value: 'yellow',    cls: 'bg-yellow-500' },
  { name: 'Rojo',     value: 'red',       cls: 'bg-red-600' },
  { name: 'Lila',     value: 'purple',    cls: 'bg-purple-600' },
  { name: 'Celeste',  value: 'lightblue', cls: 'bg-sky-400' },
];
