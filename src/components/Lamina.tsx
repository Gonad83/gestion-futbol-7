import type { CSSProperties, MouseEvent } from 'react';
import { ArrowLeftRight, Star, Trophy } from 'lucide-react';

/** La nota va de 1 a 7: se dibujan las siete, llenas hasta la del jugador. */
const MAX_ESTRELLAS = 7;

/** Colores de camiseta que la lámina sabe pintar; cualquier otro cae en azul. */
const COLORES = ['black', 'white', 'blue', 'emerald', 'yellow', 'red', 'purple', 'lightblue'];

const iniciales = (nombre: string) => nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

interface Props {
  nombre: string;
  /** Lo que va escrito al pie: apodo o apellido. */
  rotulo: string;
  foto?: string | null;
  estrellas?: number | null;
  /** Tres letras: POR, DEF, MED, DEL. */
  puesto: string;
  /** Color de camiseta (black, white, blue, emerald, yellow, red, purple, lightblue). */
  color: string;
  fueraDePuesto?: boolean;
  /** Veces que fue MVP; con al menos una, la lámina lleva la copa con el número. */
  titulos?: number | null;
  /** Figura del equipo: halo dorado. */
  figura?: boolean;
  elegido?: boolean;
  /** Alto de la lámina (cualquier medida CSS); el resto se escala solo. */
  alto: string;
  /** Orden de entrada, para que aparezcan una tras otra. */
  orden?: number;
  onClick?: (evento: MouseEvent<HTMLButtonElement>) => void;
  ariaLabel: string;
  title?: string;
}

/** Lámina de jugador al estilo de las cartas de FIFA: puesto, foto, estrellas y nombre. */
export function Lamina({ nombre, rotulo, foto, estrellas, puesto, color, fueraDePuesto, titulos, figura = false, elegido = false, alto, orden = 0, onClick, ariaLabel, title }: Props) {
  const llenas = Math.max(0, Math.min(MAX_ESTRELLAS, Math.round(estrellas ?? 0)));
  return (
    <span className={`lamina-sombra flex ${elegido ? 'lamina-sombra-elegida' : ''} ${figura ? 'lamina-sombra-figura' : ''}`}>
    <button type="button" onClick={onClick} disabled={!onClick} aria-pressed={onClick ? elegido : undefined}
      aria-label={ariaLabel} title={title}
      className={`lamina lamina-${COLORES.includes(color) ? color : 'blue'} scale-in ${elegido ? 'lamina-elegida' : ''}`}
      style={{ '--alto': alto, animationDelay: `${orden * 45}ms` } as CSSProperties}>
      <span className="lamina-cara">
        {foto
          ? <img src={foto} alt="" className="lamina-foto" loading="lazy" />
          : <span className="lamina-foto lamina-iniciales" aria-hidden="true">{iniciales(nombre)}</span>}
        <span className="lamina-esquina" aria-hidden="true" />
        <span className="lamina-puesto">{puesto}</span>
        {fueraDePuesto && (
          <span className="lamina-aviso" aria-hidden="true"><ArrowLeftRight size="0.9em" strokeWidth={3} /></span>
        )}
        {!fueraDePuesto && !!titulos && titulos > 0 && (
          <span className="lamina-titulos" aria-hidden="true"><Trophy size="0.95em" strokeWidth={2.75} />{titulos}</span>
        )}
        {llenas > 0 && (
          <span className="lamina-estrellas" aria-hidden="true">
            {Array.from({ length: MAX_ESTRELLAS }, (_, i) => (
              <Star key={i} size="1em" strokeWidth={2.5} fill={i < llenas ? 'currentColor' : 'none'} className={i < llenas ? undefined : 'lamina-estrella-vacia'} />
            ))}
          </span>
        )}
        <span className="lamina-nombre">{rotulo}</span>
        <span className="lamina-brillo" aria-hidden="true" />
      </span>
    </button>
    </span>
  );
}
