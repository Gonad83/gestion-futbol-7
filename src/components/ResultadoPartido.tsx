import { useEffect, useState } from 'react';
import { Minus, Plus, Share2, Trophy } from 'lucide-react';
import { JERSEY_COLORS, hexCamiseta } from '../lib/matchmaking';
import { avisoDescuadre, cargarResultado, guardarResultado, type FilaPlanilla, type Lado, type Resultado } from '../lib/api/resultado';
import { aviso, confirmar } from '../lib/avisos';
import { supabase } from '../lib/supabase';
import { compartirImagen, dibujarTarjeta } from '../lib/tarjetaImagen';

const nombreColor = (c: string | null, letra: 'A' | 'B') =>
  c ? `Equipo ${JERSEY_COLORS.find((x) => x.value === c)?.name ?? letra}` : `Equipo ${letra}`;

function Contador({ valor, cambiar, etiqueta, grande = false }: { valor: number; cambiar: (v: number) => void; etiqueta: string; grande?: boolean }) {
  const boton = 'w-11 h-11 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-30';
  return (
    <div className="flex items-center gap-1" role="group" aria-label={etiqueta}>
      <button type="button" className={boton} style={{ background: '#262a31' }} onClick={() => cambiar(Math.max(0, valor - 1))}
        disabled={valor === 0} aria-label={`Restar a ${etiqueta}`}><Minus size={16} /></button>
      <span className={`${grande ? 'text-3xl w-12' : 'text-base w-7'} font-headline font-black text-white text-center tabular-nums`} aria-live="polite">{valor}</span>
      <button type="button" className={boton} style={{ background: '#262a31' }} onClick={() => cambiar(Math.min(grande ? 99 : 50, valor + 1))}
        aria-label={`Sumar a ${etiqueta}`}><Plus size={16} /></button>
    </div>
  );
}

/**
 * Resultado de un partido ya jugado: marcador entre los dos equipos armados y
 * goles y asistencias de cada jugador. El capitán o un subcapitán lo carga;
 * el resto del equipo lo ve.
 */
