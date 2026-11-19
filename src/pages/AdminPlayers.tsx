import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase, withTimeout } from '../lib/supabase';
import {
  Trash2, Bell, BellOff, CheckCircle2, Circle, DollarSign, BellRing, Send, Loader2, Crown, ShieldCheck,
  ChevronRight, Search, X, Pencil, Mail, ListChecks,
} from 'lucide-react';
import PlayerModal from '../components/PlayerModal';
import { Capa } from '../components/Capa';
import { useAuth } from '../hooks/useAuth';
import { sendMatchReminder, sendPaymentReminder } from '../lib/sendEmail';
import { aviso, confirmar } from '../lib/avisos';
import { clp } from '../lib/formato';
import { enlacesDelPartido } from '../lib/enlaceAsistencia';
import { CUOTA_POR_DEFECTO, morososDeCaja, type MorosoCaja } from '../lib/api/finanzas';
import { MONTHS } from '../lib/formato';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Jugador = { id: string; name: string; nickname?: string | null; email?: string | null; photo_url?: string | null; status: string; notify?: boolean | null; match_role?: string | null; user_id?: string | null; [k: string]: any };
type Asistencia = { id: string; player_id: string; status: string };
type Filtro = 'todos' | 'sinCuenta' | 'sinAvisos';
type Rol = 'player' | 'subcaptain' | 'captain';

const ESTADOS = [
  { valor: 'Activo', activo: { background: '#44f3a9', color: '#003822' } },
  { valor: 'Lesionado', activo: { background: 'rgba(248,113,113,0.25)', color: '#fecaca' } },
  { valor: 'Inactivo', activo: { background: '#31353c', color: '#fff' } },
] as const;
const ROLES: { valor: Rol; texto: string }[] = [
  { valor: 'player', texto: 'Jugador' }, { valor: 'subcaptain', texto: 'Subcapitán' }, { valor: 'captain', texto: 'Capitán' },
];

const iniciales = (n: string) => n.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?';

function Segmentado<T extends string>({ opciones, valor, cambiar, etiqueta }: { opciones: { valor: T; texto: string; activo?: React.CSSProperties }[]; valor: T; cambiar: (v: T) => void; etiqueta: string }) {
  return (
    <div className="grid gap-1 p-1 rounded-xl" style={{ gridTemplateColumns: `repeat(${opciones.length}, 1fr)`, background: '#10141a' }} role="radiogroup" aria-label={etiqueta}>
      {opciones.map(o => (
        <button key={o.valor} type="button" role="radio" aria-checked={valor === o.valor} onClick={() => cambiar(o.valor)}
          className="h-11 rounded-lg text-sm font-bold transition-colors cursor-pointer"
          style={valor === o.valor ? (o.activo ?? { background: '#44f3a9', color: '#003822' }) : { color: 'rgba(255,255,255,0.65)' }}>
          {o.texto}
        </button>
      ))}
    </div>
  );
}

/**
 * Administrar jugadores (capitán). Diseño basado en el concepto de Stitch
 * (docs/diseno/administrar-movil-stitch.png): resumen, buscador, filtros y una
 * fila por jugador con su "Va" al próximo partido; el resto (estado, rol,
 * correos, envíos, editar, eliminar) va en una hoja que se abre al tocarlo.
 * Antes era una tabla de 8 columnas que en el celular había que deslizar.
 */
