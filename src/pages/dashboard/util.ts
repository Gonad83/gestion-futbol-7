import { format, isThisWeek, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';

/** Oro, plata y bronce para los tres primeros lugares. */
export const RANK_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32'];

/** "Hoy", "Mañana", "Esta semana" o el día, según qué tan cerca está el partido. */
export function getMatchTimeLabel(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Hoy';
  if (isTomorrow(date)) return 'Mañana';
  if (isThisWeek(date)) return 'Esta semana';
  return format(date, 'EEEE d', { locale: es });
}