export function ResultadoPartido({ matchId, teamId, puedeEditar, alGuardar, partido }: {
  matchId: string; teamId: number; puedeEditar: boolean; alGuardar?: () => void;
  partido?: { date: string; location?: string | null };
}) {
  const [datos, setDatos] = useState<Resultado | null>(null);
  const [error, setError] = useState(false);
  const [editando, setEditando] = useState(false);
  const [golesA, setGolesA] = useState(0);
  const [golesB, setGolesB] = useState(0);
  const [filas, setFilas] = useState<FilaPlanilla[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);

  useEffect(() => {
    let vivo = true;
    cargarResultado(matchId, teamId)
      .then((r) => {
        if (!vivo) return;
        setDatos(r);
        setGolesA(r.golesA ?? 0);
        setGolesB(r.golesB ?? 0);
        setFilas(r.filas);
      })
      .catch(() => vivo && setError(true));
    return () => { vivo = false; };
  }, [matchId, teamId]);

  if (error) return <p className="mt-6 text-xs text-red-300">No se pudo cargar el resultado.</p>;
  if (!datos) return null;

  const hayResultado = datos.golesA !== null && datos.golesB !== null;
  if (!hayResultado && !puedeEditar) return null;

  const nombreA = nombreColor(datos.colorA, 'A');
  const nombreB = nombreColor(datos.colorB, 'B');
  const cambiarFila = (id: string, cambios: Partial<FilaPlanilla>) =>
    setFilas((prev) => prev.map((f) => (f.player_id === id ? { ...f, ...cambios } : f)));

  const guardar = async () => {
    const descuadre = avisoDescuadre(golesA, golesB, filas);
    if (descuadre) { aviso.error(descuadre + ' Revisa la planilla.'); return; }
    setGuardando(true);
    try {
      await guardarResultado(matchId, golesA, golesB, filas);
      setDatos({ ...datos, golesA, golesB, filas });
      setEditando(false);
      aviso.ok('Resultado guardado.');
      alGuardar?.();
    } catch (e) {
      aviso.error('No se guardó el resultado: ' + (e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  /** Imagen del resultado para mandar al grupo. */
  const compartir = async () => {
    setCompartiendo(true);
    try {
      const { data: equipo } = await supabase.from('team_settings').select('team_name').eq('id', teamId).maybeSingle();
      const cuando = partido
        ? new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(partido.date)).replace(/./g, '')
        : '';
      const anotadores = datos.filas.filter((f) => f.goles > 0 || f.asistencias > 0)
        .sort((a, b) => b.goles - a.goles || b.asistencias - a.asistencias);
      const detalle = (f: FilaPlanilla) => [f.goles > 0 && `${f.goles} ${f.goles === 1 ? 'gol' : 'goles'}`, f.asistencias > 0 && `${f.asistencias} asist.`].filter(Boolean).join(' · ');
      const imagen = await dibujarTarjeta({
        equipo: equipo?.team_name || 'MiClubPro',
        titulo: 'Resultado',
        destacado: `${datos.golesA} – ${datos.golesB}`,
        bajada: `${nombreA} vs ${nombreB}`,
        filas: [
          ...(cuando ? [{ etiqueta: cuando.charAt(0).toUpperCase() + cuando.slice(1), valor: partido?.location ?? '' }] : []),
          ...anotadores.map((f) => ({ etiqueta: f.nickname || f.name, valor: detalle(f) })),
        ],
      });
      const r = await compartirImagen(imagen, 'resultado.png', `${nombreA} ${datos.golesA} – ${datos.golesB} ${nombreB}`);
      if (r === 'descargada') aviso.ok('Imagen descargada: adjúntala en WhatsApp.');
    } catch (e) {
      aviso.error('No se pudo crear la imagen: ' + (e as Error).message);
    } finally {
      setCompartiendo(false);
    }
  };

  // ── Vista ─────────────────────────────────────────────────────────────────
  if (!editando) {
    const anotadores = datos.filas.filter((f) => f.goles > 0 || f.asistencias > 0);
    return (
      <section className="mt-6 rounded-2xl p-4" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.06)' }} aria-label="Resultado del partido">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/60 mb-3 flex items-center gap-2"><Trophy size={14} /> Resultado</h3>
        {hayResultado ? (
          <>
            <div className="flex items-center justify-center gap-4">
              <span className="flex-1 text-right text-sm font-bold text-white/80 truncate">{nombreA}</span>
              <span className="font-headline font-black text-3xl text-white tabular-nums">{datos.golesA} – {datos.golesB}</span>
              <span className="flex-1 text-sm font-bold text-white/80 truncate">{nombreB}</span>
            </div>
            {anotadores.length > 0 && (
              <ul className="mt-3 space-y-1">
                {anotadores.map((f) => (
                  <li key={f.player_id} className="flex items-center gap-2 text-sm text-white/75">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: hexCamiseta((f.equipo === 'A' ? datos.colorA : datos.colorB) ?? '') }} aria-hidden />
                    <span className="truncate">{f.nickname || f.name}</span>
                    <span className="ml-auto text-white/55 tabular-nums">{f.goles > 0 && `⚽ ${f.goles}`} {f.asistencias > 0 && `🅰️ ${f.asistencias}`}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-sm text-white/60">Este partido todavía no tiene resultado.</p>
        )}
        {hayResultado && (
          <button type="button" onClick={compartir} disabled={compartiendo}
            className="mt-4 w-full h-11 rounded-full text-sm font-bold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: '#44f3a9', color: '#003822' }}>
            <Share2 size={16} /> {compartiendo ? 'Creando imagen…' : 'Compartir resultado'}
          </button>
        )}
        {puedeEditar && (
          <button type="button" onClick={() => setEditando(true)}
            className="mt-4 w-full h-11 rounded-full text-sm font-bold cursor-pointer" style={{ background: hayResultado ? '#262a31' : '#44f3a9', color: hayResultado ? '#fff' : '#003822' }}>
            {hayResultado ? 'Editar resultado' : 'Cargar resultado'}
          </button>
        )}
      </section>
    );
  }

  // ── Edición ───────────────────────────────────────────────────────────────
  const lados: { lado: Lado; titulo: string }[] = [
    { lado: 'A', titulo: nombreA }, { lado: 'B', titulo: nombreB }, { lado: null, titulo: 'Sin equipo asignado' },
  ];
  return (
    <section className="mt-6 rounded-2xl p-4 space-y-5" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.06)' }} aria-label="Cargar resultado">
      <div className="grid grid-cols-2 gap-3">
        {([['A', nombreA, golesA, setGolesA], ['B', nombreB, golesB, setGolesB]] as const).map(([l, nombre, valor, set]) => (
          <div key={l} className="flex flex-col items-center gap-2 rounded-xl p-3" style={{ background: '#10141a' }}>
            <span className="text-xs font-bold text-white/70 text-center truncate max-w-full">{nombre}</span>
            <Contador valor={valor} cambiar={set} etiqueta={`goles de ${nombre}`} grande />
          </div>
        ))}
      </div>

      {filas.length === 0 ? (
        <p className="text-sm text-white/60">No hay jugadores confirmados ni equipos armados para este partido; se guarda solo el marcador.</p>
      ) : (
        lados.map(({ lado, titulo }) => {
          const delLado = filas.filter((f) => f.equipo === lado);
          if (delLado.length === 0) return null;
          return (
            <div key={titulo}>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/60 mb-2">{titulo}</h4>
              <ul className="space-y-2">
                {delLado.map((f) => (
                  <li key={f.player_id} className="rounded-xl p-2.5" style={{ background: '#10141a' }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white truncate">{f.nickname || f.name}</span>
                      {lado === null && (
                        <span className="flex gap-1 shrink-0">
                          {(['A', 'B'] as const).map((l) => (
                            <button key={l} type="button" onClick={() => cambiarFila(f.player_id, { equipo: l })}
                              className="h-9 px-3 rounded-full text-xs font-bold cursor-pointer" style={{ background: '#262a31', color: '#fff' }}>
                              {l === 'A' ? nombreA : nombreB}
                            </button>
                          ))}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-white/60">
                      <span className="flex items-center gap-1">⚽ <Contador valor={f.goles} cambiar={(v) => cambiarFila(f.player_id, { goles: v })} etiqueta={`goles de ${f.name}`} /></span>
                      <span className="flex items-center gap-1">🅰️ <Contador valor={f.asistencias} cambiar={(v) => cambiarFila(f.player_id, { asistencias: v })} etiqueta={`asistencias de ${f.name}`} /></span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}

      <div className="flex gap-2">
        <button type="button" disabled={guardando}
          onClick={async () => { if (await confirmar('¿Descartar los cambios del resultado?', { textoConfirmar: 'Descartar', textoCancelar: 'Seguir editando' })) { setGolesA(datos.golesA ?? 0); setGolesB(datos.golesB ?? 0); setFilas(datos.filas); setEditando(false); } }}
          className="flex-1 h-11 rounded-full text-sm font-bold cursor-pointer" style={{ background: '#262a31', color: '#fff' }}>Cancelar</button>
        <button type="button" onClick={guardar} disabled={guardando}
          className="flex-[2] h-11 rounded-full text-sm font-bold cursor-pointer disabled:opacity-60" style={{ background: '#44f3a9', color: '#003822' }}>
          {guardando ? 'Guardando…' : 'Guardar resultado'}
        </button>
      </div>
    </section>
  );
}
