import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Eye, EyeOff, ArrowRight, Globe, ChevronDown } from 'lucide-react';

const REGIONS_CL = [
  'Región Metropolitana','Arica y Parinacota','Tarapacá','Antofagasta','Atacama',
  'Coquimbo','Valparaíso',"O'Higgins",'Maule','Ñuble','Biobío','La Araucanía',
  'Los Ríos','Los Lagos','Aysén','Magallanes',
];
const AGE_RANGES = ['Open','Sub-18','Sub-21','25+','35+','40+','Mixto'];
const FORMATS    = ['5vs5','7vs7','11vs11','Todos'];

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function RegisterCaptain() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const planParam = params.get('plan') || 'free';
  const emailParam = decodeURIComponent(params.get('email') || '');
  const teamParam = decodeURIComponent(params.get('team') || '');
  const nameParam = decodeURIComponent(params.get('name') || '');

  const [name, setName] = useState(nameParam);
  const [email, setEmail] = useState(emailParam);
  const [teamName, setTeamName] = useState(teamParam);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showArena, setShowArena] = useState(false);
  const [city, setCity] = useState('');
  const [commune, setCommune] = useState('');
  const [region, setRegion] = useState('');
  const [ageRange, setAgeRange] = useState('Open');
  const [preferredFormat, setPreferredFormat] = useState('7vs7');

  const planLabel = planParam === 'annual' ? 'Anual' : planParam === 'monthly' ? 'Mensual' : 'Prueba Gratis';
  const planColor = planParam === 'annual' ? '#44f3a9' : planParam === 'monthly' ? '#9acbff' : 'rgba(255,255,255,0.5)';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (!teamName.trim()) { setError('Ingresa el nombre de tu equipo.'); return; }

    setLoading(true);
    setError('');
    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpErr) throw signUpErr;
      if (!signUpData.user) throw new Error('No se pudo crear la cuenta');
      if (signUpData.user.identities?.length === 0) {
        throw new Error('Este email ya tiene una cuenta registrada. Usa "Iniciar sesión" para entrar.');
      }

      // Create team + captain via SECURITY DEFINER function (bypasses RLS during registration)
      const { error: regErr } = await supabase.rpc('register_new_captain', {
        p_team_name: teamName.trim(),
        p_join_code: generateJoinCode(),
        p_plan: planParam,
        p_captain_name: name.trim() || email.split('@')[0],
        p_captain_email: email.trim(),
        p_owner_id: signUpData.user.id,
      });
      if (regErr) throw regErr;

      // Save Arena profile if any field was filled
      if (signUpData.session && (city || commune || region)) {
        await supabase.from('team_settings')
          .update({ city: city || null, commune: commune || null, region: region || null, age_range: ageRange, preferred_format: preferredFormat })
          .eq('owner_id', signUpData.user.id);
      }

      // Email confirmation required
      if (!signUpData.session) {
        navigate(`/login?registered=1&email=${encodeURIComponent(email)}`);
        return;
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#10141a', fontFamily: 'Manrope, sans-serif' }}>
      <div className="max-w-md w-full space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(68,243,169,0.1)', border: '2px solid rgba(68,243,169,0.3)' }}>
            <CheckCircle2 size={32} style={{ color: '#44f3a9' }} />
          </div>
          {planParam !== 'free' && (
            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1" style={{ color: '#44f3a9' }}>
              Pago confirmado
            </p>
          )}
          <h1 className="font-headline font-black text-3xl text-white tracking-tight">
            Crea tu cuenta
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Plan <span className="font-bold" style={{ color: planColor }}>{planLabel}</span>
            {' '}· Completa el registro para acceder
          </p>
        </div>

        {/* Form card */}
        <div className="p-6 rounded-2xl space-y-4"
          style={{ background: '#1c2026', border: '1px solid rgba(255,255,255,0.07)' }}>

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Nombre completo</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                className="input-field" placeholder="Tu nombre" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="input-field" placeholder="tu@email.com" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Nombre del equipo</label>
              <input type="text" required value={teamName} onChange={e => setTeamName(e.target.value)}
                className="input-field" placeholder="Ej: Los Cóndores FC" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Contraseña</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)} className="input-field pr-11"
                  placeholder="Mínimo 6 caracteres" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Confirmar contraseña</label>
              <input type={showPassword ? 'text' : 'password'} required value={confirm}
                onChange={e => setConfirm(e.target.value)} className="input-field" placeholder="••••••••" />
            </div>

            {/* Arena profile — optional, collapsible */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(68,243,169,0.2)', background: 'rgba(68,243,169,0.03)' }}>
              <button
                type="button"
                onClick={() => setShowArena(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest" style={{ color: '#44f3a9' }}>
                  <Globe size={14} /> Perfil Arena (opcional)
                </span>
                <ChevronDown size={14} className="text-soccer-green/60 transition-transform" style={{ transform: showArena ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>
              {showArena && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-[10px] text-white/30">Completa estos datos para que otros equipos te encuentren en la Arena.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Ciudad</label>
                      <input type="text" className="input-field" value={city} onChange={e => setCity(e.target.value)} placeholder="Santiago" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Comuna</label>
                      <input type="text" className="input-field" value={commune} onChange={e => setCommune(e.target.value)} placeholder="Las Condes" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Región</label>
                      <select className="input-field bg-slate-900" value={region} onChange={e => setRegion(e.target.value)}>
                        <option value="">-- Seleccionar --</option>
                        {REGIONS_CL.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Rango Etario</label>
                      <select className="input-field bg-slate-900" value={ageRange} onChange={e => setAgeRange(e.target.value)}>
                        {AGE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Formato Preferido</label>
                      <select className="input-field bg-slate-900" value={preferredFormat} onChange={e => setPreferredFormat(e.target.value)}>
                        {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 mt-2">
              {loading
                ? 'Creando tu equipo...'
                : <><span>Activar mi cuenta</span><ArrowRight size={15} /></>}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/25">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" style={{ color: '#44f3a9' }} className="underline">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
