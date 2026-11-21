import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, MapPin, RefreshCw, Send, Shirt, Trophy, Users, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { Lamina } from '../../components/Lamina';
import { aviso } from '../../lib/avisos';
import { buildBest, COLORES_CAMISETA, FORMACIONES_POR_FORMATO, isGK } from './alineacion';

interface Props {
  /** La solicitud de amistoso, con su desafiante ya definido. */
  solicitud: any;
  miEquipoId: number;
  /** Ficha pública de cada equipo (nombre, escudo, comuna). */
  local: any;
  visita: any;
  /** Capitán, subcapitán o administrador: elige camiseta y escribe al rival. */
  puedeCoordinar: boolean;
  onCerrar: () => void;
}

const SIN_COLOR_MIO = 'emerald';
const nombreColor = (valor?: string | null) => COLORES_CAMISETA.find(c => c.value === valor)?.name;
const rotuloDe = (j: any) => { const n = (j.name || '').trim(); return j.nickname?.trim() || n.split(/\s+/).pop() || n; };
const puestoDe = (j: any, arquero: boolean) => arquero || isGK(j) ? 'POR' : j.position?.trim().slice(0, 3).toUpperCase() || 'INV';
const fecha = (d: string) => { try { return format(new Date(d + 'T12:00:00'), 'EEE d MMM', { locale: es }); } catch { return d; } };
const hora = (iso: string) => { try { return format(new Date(iso), 'd MMM HH:mm', { locale: es }); } catch { return ''; } };

/** Dónde va cada jugador dentro de su mitad: el arquero en su arco y los delanteros hacia el medio. */
function posEnMitad(idx: number, formacion: string, arriba: boolean): React.CSSProperties {
  const lineas = [1, ...formacion.split('-').map(Number)];
  let acc = 0, li = 0, pi = 0;
  for (let i = 0; i < lineas.length; i++) {
    if (idx < acc + lineas[i]) { li = i; pi = idx - acc; break; }
    acc += lineas[i];
  }
  const desdeElArco = `${2 + (li / Math.max(lineas.length - 1, 1)) * 36}%`;
  return {
    position: 'absolute',
    ...(arriba ? { top: desdeElArco } : { bottom: desdeElArco }),
    left: `${(100 / (lineas[li] + 1)) * (pi + 1)}%`,
    transform: 'translateX(-50%)',
    transition: 'all 0.55s cubic-bezier(0.34,1.56,0.64,1)',
  };
}
const altoEnMitad = (formacion: string) => {
  const lineas = [1, ...formacion.split('-').map(Number)];
  return `min(${(36 / Math.max(lineas.length - 1, 1) * 0.98).toFixed(2)}cqh, ${((100 / (Math.max(...lineas) + 1)) * 0.9 * (4 / 3)).toFixed(2)}cqw)`;
};

function Escudo({ equipo, lado }: { equipo: any; lado: number }) {
  return (
    <span className="rounded-2xl flex-shrink-0 flex items-center justify-center font-headline font-black text-white overflow-hidden"
      style={{ width: lado, height: lado, fontSize: lado * 0.42, background: 'linear-gradient(135deg,#1e3a5f,#3b82f6)', border: '2px solid rgba(255,255,255,0.18)' }}>
      {equipo?.logo_url ? <img src={equipo.logo_url} alt="" className="w-full h-full object-cover" /> : (equipo?.team_name?.charAt(0) || '?')}
    </span>
  );
}

/**
 * La sala de un amistoso: los dos equipos en una misma cancha (el rival arriba,
 * el mío abajo), la camiseta de cada uno y la conversación entre sus capitanes.
 * En la cancha van los que marcaron "Voy"; mientras nadie responde, se muestra
 * el equipo probable.
 */
