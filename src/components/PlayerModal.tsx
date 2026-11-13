import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { sendWelcomeEmail } from '../lib/sendEmail';
import { X, Camera, Upload, Star } from 'lucide-react';
import { SUB_STATS, MAX_STARS, subStat, ratingFromSubStats, type SubStatKey } from '../lib/playerStats';

const POSITION_GROUPS = [
  { group: 'Portero', roles: ['Portero'] },
  { group: 'Defensa', roles: ['Defensa Central', 'Lateral Izquierdo', 'Lateral Derecho'] },
  { group: 'Medio', roles: ['Medio Defensivo (MCD)', 'Medio Mixto (MC)', 'Enganche / 10 (MCO)', 'Volante Izquierdo', 'Volante Derecho'] },
  { group: 'Delantero', roles: ['Delantero Centro (9)', 'Segundo Delantero', 'Extremo Izquierdo', 'Extremo Derecho'] }
];

interface PlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  player?: any;
  teamId?: number | null;
}

export default function PlayerModal({ isOpen, onClose, onSave, player, teamId }: PlayerModalProps) {
  const [formData, setFormData] = useState<any>({
    name: '',
    nickname: '',
    email: '',
    position: 'Delantero Centro (9)',
    secondary_position: '',
    rating: 4,
    forma: 4,
    tecnica: 4,
    vision: 4,
    status: 'Activo',
    photo_url: '',
    birth_date: ''
  });
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [joinCode, setJoinCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (teamId) {
      supabase.from('team_settings').select('join_code').eq('id', teamId).single()
        .then(({ data }) => { if (data?.join_code) setJoinCode(data.join_code); });
    }
  }, [teamId]);

  useEffect(() => {
    if (player) {
      setFormData({
        ...player,
        forma: subStat(player, 'forma'),
        tecnica: subStat(player, 'tecnica'),
        vision: subStat(player, 'vision'),
      });
      setPhotoPreview(player.photo_url || '');
    } else {
      setFormData({
        name: '', nickname: '', email: '', position: 'Delantero Centro (9)', secondary_position: '', rating: 4, forma: 4, tecnica: 4, vision: 4, status: 'Activo', photo_url: '', birth_date: ''
      });
      setPhotoPreview('');
    }
    setPhotoFile(null);
  }, [player, isOpen]);

  if (!isOpen) return null;

  const setSubStat = (key: SubStatKey, value: number) => {
    const next = { ...formData, [key]: value };
    next.rating = ratingFromSubStats({ forma: next.forma, tecnica: next.tecnica, vision: next.vision });
    setFormData(next);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten archivos de imagen (JPG, PNG, WEBP, etc.)');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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

      // Remove virtual fields from payload to avoid Supabase errors
      const { matchesPlayed, participationPct, ...cleanData } = formData as any;
      // Convert empty strings to null for optional date/text fields
      const payload = {
        ...cleanData,
        photo_url: finalPhotoUrl,
        birth_date: cleanData.birth_date || null,
        nickname: cleanData.nickname || null,
        secondary_position: cleanData.secondary_position || null,
        email: cleanData.email || null,
      };

      if (player?.id) {
        const { error } = await supabase.from('players').update(payload).eq('id', player.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('players').insert([{ ...payload, team_id: teamId }]);
        if (error) throw error;
        if (payload.email) {
          await sendWelcomeEmail(payload.email, payload.name, joinCode);
        }
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error(error);
      alert('Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="relative z-[100]" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop fixed to screen */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity fade-in" onClick={onClose}></div>

      {/* Scrollable container for the modal itself */}
      <div className="fixed inset-0 z-10 overflow-y-auto custom-scrollbar">
        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0 fade-in py-10">
          
          {/* The actual modal card */}
          <div className="relative transform text-left transition-all sm:my-8 w-full max-w-lg glass-card shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white" id="modal-title">
                {player ? 'Editar Jugador' : 'Nuevo Jugador'}
              </h2>
              <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm text-slate-300 mb-1">Nombre y Apellido</label>
              <input type="text" required className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej. Lionel Messi" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm text-slate-300 mb-1">Apodo (Opcional)</label>
              <input type="text" className="input-field" value={formData.nickname} onChange={e => setFormData({...formData, nickname: e.target.value})} placeholder="Ej. La Pulga" />
            </div>
            
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm text-slate-300 mb-1">Posición Principal</label>
              <select className="input-field bg-slate-900" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}>
                {POSITION_GROUPS.map(group => (
                  <optgroup key={group.group} label={group.group}>
                    {group.roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm text-slate-300 mb-1">Posición Secundaria (Opcional)</label>
              <select className="input-field bg-slate-900" value={formData.secondary_position || ''} onChange={e => setFormData({...formData, secondary_position: e.target.value})}>
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
            <div className="col-span-2 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-slate-300">Estrellas</label>
                <span className="text-xs font-bold" style={{ color: '#ffd08b' }}>
                  Total {formData.rating}/{MAX_STARS}
                </span>
              </div>
              <div className="space-y-2">
                {SUB_STATS.map(s => {
                  const value = subStat(formData, s.key);
                  return (
                    <div key={s.key} className="flex items-center gap-3">
                      <span className="w-16 text-xs font-semibold text-slate-400">{s.label}</span>
                      <div className="flex gap-1">
                        {Array.from({ length: MAX_STARS }, (_, i) => (
                          <button key={i} type="button" aria-label={`${s.label} ${i + 1}`}
                            onClick={() => setSubStat(s.key, i + 1)}
                            className="p-0.5 transition-transform hover:scale-110">
                            <Star size={18} className={i < value ? 'fill-current' : ''}
                              style={{ color: i < value ? '#ffd08b' : 'rgba(255,255,255,0.15)' }} />
                          </button>
                        ))}
                      </div>
                      <span className="text-xs text-white/40 w-6 text-right">{value}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm text-slate-300 mb-1">Estado</label>
              <select className="input-field bg-slate-900" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option>Activo</option>
                <option>Inactivo</option>
                <option>Lesionado</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm text-slate-300 mb-1">Foto del Jugador</label>
              <div
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-glass-border rounded-xl p-4 cursor-pointer hover:border-soccer-green transition-colors bg-black/20"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="preview" className="w-16 h-16 rounded-full object-cover border-2 border-soccer-green" />
                ) : (
                  <Camera size={28} className="text-slate-500" />
                )}
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Upload size={12} /> {photoPreview ? 'Cambiar foto' : 'Subir foto'}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm text-slate-300 mb-1">Correo Electrónico</label>
              <input type="email" className="input-field" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="jugador@correo.com" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm text-slate-300 mb-1">Fecha de Nacimiento</label>
              <input type="date" className="input-field" value={formData.birth_date || ''} onChange={e => setFormData({...formData, birth_date: e.target.value})} />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-glass-border">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary min-w-[120px]">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
