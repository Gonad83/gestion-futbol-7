import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Settings as SettingsIcon, Save, CreditCard, Camera, Image, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Settings() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [saved, setSaved] = useState(false);

  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const logoRef = useRef<HTMLInputElement>(null);

  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const bannerRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('team_settings').select('*').eq('id', 1).single();
    if (data) {
      setTeamName(data.team_name || '');
      setJoinCode(data.join_code || '');
      setPaymentLink(data.payment_link || '');
      setPaymentEnabled(data.payment_button_enabled || false);
      setLogoUrl(data.logo_url || '');
      setLogoPreview(data.logo_url || '');
      setBannerUrl(data.banner_url || '');
      setBannerPreview(data.banner_url || '');
    }
    setLoading(false);
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File) => void,
    setPreview: (s: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Solo se permiten imágenes.'); return; }
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      let finalLogoUrl = logoUrl;
      let finalBannerUrl = bannerUrl;
      if (logoFile) finalLogoUrl = await uploadImage(logoFile, 'team_logo');
      if (bannerFile) finalBannerUrl = await uploadImage(bannerFile, 'team_banner');

      await supabase.from('team_settings').update({
        team_name: teamName,
        logo_url: finalLogoUrl,
        banner_url: finalBannerUrl,
        payment_link: paymentLink,
        payment_button_enabled: paymentEnabled,
      }).eq('id', 1);

      setLogoUrl(finalLogoUrl);
      setBannerUrl(finalBannerUrl);
      setLogoFile(null);
      setBannerFile(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return (
    <div className="flex justify-center items-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-soccer-green" />
    </div>
  );
  if (!isAdmin) return <div className="text-white p-8">No tienes acceso a esta sección.</div>;

  return (
    <div className="fade-in pb-20 md:pb-0 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-soccer-green/70 mb-1">Panel Admin</p>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="text-soccer-green" /> Configuración del Equipo
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-soccer-green" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="glass-card space-y-6">

          {/* Team Name */}
          <div>
            <label className="block text-sm text-slate-300 mb-1">Nombre del Equipo</label>
            <input
              type="text"
              required
              className="input-field"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              placeholder="Ej. Real Fútbol 7"
            />
            <p className="text-xs text-slate-400 mt-2">Aparece en la barra lateral y el Dashboard.</p>
          </div>

          {/* Logo upload */}
          <div>
            <label className="block text-sm text-slate-300 mb-2">Escudo / Logo del Equipo</label>
            <div
              className="flex items-center gap-4 rounded-xl p-3 cursor-pointer transition-all hover:border-soccer-green/40"
              style={{ background: 'rgba(49,53,60,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
              onClick={() => logoRef.current?.click()}
            >
              <div
                className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ background: '#262a31', border: '2px solid rgba(68,243,169,0.3)' }}
              >
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  : <Camera size={22} className="text-white/30" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/70">
                  {logoPreview ? 'Cambiar escudo/logo' : 'Subir escudo/logo'}
                </p>
                <p className="text-xs text-white/30 mt-0.5">PNG, JPG o WebP · Aparece en la barra lateral</p>
              </div>
              {logoFile && (
                <span className="text-[10px] font-black text-soccer-green uppercase tracking-wider">Seleccionado ✓</span>
              )}
            </div>
            <input ref={logoRef} type="file" accept="image/*" className="hidden"
              onChange={e => handleFileChange(e, setLogoFile, setLogoPreview)} />
          </div>

          {/* Banner upload */}
          <div>
            <label className="block text-sm text-slate-300 mb-2">Foto de Portada del Dashboard</label>
            <div
              className="relative flex items-center gap-4 rounded-xl p-3 cursor-pointer transition-all overflow-hidden hover:border-[#9acbff]/40"
              style={{ background: 'rgba(49,53,60,0.8)', border: '1px solid rgba(255,255,255,0.08)', minHeight: '78px' }}
              onClick={() => bannerRef.current?.click()}
            >
              {bannerPreview && (
                <div className="absolute inset-0">
                  <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover opacity-25" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(28,32,38,0.92) 0%, rgba(28,32,38,0.6) 100%)' }} />
                </div>
              )}
              <div className="relative z-10 flex items-center gap-4 w-full">
                <div
                  className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{ background: '#262a31', border: '2px solid rgba(154,203,255,0.3)' }}
                >
                  {bannerPreview
                    ? <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                    : <Image size={22} className="text-white/30" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/70">
                    {bannerPreview ? 'Cambiar foto de portada' : 'Subir foto de portada'}
                  </p>
                  <p className="text-xs text-white/30 mt-0.5">Imagen panorámica · Se muestra en el banner del Dashboard</p>
                </div>
                {bannerFile && (
                  <span className="text-[10px] font-black text-[#9acbff] uppercase tracking-wider">Seleccionado ✓</span>
                )}
              </div>
            </div>
            <input ref={bannerRef} type="file" accept="image/*" className="hidden"
              onChange={e => handleFileChange(e, setBannerFile, setBannerPreview)} />
            <p className="text-xs text-slate-400 mt-2">Si no subes imagen, el banner mostrará un fondo degradado.</p>
          </div>

          {/* Join code */}
          <div className="p-5 bg-soccer-green/5 rounded-2xl border border-soccer-green/20">
            <label className="block text-xs font-black uppercase tracking-widest text-soccer-green mb-2">Código Único del Club</label>
            <div className="flex items-center gap-4">
              <div className="bg-black/40 border border-white/10 rounded-xl px-6 py-3 font-black text-2xl tracking-[0.3em] text-white uppercase">
                {joinCode || '---'}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Código que los <b>Jugadores</b> ingresan al registrarse para unirse al equipo.
              </p>
            </div>
          </div>

          {/* Payment button */}
          <div className="p-5 rounded-2xl border" style={{ background: 'rgba(68,243,169,0.03)', borderColor: 'rgba(68,243,169,0.15)' }}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9' }}>
                  <CreditCard size={16} />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-white">Botón de Pago</label>
                  <p className="text-xs text-slate-400 mt-0.5">Muestra un banner de pago en el Dashboard para todos los jugadores.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentEnabled(v => !v)}
                className="flex-shrink-0 relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none"
                style={{ background: paymentEnabled ? '#44f3a9' : 'rgba(255,255,255,0.1)' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300"
                  style={{ transform: paymentEnabled ? 'translateX(24px)' : 'translateX(0)' }}
                />
              </button>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">URL del botón de pago</label>
              <input
                type="url"
                className="input-field"
                value={paymentLink}
                onChange={e => setPaymentLink(e.target.value)}
                placeholder="https://mpago.la/1Ng5FjY"
                disabled={!paymentEnabled}
                style={{ opacity: paymentEnabled ? 1 : 0.4 }}
              />
              <p className="text-xs text-slate-400 mt-2">Link de Mercado Pago u otra plataforma de pago.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-glass-border flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 min-w-[160px] justify-center" style={saved ? { background: 'linear-gradient(135deg,#00d68f,#00b876)' } : undefined}>
              {saved ? <><CheckCircle2 size={18} /> ¡Guardado!</> : saving ? <><Save size={18} /> Guardando...</> : <><Save size={18} /> Guardar Cambios</>}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
