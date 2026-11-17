import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Camera, CheckCircle2, AlertCircle, Copy, Check, Share2, Send } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { aviso } from '../lib/avisos';
import { EQUIPO_ACTUALIZADO } from '../lib/config';
import { BarraGuardar } from '../components/BarraGuardar';

const REGIONS_CL = [
  'Región Metropolitana','Arica y Parinacota','Tarapacá','Antofagasta','Atacama',
  'Coquimbo','Valparaíso',"O'Higgins",'Maule','Ñuble','Biobío','La Araucanía',
  'Los Ríos','Los Lagos','Aysén','Magallanes',
];
const AGE_RANGES = ['Open','Sub-18','Sub-21','25+','35+','40+','Mixto'];
const FORMATS    = ['5vs5','7vs7','11vs11','Todos'];

const CITIES_CL = [
  'Arica','Iquique','Alto Hospicio','Antofagasta','Calama','Tocopilla','Copiapó','Vallenar',
  'La Serena','Coquimbo','Ovalle','Illapel','Valparaíso','Viña del Mar','Quilpué','Villa Alemana',
  'San Antonio','Los Andes','Quillota','San Felipe','Santiago','Puente Alto','Maipú','La Florida',
  'Las Condes','Ñuñoa','Providencia','San Bernardo','Quilicura','El Bosque','Pudahuel','Peñalolén',
  'La Pintana','Rancagua','San Fernando','Curicó','Talca','Linares','Constitución','Chillán',
  'Los Ángeles','Concepción','Talcahuano','Hualpén','San Pedro de la Paz','Coronel','Lota',
  'Temuco','Padre Las Casas','Angol','Valdivia','Osorno','Puerto Montt','Puerto Varas','Castro',
  'Coyhaique','Punta Arenas','Puerto Natales',
];

const COMMUNES_CL = [
  ...CITIES_CL,
  'Cerrillos','Cerro Navia','Conchalí','Estación Central','Huechuraba','Independencia',
  'La Cisterna','La Granja','La Reina','Lo Barnechea','Lo Espejo','Lo Prado','Macul',
  'Melipilla','Padre Hurtado','Paine','Pedro Aguirre Cerda','Peñaflor','Pirque',
  'Quinta Normal','Recoleta','Renca','San Joaquín','San José de Maipo','San Miguel',
  'San Ramón','Talagante','Vitacura','Buin','Colina','Lampa','Tiltil','Curacaví',
  'Isla de Maipo','Malleco','Cauquenes','Cañete','Lebu','Arauco','Tomé','Penco',
  'Chiguayante','Hualqui','Florida','Laja','Nacimiento','San Rosendo','Yumbel',
  'Cabrero','Mulchén','Quilleco','Santa Bárbara','Tucapel','Antuco','Tirrúa',
  'Calbuco','Maullín','Los Muermos','Frutillar','Llanquihue','Puerto Octay',
].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a.localeCompare(b, 'es'));