export default function AdminPlayers() {
  const { teamId, isAdmin } = useAuth();
  const [players, setPlayers] = useState<Jugador[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Jugador | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [attendances, setAttendances] = useState<Asistencia[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [sending, setSending] = useState<'pago' | 'recordatorio' | 'lista' | null>(null);
  const [equipo, setEquipo] = useState({ nombre: '', cuota: 0, linkPago: '' });
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [menuEnvio, setMenuEnvio] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchPlayers = useCallback(async () => {
    if (!teamId) return;
    try {
      setLoading(true);
      const { data } = await withTimeout(supabase.from('players').select('*').eq('team_id', teamId).order('name') as unknown as Promise<{ data: Jugador[] | null }>, 10000);
      if (data) setPlayers(data);

      const { data: matches } = await withTimeout(supabase.from('matches').select('*').eq('team_id', teamId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .gte('date', new Date().toISOString()).order('date').limit(1) as unknown as Promise<{ data: any[] | null }>, 8000);
      if (matches && matches.length > 0) {
        setNextMatch(matches[0]);
        const { data: att } = await withTimeout(supabase.from('attendance').select('*').eq('match_id', matches[0].id) as unknown as Promise<{ data: Asistencia[] | null }>, 5000);
        if (att) setAttendances(att);
      }

      const { data: s } = await withTimeout(supabase.from('team_settings').select('team_name, quota_amount, payment_link, payment_button_enabled').eq('id', teamId).single() as unknown as Promise<{ data: { team_name: string; quota_amount: number; payment_link: string; payment_button_enabled: boolean } | null }>, 5000);
      if (s) setEquipo({ nombre: s.team_name || '', cuota: Number(s.quota_amount) || 0, linkPago: s.payment_button_enabled ? s.payment_link || '' : '' });
    } catch (e) {
      console.error('Error in AdminPlayers fetch:', e);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { fetchPlayers(); }, [fetchPlayers]);

  useEffect(() => {
    if (!menuEnvio) return;
    const cerrar = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuEnvio(false); };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [menuEnvio]);

  const va = (id: string) => attendances.some(a => a.player_id === id && a.status === 'Voy');

  const toggleAttendance = async (playerId: string) => {
    if (!isAdmin || !nextMatch) return;
    setTogglingId(playerId + 'att');
    const existing = attendances.find(a => a.player_id === playerId);
    if (existing) {
      if (existing.status === 'Voy') {
        const { error } = await supabase.from('attendance').delete().eq('id', existing.id);
        if (!error) setAttendances(prev => prev.filter(a => a.id !== existing.id));
        else aviso.error('No se guardó la asistencia: ' + error.message);
      } else {
        const { error } = await supabase.from('attendance').update({ status: 'Voy' }).eq('id', existing.id);
        if (!error) setAttendances(prev => prev.map(a => (a.id === existing.id ? { ...a, status: 'Voy' } : a)));
        else aviso.error('No se guardó la asistencia: ' + error.message);
      }
    } else {
      const { data, error } = await supabase.from('attendance').insert([{ match_id: nextMatch.id, player_id: playerId, status: 'Voy' }]).select();
      if (data) setAttendances(prev => [...prev, data[0]]);
      if (error) aviso.error('No se guardó la asistencia: ' + error.message);
    }
    setTogglingId(null);
  };

  const actualizar = async (player: Jugador, cambios: Partial<Jugador>) => {
    if (!isAdmin) return;
    const { error } = await supabase.from('players').update(cambios).eq('id', player.id).eq('team_id', teamId);
    if (error) { aviso.error('No se pudo guardar: ' + error.message); return; }
    setPlayers(prev => prev.map(p => (p.id === player.id ? { ...p, ...cambios } : p)));
  };

  const cambiarRol = (player: Jugador, rol: Rol) => {
    if (rol === 'captain' && players.some(p => p.match_role === 'captain' && p.id !== player.id)) { aviso.info('Ya hay un capitán. Quítale el rol primero.'); return; }
    if (rol === 'subcaptain' && players.filter(p => p.match_role === 'subcaptain' && p.id !== player.id).length >= 3) { aviso.info('Ya hay 3 subcapitanes.'); return; }
    actualizar(player, { match_role: rol === 'player' ? null : rol });
  };

  const handleDelete = async (player: Jugador) => {
    if (!isAdmin) return;
    // Sus pagos son parte del saldo de la caja: borrarlos lo cambiaría. Quien
    // pagó alguna vez se deja Inactivo (no aparece en listas ni cobros).
    const { count, error: errPagos } = await supabase.from('payments').select('id', { count: 'exact', head: true })
      .eq('player_id', player.id).in('status', ['Pagado', 'Pendiente', 'Atrasado']).gt('amount', 0);
    if (errPagos) { aviso.error('No se pudo revisar sus pagos: ' + errPagos.message); return; }
    if ((count ?? 0) > 0) {
      if (await confirmar(`${player.name} tiene pagos registrados en la caja; si lo eliminas, el saldo cambiaría. ¿Lo marco como Inactivo? Deja de aparecer en listas y cobros, y su historial se conserva.`, { textoConfirmar: 'Marcar Inactivo' })) {
        await actualizar(player, { status: 'Inactivo' });
      }
      return;
    }
    if (!(await confirmar(`¿Eliminar a ${player.name}? Se borra también su asistencia. Esta acción no se puede deshacer.`))) return;
    setAbierto(null);
    const { error: errAsis } = await supabase.from('attendance').delete().eq('player_id', player.id);
    const { error } = errAsis ? { error: errAsis } : await supabase.from('players').delete().eq('id', player.id).eq('team_id', teamId);
    if (error) {
      aviso.error(/foreign key|violates/i.test(error.message)
        ? `No se puede eliminar a ${player.name} porque tiene historial (por ejemplo, fue MVP). Márcalo como Inactivo.`
        : 'No se pudo eliminar: ' + error.message);
      return;
    }
    setPlayers(prev => prev.filter(p => p.id !== player.id));
    aviso.ok(`${player.name} fue eliminado.`);
  };

  const bulkNotify = async (value: boolean) => {
    setMenuEnvio(false);
    if (!isAdmin) return;
    const { error } = await supabase.from('players').update({ notify: value }).eq('team_id', teamId);
    if (error) { aviso.error('No se pudo guardar: ' + error.message); return; }
    setPlayers(prev => prev.map(p => ({ ...p, notify: value })));
    aviso.ok(value ? 'Todos recibirán correos.' : 'Nadie recibirá correos.');
  };

  const fechaPartido = () => format(new Date(nextMatch.date), "EEEE d 'de' MMMM, HH:mm", { locale: es });

  /** Quiénes deben cuotas hoy, con la misma cuenta que Caja (meses desde su ingreso, menos abonos). */
  const cargarMorosos = async (lista: Jugador[]): Promise<Map<string, MorosoCaja>> => {
    const ids = lista.map(p => p.id);
    if (ids.length === 0) return new Map();
    const { data, error } = await supabase.from('payments').select('player_id, month, year, status, amount, es_deuda').in('player_id', ids);
    if (error) throw error;
    const cuota = equipo.cuota > 0 ? equipo.cuota : CUOTA_POR_DEFECTO;
    const morosos = morososDeCaja(
      lista.map(p => ({ id: p.id, name: p.name, nickname: p.nickname ?? null, status: p.status, created_at: (p.created_at as string | null) ?? null })),
      data ?? [], cuota,
    );
    return new Map(morosos.map(m => [m.id, m]));
  };
  const mesesDe = (m: MorosoCaja) => m.pendingMonths.map(x => `${MONTHS[x.month - 1]} ${x.year}`);

  const sendToPlayer = async (type: 'pago' | 'recordatorio', player: Jugador) => {
    if (!player.email) { aviso.info(`${player.name} no tiene correo registrado.`); return; }
    try {
      if (type === 'recordatorio' && nextMatch) {
        const enlace = await enlacesDelPartido(nextMatch.id);
        const ok = await sendMatchReminder(player.email, player.name, fechaPartido(), nextMatch.location || '', enlace(player.id, 'Voy'), enlace(player.id, 'No voy'));
        if (!ok) { aviso.error('No se pudo enviar el correo.'); return; }
      } else if (type === 'pago') {
        const deuda = (await cargarMorosos([player])).get(player.id);
        if (!deuda) { aviso.info(`${player.name} está al día: no hay nada que cobrarle.`); return; }
        const ok = await sendPaymentReminder(player.email, player.name, mesesDe(deuda), clp(deuda.totalDebt), equipo.linkPago || undefined);
        if (!ok) { aviso.error('No se pudo enviar el correo.'); return; }
      }
      aviso.ok(`Correo enviado a ${player.name}.`);
    } catch { aviso.error('Error al enviar el correo.'); }
  };

  const sendBulk = async (type: 'pago' | 'recordatorio' | 'lista') => {
    setMenuEnvio(false);
    if (type === 'lista') {
      const url = import.meta.env.VITE_N8N_LISTA_FINAL_URL;
      if (!url) { aviso.info('Configura VITE_N8N_LISTA_FINAL_URL en el .env'); return; }
      if (!(await confirmar('¿Enviar la lista final a todo el equipo?'))) return;
      setSending('lista');
      try {
        const confirmed = players.filter(p => va(p.id));
        const declined = players.filter(p => attendances.some(a => a.player_id === p.id && a.status === 'No voy'));
        const pending = players.filter(p => p.status === 'Activo' && !attendances.some(a => a.player_id === p.id));
        const res = await fetch(url, {
          method: 'POST',
          // El webhook no necesita credenciales. Antes se mandaba aquí la llave de
          // administrador de n8n, y por eso viajaba dentro de la web pública.
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'admin_summary',
            match_date: nextMatch ? fechaPartido() : 'Próximo partido',
            match_location: nextMatch?.location || 'Cancha habitual',
            lista_confirmados: confirmed.map(p => `✅ ${p.name}`).join('\n') || 'Ninguno',
            lista_bajas: declined.map(p => `❌ ${p.name}`).join('\n') || 'Ninguno',
            lista_pendientes: pending.map(p => `⏳ ${p.name}`).join('\n') || 'Ninguno',
            confirmados_count: confirmed.length, bajas_count: declined.length,
            pendientes_count: pending.length, team_info: equipo.nombre,
          }),
        });
        if (res.ok) aviso.ok('Lista final enviada.'); else aviso.error(`Error: ${res.status}`);
      } catch { aviso.error('Error al enviar.'); }
      setSending(null);
      return;
    }

    if (type === 'recordatorio' && !nextMatch) { aviso.info('No hay un partido próximo agendado.'); return; }
    let targets = players.filter(p => p.notify !== false && p.status === 'Activo' && p.email);
    if (type === 'recordatorio') targets = targets.filter(p => !va(p.id));
    // El cobro va solo a quienes deben, con sus meses y su saldo (antes le llegaba a todos).
    let deudas = new Map<string, MorosoCaja>();
    if (type === 'pago') {
      try { deudas = await cargarMorosos(targets); } catch { aviso.error('No se pudo revisar quién debe.'); return; }
      targets = targets.filter(p => deudas.has(p.id));
      if (targets.length === 0) { aviso.ok('Todos están al día: no hay cobros que enviar.'); return; }
    }
    if (targets.length === 0) { aviso.info('No hay jugadores a los que enviar.'); return; }
    if (!(await confirmar(type === 'pago'
      ? `¿Enviar el cobro a los ${targets.length} jugadores que deben cuotas?`
      : `¿Enviar el recordatorio a ${targets.length} jugadores?`))) return;
    setSending(type);
    try {
      let sent = 0;
      const enlace = type === 'recordatorio' ? await enlacesDelPartido(nextMatch.id) : null;
      for (const p of targets) {
        const ok = enlace
          ? await sendMatchReminder(p.email!, p.name, fechaPartido(), nextMatch.location || '', enlace(p.id, 'Voy'), enlace(p.id, 'No voy'))
          : await sendPaymentReminder(p.email!, p.name, mesesDe(deudas.get(p.id)!), clp(deudas.get(p.id)!.totalDebt), equipo.linkPago || undefined);
        if (ok) sent++;
      }
      aviso.ok(`Enviados ${sent} de ${targets.length} correos.`);
    } catch { aviso.error('Error al enviar.'); }
    setSending(null);
  };

  const sinCuenta = players.filter(p => !p.user_id).length;
  const sinAvisos = players.filter(p => p.notify === false).length;
  const activos = players.filter(p => p.status === 'Activo').length;
  const vanAlPartido = players.filter(p => va(p.id)).length;
  const texto = busqueda.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const lista = players
    .filter(p => filtro === 'todos' || (filtro === 'sinCuenta' ? !p.user_id : p.notify === false))
    .filter(p => !texto || `${p.name} ${p.nickname ?? ''}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(texto));
  const jugadorAbierto = players.find(p => p.id === abierto) ?? null;

  const opcionMenu = 'w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-left hover:bg-white/5 cursor-pointer';

  return (
    <div className="fade-in pb-24 md:pb-8 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-soccer-green mb-1">Capitán</p>
          <h1 className="font-headline text-3xl font-black text-white tracking-tight">Administrar</h1>
        </div>
        <div className="relative" ref={menuRef}>
          <button type="button" onClick={() => setMenuEnvio(v => !v)} disabled={sending !== null} aria-haspopup="menu" aria-expanded={menuEnvio}
            className="h-11 px-4 rounded-full flex items-center gap-2 font-bold text-sm text-[#003822] cursor-pointer disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #44f3a9, #00d68f)' }}>
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Enviar
          </button>
          {menuEnvio && (
            <div role="menu" className="absolute right-0 top-full mt-2 z-40 w-64 py-1.5 rounded-2xl scale-in"
              style={{ background: '#262a31', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 40px -12px rgba(0,0,0,0.7)' }}>
              <button type="button" role="menuitem" onClick={() => sendBulk('recordatorio')} className={opcionMenu} style={{ color: '#9acbff' }}>
                <BellRing size={16} /> Recordatorio del partido
              </button>
              <button type="button" role="menuitem" onClick={() => sendBulk('pago')} className={opcionMenu} style={{ color: '#ffd08b' }}>
                <DollarSign size={16} /> Cobro de cuota
              </button>
              <button type="button" role="menuitem" onClick={() => sendBulk('lista')} className={opcionMenu} style={{ color: 'rgba(255,255,255,0.8)' }}>
                <ListChecks size={16} /> Lista final al grupo
              </button>
              <div className="h-px my-1.5 bg-white/[0.07]" />
              <button type="button" role="menuitem" onClick={() => bulkNotify(true)} className={opcionMenu} style={{ color: 'rgba(255,255,255,0.8)' }}>
                <Bell size={16} /> Activar correos a todos
              </button>
              <button type="button" role="menuitem" onClick={() => bulkNotify(false)} className={opcionMenu} style={{ color: 'rgba(255,255,255,0.6)' }}>
                <BellOff size={16} /> Desactivar correos a todos
              </button>
            </div>
          )}
        </div>
      </div>

      <section aria-label="Resumen" className="grid grid-cols-3 rounded-[20px] divide-x divide-white/[0.07] text-center"
        style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="py-3"><p className="font-headline font-black text-2xl text-white tabular-nums">{players.length}</p><p className="text-xs text-white/55">jugadores</p></div>
        <div className="py-3"><p className="font-headline font-black text-2xl text-soccer-green tabular-nums">{activos}</p><p className="text-xs text-white/55">activos</p></div>
        <div className="py-3">
          <p className="font-headline font-black text-2xl tabular-nums text-[#9acbff]">{nextMatch ? vanAlPartido : '—'}</p>
          <p className="text-xs text-white/55">{nextMatch ? `van el ${format(new Date(nextMatch.date), 'EEE d', { locale: es })}` : 'sin partido'}</p>
        </div>
      </section>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
        <input type="search" aria-label="Buscar jugador" placeholder="Buscar jugador..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="w-full h-12 pl-11 pr-4 rounded-2xl text-[15px] text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-soccer-green/50"
          style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.07)' }} />
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1" role="group" aria-label="Filtrar">
        {([['todos', `Todos ${players.length}`], ['sinCuenta', `Sin cuenta ${sinCuenta}`], ['sinAvisos', `Sin correos ${sinAvisos}`]] as const).map(([f, t]) => (
          <button key={f} type="button" onClick={() => setFiltro(f)} aria-pressed={filtro === f}
            className="shrink-0 h-10 px-4 rounded-full text-sm font-bold transition-colors cursor-pointer"
            style={filtro === f ? { background: f === 'sinCuenta' ? '#f59e0b' : '#44f3a9', color: '#1a1200' } : { background: '#262a31', color: f === 'sinCuenta' && sinCuenta ? '#fbbf24' : 'rgba(255,255,255,0.75)' }}>
            {t}
          </button>
        ))}
      </div>
      {filtro === 'sinCuenta' && (
        <p className="text-xs text-white/55 -mt-2 px-1">Estos jugadores aún no crean su cuenta. Mándales el código del equipo desde Ajustes; al registrarse con este mismo correo se vinculan solos.</p>
      )}

      {loading ? (
        <div className="flex justify-center p-16">
          <div className="w-9 h-9 rounded-full border-2 border-t-soccer-green border-r-soccer-green/20 border-b-soccer-green/10 border-l-soccer-green/5 animate-spin" />
        </div>
      ) : lista.length === 0 ? (
        <p className="text-center py-14 text-white/55 text-sm">{players.length === 0 ? 'No hay jugadores registrados.' : 'Nadie coincide con el filtro.'}</p>
      ) : (
        <ul className="space-y-2">
          {lista.map(p => {
            const vaAlPartido = va(p.id);
            return (
              <li key={p.id} className="flex items-center gap-2 p-2 pl-3 rounded-2xl min-h-[72px]"
                style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)', opacity: p.status === 'Inactivo' ? 0.55 : 1 }}>
                <button type="button" onClick={() => setAbierto(p.id)} aria-label={`Gestionar a ${p.name}`}
                  className="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer py-1">
                  <span className="w-11 h-11 shrink-0 rounded-full overflow-hidden flex items-center justify-center font-headline font-bold text-sm text-white/70" style={{ background: '#262a31' }}>
                    {p.photo_url ? <img src={p.photo_url} alt="" className="w-full h-full object-cover" /> : iniciales(p.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-white truncate">{p.name}</span>
                    <span className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {p.match_role === 'captain' && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ffd08b]"><Crown size={11} /> Capitán</span>}
                      {p.match_role === 'subcaptain' && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#9acbff]"><ShieldCheck size={11} /> Subcapitán</span>}
                      {!p.user_id && <span className="px-1.5 rounded text-[11px] font-bold text-amber-300" style={{ background: 'rgba(245,158,11,0.15)' }}>Sin cuenta</span>}
                      {p.status === 'Lesionado' && <span className="px-1.5 rounded text-[11px] font-bold text-red-300" style={{ background: 'rgba(248,113,113,0.15)' }}>Lesionado</span>}
                      {p.status === 'Inactivo' && <span className="text-[11px] font-bold text-white/50">Inactivo</span>}
                      {p.notify === false && <BellOff size={12} className="text-white/45" aria-label="No recibe correos" />}
                    </span>
                  </span>
                </button>
                <button type="button" onClick={() => toggleAttendance(p.id)} disabled={!nextMatch || togglingId === p.id + 'att'}
                  aria-pressed={vaAlPartido} aria-label={`${p.name} ${vaAlPartido ? 'va' : 'no ha confirmado'} al próximo partido`}
                  className="shrink-0 w-14 h-12 rounded-full flex flex-col items-center justify-center text-[10px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-default"
                  style={vaAlPartido ? { background: '#44f3a9', color: '#003822' } : { color: 'rgba(255,255,255,0.45)', border: '1.5px solid #31353c' }}>
                  {vaAlPartido ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  Va
                </button>
                <ChevronRight size={16} className="text-white/25 shrink-0" aria-hidden="true" />
              </li>
            );
          })}
        </ul>
      )}

      {jugadorAbierto && (
        <HojaJugador
          jugador={jugadorAbierto}
          hayPartido={!!nextMatch}
          cerrar={() => setAbierto(null)}
          cambiarEstado={estado => actualizar(jugadorAbierto, { status: estado })}
          cambiarRol={rol => cambiarRol(jugadorAbierto, rol)}
          cambiarAvisos={() => actualizar(jugadorAbierto, { notify: jugadorAbierto.notify === false })}
          recordatorio={() => sendToPlayer('recordatorio', jugadorAbierto)}
          cobro={() => sendToPlayer('pago', jugadorAbierto)}
          editar={() => { setAbierto(null); setSelectedPlayer(jugadorAbierto); setIsModalOpen(true); }}
          eliminar={() => handleDelete(jugadorAbierto)}
        />
      )}

      <PlayerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={fetchPlayers} player={selectedPlayer} teamId={teamId} />
    </div>
  );
}

interface HojaProps {
  jugador: Jugador;
  hayPartido: boolean;
  cerrar: () => void;
  cambiarEstado: (estado: string) => void;
  cambiarRol: (rol: Rol) => void;
  cambiarAvisos: () => void;
  recordatorio: () => void;
  cobro: () => void;
  editar: () => void;
  eliminar: () => void;
}

/** Hoja inferior con todo lo que se puede hacer con un jugador. */
function HojaJugador({ jugador: j, hayPartido, cerrar, cambiarEstado, cambiarRol, cambiarAvisos, recordatorio, cobro, editar, eliminar }: HojaProps) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [cerrar]);

  const recibe = j.notify !== false;
  const rol: Rol = j.match_role === 'captain' ? 'captain' : j.match_role === 'subcaptain' ? 'subcaptain' : 'player';
  const botonSecundario = 'h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-bold cursor-pointer disabled:opacity-40';

  return (
    <Capa>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="hoja-jugador">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm fade-in" onClick={cerrar} />
        <div className="relative w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-5 scale-in"
          style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 shrink-0 rounded-full overflow-hidden flex items-center justify-center font-headline font-bold text-[#003822]" style={{ background: '#44f3a9' }}>
              {j.photo_url ? <img src={j.photo_url} alt="" className="w-full h-full object-cover" /> : iniciales(j.name)}
            </span>
            <div className="flex-1 min-w-0">
              <h2 id="hoja-jugador" className="font-headline font-bold text-lg text-white truncate">{j.name}</h2>
              <p className="text-xs text-white/55 truncate">{j.email || 'Sin correo registrado'}{!j.user_id && ' · sin cuenta'}</p>
            </div>
            <button type="button" onClick={cerrar} aria-label="Cerrar" className="w-11 h-11 rounded-full flex items-center justify-center text-white/60 hover:text-white cursor-pointer" style={{ background: '#262a31' }}>
              <X size={18} />
            </button>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/60 mb-1.5">Estado</p>
            <Segmentado etiqueta="Estado" valor={j.status} cambiar={cambiarEstado} opciones={ESTADOS.map(e => ({ valor: e.valor, texto: e.valor, activo: e.activo }))} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/60 mb-1.5">Rol en el equipo</p>
            <Segmentado etiqueta="Rol" valor={rol} cambiar={cambiarRol} opciones={ROLES} />
            <p className="text-xs text-white/50 mt-1.5">Capitán y subcapitanes pueden armar equipos y marcar asistencia.</p>
          </div>

          <div className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ background: '#10141a' }}>
            <span className="flex items-center gap-3 min-w-0">
              <Mail size={18} className="text-soccer-green shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">Recibe correos</span>
                <span className="block text-xs text-white/55">Citaciones y cobros</span>
              </span>
            </span>
            <button type="button" role="switch" aria-checked={recibe} aria-label="Recibe correos" onClick={cambiarAvisos}
              className="shrink-0 relative w-[52px] h-8 rounded-full transition-colors cursor-pointer" style={{ background: recibe ? '#44f3a9' : '#31353c' }}>
              <span className="absolute top-1 left-1 w-6 h-6 rounded-full transition-transform" style={{ background: recibe ? '#003822' : '#fff', transform: recibe ? 'translateX(20px)' : 'none' }} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={recordatorio} disabled={!hayPartido || !j.email} className={botonSecundario} style={{ background: '#262a31', color: '#9acbff' }}>
              <BellRing size={16} /> Recordatorio
            </button>
            <button type="button" onClick={cobro} disabled={!j.email} className={botonSecundario} style={{ background: '#262a31', color: '#ffd08b' }}>
              <DollarSign size={16} /> Cobro
            </button>
          </div>
          <button type="button" onClick={editar} className={`${botonSecundario} w-full text-white`} style={{ background: '#262a31' }}>
            <Pencil size={16} /> Editar perfil del jugador
          </button>
          <button type="button" onClick={eliminar} className="w-full h-11 flex items-center justify-center gap-2 text-sm font-bold text-red-300 cursor-pointer">
            <Trash2 size={16} /> Eliminar jugador
          </button>
        </div>
      </div>
    </Capa>
  );
}
