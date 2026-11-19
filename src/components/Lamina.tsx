import type { CSSProperties, MouseEvent } from 'react';
import { ArrowLeftRight, Star } from 'lucide-react';
import type { TonoLamina } from '../lib/lamina';

/** La nota va de 1 a 7: se dibujan las siete, llenas hasta la del jugador. */
const MAX_ESTRELLAS = 7;

const iniciales = (nombre: string) => nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

interface Props {
  nombre: string;
  /** Lo que va escrito al pie: apodo o apellido. */
  rotulo: string;
  foto?: string | null;
  estrellas?: number | null;
  /** Tres letras: POR, DEF, MED, DEL. */
  puesto: string;
  tono: TonoLamina;
  fueraDePuesto?: boolean;
  /** Color de la camiseta del equipo: pinta la punta de abajo. */
  camiseta?: string;
  elegido?: boolean;
  /** Alto de la lámina (cualquier medida CSS); el resto se escala solo. */
  alto: string;
  /** Orden de entrada, para que aparezcan una tras otra. */
  orden?: number;
  onClick?: (evento: MouseEvent<HTMLButtonElement>) => void;
  ariaLabel: string;
  title?: string;
}

/** Lámina de jugador al estilo de las cartas de FIFA: nota, puesto, foto y nombre. */
export function Lamina({ nombre, rotulo, foto, estrellas, puesto, tono, fueraDePuesto, camiseta, elegido = false, alto, orden = 0, onClick, ariaLabel, title }: Props) {
  const llenas = Math.max(0, Math.min(MAX_ESTRELLAS, Math.round(estrellas ?? 0)));
  return (
    <span className={`lamina-sombra flex ${elegido ? 'lamina-sombra-elegida' : ''}`}>
    <button type="button" onClick={onClick} disabled={!onClick} aria-pressed={onClick ? elegido : undefined}
      aria-label={ariaLabel} title={title}
      className={`lamina lamina-${tono} scale-in ${elegido ? 'lamina-elegida' : ''}`}
      style={{ '--alto': alto, animationDelay: `${orden * 45}ms` } as CSSProperties}>
      <span className="lamina-cara">
        {foto
          ? <img src={foto} alt="" className="lamina-foto" loading="lazy" />
          : <span className="lamina-foto lamina-iniciales" aria-hidden="true">{iniciales(nombre)}</span>}
        <span className="lamina-esquina" aria-hidden="true" />
        <span className="lamina-nota">
          {estrellas ? <b>{estrellas}</b> : null}
          <i>{puesto}</i>
        </span>
        {fueraDePuesto && (
          <span className="lamina-aviso" aria-hidden="true"><ArrowLeftRight size="0.9em" strokeWidth={3} /></span>
        )}
        {llenas > 0 && (
          <span className="lamina-estrellas" aria-hidden="true">
            {Array.from({ length: MAX_ESTRELLAS }, (_, i) => (
              <Star key={i} size="1em" strokeWidth={2.5} fill={i < llenas ? 'currentColor' : 'none'} opacity={i < llenas ? 1 : 0.4} />
            ))}
          </span>
        )}
        <span className="lamina-nombre">{rotulo}</span>
        {camiseta && <span className="lamina-punta" style={{ background: camiseta }} aria-hidden="true" />}
        <span className="lamina-brillo" aria-hidden="true" />
      </span>
    </button>
    </span>
  );
}
