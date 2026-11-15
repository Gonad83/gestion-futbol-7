import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';

const RELOAD_FLAG = 'miclubpro-recarga-por-version';

/**
 * Después de publicar una versión nueva, quien tenía la app abierta pide
 * archivos que ya no existen. Ese error se arregla solo recargando.
 */
function esErrorDeVersion(error: Error) {
  return /dynamically imported module|Loading chunk|Importing a module script failed|error loading dynamically/i.test(
    error.message ?? '',
  );
}

interface Props {
  children: ReactNode;
  /** Ocupa toda la pantalla (fuera del menú) o solo el área de contenido. */
  fullScreen?: boolean;
}

interface State {
  error: Error | null;
}

/**
 * Sin esto, cualquier error al dibujar una pantalla dejaba la app en blanco.
 * Ahora se muestra un aviso con un botón para volver a intentar.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error en pantalla:', error, info.componentStack);

    if (esErrorDeVersion(error)) {
      try {
        // Una sola recarga automática, para no quedar en un ciclo sin fin.
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, '1');
          window.location.reload();
        }
      } catch {
        // Sin acceso a sessionStorage se muestra el aviso con el botón.
      }
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const deVersion = esErrorDeVersion(error);

    return (
      <div
        role="alert"
        className={
          this.props.fullScreen
            ? 'min-h-screen flex items-center justify-center bg-dark-bg p-6'
            : 'flex items-center justify-center py-20 px-4'
        }
      >
        <div className="surface-card max-w-md w-full text-center fade-in">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center bg-neon-gold/10 text-neon-gold">
            <TriangleAlert size={22} />
          </div>
          <h2 className="font-headline font-bold text-xl text-white mb-2">
            {deVersion ? 'Hay una versión nueva' : 'Algo salió mal en esta pantalla'}
          </h2>
          <p className="text-sm text-white/60 mb-6 leading-relaxed">
            {deVersion
              ? 'Actualizamos la app mientras la tenías abierta. Recarga para seguir.'
              : 'Tus datos están a salvo. Recarga la página; si se repite, avísanos desde Contacto.'}
          </p>
          <button type="button" className="btn-primary mx-auto" onClick={() => window.location.reload()}>
            <RefreshCw size={16} />
            Recargar
          </button>
        </div>
      </div>
    );
  }
}
