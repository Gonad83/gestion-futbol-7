import { useEffect, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Trophy, Users, FileText, Download, Upload, Image as ImageIcon, Video, Plus, Trash2, Check, X,
  Copy, Pencil, CalendarDays, MapPin, Wallet, Search, ChevronLeft, ChevronRight, Play,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { aviso, confirmar } from '../lib/avisos';
import TorneoInterGen from '../components/TorneoInterGen';
import ReglasInterGen from '../components/ReglasInterGen';
import { tienePrograma } from '../lib/programaInterGen';
import { copiarTexto } from '../lib/copiarTexto';

/**
 * Inter Generaciones SSCC: una edición por año. Cada edición tiene su lista de
 * jugadores, la cuota, las bases para descargar, un resumen que se arma solo y
 * una galería de fotos y videos.
 */

const BUCKET = 'intergeneraciones';
const DEFAULT_FEE = 20000;
const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

type Edition = {
  id: string;
  team_id: number;
  year: number;
  fee: number;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  category: string | null;
  details: string | null;
  payment_info: string | null;
  bases_url: string | null;
  bases_name: string | null;
  bases_path: string | null;
};

type Player = { id: string; name: string; nickname: string | null; photo_url: string | null; position: string | null; status: string | null };
type Participant = { id: string; player_id: string; paid: boolean; paid_at: string | null };
type Media = { id: string; kind: 'photo' | 'video'; url: string; storage_path: string | null; caption: string | null; uploaded_by: string | null; created_at: string };

const fechaLarga = (d: string | null) => (d ? format(parseISO(d), "d 'de' MMMM yyyy", { locale: es }) : null);

function rangoFechas(e: Edition) {
  const ini = fechaLarga(e.start_date);
  const fin = fechaLarga(e.end_date);
  if (ini && fin && e.start_date !== e.end_date) return `${ini} al ${fin}`;
  return ini || fin || 'Por confirmar';
}

const iniciales = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('');

const limpiarNombre = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80);

