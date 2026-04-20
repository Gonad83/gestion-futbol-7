import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Camera, Upload, Save, Star, UserCircle, CheckCircle2, TrendingUp } from 'lucide-react';

const POSITION_GROUPS = [
  { group: 'Portero', roles: ['Portero'] },
  { group: 'Defensa', roles: ['Defensa Central', 'Lateral Izquierdo', 'Lateral Derecho'] },
  { group: 'Medio', roles: ['Medio Defensivo (MCD)', 'Medio Mixto (MC)', 'Enganche / 10 (MCO)', 'Volante Izquierdo', 'Volante Derecho'] },
  { group: 'Delantero', roles: ['Delantero Centro (9)', 'Segundo Delantero', 'Extremo Izquierdo', 'Extremo Derecho'] }
];

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Activo:    { bg: 'rgba(68,243,169,0.1)',   color: '#44f3a9', border: 'rgba(68,243,169,0.2)' },
  Lesionado: { bg: 'rgba(248,113,113,0.1)',  color: '#f87171', border: 'rgba(248,113,113,0.2)' },
  Inactivo:  { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', border: 'rgba(255,255,255,0.08)' },
};

export default function MyProfile() {
  const { playerProfile, refreshProfile } = useAuth();
  const [formData, setFormData] = useState<any>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [participationStats, setParticipationStats] = useState({ matchesPlayed: 0, totalMatches: 0, pct: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (playerProfile) {
      setFormData({
        name: playerProfile.name || '',
        nickname: playerProfile.nickname || '',
        position: playerProfile.position || 'Delantero Centro (9)',
        secondary_position: playerProfile.secondary_position || '',
        photo_url: playerProfile.photo_url || '',
        status: playerProfile.status || 'Activo',
        birth_date: playerProfile.birth_date || '',
      });
      setPhotoPreview(playerProfile.photo_url || '');
      fetchParticipation(playerProfile.id);
    }
  }, [playerProfile]);

  const fetchParticipation = async (playerId: string) => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const now = new Date().toISOString();
    const { data: yearMatches } = await supabase.from('matches').select('id').gte('date', yearStart).lt('date', now);
    const matchIds = (yearMatches || []).map(m => m.id);
    if (matchIds.length === 0) return;
    const { data: att } = await supabase.from('attendance').select('id').eq('player_id', playerId).eq('status', 'Voy').in('match_id', matchIds);
    const played = att?.length || 0;
    setParticipationStats({ matchesPlayed: played, totalMatches: matchIds.length, pct: Math.round((played / matchIds.length) * 100) });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Solo se permiten imágenes.'); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!playerProfile?.id || !formData) return;
    setSaving(true);
    setSaved(false);

    try {
      let finalPhotoUrl = formData.photo_url;

      if (photoFile) {
        const ext = photoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('foto jugadores')
          .upload(fileName, photoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('foto jugadores').getPublicUrl(fileName);
        finalPhotoUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('players').update({
        name: formData.name,
        nickname: formData.nickname,
        position: formData.position,
        secondary_position: formData.secondary_position,
        photo_url: finalPhotoUrl,
        status: formData.status,
        birth_date: formData.birth_date || null,
      }).eq('id', playerProfile.id);

      if (error) throw error;

      await refreshProfile();
      setSaved(true);
      setPhotoFile(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!playerProfile) {
    return (
      <div className="fade-in flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <UserCircle size={32} className="text-white/20" />
        </div>
        <div>
          <h2 className="font-headline text-xl font-bold text-white mb-1">Sin perfil de jugador</h2>
          <p className="text-white/40 text-sm max-w-sm">
            Tu cuenta no está vinculada a ningún perfil. Pídele al administrador que registre tu email en la plantilla de jugadores.
          </p>
        </div>
      </div>
    );
  }

  if (!formData) return null;

  const st = STATUS_STYLE[playerProfile.status] || STATUS_STYLE.Inactivo;

  return (
    <div className="fade-in pb-20 md:pb-0 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-soccer-green/70 mb-1">Cuenta</p>
        <h1 className="font-headline text-3xl font-black text-white tracking-tight">Mi Perfil</h1>
      </div>

      {/* Info card (read-only: status + rating) */}
      <div
        className="flex items-center gap-5 p-5 rounded-2xl"
        style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Avatar */}
        <div
          className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer transition-all hover:brightness-110"
          style={{ background: '#262a31', border: '2.5px solid rgba(68,243,169,0.25)' }}
          onClick={() => fileInputRef.current?.click()}
          title="Click para cambiar foto"
        >
          {photoPreview
            ? <img src={photoPreview} alt={playerProfile.name} className="w-full h-full object-cover" />
            : <span className="text-3xl font-black text-white/20">{playerProfile.name?.charAt(0)}</span>
          }
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-headline text-2xl font-black text-white tracking-tight leading-tight truncate">
            {playerProfile.name}
          </h2>
          {playerProfile.nickname && (
            <p className="text-white/35 text-sm mt-0.5">"{playerProfile.nickname}"</p>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs font-bold" style={{ color: '#44f3a9' }}>{playerProfile.position}</span>
            <span
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
              style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
            >
              {playerProfile.status}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 7 }, (_, i) => (
                <Star
                  key={i}
                  size={11}
                  className={i < playerProfile.rating ? 'fill-current' : ''}
                  style={{ color: i < playerProfile.rating ? '#ffd08b' : 'rgba(255,255,255,0.1)' }}
                />
              ))}
            </div>
            <span className="text-[10px] text-white/30 font-semibold">Rating {playerProfile.rating}/7</span>
          </div>
        </div>
      </div>

      {/* Participation stats */}
      <div
        className="p-5 rounded-2xl"
        style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} style={{ color: '#44f3a9' }} />
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Estadísticas {new Date().getFullYear()}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl p-3 text-center" style={{ background: '#0a0e14' }}>
            <p className="font-headline text-2xl font-black text-white">{participationStats.matchesPlayed}</p>
            <p className="text-[9px] text-white/30 uppercase tracking-wider font-bold mt-0.5">Jugados</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: '#0a0e14' }}>
            <p className="font-headline text-2xl font-black text-white">{participationStats.totalMatches}</p>
            <p className="text-[9px] text-white/30 uppercase tracking-wider font-bold mt-0.5">Totales</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: '#0a0e14' }}>
            <p className="font-headline text-2xl font-black" style={{ color: participationStats.pct >= 70 ? '#44f3a9' : participationStats.pct >= 40 ? '#ffd08b' : '#f87171' }}>
              {participationStats.pct}%
            </p>
            <p className="text-[9px] text-white/30 uppercase tracking-wider font-bold mt-0.5">Asistencia</p>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${participationStats.pct}%`,
              background: participationStats.pct >= 70 ? '#44f3a9' : participationStats.pct >= 40 ? '#ffd08b' : '#f87171',
            }}
          />
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSave} className="glass-card space-y-5">
        <h3 className="font-headline text-base font-bold text-white flex items-center gap-2">
          Editar información
        </h3>

        {/* Photo upload */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Foto de perfil</label>
          <div
            className="flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all"
            style={{ background: 'rgba(49,53,60,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div
              className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ background: '#31353c', border: '1.5px solid rgba(68,243,169,0.2)' }}
            >
              {photoPreview
                ? <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                : <Camera size={18} className="text-white/30" />
              }
            </div>
            <span className="text-sm flex items-center gap-2 font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <Upload size={14} />
              {photoPreview ? 'Cambiar foto de perfil' : 'Subir foto de perfil'}
            </span>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Nombre completo</label>
            <input
              type="text"
              required
              className="input-field"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Apodo (opcional)</label>
            <input
              type="text"
              className="input-field"
              value={formData.nickname}
              onChange={e => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="Ej. La Pulga"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Posición Principal</label>
            <select
              className="input-field"
              style={{ background: 'rgba(49,53,60,0.8)' }}
              value={formData.position}
              onChange={e => setFormData({ ...formData, position: e.target.value })}
            >
              {POSITION_GROUPS.map(group => (
                <optgroup key={group.group} label={group.group}>
                  {group.roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Posición Secundaria</label>
            <select
              className="input-field"
              style={{ background: 'rgba(49,53,60,0.8)' }}
              value={formData.secondary_position || ''}
              onChange={e => setFormData({ ...formData, secondary_position: e.target.value })}
            >
              <option value="">-- Ninguna --</option>
              {POSITION_GROUPS.map(group => (
                <optgroup key={group.group} label={group.group}>
                  {group.roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Estado</label>
            <select
              className="input-field"
              style={{ background: 'rgba(49,53,60,0.8)' }}
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
              <option value="Lesionado">Lesionado</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Fecha de Nacimiento</label>
            <input
              type="date"
              className="input-field"
              style={{ background: 'rgba(49,53,60,0.8)' }}
              value={formData.birth_date || ''}
              onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
            />
          </div>
        </div>

        <div
          className="flex items-center justify-between pt-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-[10px] text-white/25">El rating es gestionado por el administrador.</p>
          <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5 gap-2">
            {saving
              ? 'Guardando...'
              : saved
                ? <><CheckCircle2 size={15} /> ¡Guardado!</>
                : <><Save size={15} /> Guardar Cambios</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
