import { useState } from 'react';
import { format, isSameDay, isToday, eachDayOfInterval, startOfMonth, endOfMonth, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ChevronDown, Clock, MapPin, Cake, PartyPopper, Trophy, X } from 'lucide-react';
import { Capa } from '../../components/Capa';
import { COLORES, edadQueCumple, esSocial, esTorneo, puntosDelDia, tituloPartido, type EventoAgenda, type JugadorCal, type PartidoCal } from './agenda';

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

interface MesProps {
  mes: Date;
  partidos: PartidoCal[];
  cumples: { fecha: Date }[];
  total: number;
  seleccionado: Date | null;
  cargando: boolean;
  anterior: () => void;
  siguiente: () => void;
  tocarDia: (dia: Date) => void;
}

/** Mes compacto, lunes primero, con puntos: verde partido, dorado torneo, violeta social, rosado cumpleaños. */
export function MesCompacto({ mes, partidos, cumples, total, seleccionado, cargando, anterior, siguiente, tocarDia }: MesProps) {
  const inicio = startOfMonth(mes);
  const fin = endOfMonth(mes);
  const antes = (inicio.getDay() + 6) % 7;
  const despues = (7 - ((antes + fin.getDate()) % 7)) % 7;
  const dias = [
    ...Array.from({ length: antes }, (_, i) => ({ dia: subDays(inicio, antes - i), fuera: true })),
    ...eachDayOfInterval({ start: inicio, end: fin }).map(dia => ({ dia, fuera: false })),
    ...Array.from({ length: despues }, (_, i) => ({ dia: addDays(fin, i + 1), fuera: true })),
  ];

  return (
    <section aria-label="Mes" className="rounded-[20px] p-4" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <button type="button" onClick={anterior} aria-label="Mes anterior" className="w-11 h-11 rounded-full flex items-center justify-center text-white/70 hover:bg-white/5 cursor-pointer">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center min-w-0" aria-live="polite">
          <h2 className="font-headline font-bold text-lg text-white leading-tight">{mayuscula(format(mes, 'MMMM yyyy', { locale: es }))}</h2>
          <p className="text-xs text-white/55">{total} {total === 1 ? 'evento' : 'eventos'}</p>
        </div>
        <button type="button" onClick={siguiente} aria-label="Mes siguiente" className="w-11 h-11 rounded-full flex items-center justify-center text-white/70 hover:bg-white/5 cursor-pointer">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-bold text-white/50 py-1" aria-hidden="true">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <span key={d}>{d}</span>)}
      </div>

      <div className={`grid grid-cols-7 gap-y-1 ${cargando ? 'opacity-50' : ''}`}>
        {dias.map(({ dia, fuera }) => {
          const p = puntosDelDia(dia, partidos, cumples);
          const hoy = isToday(dia);
          const elegido = seleccionado && isSameDay(dia, seleccionado);
          const conAlgo = p.partido || p.torneo || p.social || p.cumple;
          return (
            <button key={dia.toISOString()} type="button" disabled={fuera} onClick={() => tocarDia(dia)}
              aria-label={`${format(dia, "EEEE d 'de' MMMM", { locale: es })}${conAlgo ? ', con eventos' : ''}`}
              className="h-11 flex flex-col items-center justify-center rounded-xl enabled:cursor-pointer enabled:hover:bg-white/5 disabled:cursor-default"
              style={elegido && !hoy ? { background: '#262a31' } : undefined}>
              <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm tabular-nums ${hoy ? 'font-bold' : ''}`}
                style={{
                  color: fuera ? 'rgba(255,255,255,0.22)' : hoy ? '#44f3a9' : 'rgba(255,255,255,0.85)',
                  border: hoy ? '2px solid #44f3a9' : '2px solid transparent',
                }}>
                {format(dia, 'd')}
              </span>
              <span className="flex gap-0.5 h-1.5 -mt-0.5" aria-hidden="true">
                {!fuera && p.partido && <i className="w-1.5 h-1.5 rounded-full" style={{ background: COLORES.partido }} />}
                {!fuera && p.torneo && <i className="w-1.5 h-1.5 rounded-full" style={{ background: COLORES.torneo }} />}
                {!fuera && p.social && <i className="w-1.5 h-1.5 rounded-full" style={{ background: COLORES.social }} />}
                {!fuera && p.cumple && <i className="w-1.5 h-1.5 rounded-full" style={{ background: COLORES.cumple }} />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-center flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-white/[0.06] text-xs text-white/60" aria-hidden="true">
        {([['Partido', COLORES.partido], ['Torneo', COLORES.torneo], ['Social', COLORES.social], ['Cumpleaños', COLORES.cumple]] as const).map(([t, c]) => (
          <span key={t} className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full" style={{ background: c }} />{t}</span>
        ))}
      </div>
    </section>
  );
}

interface ItemProps {
  evento: EventoAgenda;
  confirmados: number;
  activos: number;
  abrir: (p: PartidoCal) => void;
  /** Abre el detalle de un cumpleaños; sin esto, el cumpleaños no se puede pinchar. */
  abrirCumple?: (jugador: JugadorCal, fecha: Date) => void;
}

/** Un evento de la agenda: bloque de fecha a la izquierda y la tarjeta a la derecha. */
export function ItemAgenda({ evento, confirmados, activos, abrir, abrirCumple }: ItemProps) {
  const color = evento.tipo === 'cumple' ? COLORES.cumple : esSocial(evento.partido) ? COLORES.social : esTorneo(evento.partido) ? COLORES.torneo : COLORES.partido;
  const bloque = (
    <span className="w-14 shrink-0 self-stretch flex flex-col items-center justify-center rounded-[14px]" style={{ background: '#10141a', border: '1px solid #262a31' }}>
      <span className="font-headline font-bold text-xl text-white tabular-nums leading-none">{format(evento.fecha, 'd')}</span>
      <span className="text-[11px] font-bold uppercase mt-1" style={{ color }}>{format(evento.fecha, 'MMM', { locale: es }).replace('.', '')}</span>
    </span>
  );

  if (evento.tipo === 'cumple') {
    const j = evento.jugador;
    const Caja = abrirCumple ? 'button' : 'div';
    return (
      <li>
      <Caja {...(abrirCumple ? { type: 'button' as const, onClick: () => abrirCumple(j, evento.fecha) } : {})}
        className={`w-full flex gap-3 p-3 rounded-[18px] text-left ${abrirCumple ? 'cursor-pointer hover:bg-[#1c2026] transition-colors' : ''}`}
        style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>
        {bloque}
        <span className="flex-1 min-w-0 py-1">
          <span className="flex items-center justify-between gap-2">
            <span className="font-headline font-bold text-white truncate">Cumpleaños de {j.nickname || j.name.split(' ')[0]}</span>
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(244,114,182,0.14)', color: COLORES.cumple }}>
              <Cake size={12} /> Cumple
            </span>
          </span>
          <span className="block text-sm text-white/60 mt-1">{mayuscula(format(evento.fecha, "EEEE d 'de' MMMM", { locale: es }))}</span>
        </span>
      </Caja>
      </li>
    );
  }

  const p = evento.partido;
  const social = esSocial(p);
  const torneo = esTorneo(p);
  const pct = activos > 0 ? Math.min(100, Math.round((confirmados / activos) * 100)) : 0;
  return (
    <li>
      <button type="button" onClick={() => abrir(p)}
        className="w-full flex gap-3 p-3 rounded-[18px] text-left cursor-pointer hover:bg-[#1c2026] transition-colors"
        style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>
        {bloque}
        <span className="flex-1 min-w-0 py-1">
          <span className="flex items-center justify-between gap-2">
            <span className="font-headline font-bold text-white truncate">{tituloPartido(p)}</span>
            {social ? (
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(167,139,250,0.15)', color: COLORES.social }}>
                <PartyPopper size={12} /> Social
              </span>
            ) : torneo ? (
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(255,208,139,0.14)', color: COLORES.torneo }}>
                <Trophy size={12} /> Torneo
              </span>
            ) : <ChevronRight size={16} className="text-white/35 shrink-0" />}
          </span>
          <span className="flex items-center gap-x-3 gap-y-1 flex-wrap text-sm text-white/60 mt-1">
            <span className="flex items-center gap-1"><Clock size={13} /> {mayuscula(format(evento.fecha, 'EEEE', { locale: es }))} · {format(evento.fecha, 'HH:mm')}</span>
            {p.location && <span className="flex items-center gap-1 min-w-0"><MapPin size={13} className="shrink-0" /><span className="truncate">{p.location}</span></span>}
          </span>
          {!social && activos > 0 && (
            <span className="block mt-2.5">
              <span className="flex justify-between text-xs mb-1">
                <span className="text-white/60 tabular-nums">{confirmados}/{activos} confirmados</span>
                <span className="font-bold tabular-nums" style={{ color }}>{pct}%</span>
              </span>
              <span className="block h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
              </span>
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

interface PasadosProps {
  eventos: EventoAgenda[];
  confirmados: Record<string, number>;
  activos: number;
  abrir: (p: PartidoCal) => void;
  abrirCumple?: (jugador: JugadorCal, fecha: Date) => void;
}

/** Lo que ya pasó este mes, plegado para no estorbar. */
export function YaJugados({ eventos, confirmados, activos, abrir, abrirCumple }: PasadosProps) {
  const [abierto, setAbierto] = useState(false);
  if (eventos.length === 0) return null;
  return (
    <section>
      <button type="button" onClick={() => setAbierto(v => !v)} aria-expanded={abierto}
        className="w-full h-14 px-4 flex items-center justify-between rounded-[18px] text-white/75 cursor-pointer"
        style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="flex items-center gap-2"><Trophy size={15} className="text-white/45" /> Ya pasaron este mes ({eventos.length})</span>
        <ChevronDown size={18} className={`transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <ul className="space-y-2 mt-2 opacity-70">
          {eventos.map(e => (
            <ItemAgenda key={e.tipo === 'partido' ? e.partido.id : `c-${e.jugador.id}`} evento={e} activos={activos}
              confirmados={e.tipo === 'partido' ? confirmados[e.partido.id] || 0 : 0} abrir={abrir} abrirCumple={abrirCumple} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** El detalle de un cumpleaños: quién es, qué día cae y cuántos cumple. */
export function DetalleCumple({ jugador, fecha, cerrar }: { jugador: JugadorCal; fecha: Date; cerrar: () => void }) {
  const edad = edadQueCumple(jugador, fecha);
  const iniciales = jugador.name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
  return (
    <Capa>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in" onClick={cerrar}
        role="dialog" aria-modal="true" aria-label={`Cumpleaños de ${jugador.name}`}>
        <div className="glass-card w-full max-w-sm text-center relative scale-in" onClick={e => e.stopPropagation()}>
          <button type="button" onClick={cerrar} aria-label="Cerrar" className="absolute top-3 right-3 text-white/50 hover:text-white p-1 cursor-pointer"><X size={20} /></button>
          <span className="mx-auto w-24 h-24 rounded-full overflow-hidden flex items-center justify-center font-headline font-black text-3xl text-white"
            style={{ background: '#31353c', border: `3px solid ${COLORES.cumple}` }}>
            {jugador.photo_url ? <img src={jugador.photo_url} alt="" className="w-full h-full object-cover" /> : iniciales}
          </span>
          <p className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mt-4" style={{ background: 'rgba(244,114,182,0.14)', color: COLORES.cumple }}>
            <Cake size={13} /> Cumpleaños
          </p>
          <h2 className="font-headline font-black text-2xl text-white mt-2">{jugador.name}</h2>
          {jugador.nickname && <p className="text-sm text-white/55">"{jugador.nickname}"</p>}
          <p className="text-white/80 mt-3">{mayuscula(format(fecha, "EEEE d 'de' MMMM", { locale: es }))}</p>
          {edad !== null && <p className="font-headline font-bold text-lg mt-1" style={{ color: COLORES.cumple }}>Cumple {edad} años</p>}
        </div>
      </div>
    </Capa>
  );
}