export default function InterGeneraciones() {
  const { isAdmin, isMatchmaker, teamId, user, playerProfile } = useAuth();
  const currentYear = new Date().getFullYear();

  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState(currentYear);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'resumen' | 'jugadores' | 'torneo' | 'galeria'>('jugadores');
  const [error, setError] = useState<string | null>(null);

  // ── Carga ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!teamId) return;
    (async () => {
      const [{ data: eds }, { data: pls }] = await Promise.all([
        supabase.from('intergen_editions').select('year').eq('team_id', teamId).order('year', { ascending: false }),
        supabase.from('players').select('id, name, nickname, photo_url, position, status').eq('team_id', teamId).order('name'),
      ]);
      const ys = new Set<number>((eds || []).map((e: { year: number }) => e.year));
      ys.add(currentYear);
      setYears([...ys].sort((a, b) => b - a));
      setPlayers((pls as Player[]) || []);
    })();
  }, [teamId, currentYear]);

  useEffect(() => {
    if (teamId) loadEdition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, year]);

  const loadEdition = async () => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    const { data: ed, error: edErr } = await supabase
      .from('intergen_editions').select('*').eq('team_id', teamId).eq('year', year).maybeSingle();
    if (edErr) setError('No se pudo cargar la edición.');
    setEdition((ed as Edition) || null);
    if (ed) {
      const [{ data: parts }, { data: med }] = await Promise.all([
        supabase.from('intergen_participants').select('id, player_id, paid, paid_at').eq('edition_id', ed.id),
        supabase.from('intergen_media').select('*').eq('edition_id', ed.id).order('created_at', { ascending: false }),
      ]);
      setParticipants((parts as Participant[]) || []);
      setMedia((med as Media[]) || []);
    } else {
      setParticipants([]);
      setMedia([]);
    }
    setLoading(false);
  };

  const createEdition = async () => {
    if (!teamId) return;
    const { data, error } = await supabase
      .from('intergen_editions').insert({ team_id: teamId, year, fee: DEFAULT_FEE }).select('*').single();
    if (error) { setError('No se pudo crear la edición: ' + error.message); return; }
    setEdition(data as Edition);
    setYears(prev => (prev.includes(year) ? prev : [...prev, year].sort((a, b) => b - a)));
  };

  const addYear = () => {
    const next = Math.max(...years, currentYear) + 1;
    setYears(prev => [next, ...prev]);
    setYear(next);
  };

  // ── Datos derivados ──────────────────────────────────────────────────────
  const playerById = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);
  const roster = useMemo(
    () => participants
      .map(pt => ({ ...pt, player: playerById.get(pt.player_id) }))
      .filter(r => r.player)
      .sort((a, b) => a.player!.name.localeCompare(b.player!.name)),
    [participants, playerById],
  );

  // Los inscritos son a quienes se convoca a cada partido del torneo.
  const plantel = useMemo(
    () => roster.map(r => ({ id: r.player!.id, name: r.player!.name, photo_url: r.player!.photo_url })),
    [roster],
  );

  const hayPrograma = tienePrograma(year);
  // Un año sin programa cargado no tiene pestaña Torneo.
  const tabActiva = tab === 'torneo' && !hayPrograma ? 'jugadores' : tab;

  const fee = edition?.fee ?? DEFAULT_FEE;
  const totalEsperado = roster.length * fee;
  const pagados = roster.filter(r => r.paid).length;
  const recaudado = pagados * fee;
  const pendiente = totalEsperado - recaudado;
  const fotos = media.filter(m => m.kind === 'photo').length;
  const videos = media.filter(m => m.kind === 'video').length;

  const resumenTexto = useMemo(() => {
    if (!edition) return '';
    // Solo los que ya pagaron (están listos) y el total pagado. Se copia
    // para pegarlo en WhatsApp, así los emojis llegan tal cual.
    const listos = roster.filter(r => r.paid);
    const lineas = [
      `🏆 *INTER GENERACIONES SSCC ${edition.year}* 🏆`,
      '',
      `⚽ *Jugadores listos: ${listos.length}*`,
      ...listos.map((r, i) => `✅ ${i + 1}. ${r.player!.name}`),
      '',
      `💰 *Total pagado: ${clp(listos.length * fee)}*`,
    ];
    return lineas.join('\n');
  }, [edition, fee, roster]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">
      {/* Encabezado */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8"
        style={{ background: 'linear-gradient(135deg, rgba(255,208,139,0.12) 0%, rgba(68,243,169,0.08) 60%, rgba(28,32,38,0.9) 100%)' }}>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em]" style={{ color: '#ffd08b' }}>Campeonato</p>
            <h1 className="font-headline font-black text-3xl md:text-4xl text-white tracking-tight mt-1 flex items-center gap-3">
              <Trophy className="shrink-0" style={{ color: '#ffd08b' }} size={32} />
              Inter Generaciones SSCC
            </h1>
            <p className="text-white/50 text-sm mt-2">Jugadores, cuota, bases, resumen y galería de cada año.</p>
          </div>
          {/* Selector de año */}
          <div className="flex items-center gap-2 flex-wrap">
            {years.map(y => (
              <button key={y} onClick={() => setYear(y)}
                className="px-4 py-2 rounded-xl font-headline font-bold text-sm transition-all"
                style={y === year
                  ? { background: 'linear-gradient(135deg,#44f3a9,#00d68f)', color: '#003822' }
                  : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                {y}
              </button>
            ))}
            {isAdmin && (
              <button onClick={addYear} title="Agregar año"
                className="p-2 rounded-xl text-white/50 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <Plus size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm text-red-300" style={{ background: 'rgba(248,113,113,0.1)' }}>{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-soccer-green" /></div>
      ) : !edition ? (
        <>
        <div className="glass-card rounded-3xl p-10 text-center">
          <Trophy size={44} className="mx-auto mb-4" style={{ color: '#ffd08b' }} />
          <h2 className="font-headline font-bold text-xl text-white">Aún no hay edición {year}</h2>
          {isAdmin ? (
            <>
              <p className="text-white/50 text-sm mt-2 mb-6">Crea la edición para armar la lista de jugadores. La cuota parte en {clp(DEFAULT_FEE)} y la puedes cambiar después.</p>
              <button onClick={createEdition} className="btn-primary px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2">
                <Plus size={18} /> Crear edición {year}
              </button>
            </>
          ) : (
            <p className="text-white/50 text-sm mt-2">El capitán todavía no la publica.</p>
          )}
        </div>
        {hayPrograma && <TorneoInterGen year={year} teamId={teamId!} puedeEditar={isAdmin || isMatchmaker} />}
        </>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={<Users size={16} />} label="Jugadores" value={String(roster.length)} />
            <Kpi icon={<Wallet size={16} />} label="Cuota" value={clp(fee)} accent="#ffd08b" />
            <Kpi icon={<Check size={16} />} label="Recaudado" value={clp(recaudado)} sub={`${pagados} de ${roster.length} pagados`} />
            <Kpi icon={<Wallet size={16} />} label="Por recaudar" value={clp(pendiente)} sub={`Total ${clp(totalEsperado)}`} accent={pendiente > 0 ? '#f87171' : '#44f3a9'} />
          </div>

          {/* Pestañas + WhatsApp */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex gap-1 p-1 rounded-2xl w-full md:w-fit overflow-x-auto" style={{ background: '#0a0e14' }}>
            {([
              ['jugadores', `Jugadores (${roster.length})`, <Users size={15} key="j" />],
              ...(hayPrograma ? [['torneo', 'Torneo', <Trophy size={15} key="t" />] as const] : []),
              ['resumen', 'Resumen y bases', <FileText size={15} key="r" />],
              ['galeria', `Fotos y videos (${media.length})`, <ImageIcon size={15} key="g" />],
            ] as const).map(([key, label, icon]) => (
              <button key={key} onClick={() => setTab(key)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
                style={tabActiva === key ? { background: 'rgba(68,243,169,0.12)', color: '#44f3a9' } : { color: 'rgba(255,255,255,0.45)' }}>
                {icon}{label}
              </button>
            ))}
          </div>
          <BotonCopiarLista texto={resumenTexto} />
          </div>

          {tabActiva === 'resumen' && (
            <>
              <ResumenTab edition={edition} isAdmin={isAdmin} teamId={teamId!} resumenTexto={resumenTexto}
                stats={{ jugadores: roster.length, pagados, fotos, videos }}
                onSaved={setEdition} />
              {hayPrograma && <ReglasInterGen year={year} />}
            </>
          )}
          {tabActiva === 'torneo' && (
            <TorneoInterGen year={year} teamId={teamId!} puedeEditar={isAdmin || isMatchmaker}
              convocatoria={{ edicionId: edition.id, plantel, miJugadorId: playerProfile?.id ?? null }} />
          )}
          {tabActiva === 'jugadores' && (
            <JugadoresTab edition={edition} isAdmin={isAdmin} players={players} roster={roster}
              onChange={setParticipants} participants={participants} />
          )}
          {tabActiva === 'galeria' && (
            <GaleriaTab edition={edition} isAdmin={isAdmin} teamId={teamId!} userId={user?.id ?? null}
              media={media} onChange={setMedia} />
          )}
        </>
      )}
    </div>
  );
}

/** Copia la lista de jugadores listos para pegarla en WhatsApp. No abre
 *  WhatsApp: al pasar por su enlace, algunos equipos rompían los emojis. */
function BotonCopiarLista({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    if (await copiarTexto(texto)) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } else {
      aviso.error('No se pudo copiar la lista');
    }
  };

  return (
    <button onClick={copiar}
      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:brightness-110 active:scale-95 shrink-0"
      style={copiado
        ? { background: 'rgba(68,243,169,0.15)', color: '#44f3a9' }
        : { background: 'linear-gradient(135deg,#44f3a9,#00d68f)', color: '#003822' }}>
      {copiado ? <Check size={17} /> : <Copy size={17} />}
      {copiado ? 'Lista copiada' : 'Copiar lista'}
    </button>
  );
}

function Kpi({ icon, label, value, sub, accent = '#44f3a9' }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: '#1c2026' }}>
      <div className="flex items-center gap-2 text-white/50 text-[11px] font-bold uppercase tracking-wider">
        <span style={{ color: accent }}>{icon}</span>{label}
      </div>
      <p className="font-headline font-black text-2xl text-white mt-2">{value}</p>
      {sub && <p className="text-[11px] text-white/50 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Resumen, detalles y bases ───────────────────────────────────────────────
function ResumenTab({ edition, isAdmin, teamId, resumenTexto, stats, onSaved }: {
  edition: Edition; isAdmin: boolean; teamId: number; resumenTexto: string;
  stats: { jugadores: number; pagados: number; fotos: number; videos: number };
  onSaved: (e: Edition) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(edition);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadingBases, setUploadingBases] = useState(false);
  const basesInput = useRef<HTMLInputElement>(null);

  const save = async () => {
    setSaving(true);
    const { data, error } = await supabase.from('intergen_editions').update({
      fee: Number(form.fee) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      location: form.location?.trim() || null,
      category: form.category?.trim() || null,
      details: form.details?.trim() || null,
      payment_info: form.payment_info?.trim() || null,
    }).eq('id', edition.id).select('*').single();
    setSaving(false);
    if (error) { aviso.error('No se pudo guardar: ' + error.message); return; }
    onSaved(data as Edition);
    setEditing(false);
  };

  const uploadBases = async (file: File) => {
    setUploadingBases(true);
    const path = `${teamId}/${edition.year}/bases/${Date.now()}_${limpiarNombre(file.name)}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined });
    if (upErr) { setUploadingBases(false); aviso.error('No se pudo subir: ' + upErr.message); return; }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const { data, error } = await supabase.from('intergen_editions')
      .update({ bases_url: pub.publicUrl, bases_name: file.name, bases_path: path })
      .eq('id', edition.id).select('*').single();
    if (!error && edition.bases_path) await supabase.storage.from(BUCKET).remove([edition.bases_path]);
    setUploadingBases(false);
    if (error) { aviso.error('No se pudo guardar: ' + error.message); return; }
    onSaved(data as Edition);
  };

  const removeBases = async () => {
    if (!(await confirmar('¿Quitar las bases publicadas?'))) return;
    if (edition.bases_path) await supabase.storage.from(BUCKET).remove([edition.bases_path]);
    const { data } = await supabase.from('intergen_editions')
      .update({ bases_url: null, bases_name: null, bases_path: null }).eq('id', edition.id).select('*').single();
    if (data) onSaved(data as Edition);
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(resumenTexto); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { aviso.error('No se pudo copiar'); }
  };

  const set = (k: keyof Edition, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-6">
        {/* Resumen automático */}
        <div className="glass-card rounded-3xl p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-soccer-green">Se actualiza solo</p>
              <h2 className="font-headline font-bold text-xl text-white">Resumen {edition.year}</h2>
            </div>
            <button onClick={copy} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background: copied ? 'rgba(68,243,169,0.15)' : 'rgba(255,255,255,0.06)', color: copied ? '#44f3a9' : 'rgba(255,255,255,0.7)' }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Lista copiada' : 'Copiar lista'}
            </button>
          </div>

          <div className="space-y-3">
            <Fila icon={<CalendarDays size={16} />} label="Fecha" value={rangoFechas(edition)} />
            <Fila icon={<MapPin size={16} />} label="Lugar" value={edition.location || 'Por confirmar'} />
            {edition.category && <Fila icon={<Trophy size={16} />} label="Categoría" value={edition.category} />}
            <Fila icon={<Wallet size={16} />} label="Cuota" value={`${clp(edition.fee)} por jugador`} />
            <Fila icon={<Users size={16} />} label="Inscritos"
              value={`${stats.jugadores} jugadores · ${stats.pagados} con cuota pagada`} />
            <Fila icon={<ImageIcon size={16} />} label="Galería" value={`${stats.fotos} fotos · ${stats.videos} videos`} />
            <Fila icon={<FileText size={16} />} label="Bases" value={edition.bases_url ? 'Disponibles para descargar' : 'Aún no se suben'} />
          </div>

          {edition.payment_info && (
            <div className="mt-5 rounded-2xl p-4" style={{ background: '#0a0e14' }}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">Datos para pagar la cuota</p>
              <p className="text-sm text-white/80 whitespace-pre-line">{edition.payment_info}</p>
            </div>
          )}
          {edition.details && (
            <div className="mt-3 rounded-2xl p-4" style={{ background: '#0a0e14' }}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">Detalles</p>
              <p className="text-sm text-white/80 whitespace-pre-line">{edition.details}</p>
            </div>
          )}
        </div>

        {/* Edición de detalles */}
        {isAdmin && (
          <div className="rounded-3xl p-6" style={{ background: '#181c22' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline font-bold text-white">Detalles de la edición</h3>
              {!editing && (
                <button onClick={() => { setForm(edition); setEditing(true); }} className="flex items-center gap-1.5 text-xs font-bold text-soccer-green">
                  <Pencil size={14} /> Editar
                </button>
              )}
            </div>
            {editing ? (
              <div className="grid sm:grid-cols-2 gap-3">
                <Campo label="Cuota por jugador (CLP)">
                  <input type="number" min={0} className="input-field w-full" value={form.fee} onChange={e => set('fee', e.target.value)} />
                </Campo>
                <Campo label="Categoría">
                  <input className="input-field w-full" placeholder="Ej: Generación 2005" value={form.category || ''} onChange={e => set('category', e.target.value)} />
                </Campo>
                <Campo label="Fecha inicio">
                  <input type="date" className="input-field w-full" value={form.start_date || ''} onChange={e => set('start_date', e.target.value)} />
                </Campo>
                <Campo label="Fecha término">
                  <input type="date" className="input-field w-full" value={form.end_date || ''} onChange={e => set('end_date', e.target.value)} />
                </Campo>
                <Campo label="Lugar" full>
                  <input className="input-field w-full" placeholder="Ej: Canchas del colegio" value={form.location || ''} onChange={e => set('location', e.target.value)} />
                </Campo>
                <Campo label="Datos de pago" full>
                  <textarea rows={3} className="input-field w-full" placeholder="Banco, cuenta, RUT, correo…" value={form.payment_info || ''} onChange={e => set('payment_info', e.target.value)} />
                </Campo>
                <Campo label="Otros detalles" full>
                  <textarea rows={4} className="input-field w-full" placeholder="Horarios, camiseta, reglas importantes…" value={form.details || ''} onChange={e => set('details', e.target.value)} />
                </Campo>
                <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
                  <button onClick={() => { setForm(edition); setEditing(false); }} className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white">Cancelar</button>
                  <button onClick={save} disabled={saving} className="btn-primary px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50">
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/45">Cambia la cuota, fechas, lugar, datos de pago y detalles. El resumen se actualiza con lo que guardes.</p>
            )}
          </div>
        )}
      </div>

      {/* Bases */}
      <div className="lg:col-span-2">
        <div className="glass-card rounded-3xl p-6">
          <h3 className="font-headline font-bold text-white mb-1">Bases del campeonato</h3>
          <p className="text-xs text-white/50 mb-5">Documento oficial para descargar.</p>
          {edition.bases_url ? (
            <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: '#0a0e14' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,208,139,0.12)', color: '#ffd08b' }}>
                <FileText size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{edition.bases_name || 'Bases'}</p>
                <p className="text-[11px] text-white/50">Inter Generaciones {edition.year}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-6 text-center text-sm text-white/40" style={{ background: '#0a0e14' }}>
              Aún no hay bases publicadas.
            </div>
          )}

          <div className="flex flex-col gap-2 mt-4">
            {edition.bases_url && (
              <a href={edition.bases_url} target="_blank" rel="noopener noreferrer" download={edition.bases_name || undefined}
                className="btn-primary px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                <Download size={16} /> Descargar bases
              </a>
            )}
            {isAdmin && (
              <>
                <input ref={basesInput} type="file" className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadBases(f); e.target.value = ''; }} />
                <button onClick={() => basesInput.current?.click()} disabled={uploadingBases}
                  className="px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white/80 hover:text-white disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <Upload size={16} /> {uploadingBases ? 'Subiendo…' : edition.bases_url ? 'Reemplazar bases' : 'Subir bases'}
                </button>
                {edition.bases_url && (
                  <button onClick={removeBases} className="text-xs text-red-400/70 hover:text-red-400 py-1">Quitar bases</button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Fila({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-soccer-green" style={{ background: 'rgba(68,243,169,0.08)' }}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">{label}</p>
        <p className="text-sm text-white font-medium">{value}</p>
      </div>
    </div>
  );
}

function Campo({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={full ? 'sm:col-span-2 block' : 'block'}>
      <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

// ── Jugadores ───────────────────────────────────────────────────────────────
function JugadoresTab({ edition, isAdmin, players, roster, participants, onChange }: {
  edition: Edition; isAdmin: boolean; players: Player[];
  roster: (Participant & { player?: Player })[]; participants: Participant[];
  onChange: (p: Participant[]) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const inscritos = new Set(participants.map(p => p.player_id));
  const disponibles = players
    .filter(p => !inscritos.has(p.id))
    .filter(p => `${p.name} ${p.nickname || ''}`.toLowerCase().includes(search.toLowerCase()));

  const addSelected = async () => {
    if (!selected.size) return;
    setSaving(true);
    const rows = [...selected].map(player_id => ({ edition_id: edition.id, player_id }));
    const { data, error } = await supabase.from('intergen_participants').insert(rows).select('id, player_id, paid, paid_at');
    setSaving(false);
    if (error) { aviso.error('No se pudo agregar: ' + error.message); return; }
    onChange([...participants, ...((data as Participant[]) || [])]);
    setSelected(new Set());
    setPicking(false);
    setSearch('');
  };

  const togglePaid = async (pt: Participant) => {
    const paid = !pt.paid;
    const paid_at = paid ? new Date().toISOString() : null;
    onChange(participants.map(p => (p.id === pt.id ? { ...p, paid, paid_at } : p)));
    const { error } = await supabase.from('intergen_participants').update({ paid, paid_at }).eq('id', pt.id);
    if (error) { aviso.error('No se pudo actualizar'); onChange(participants); }
  };

  const remove = async (pt: Participant & { player?: Player }) => {
    if (!(await confirmar(`¿Sacar a ${pt.player?.name} de la lista?`))) return;
    const { error } = await supabase.from('intergen_participants').delete().eq('id', pt.id);
    if (error) { aviso.error('No se pudo quitar'); return; }
    onChange(participants.filter(p => p.id !== pt.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-headline font-bold text-xl text-white">Jugadores que participan</h2>
          <p className="text-xs text-white/50">Cuota {clp(edition.fee)} por jugador{isAdmin ? ' · toca el estado para marcar el pago' : ''}</p>
        </div>
        {isAdmin && !picking && (
          <button onClick={() => setPicking(true)} className="btn-primary px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2">
            <Plus size={16} /> Agregar jugadores
          </button>
        )}
      </div>

      {picking && (
        <div className="rounded-3xl p-5" style={{ background: '#181c22' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input className="input-field w-full pl-9" placeholder="Buscar en la plantilla…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={() => setSelected(new Set(disponibles.map(p => p.id)))} className="text-xs font-bold text-soccer-green px-2 whitespace-nowrap">Todos</button>
          </div>
          <div className="max-h-80 overflow-y-auto custom-scrollbar grid sm:grid-cols-2 gap-1.5">
            {disponibles.length === 0 && <p className="text-sm text-white/40 p-3">No quedan jugadores por agregar.</p>}
            {disponibles.map(p => {
              const on = selected.has(p.id);
              return (
                <button key={p.id}
                  onClick={() => setSelected(prev => { const n = new Set(prev); if (on) n.delete(p.id); else n.add(p.id); return n; })}
                  className="flex items-center gap-3 p-2.5 rounded-xl text-left transition-all"
                  style={{ background: on ? 'rgba(68,243,169,0.1)' : '#1c2026' }}>
                  <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: on ? '#44f3a9' : 'rgba(255,255,255,0.08)' }}>
                    {on && <Check size={13} style={{ color: '#003822' }} />}
                  </div>
                  <Avatar p={p} size={32} />
                  <span className="text-sm text-white truncate">{p.name}</span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => { setPicking(false); setSelected(new Set()); setSearch(''); }} className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white">Cancelar</button>
            <button onClick={addSelected} disabled={!selected.size || saving} className="btn-primary px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-40">
              {saving ? 'Agregando…' : `Agregar ${selected.size || ''}`}
            </button>
          </div>
        </div>
      )}

      {roster.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-white/40 text-sm">
          Todavía no hay jugadores en la lista {edition.year}.
        </div>
      ) : (
        <div className="rounded-3xl overflow-hidden" style={{ background: '#181c22' }}>
          {roster.map((r, i) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3" style={i % 2 ? { background: '#1c2026' } : {}}>
              <span className="w-6 text-right text-xs text-white/50 font-bold">{i + 1}</span>
              <Avatar p={r.player!} size={38} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{r.player!.name}</p>
                <p className="text-[11px] text-white/50 truncate">{r.player!.position || '—'}</p>
              </div>
              <button disabled={!isAdmin} onClick={() => togglePaid(r)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all disabled:cursor-default"
                style={r.paid
                  ? { background: 'rgba(68,243,169,0.12)', color: '#44f3a9' }
                  : { background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>
                {r.paid ? 'Pagado' : 'Pendiente'}
              </button>
              {isAdmin && (
                <button onClick={() => remove(r)} title="Quitar" className="p-1.5 text-white/25 hover:text-red-400 transition-colors">
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Avatar({ p, size }: { p: Player; size: number }) {
  return (
    <div className="rounded-full overflow-hidden flex items-center justify-center shrink-0 text-[11px] font-bold"
      style={{ width: size, height: size, background: 'rgba(68,243,169,0.12)', color: '#44f3a9' }}>
      {p.photo_url ? <img src={p.photo_url} alt="" className="w-full h-full object-cover" /> : iniciales(p.name)}
    </div>
  );
}

// ── Galería ─────────────────────────────────────────────────────────────────
function GaleriaTab({ edition, isAdmin, teamId, userId, media, onChange }: {
  edition: Edition; isAdmin: boolean; teamId: number; userId: string | null;
  media: Media[]; onChange: (m: Media[]) => void;
}) {
  const [filter, setFilter] = useState<'todo' | 'photo' | 'video'>('todo');
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const items = media.filter(m => filter === 'todo' || m.kind === filter);

  const upload = async (files: FileList) => {
    const list = [...files].filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (!list.length) return;
    const nuevos: Media[] = [];
    setUploading({ done: 0, total: list.length });
    for (const file of list) {
      const kind: Media['kind'] = file.type.startsWith('video/') ? 'video' : 'photo';
      if (file.size > 100 * 1024 * 1024) { aviso.error(`${file.name} pesa más de 100 MB y no se subió.`); continue; }
      const path = `${teamId}/${edition.year}/${kind === 'photo' ? 'fotos' : 'videos'}/${Date.now()}_${limpiarNombre(file.name)}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (upErr) { aviso.error(`No se pudo subir ${file.name}: ${upErr.message}`); continue; }
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const { data, error } = await supabase.from('intergen_media')
        .insert({ edition_id: edition.id, kind, url: pub.publicUrl, storage_path: path, uploaded_by: userId })
        .select('*').single();
      if (error) { await supabase.storage.from(BUCKET).remove([path]); aviso.error('No se pudo guardar ' + file.name); continue; }
      nuevos.push(data as Media);
      setUploading(u => (u ? { ...u, done: u.done + 1 } : u));
    }
    onChange([...nuevos.reverse(), ...media]);
    setUploading(null);
  };

  const remove = async (m: Media) => {
    if (!(await confirmar('¿Eliminar este archivo?'))) return;
    const { error } = await supabase.from('intergen_media').delete().eq('id', m.id);
    if (error) { aviso.error('No se pudo eliminar'); return; }
    if (m.storage_path) await supabase.storage.from(BUCKET).remove([m.storage_path]);
    onChange(media.filter(x => x.id !== m.id));
    setViewer(null);
  };

  const current = viewer !== null ? items[viewer] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#0a0e14' }}>
          {([['todo', 'Todo'], ['photo', 'Fotos'], ['video', 'Videos']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={filter === k ? { background: 'rgba(68,243,169,0.12)', color: '#44f3a9' } : { color: 'rgba(255,255,255,0.45)' }}>{l}</button>
          ))}
        </div>
        <input ref={input} type="file" multiple accept="image/*,video/*" className="hidden"
          onChange={e => { if (e.target.files) upload(e.target.files); e.target.value = ''; }} />
        <button onClick={() => input.current?.click()} disabled={!!uploading}
          className="btn-primary px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-60">
          <Upload size={16} /> {uploading ? `Subiendo ${uploading.done}/${uploading.total}…` : 'Subir fotos o videos'}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <ImageIcon size={36} className="mx-auto mb-3 text-white/20" />
          <p className="text-white/40 text-sm">Aún no hay {filter === 'video' ? 'videos' : filter === 'photo' ? 'fotos' : 'fotos ni videos'} de {edition.year}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {items.map((m, i) => (
            <button key={m.id} onClick={() => setViewer(i)} className="relative aspect-square rounded-2xl overflow-hidden group" style={{ background: '#1c2026' }}>
              {m.kind === 'photo' ? (
                <img src={m.url} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <>
                  <video src={`${m.url}#t=0.5`} preload="metadata" muted playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(68,243,169,0.9)' }}>
                      <Play size={18} style={{ color: '#003822' }} className="ml-0.5" />
                    </div>
                  </div>
                </>
              )}
              {m.kind === 'video' && <Video size={14} className="absolute top-2 left-2 text-white drop-shadow" />}
            </button>
          ))}
        </div>
      )}

      {current && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.92)' }} onClick={() => setViewer(null)}>
          <div className="absolute top-4 right-4 flex gap-2" onClick={e => e.stopPropagation()}>
            <a href={current.url} target="_blank" rel="noopener noreferrer" download className="p-2.5 rounded-full text-white/70 hover:text-white" style={{ background: 'rgba(255,255,255,0.08)' }} title="Descargar">
              <Download size={20} />
            </a>
            {(isAdmin || current.uploaded_by === userId) && (
              <button onClick={() => remove(current)} className="p-2.5 rounded-full text-red-400/80 hover:text-red-400" style={{ background: 'rgba(255,255,255,0.08)' }} title="Eliminar">
                <Trash2 size={20} />
              </button>
            )}
            <button onClick={() => setViewer(null)} className="p-2.5 rounded-full text-white/70 hover:text-white" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <X size={20} />
            </button>
          </div>
          {viewer! > 0 && (
            <button onClick={e => { e.stopPropagation(); setViewer(viewer! - 1); }} className="absolute left-3 p-2 rounded-full text-white/70 hover:text-white" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <ChevronLeft size={26} />
            </button>
          )}
          {viewer! < items.length - 1 && (
            <button onClick={e => { e.stopPropagation(); setViewer(viewer! + 1); }} className="absolute right-3 p-2 rounded-full text-white/70 hover:text-white" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <ChevronRight size={26} />
            </button>
          )}
          <div className="max-w-5xl max-h-[85vh] w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            {current.kind === 'photo'
              ? <img src={current.url} alt="" className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
              : <video key={current.id} src={current.url} controls autoPlay playsInline className="max-h-[85vh] max-w-full rounded-2xl" />}
          </div>
        </div>
      )}
    </div>
  );
}