function AutocompleteInput({ label, value, onChange, suggestions, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  suggestions: string[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const filtered = value.length >= 2
    ? suggestions.filter(s => s.toLowerCase().startsWith(value.toLowerCase())).slice(0, 6)
    : [];
  return (
    <div className="relative">
      <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60 mb-1.5">{label}</label>
      <input
        type="text"
        className="input-field"
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-2xl" style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.1)' }}>
          {filtered.map(s => (
            <li
              key={s}
              onMouseDown={() => { onChange(s); setOpen(false); }}
              className="px-4 py-2.5 text-sm cursor-pointer hover:bg-soccer-green/10 hover:text-soccer-green transition-colors"
              style={{ color: 'rgba(255,255,255,0.75)' }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Interruptor grande (52x32) para que se pueda tocar con el pulgar. */
function Interruptor({ activo, cambiar, etiqueta }: { activo: boolean; cambiar: () => void; etiqueta: string }) {
  return (
    <button type="button" role="switch" aria-checked={activo} aria-label={etiqueta} onClick={cambiar}
      className="shrink-0 relative w-[52px] h-8 rounded-full transition-colors duration-200 cursor-pointer"
      style={{ background: activo ? '#44f3a9' : '#31353c' }}>
      <span className="absolute top-1 left-1 w-6 h-6 rounded-full shadow transition-transform duration-200"
        style={{ background: activo ? '#003822' : '#fff', transform: activo ? 'translateX(20px)' : 'translateX(0)' }} />
    </button>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-white/60 mb-2 px-1">{titulo}</h2>
      <div className="rounded-[20px] p-4 space-y-4" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>{children}</div>
    </section>
  );
}

function Fila({ titulo, detalle, children }: { titulo: string; detalle?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-semibold text-white">{titulo}</p>
        {detalle && <p className="text-xs text-white/55 mt-0.5">{detalle}</p>}
      </div>
      {children}
    </div>
  );
}

function Chips({ etiqueta, opciones, valor, cambiar }: { etiqueta: string; opciones: string[]; valor: string; cambiar: (v: string) => void }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-white/60 mb-1.5">{etiqueta}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={etiqueta}>
        {opciones.map(o => (
          <button key={o} type="button" role="radio" aria-checked={valor === o} onClick={() => cambiar(o)}
            className="h-10 px-4 rounded-full text-sm font-bold transition-colors cursor-pointer"
            style={valor === o ? { background: '#44f3a9', color: '#003822' } : { background: '#10141a', color: 'rgba(255,255,255,0.75)', border: '1px solid #31353c' }}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

const etiqueta = 'block text-[11px] font-bold uppercase tracking-wider text-white/60 mb-1.5';

/**
 * Ajustes del equipo (solo capitán). Diseño basado en el concepto de Stitch
 * (docs/diseno/ajustes-movil-stitch.png): secciones agrupadas, interruptores
 * grandes y una barra para guardar que aparece solo cuando hay cambios.
 * Al guardar ya no se recarga la página: el menú se entera por un evento.
 */
export default function Settings() {
  const { isAdmin, loading: authLoading, teamId } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [paymentEnabled, setPaymentEnabled] = useState(false);

  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);

  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const bannerRef = useRef<HTMLInputElement>(null);

  const [city, setCity] = useState('');
  const [commune, setCommune] = useState('');
  const [region, setRegion] = useState('');
  const [ageRange, setAgeRange] = useState('Open');
  const [preferredFormat, setPreferredFormat] = useState('7vs7');
  const [arenaVisible, setArenaVisible] = useState(true);
  const [teamDescription, setTeamDescription] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guardado, setGuardado] = useState('');
  const [copiado, setCopiado] = useState(false);

  const [testingReminder, setTestingReminder] = useState(false);
  const [reminderResult, setReminderResult] = useState<{ ok: boolean; matches_processed?: number; emails_sent?: number; message?: string; error?: string } | null>(null);

  // Lo que hay que guardar, en un texto: si cambia respecto de lo guardado, hay cambios pendientes.
  const actual = JSON.stringify([teamName, paymentLink, paymentEnabled, city, commune, region, ageRange, preferredFormat, arenaVisible, teamDescription]);
  const hayCambios = !loading && (actual !== guardado || !!logoFile || !!bannerFile);

  const handleTestReminder = async () => {
    setTestingReminder(true);
    setReminderResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('auto-reminder');
      if (error) throw error;
      setReminderResult(data);
    } catch (err) {
      setReminderResult({ ok: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setTestingReminder(false);
    }
  };

  useEffect(() => {
    if (!teamId) return;
    supabase.from('team_settings').select('*').eq('id', teamId).single().then(({ data }) => {
      if (data) {
        const v = {
          teamName: data.team_name || '', paymentLink: data.payment_link || '', paymentEnabled: data.payment_button_enabled || false,
          city: data.city || '', commune: data.commune || '', region: data.region || '', ageRange: data.age_range || 'Open',
          preferredFormat: data.preferred_format || '7vs7', arenaVisible: data.arena_visible ?? true, teamDescription: data.team_description || '',
        };
        setTeamName(v.teamName); setJoinCode(data.join_code || ''); setPaymentLink(v.paymentLink); setPaymentEnabled(v.paymentEnabled);
        setLogoUrl(data.logo_url || ''); setLogoPreview(data.logo_url || '');
        setBannerUrl(data.banner_url || ''); setBannerPreview(data.banner_url || '');
        setCity(v.city); setCommune(v.commune); setRegion(v.region); setAgeRange(v.ageRange);
        setPreferredFormat(v.preferredFormat); setArenaVisible(v.arenaVisible); setTeamDescription(v.teamDescription);
        setGuardado(JSON.stringify([v.teamName, v.paymentLink, v.paymentEnabled, v.city, v.commune, v.region, v.ageRange, v.preferredFormat, v.arenaVisible, v.teamDescription]));
      }
      setLoading(false);
    });
  }, [teamId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: (f: File) => void, setPreview: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { aviso.info('Solo se permiten imágenes.'); return; }
    setFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File, prefix: string) => {
    const ext = file.name.split('.').pop();
    const fileName = `${prefix}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('foto jugadores').upload(fileName, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('foto jugadores').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isAdmin || saving) return;
    if (!teamName.trim()) { aviso.info('El equipo necesita un nombre.'); return; }
    setSaving(true);
    try {
      const finalLogoUrl = logoFile ? await uploadImage(logoFile, 'team_logo') : logoUrl;
      const finalBannerUrl = bannerFile ? await uploadImage(bannerFile, 'team_banner') : bannerUrl;

      const { error: updateError } = await supabase.from('team_settings').update({
        team_name: teamName.trim(),
        logo_url: finalLogoUrl,
        banner_url: finalBannerUrl,
        payment_link: paymentLink,
        payment_button_enabled: paymentEnabled,
        city: city || null,
        commune: commune || null,
        region: region || null,
        age_range: ageRange,
        preferred_format: preferredFormat,
        arena_visible: arenaVisible,
        team_description: teamDescription || null,
      }).eq('id', teamId);
      if (updateError) throw updateError;

      setLogoUrl(finalLogoUrl); setBannerUrl(finalBannerUrl); setLogoFile(null); setBannerFile(null);
      setGuardado(actual);
      window.dispatchEvent(new Event(EQUIPO_ACTUALIZADO));
      aviso.ok('Cambios guardados.');
    } catch (err) {
      aviso.error('Error al guardar: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const textoInvitacion = `Únete a ${teamName || 'nuestro equipo'} en MiClubPro: entra a https://miclubpro.cl/login, toca "Soy jugador nuevo" y usa el código ${joinCode}.`;
  const copiarCodigo = async () => {
    try { await navigator.clipboard.writeText(joinCode); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }
    catch { aviso.info(`Tu código es ${joinCode}`); }
  };

  if (authLoading) return (
    <div className="flex justify-center items-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-soccer-green" />
    </div>
  );
  if (!isAdmin) return <div className="text-white p-8">No tienes acceso a esta sección.</div>;

  return (
    <div className="fade-in pb-40 md:pb-24 max-w-2xl mx-auto">
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-soccer-green mb-1">Capitán</p>
        <h1 className="font-headline text-3xl font-black text-white tracking-tight">Ajustes</h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-soccer-green" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Identidad: portada, escudo y nombre */}
          <section className="rounded-[20px] overflow-hidden" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="relative h-36" style={{ background: 'linear-gradient(135deg, #0a0e14 0%, #142019 100%)' }}>
              {bannerPreview && <img src={bannerPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(24,28,34,0.9) 100%)' }} />
              <button type="button" onClick={() => bannerRef.current?.click()}
                className="absolute top-3 right-3 h-9 px-3 rounded-full flex items-center gap-1.5 text-xs font-bold text-white cursor-pointer"
                style={{ background: 'rgba(10,14,20,0.75)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <Camera size={14} /> {bannerPreview ? 'Cambiar portada' : 'Subir portada'}
              </button>
              <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, setBannerFile, setBannerPreview)} />
            </div>
            <div className="px-4 pb-4 -mt-10 relative">
              <button type="button" onClick={() => logoRef.current?.click()} aria-label="Cambiar escudo"
                className="relative w-20 h-20 rounded-full overflow-hidden flex items-center justify-center cursor-pointer"
                style={{ background: '#262a31', border: '3px solid #181c22' }}>
                {logoPreview ? <img src={logoPreview} alt="" className="w-full h-full object-cover" /> : <Camera size={24} className="text-white/40" />}
              </button>
              <span className="absolute left-[4.6rem] top-[3.4rem] w-7 h-7 rounded-full flex items-center justify-center pointer-events-none" style={{ background: '#44f3a9', color: '#003822' }}>
                <Camera size={14} />
              </span>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileChange(e, setLogoFile, setLogoPreview)} />
              <label htmlFor="aj-nombre" className={`${etiqueta} mt-3`}>Nombre del equipo</label>
              <input id="aj-nombre" type="text" required className="input-field" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Ej. Real Fútbol 7" />
              <p className="text-xs text-white/50 mt-2">La portada se ve en el Inicio; el escudo, en el menú.</p>
            </div>
          </section>

          <Seccion titulo="Invitar jugadores">
            <div className="text-center py-3 rounded-2xl" style={{ background: '#10141a' }}>
              <p className="text-xs text-white/55 mb-1">Código para unirse</p>
              <p className="font-headline font-black text-3xl tracking-[0.3em] text-soccer-green select-all">{joinCode || '---'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={copiarCodigo} disabled={!joinCode}
                className="h-12 rounded-full flex items-center justify-center gap-2 font-bold text-sm text-white cursor-pointer" style={{ background: '#262a31' }}>
                {copiado ? <Check size={16} className="text-soccer-green" /> : <Copy size={16} />} {copiado ? 'Copiado' : 'Copiar'}
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(textoInvitacion)}`} target="_blank" rel="noopener noreferrer"
                className="h-12 rounded-full flex items-center justify-center gap-2 font-bold text-sm text-[#003822]" style={{ background: '#44f3a9' }}>
                <Share2 size={16} /> WhatsApp
              </a>
            </div>
          </Seccion>

          <Seccion titulo="Cobro de cuotas">
            <Fila titulo="Botón de pago en el Inicio" detalle="Los jugadores que deben ven un botón para pagar.">
              <Interruptor activo={paymentEnabled} cambiar={() => setPaymentEnabled(v => !v)} etiqueta="Botón de pago en el Inicio" />
            </Fila>
            <div style={{ opacity: paymentEnabled ? 1 : 0.45 }}>
              <label htmlFor="aj-link" className={etiqueta}>Link de pago</label>
              <input id="aj-link" type="url" inputMode="url" className="input-field" value={paymentLink} onChange={e => setPaymentLink(e.target.value)}
                placeholder="https://mpago.la/..." disabled={!paymentEnabled} />
            </div>
          </Seccion>

          <Seccion titulo="Perfil Arena">
            <Fila titulo="Visible para otros equipos" detalle="Te pueden encontrar para amistosos y torneos.">
              <Interruptor activo={arenaVisible} cambiar={() => setArenaVisible(v => !v)} etiqueta="Visible para otros equipos" />
            </Fila>
            <AutocompleteInput label="Ciudad" value={city} onChange={setCity} suggestions={CITIES_CL} placeholder="Ej: Concepción" />
            <AutocompleteInput label="Comuna" value={commune} onChange={setCommune} suggestions={COMMUNES_CL} placeholder="Ej: San Pedro de la Paz" />
            <div>
              <label htmlFor="aj-region" className={etiqueta}>Región</label>
              <select id="aj-region" className="input-field bg-slate-900" value={region} onChange={e => setRegion(e.target.value)}>
                <option value="">Seleccionar</option>
                {REGIONS_CL.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <Chips etiqueta="Rango etario" opciones={AGE_RANGES} valor={ageRange} cambiar={setAgeRange} />
            <Chips etiqueta="Formato" opciones={FORMATS} valor={preferredFormat} cambiar={setPreferredFormat} />
            <div>
              <label htmlFor="aj-desc" className={etiqueta}>Descripción (opcional)</label>
              <textarea id="aj-desc" rows={3} className="input-field resize-none" value={teamDescription} onChange={e => setTeamDescription(e.target.value)}
                placeholder="Ej: Equipo amateur, jugamos los martes" />
            </div>
          </Seccion>

          <Seccion titulo="Recordatorios">
            <Fila titulo="Recordatorio 24 h antes" detalle="Correo a quienes no han confirmado, todos los días a las 9:00.">
              <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold text-soccer-green" style={{ background: 'rgba(68,243,169,0.12)' }}>Activo</span>
            </Fila>
            <button type="button" onClick={handleTestReminder} disabled={testingReminder}
              className="flex items-center gap-1.5 text-sm font-bold text-[#9acbff] hover:text-white py-1 cursor-pointer disabled:opacity-50">
              <Send size={14} /> {testingReminder ? 'Enviando...' : 'Enviar prueba ahora'}
            </button>
            {reminderResult && (
              <p role="status" className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm"
                style={{ background: reminderResult.ok ? 'rgba(68,243,169,0.08)' : 'rgba(248,113,113,0.08)', color: reminderResult.ok ? '#44f3a9' : '#fca5a5' }}>
                {reminderResult.ok ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" /> : <AlertCircle size={15} className="shrink-0 mt-0.5" />}
                {reminderResult.ok
                  ? reminderResult.message || `${reminderResult.matches_processed} partido(s) revisado(s) · ${reminderResult.emails_sent} correo(s) enviado(s)`
                  : reminderResult.error || 'Error desconocido'}
              </p>
            )}
          </Seccion>
        </form>
      )}

      <BarraGuardar visible={hayCambios} guardando={saving} guardar={() => handleSave()} />
    </div>
  );
}
