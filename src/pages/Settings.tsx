import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Settings as SettingsIcon, Save, CreditCard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Settings() {
  const { isAdmin } = useAuth();
  const [formData, setFormData] = useState({ team_name: '', logo_url: '', join_code: '', payment_link: '', payment_button_enabled: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('team_settings').select('*').eq('id', 1).single();
    if (data) {
      setFormData({
        team_name: data.team_name,
        logo_url: data.logo_url || '',
        join_code: data.join_code || '',
        payment_link: data.payment_link || '',
        payment_button_enabled: data.payment_button_enabled || false,
      });
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    await supabase.from('team_settings').update(formData).eq('id', 1);
    setSaving(false);
    window.location.reload();
  };

  if (!isAdmin) {
    return <div className="text-white p-8">No tienes acceso a esta sección.</div>;
  }

  return (
    <div className="fade-in pb-20 md:pb-0 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="text-soccer-green" /> Configuración del Equipo
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
           <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-soccer-green"></div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="glass-card space-y-6">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Nombre del Equipo</label>
            <input 
              type="text" 
              required 
              className="input-field" 
              value={formData.team_name} 
              onChange={e => setFormData({...formData, team_name: e.target.value})} 
              placeholder="Ej. Real Fútbol 7" 
            />
            <p className="text-xs text-slate-400 mt-2">Este nombre aparecerá en la barra de navegación y página principal.</p>
          </div>
          
          <div>
            <label className="block text-sm text-slate-300 mb-1">URL de la Foto o Logo</label>
            <input 
              type="url" 
              className="input-field" 
              value={formData.logo_url} 
              onChange={e => setFormData({...formData, logo_url: e.target.value})} 
              placeholder="https://tulogo.com/logo.png" 
            />
            <p className="text-xs text-slate-400 mt-2">Pega la URL de una imagen PNG o JPG. Si la dejas en blanco, se mostrará el emoji del balón (⚽).</p>
          </div>

          <div className="p-5 bg-soccer-green/5 rounded-2xl border border-soccer-green/20">
            <label className="block text-xs font-black uppercase tracking-widest text-soccer-green mb-2">Código Único del Club</label>
            <div className="flex items-center gap-4">
              <div className="bg-black/40 border border-white/10 rounded-xl px-6 py-3 font-black text-2xl tracking-[0.3em] text-white uppercase">
                {formData.join_code || '---'}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Este es el código que los <b>Jugadores</b> deben ingresar en la pantalla de inicio para unirse a tu equipo.
              </p>
            </div>
          </div>

          {/* Payment Button */}
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
                onClick={() => setFormData(f => ({ ...f, payment_button_enabled: !f.payment_button_enabled }))}
                className="flex-shrink-0 relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none"
                style={{ background: formData.payment_button_enabled ? '#44f3a9' : 'rgba(255,255,255,0.1)' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300"
                  style={{ transform: formData.payment_button_enabled ? 'translateX(24px)' : 'translateX(0)' }}
                />
              </button>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">URL del botón de pago</label>
              <input
                type="url"
                className="input-field"
                value={formData.payment_link}
                onChange={e => setFormData({ ...formData, payment_link: e.target.value })}
                placeholder="https://mpago.la/1Ng5FjY"
                disabled={!formData.payment_button_enabled}
                style={{ opacity: formData.payment_button_enabled ? 1 : 0.4 }}
              />
              <p className="text-xs text-slate-400 mt-2">Pega el link de pago de Mercado Pago u otra plataforma.</p>
            </div>
          </div>

          {formData.logo_url && (
            <div className="p-4 bg-white/5 rounded-2xl border border-glass-border">
              <p className="block text-sm font-medium text-slate-300 mb-4">Vista Previa en Barra Lateral:</p>
              <div className="flex flex-col items-center gap-4 bg-dark-bg/50 p-6 rounded-xl border border-white/5">
                <div className="bg-soccer-green/20 w-24 h-24 rounded-full flex items-center justify-center border-2 border-soccer-green/50 overflow-hidden shadow-2xl shadow-soccer-green/20 ring-4 ring-soccer-green/10">
                  <img src={formData.logo_url} alt="Logo Prev" className="w-full h-full object-cover scale-110" />
                </div>
                <div className="text-center">
                  <h2 className="font-black text-xl tracking-tighter text-white uppercase italic">{formData.team_name || 'Nombre del Equipo'}</h2>
                  <div className="h-1 w-8 bg-soccer-green mx-auto mt-1 rounded-full"></div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-glass-border flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 min-w-[140px] justify-center">
              <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
