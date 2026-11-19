import { Lamina } from '../../components/Lamina';
import { tonoPorEstrellas } from '../../lib/lamina';
import { esInvitado, sinMarcaDeInvitado, type JugadorMM } from '../../lib/matchmaking';

interface Props {
  jugador: JugadorMM;
  color: string;
  arquero: boolean;
  elegido: boolean;
  alto: string;
  orden: number;
  onClick?: () => void;
}

/** La lámina de un jugador en la pizarra de Armar equipos (celular y escritorio). */
export function FichaJugador({ jugador, color, arquero, elegido, alto, orden, onClick }: Props) {
  const nombre = sinMarcaDeInvitado(jugador.name);
  const puesto = arquero ? 'POR' : esInvitado(jugador) ? 'INV' : jugador.position?.trim().slice(0, 3).toUpperCase() || '—';
  return (
    <Lamina nombre={nombre} rotulo={jugador.nickname?.trim() || nombre.split(/\s+/).pop() || nombre} foto={jugador.photo_url}
      estrellas={jugador.rating} puesto={puesto} tono={arquero ? 'arquero' : tonoPorEstrellas(jugador.rating)} camiseta={color}
      elegido={elegido} alto={alto} orden={orden} onClick={onClick}
      ariaLabel={`${jugador.name}${elegido ? ', elegido para cambiar' : ''}`} title={jugador.name} />
  );
}
