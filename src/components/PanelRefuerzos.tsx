import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Send, X } from 'lucide-react';
import {
  REGIONES, buscarRefuerzos, cancelarRefuerzo, invitadosFrecuentes, pedidosDelPartido, pedirRefuerzo, sumarInvitadoFrecuente,
  type InvitadoFrecuente, type PedidoDelPartido, type RefuerzoBanco,
} from '../lib/api/refuerzos';
import { aviso } from '../lib/avisos';

const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const ESTADO: Record<string, { texto: string; color: string }> = {
  Pendiente: { texto: 'Esperando respuesta', color: '#ffd08b' },
  Aceptada: { texto: 'Juega', color: '#44f3a9' },
  Rechazada: { texto: 'No puede', color: '#f87171' },
};

/**
 * Para completar el partido (capitán o subcapitán):
 *  - "De confianza": los invitados que ya jugaron con el equipo, con un toque.
 *  - "Otros equipos": jugadores de otros clubes que se ofrecen como refuerzo.
 */
export function PanelRefuerzos({ matchId, teamId, nombresActuales, alSumar }: {
  matchId: string; teamId: number; nombresActuales: string[]; alSumar: (invitado: { id: string; name: string }) => void;
}) {
  const [pestana, setPestana] = useState<'confianza' | 'banco'>('confianza');
  const [frecuentes, setFrecuentes] = useState<InvitadoFrecuente[] | null>(null);
  const [region, setRegion] = useState('Región Metropolitana');
  const [banco, setBanco] = useState<RefuerzoBanco[] | null>(null);
  const [pedidos, setPedidos] = useState<PedidoDelPartido[]>([]);
  const [ocupado, setOcupado] = useState<string | null>(null);

  useEffect(() => {
    invitadosFrecuentes(teamId).then(setFrecuentes).catch(() => setFrecuentes([]));
  }, [teamId]);

  const cargarBanco = useCallback(() => {
    setBanco(null);
    Promise.all([buscarRefuerzos(matchId, region), pedidosDelPartido(matchId)])
      .then(([b, p]) => { setBanco(b); setPedidos(p); })
      .catch((e) => { setBanco([]); aviso.error('No se pudo buscar refuerzos: ' + (e as Error).message); });
  }, [matchId, region]);

  useEffect(() => { if (pestana === 'banco') cargarBanco(); }, [pestana, cargarBanco]);

  const yaEstan = new Set(nombresActuales.map(normal));
  const disponibles = (frecuentes ?? []).filter((f) => !yaEstan.has(normal(f.nombre)));

  const sumar = async (f: InvitadoFrecuente) => {
    setOcupado(f.nombre);
    try {
      alSumar(await sumarInvitadoFrecuente(matchId, f));
    } catch (e) {
      aviso.error('No se pudo sumar: ' + (e as Error).message);
    } finally {
      setOcupado(null);
    }
  };

  const pedir = async (r: RefuerzoBanco) => {
    setOcupado(r.player_id);
    try {
      await pedirRefuerzo(matchId, r.player_id);
      aviso.ok(`Le avisamos a ${r.apodo || r.nombre}. Si acepta, entra a la lista como invitado.`);
      cargarBanco();
    } catch (e) {
      aviso.error((e as Error).message);
    } finally {
      setOcupado(null);
    }
  };

  const cancelar = async (p: PedidoDelPartido) => {
    setOcupado(p.id);
    try {
      await cancelarRefuerzo(p.id);
      cargarBanco();
    } catch (e) {
      aviso.error((e as Error).message);
    } finally {
      setOcupado(null);
    }
  };

  const boton = 'h-9 px-3 rounded-full text-xs font-bold cursor-pointer disabled:opacity-50 shrink-0';
  const fila = 'flex items-center gap-2 p-2.5 rounded-xl';

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <span className="text-[11px] font-black uppercase tracking-widest px-2 text-white/50">Refuerzos</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div className="grid grid-cols-2 gap-1 p-1 rounded-full mb-3" role="tablist" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {([['confianza', 'De confianza'], ['banco', 'Otros equipos']] as const).map(([id, texto]) => (
          <button key={id} type="button" role="tab" aria-selected={pestana === id} onClick={() => setPestana(id)}
            className="h-9 rounded-full text-xs font-bold cursor-pointer"
            style={pestana === id ? { background: '#9acbff', color: '#0b2236' } : { color: 'rgba(255,255,255,0.65)' }}>{texto}</button>
        ))}
      </div>

      {pestana === 'confianza' && (
        frecuentes === null ? <p className="text-xs text-white/50 py-2">Cargando…</p>
        : disponibles.length === 0 ? <p className="text-xs text-white/50 py-2">{frecuentes.length === 0 ? 'Todavía no hay invitados de otros partidos.' : 'Todos tus invitados de confianza ya están en este partido.'}</p>
        : (
          <ul className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
            {disponibles.map((f) => (
              <li key={f.nombre} className={fila} style={{ background: 'rgba(0,0,0,0.2)' }}>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-white truncate">{f.nombre}</span>
                  <span className="block text-[11px] text-white/50">Jugó {f.veces} {f.veces === 1 ? 'vez' : 'veces'}{f.posicion && f.posicion !== 'Invitado' ? ` · ${f.posicion}` : ''}</span>
                </span>
                <button type="button" onClick={() => sumar(f)} disabled={ocupado !== null} className={boton}
                  style={{ background: 'rgba(154,203,255,0.15)', color: '#9acbff' }} aria-label={`Sumar a ${f.nombre}`}>
                  <span className="flex items-center gap-1"><UserPlus size={13} /> {ocupado === f.nombre ? '…' : 'Sumar'}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      )}

      {pestana === 'banco' && (
        <div className="space-y-2">
          <label className="block">
            <span className="sr-only">Región</span>
            <select value={region} onChange={(e) => setRegion(e.target.value)}
              className="w-full h-10 rounded-xl px-3 text-sm text-white outline-none" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(154,203,255,0.2)' }}>
              {REGIONES.map((r) => <option key={r} value={r} style={{ background: '#1c2026' }}>{r}</option>)}
            </select>
          </label>

          {pedidos.length > 0 && (
            <ul className="space-y-1.5" aria-label="Pedidos enviados">
              {pedidos.map((p) => (
                <li key={p.id} className={fila} style={{ background: 'rgba(255,208,139,0.06)' }}>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-white truncate">{p.nombre}</span>
                    <span className="block text-[11px]" style={{ color: ESTADO[p.estado]?.color }}>{ESTADO[p.estado]?.texto ?? p.estado}{p.equipo ? ` · ${p.equipo}` : ''}</span>
                  </span>
                  <button type="button" onClick={() => cancelar(p)} disabled={ocupado !== null} aria-label={`Retirar el pedido a ${p.nombre}`}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:bg-white/10 cursor-pointer"><X size={14} /></button>
                </li>
              ))}
            </ul>
          )}

          {banco === null ? <p className="text-xs text-white/50 py-2">Buscando…</p>
          : banco.filter((r) => !r.estado || r.estado === 'Cancelada').length === 0 ? (
            <p className="text-xs text-white/50 py-2">No hay refuerzos disponibles en {region}. Los jugadores se ofrecen desde su perfil, en "Juego de refuerzo".</p>
          ) : (
            <ul className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
              {banco.filter((r) => !r.estado || r.estado === 'Cancelada').map((r) => (
                <li key={r.player_id} className={fila} style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <span className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-xs font-black" style={{ background: '#31353c' }}>
                    {r.foto ? <img src={r.foto} alt="" className="w-full h-full object-cover" /> : r.nombre.charAt(0)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-white truncate">{r.nombre}{r.apodo ? ` "${r.apodo}"` : ''}</span>
                    <span className="block text-[11px] text-white/55 truncate">
                      {[r.posicion, r.rating ? `nivel ${r.rating}/7` : null, r.comuna, r.equipo].filter(Boolean).join(' · ')}
                    </span>
                    {r.nota && <span className="block text-[11px] text-white/45 italic truncate">{r.nota}</span>}
                  </span>
                  <button type="button" onClick={() => pedir(r)} disabled={ocupado !== null} className={boton}
                    style={{ background: '#44f3a9', color: '#003822' }} aria-label={`Pedirle a ${r.nombre} que juegue`}>
                    <span className="flex items-center gap-1"><Send size={12} /> {ocupado === r.player_id ? '…' : 'Pedir'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