export function SalaAmistoso({ solicitud, miEquipoId, local, visita, puedeCoordinar, onCerrar }: Props) {
  const soyLocal = solicitud.team_id === miEquipoId;
  const rivalId: number = soyLocal ? solicitud.challenger_team_id : solicitud.team_id;
  const miFicha = soyLocal ? local : visita;
  const rivalFicha = soyLocal ? visita : local;
  const formaciones = FORMACIONES_POR_FORMATO[solicitud.format] || FORMACIONES_POR_FORMATO['7vs7'];

  const [jugadores, setJugadores] = useState<any[] | null>(null);
  const [colores, setColores] = useState<{ local: string | null; visita: string | null }>({ local: solicitud.color_local ?? null, visita: solicitud.color_visita ?? null });
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [miFormacion, setMiFormacion] = useState(formaciones[0]);
  const [elegido, setElegido] = useState<any | null>(null);
  const finDelChat = useRef<HTMLDivElement>(null);
  const cuantosMensajes = useRef(0);

  const refrescar = useCallback(async () => {
    const [sol, msj] = await Promise.all([
      supabase.from('friendly_requests').select('color_local, color_visita').eq('id', solicitud.id).maybeSingle(),
      puedeCoordinar
        ? supabase.from('mensajes_amistoso').select('id, team_id, texto, created_at').eq('solicitud_id', solicitud.id).order('created_at')
        : Promise.resolve({ data: [] as any[] }),
    ]);
    if (sol.data) setColores({ local: sol.data.color_local, visita: sol.data.color_visita });
    if (msj.data) setMensajes(msj.data);
  }, [solicitud.id, puedeCoordinar]);

  useEffect(() => {
    let vivo = true;
    supabase.rpc('sala_amistoso', { p_solicitud: solicitud.id }).then(({ data }) => { if (vivo) setJugadores(data || []); });
    // El rival puede cambiar su camiseta o escribir mientras la sala está abierta.
    const primero = window.setTimeout(refrescar, 0);
    const reloj = window.setInterval(refrescar, 6000);
    return () => { vivo = false; window.clearTimeout(primero); window.clearInterval(reloj); };
  }, [solicitud.id, refrescar]);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', alTeclear);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', alTeclear); document.body.style.overflow = antes; };
  }, [onCerrar]);

  useEffect(() => {
    if (mensajes.length > cuantosMensajes.current) finDelChat.current?.scrollIntoView({ block: 'nearest' });
    cuantosMensajes.current = mensajes.length;
  }, [mensajes.length]);

  const miColorElegido = soyLocal ? colores.local : colores.visita;
  const colorRivalElegido = soyLocal ? colores.visita : colores.local;
  const miColor = miColorElegido || (colorRivalElegido === SIN_COLOR_MIO ? 'white' : SIN_COLOR_MIO);
  const colorRival = colorRivalElegido || (miColor === 'blue' ? 'red' : 'blue');

  const elegirColor = async (valor: string) => {
    if (!puedeCoordinar || valor === miColorElegido) return;
    const antes = colores;
    setColores(soyLocal ? { ...colores, local: valor } : { ...colores, visita: valor });
    const { error } = await supabase.rpc('elegir_color_amistoso', { p_solicitud: solicitud.id, p_color: valor });
    if (error) { setColores(antes); aviso.error(error.message); refrescar(); }
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    const { error } = await supabase.from('mensajes_amistoso').insert({ solicitud_id: solicitud.id, team_id: miEquipoId, texto: limpio.slice(0, 500) });
    setEnviando(false);
    if (error) { aviso.error('No se pudo enviar: ' + error.message); return; }
    setTexto('');
    refrescar();
  };

  /** Los que juegan por un equipo: quienes marcaron "Voy"; si aún nadie responde, el equipo probable. */
  const ladoDe = (equipoId: number, formacion: string) => {
    const plantel = (jugadores || []).filter(j => j.team_id === equipoId);
    const van = plantel.filter(j => j.va);
    const confirmados = van.length > 0;
    const convocados = confirmados ? van : plantel;
    const titulares = buildBest(convocados, formacion);
    const enCancha = new Set(titulares.map(j => j.id));
    return {
      confirmados, titulares, formacion,
      banca: confirmados ? convocados.filter(j => !enCancha.has(j.id)) : [],
      hayPartido: plantel.some(j => j.hay_partido),
      total: van.length,
    };
  };
  const mio = ladoDe(miEquipoId, miFormacion);
  const rival = ladoDe(rivalId, formaciones[0]);

  const estado = (lado: ReturnType<typeof ladoDe>) =>
    lado.confirmados ? `${lado.total} ${lado.total === 1 ? 'confirmado' : 'confirmados'}`
      : lado.hayPartido ? 'Aún nadie confirma · equipo probable' : 'Equipo probable';

  const mitad = (lado: ReturnType<typeof ladoDe>, color: string, arriba: boolean) =>
    lado.titulares.map((j, i) => (
      <div key={j.id} className="pitch-player" style={{ ...posEnMitad(i, lado.formacion, arriba), zIndex: arriba ? 20 - i : 30 + i, filter: elegido && elegido.id !== j.id ? 'brightness(0.6)' : undefined }}>
        <Lamina nombre={j.name} rotulo={rotuloDe(j)} foto={j.photo_url} estrellas={j.rating} puesto={puestoDe(j, i === 0)}
          color={color} titulos={j.mvps} alto={altoEnMitad(lado.formacion)} orden={i} elegido={elegido?.id === j.id}
          onClick={() => setElegido((actual: any) => actual?.id === j.id ? null : j)}
          ariaLabel={`${j.name}, ${j.position || 'sin puesto'}`} title={j.name} />
      </div>
    ));

  const rotuloMitad = (equipo: any, lado: ReturnType<typeof ladoDe>, arriba: boolean) => (
    <div className={`absolute left-5 right-5 flex justify-between gap-2 pointer-events-none ${arriba ? 'top-5 items-start' : 'bottom-5 items-end'}`} style={{ zIndex: 5 }}>
      <span className="text-[9px] font-black uppercase tracking-widest text-white/45 leading-tight max-w-[32%]">{equipo?.team_name}</span>
      <span className="text-[9px] font-black uppercase tracking-widest text-white/45 leading-tight max-w-[32%] text-right">{estado(lado)}</span>
    </div>
  );

  const bancaDe = (titulo: string, lado: ReturnType<typeof ladoDe>) => lado.banca.length > 0 && (
    <p className="text-[11px] text-white/55"><span className="font-black text-white/70">{titulo}:</span> {lado.banca.map(rotuloDe).join(', ')}</p>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 fade-in" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={onCerrar} role="dialog" aria-modal="true" aria-label={`Amistoso ${local?.team_name || ''} contra ${visita?.team_name || ''}`}>
      <div className="w-full sm:max-w-md max-h-[94dvh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl scale-in"
        style={{ background: '#10141a', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}>

        {/* Cabecera: los dos equipos frente a frente */}
        <div className="relative px-5 pt-5 pb-4 flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0d3b2c 0%,#1c2026 50%,#12305a 100%)' }}>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors" style={{ background: 'rgba(0,0,0,0.35)' }}><X size={15} /></button>
          <div className="flex items-center justify-center gap-3 px-6">
            <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5 text-center">
              <Escudo equipo={miFicha} lado={48} />
              <p className="font-headline text-xs font-black text-white italic uppercase leading-tight line-clamp-2">{miFicha?.team_name || 'Mi equipo'}</p>
            </div>
            <span className="font-headline text-lg font-black italic text-white/40">VS</span>
            <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5 text-center">
              <Escudo equipo={rivalFicha} lado={48} />
              <p className="font-headline text-xs font-black text-white italic uppercase leading-tight line-clamp-2">{rivalFicha?.team_name || 'Rival'}</p>
            </div>
          </div>
          <p className="text-[11px] text-white/60 flex items-center justify-center gap-1.5 flex-wrap mt-3">
            <Clock size={11} />{fecha(solicitud.date)} · {solicitud.time}<span className="font-black" style={{ color: '#9acbff' }}>{solicitud.format}</span>
            <MapPin size={11} className="ml-1" />{solicitud.location}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 custom-scrollbar">
          {!jugadores ? (
            <div className="flex justify-center py-16"><RefreshCw className="animate-spin text-white/30" size={22} /></div>
          ) : (
            <>
              {/* La cancha compartida */}
              <div className="space-y-2.5">
                <div className="relative overflow-hidden mx-auto w-full"
                  style={{ aspectRatio: '3/5', containerType: 'size', background: 'linear-gradient(180deg,#053d2e 0%,#065f46 50%,#053d2e 100%)', border: '4px solid #0a0e14', borderRadius: '1.5rem' }}
                  onClick={() => setElegido(null)}>
                  <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 9%,rgba(255,255,255,0.06) 9%,rgba(255,255,255,0.06) 10%)' }} />
                  <div className="absolute inset-3 border-2 border-white/15 rounded-xl pointer-events-none" />
                  <div className="absolute left-3 right-3 top-1/2 h-px bg-white/25 pointer-events-none" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white/15 rounded-full pointer-events-none" />
                  <div className="absolute left-1/2 -translate-x-1/2 top-3 w-24 h-10 border-2 border-white/15 border-t-0 rounded-b-xl pointer-events-none" />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-3 w-24 h-10 border-2 border-white/15 border-b-0 rounded-t-xl pointer-events-none" />
                  {rotuloMitad(rivalFicha, rival, true)}
                  {rotuloMitad(miFicha, mio, false)}
                  <div onClick={e => e.stopPropagation()}>
                    {mitad(rival, colorRival, true)}
                    {mitad(mio, miColor, false)}
                  </div>
                </div>

                {elegido ? (
                  <div className="rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 scale-in" style={{ background: '#1c2026' }}>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white truncate">{elegido.name}</p>
                      <p className="text-[11px] text-white/55 truncate">{elegido.team_id === miEquipoId ? miFicha?.team_name : rivalFicha?.team_name} · {elegido.position || 'Sin puesto'}</p>
                    </div>
                    {elegido.mvps > 0 && <span className="text-[11px] font-black flex items-center gap-1 flex-shrink-0" style={{ color: '#ffd08b' }}><Trophy size={11} />{elegido.mvps} MVP</span>}
                  </div>
                ) : (
                  <p className="text-[11px] text-white/40 text-center">En la cancha van los que marcaron "Confirmo" en el partido. Toca un jugador para ver quién es.</p>
                )}

                <div className="flex gap-2 flex-wrap items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/45 mr-1">Mi formación</span>
                  {formaciones.map(f => (
                    <button key={f} type="button" onClick={() => { setMiFormacion(f); setElegido(null); }} className="px-2.5 py-1 rounded-lg text-[11px] font-black transition-all"
                      style={miFormacion === f ? { background: 'rgba(68,243,169,0.15)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.4)' } : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>{f}</button>
                  ))}
                </div>
                {bancaDe('También van por nosotros', mio)}
                {bancaDe(`También van por ${rivalFicha?.team_name || 'el rival'}`, rival)}
              </div>

              {/* Camisetas */}
              <div className="rounded-2xl p-4 space-y-3" style={{ background: '#1c2026' }}>
                <p className="text-sm font-black text-white flex items-center gap-2"><Shirt size={15} style={{ color: '#44f3a9' }} /> Camisetas</p>
                <div className="grid grid-cols-2 gap-2">
                  {[[miFicha, miColorElegido, 'Nosotros'], [rivalFicha, colorRivalElegido, 'Rival']].map(([equipo, valor, quien]) => (
                    <div key={quien as string} className="rounded-xl px-3 py-2.5 flex items-center gap-2.5" style={{ background: 'rgba(0,0,0,0.28)' }}>
                      <span className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 ${COLORES_CAMISETA.find(c => c.value === valor)?.cls || 'border-dashed border-white/25'}`} />
                      <span className="min-w-0">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-white/45">{quien as string}</span>
                        <span className="block text-xs font-black text-white truncate">{nombreColor(valor as string) || 'Sin elegir'}</span>
                        <span className="sr-only">{(equipo as any)?.team_name}</span>
                      </span>
                    </div>
                  ))}
                </div>
                {puedeCoordinar ? (
                  <>
                    <p className="text-[11px] text-white/55">Elige la camiseta de tu equipo. La del rival queda bloqueada para que no se repitan.</p>
                    <div className="flex gap-2.5 flex-wrap">
                      {COLORES_CAMISETA.map(c => {
                        const delRival = c.value === colorRivalElegido;
                        const mia = c.value === miColorElegido;
                        return (
                          <button key={c.value} type="button" disabled={delRival} onClick={() => elegirColor(c.value)}
                            aria-label={`${c.name}${delRival ? ', la usa el rival' : mia ? ', elegida' : ''}`} aria-pressed={mia} title={delRival ? `${c.name}: la usa el rival` : c.name}
                            className={`relative w-9 h-9 rounded-xl border-2 transition-all ${c.cls} ${mia ? 'scale-110 border-white ring-2 ring-white/25' : delRival ? 'opacity-25 cursor-not-allowed' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                            {delRival && <X size={16} className="absolute inset-0 m-auto text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-white/55">La camiseta la eligen el capitán, el subcapitán o el administrador de cada equipo.</p>
                )}
              </div>

              {/* Conversación entre capitanes */}
              {puedeCoordinar && (
                <div className="rounded-2xl overflow-hidden" style={{ background: '#1c2026' }}>
                  <div className="px-4 pt-4 pb-2">
                    <p className="text-sm font-black text-white flex items-center gap-2"><Users size={15} style={{ color: '#9acbff' }} /> Coordinar con {rivalFicha?.team_name || 'el rival'}</p>
                    <p className="text-[11px] text-white/50 mt-0.5">Lo leen capitanes, subcapitanes y administradores de los dos equipos.</p>
                  </div>
                  <div className="px-4 py-2 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {mensajes.length === 0 && <p className="text-[11px] text-white/40 text-center py-4">Aún no hay mensajes. Escribe para ponerse de acuerdo en camisetas, árbitro o cancha.</p>}
                    {mensajes.map(m => {
                      const mioMsj = m.team_id === miEquipoId;
                      return (
                        <div key={m.id} className={`flex ${mioMsj ? 'justify-end' : 'justify-start'}`}>
                          <div className="max-w-[82%] rounded-2xl px-3 py-2" style={mioMsj ? { background: 'rgba(68,243,169,0.14)' } : { background: 'rgba(154,203,255,0.12)' }}>
                            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: mioMsj ? '#44f3a9' : '#9acbff' }}>{mioMsj ? miFicha?.team_name : rivalFicha?.team_name}</p>
                            <p className="text-xs text-white whitespace-pre-wrap break-words">{m.texto}</p>
                            <p className="text-[9px] text-white/40 text-right mt-0.5">{hora(m.created_at)}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={finDelChat} />
                  </div>
                  <form onSubmit={enviar} className="flex gap-2 p-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
                    <input type="text" className="input-field text-sm flex-1" placeholder="Escribe un mensaje…" maxLength={500} value={texto} onChange={e => setTexto(e.target.value)} aria-label="Mensaje para el rival" />
                    <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar" className="btn-primary px-4 flex items-center justify-center disabled:opacity-40"><Send size={15} /></button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
