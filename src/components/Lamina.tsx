import type { CSSProperties } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import type { TonoLamina } from '../lib/lamina';

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
  onClick?: () => void;
  ariaLabel: string;
  title?: string;
}

/** Lámina de jugador al estilo de las cartas de FIFA: nota, puesto, foto y nombre. */
export function Lamina({ nombre, rotulo, foto, estrellas, puesto, tono, fueraDePuesto, camiseta, elegido = false, alto, orden = 0, onClick, ariaLabel, title }: Props) {
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
        <span className="lamina-nombre">{rotulo}</span>
        {camiseta && <span className="lamina-punta" style={{ background: camiseta }} aria-hidden="true" />}
        <span className="lamina-brillo" aria-hidden="true" />
      </span>
    </button>
    </span>
  );
}
