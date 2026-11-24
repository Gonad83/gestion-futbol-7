import { endOfMonth, isSameDay, startOfDay, startOfMonth } from 'date-fns';

/** Reglas del Calendario, sin dibujo, para poder probarlas. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PartidoCal = { id: string; date: string; event_type?: string; description?: string | null; location?: string | null; match_type?: string | null; status?: string; [campo: string]: any };
export type JugadorCal = { id: string; name: string; nickname?: string | null; birth_date: string; photo_url?: string | null };

export type EventoAgenda =
  | { tipo: 'partido'; fecha: Date; partido: PartidoCal }
  | { tipo: 'cumple'; fecha: Date; jugador: JugadorCal };

export const esSocial = (p: PartidoCal) => p.event_type === 'Recreacional';
export const esTorneo = (p: PartidoCal) => p.event_type === 'Torneo';

export const COLORES = { partido: '#44f3a9', social: '#a78bfa', cumple: '#f472b6', torneo: '#ffd08b' } as const;

export function tituloPartido(p: PartidoCal) {
  if (p.description?.trim()) return p.description.trim();
  if (esTorneo(p)) return 'Torneo';
  return esSocial(p) ? 'Evento social' : `Partido ${p.match_type || '7vs7'}`;
}

/** Cumpleaños que caen en el mes mostrado (el año no importa). */
export function cumplesDelMes(jugadores: JugadorCal[], mes: Date): { jugador: JugadorCal; fecha: Date }[] {
  return jugadores
    .filter(j => j.birth_date)
    .map(j => {
      const nac = new Date(`${j.birth_date}T12:00:00`);
      return { jugador: j, fecha: new Date(mes.getFullYear(), nac.getMonth(), nac.getDate(), 12) };
    })
    .filter(c => c.fecha.getMonth() === mes.getMonth());
}

/** Partidos y cumpleaños del mes, ordenados, separados en los que vienen y los que ya pasaron. */
export function armarAgenda(partidos: PartidoCal[], jugadores: JugadorCal[], mes: Date, hoy: Date = new Date()) {
  const desde = startOfMonth(mes);
  const hasta = endOfMonth(mes);
  const eventos: EventoAgenda[] = [
    ...partidos
      .map(p => ({ tipo: 'partido' as const, fecha: new Date(p.date), partido: p }))
      .filter(e => e.fecha >= desde && e.fecha <= hasta),
    ...cumplesDelMes(jugadores, mes).map(c => ({ tipo: 'cumple' as const, fecha: c.fecha, jugador: c.jugador })),
  ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  const inicioHoy = startOfDay(hoy);
  const pasado = (e: EventoAgenda) => e.fecha < inicioHoy && !isSameDay(e.fecha, hoy);
  return { proximos: eventos.filter(e => !pasado(e)), pasados: eventos.filter(pasado), total: eventos.length };
}

/** Años que cumple un jugador en la fecha de su cumpleaños; null si no hay un año de nacimiento creíble. */
export function edadQueCumple(jugador: JugadorCal, fecha: Date): number | null {
  const nacio = new Date(`${jugador.birth_date}T12:00:00`).getFullYear();
  const edad = fecha.getFullYear() - nacio;
  return Number.isFinite(edad) && edad > 0 && edad < 110 ? edad : null;
}

/** Qué puntos lleva un día en la grilla del mes. */
export function puntosDelDia(dia: Date, partidos: PartidoCal[], cumples: { fecha: Date }[]) {
  const delDia = partidos.filter(p => isSameDay(new Date(p.date), dia));
  return {
    partido: delDia.some(p => !esSocial(p) && !esTorneo(p)),
    torneo: delDia.some(esTorneo),
    social: delDia.some(esSocial),
    cumple: cumples.some(c => isSameDay(c.fecha, dia)),
  };
}
