import { useCallback, useEffect, useState } from 'react';
import { Handshake } from 'lucide-react';
import {
  REGIONES, guardarDisponibilidad, miDisponibilidad, misPedidosRefuerzo, responderRefuerzo,
  type MiDisponibilidad, type MiPedido,
} from '../../lib/api/refuerzos';
import { aviso } from '../../lib/avisos';

const fecha = (f: string) => {
  const t = new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(f));
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/**
 * Pedidos de otros equipos para jugar de refuerzo. Se usa en Mi perfil y en el
 * Inicio (`soloPendientes`: solo aparece si hay alguno sin responder).
 */
export function PedidosRefuerzo({ soloPendientes = false }: { soloPendientes?: boolean }) {
  const [pedidos, setPedidos] = useState<MiPedido[]>([]);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = useCallback(() => { misPedidosRefuerzo().then(setPedidos).catch(() => setPedidos([])); }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const responder = async (p: MiPedido, acepta: boolean) => {
    setOcupado(p.id);
    try {
      await responderRefuerzo(p.id, acepta);
      aviso.ok(acepta ? `Listo: juegas con ${p.equipo ?? 'ese equipo'}. Le avisamos al capitán.` : 'Le avisamos al capitán que no puedes.');
      cargar();
    } catch (e) {
      aviso.error((e as Error).message);
    } finally {
      setOcupado(null);
    }
  };

  const lista = soloPendientes ? pedidos.filter((p) => p.estado === 'Pendiente') : pedidos;
  if (lista.length === 0) return null;

  return (
    <section aria-label="Pedidos de refuerzo" className="rounded-[20px] p-4 space-y-2" style={{ background: 'rgba(68,243,169,0.06)', border: '1px solid rgba(68,243,169,0.25)' }}>
      <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-soccer-green flex items-center gap-2"><Handshake size={14} /> Te piden de refuerzo</h2>
      <ul className="space-y-2">
        {lista.map((p) => (
          <li key={p.id} className="rounded-xl p-3" style={{ background: '#10141a' }}>
            <p className="text-sm font-bold text-white">{p.equipo ?? 'Un equipo'}{p.formato ? ` · ${p.formato}` : ''}</p>
            <p className="text-xs text-white/60 mt-0.5">{fecha(p.fecha)}{p.lugar ? ` · ${p.lugar}` : ''}</p>
            {p.estado === 'Aceptada' ? (
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-soccer-green">Vas a jugar</span>
                <button type="button" onClick={() => responder(p, false)} disabled={ocupado !== null}
                  className="h-10 px-4 rounded-full text-xs font-bold cursor-pointer disabled:opacity-60" style={{ background: '#262a31', color: '#fff' }}>Ya no puedo</button>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => responder(p, false)} disabled={ocupado !== null}
                  className="h-11 rounded-full text-sm font-bold cursor-pointer disabled:opacity-60" style={{ background: '#262a31', color: '#fff' }}>No puedo</button>
                <button type="button" onClick={() => responder(p, true)} disabled={ocupado !== null}
                  className="h-11 rounded-full text-sm font-bold cursor-pointer disabled:opacity-60" style={{ background: '#44f3a9', color: '#003822' }}>
                  {ocupado === p.id ? '…' : 'Juego'}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Juego de refuerzo": el jugador se ofrece a otros equipos de su región. */
export function MiRefuerzo({ playerId }: { playerId: string }) {
  const [datos, setDatos] = useState<MiDisponibilidad | null>(null);
  const [cargado, setCargado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    miDisponibilidad(playerId)
      .then((d) => setDatos(d ?? { region: 'Región Metropolitana', comuna: '', nota: '', activo: false }))
      .catch(() => setDatos(null))
      .finally(() => setCargado(true));
  }, [playerId]);

  if (!cargado || !datos) return null;

  const guardar = async (nuevo: MiDisponibilidad, mensaje?: string) => {
    setGuardando(true);
    try {
      await guardarDisponibilidad(playerId, nuevo);
      setDatos(nuevo);
      if (mensaje) aviso.ok(mensaje);
    } catch (e) {
      aviso.error('No se guardó: ' + (e as Error).message);
    } finally {
      setGuardando(false);
    }
  };
  const campo = 'w-full h-11 rounded-xl px-3 text-sm text-white outline-none';
  const estiloCampo = { background: '#10141a', border: '1px solid rgba(255,255,255,0.08)' };

  return (
    <section id="refuerzos" aria-label="Juego de refuerzo" className="rounded-[20px] p-4 space-y-3 scroll-mt-24" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-white flex items-center gap-2"><Handshake size={16} /> Juego de refuerzo</p>
          <p className="text-xs text-white/55 mt-0.5">Otros equipos de tu región pueden pedirte jugar cuando les falte gente. Ven tu nombre, posición y nivel; nunca tu correo.</p>
        </div>
        <button type="button" role="switch" aria-checked={datos.activo} aria-label="Juego de refuerzo" disabled={guardando}
          onClick={() => guardar({ ...datos, activo: !datos.activo }, datos.activo ? 'Ya no apareces como refuerzo.' : 'Listo: apareces como refuerzo.')}
          className="shrink-0 relative w-[52px] h-8 rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-60"
          style={{ background: datos.activo ? '#44f3a9' : '#31353c' }}>
          <span className="absolute top-1 left-1 w-6 h-6 rounded-full shadow transition-transform duration-200"
            style={{ background: datos.activo ? '#003822' : '#fff', transform: datos.activo ? 'translateX(20px)' : 'translateX(0)' }} />
        </button>
      </div>

      {datos.activo && (
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); guardar(datos, 'Guardado.'); }}>
          <label className="block">
            <span className="text-xs text-white/60">Región</span>
            <select value={datos.region} onChange={(e) => setDatos({ ...datos, region: e.target.value })} className={campo} style={estiloCampo}>
              {REGIONES.map((r) => <option key={r} value={r} style={{ background: '#1c2026' }}>{r}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-white/60">Comuna (opcional)</span>
            <input value={datos.comuna ?? ''} maxLength={60} onChange={(e) => setDatos({ ...datos, comuna: e.target.value })} className={campo} style={estiloCampo} placeholder="Ej: Ñuñoa" />
          </label>
          <label className="block">
            <span className="text-xs text-white/60">Cuándo puedes (opcional)</span>
            <input value={datos.nota ?? ''} maxLength={140} onChange={(e) => setDatos({ ...datos, nota: e.target.value })} className={campo} style={estiloCampo} placeholder="Ej: martes y jueves en la noche" />
          </label>
          <button type="submit" disabled={guardando} className="w-full h-11 rounded-full text-sm font-bold cursor-pointer disabled:opacity-60" style={{ background: '#262a31', color: '#fff' }}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </form>
      )}
    </section>
  );
}
