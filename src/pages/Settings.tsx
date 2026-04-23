import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Settings() {
  const { isAdmin } = useAuth();
  const [formData, setFormData] = useState({ team_name: '', logo_url: '', join_code: '' });
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
        join_code: data.join_code || ''
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
