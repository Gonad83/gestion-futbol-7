import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { subirFoto } from '../lib/subirFoto';
import { AvisosCelular } from '../components/AvisosCelular';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Camera, UserCircle, Star, ChevronRight } from 'lucide-react';
import { aviso } from '../lib/avisos';
import { BarraGuardar } from '../components/BarraGuardar';
import { AnilloAsistencia } from './players/ListaPlantilla';
import { MisPagos } from './profile/MisPagos';
import { MiRefuerzo, PedidosRefuerzo } from './profile/MiRefuerzo';

const POSITION_GROUPS = [
  { group: 'Portero', roles: ['Portero'] },
  { group: 'Defensa', roles: ['Defensa Central', 'Lateral Izquierdo', 'Lateral Derecho'] },
  { group: 'Medio', roles: ['Medio Defensivo (MCD)', 'Medio Mixto (MC)', 'Enganche / 10 (MCO)', 'Volante Izquierdo', 'Volante Derecho'] },
  { group: 'Delantero', roles: ['Delantero Centro (9)', 'Segundo Delantero', 'Extremo Izquierdo', 'Extremo Derecho'] },
];

const ESTADOS = [
  { valor: 'Activo', activo: { background: 'rgba(68,243,169,0.15)', color: '#44f3a9' } },
  { valor: 'Lesionado', activo: { background: 'rgba(248,113,113,0.18)', color: '#fca5a5' } },
  { valor: 'Inactivo', activo: { background: '#31353c', color: '#fff' } },
] as const;

interface Datos {
  name: string;
  nickname: string;
  position: string;
  secondary_position: string;
  status: string;
  birth_date: string;
}

const etiqueta = 'block text-[11px] font-bold uppercase tracking-wider text-white/60 mb-1.5';

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-white/60 mb-2 px-1">{titulo}</h2>
      <div className="rounded-[20px] p-4 space-y-4" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>{children}</div>
    </section>
  );
}

function SelectorPosicion({ id, valor, cambiar, conNinguna }: { id: string; valor: string; cambiar: (v: string) => void; conNinguna?: boolean }) {
  return (
    <select id={id} className="input-field bg-slate-900" value={valor} onChange={e => cambiar(e.target.value)}>
      {conNinguna && <option value="">Ninguna</option>}
      {POSITION_GROUPS.map(g => (
        <optgroup key={g.group} label={g.group}>
          {g.roles.map(r => <option key={r} value={r}>{r}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

/**
 * Mi perfil. Diseño basado en el concepto de Stitch (docs/diseno/perfil-movil-stitch.png):
 * ficha arriba, tu año en números, tus datos y tu estado; se guarda con la
 * barra que aparece solo cuando cambiaste algo.
 */
export default function MyProfile() {
  const { playerProfile, refreshProfile } = useAuth();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [original, setOriginal] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [vistaFoto, setVistaFoto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [anio, setAnio] = useState({ jugados: 0, total: 0, pct: 0 });
  const archivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!playerProfile) return;
    const d: Datos = {
      name: playerProfile.name || '',
      nickname: playerProfile.nickname || '',
      position: playerProfile.position || 'Delantero Centro (9)',
      secondary_position: playerProfile.secondary_position || '',
      status: playerProfile.status || 'Activo',
      birth_date: playerProfile.birth_date || '',
    };
    setDatos(d);
    setOriginal(JSON.stringify(d));
    setVistaFoto(playerProfile.photo_url || '');

    // Partidos del año de SU equipo (antes contaba los de todos los equipos que la base dejara ver).
    const inicio = new Date(new Date().getFullYear(), 0, 1).toISOString();
    (async () => {
      const { data: partidos } = await supabase.from('matches').select('id')
        .eq('team_id', playerProfile.team_id).gte('date', inicio).lt('date', new Date().toISOString());
      const ids = (partidos || []).map((m: { id: string }) => m.id);
      if (ids.length === 0) { setAnio({ jugados: 0, total: 0, pct: 0 }); return; }
      const { data: fue } = await supabase.from('attendance').select('id').eq('player_id', playerProfile.id).eq('status', 'Voy').in('match_id', ids);
      const jugados = fue?.length || 0;
      setAnio({ jugados, total: ids.length, pct: Math.min(100, Math.round((jugados / ids.length) * 100)) });
    })();
  }, [playerProfile]);

  const hayCambios = !!datos && (JSON.stringify(datos) !== original || !!foto);
  const cambiar = (campo: keyof Datos) => (valor: string) => setDatos(d => (d ? { ...d, [campo]: valor } : d));

  const elegirFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { aviso.info('Solo se permiten imágenes.'); return; }
    setFoto(f);
    setVistaFoto(URL.createObjectURL(f));
  };

  const guardar = async () => {
    if (!playerProfile?.id || !datos || guardando) return;
    if (!datos.name.trim()) { aviso.info('Tu nombre no puede quedar vacío.'); return; }
    setGuardando(true);
    try {
      let urlFoto = playerProfile.photo_url || '';
      if (foto) urlFoto = await subirFoto(foto, 'jugador');
      const { data: actualizado, error } = await supabase.from('players').update({
        name: datos.name.trim(),
        nickname: datos.nickname,
        position: datos.position,
        secondary_position: datos.secondary_position,
        photo_url: urlFoto,
        status: datos.status,
        birth_date: datos.birth_date || null,
      }).eq('id', playerProfile.id).select();
      if (error) throw error;
      if (!actualizado || actualizado.length === 0) {
        throw new Error('No tienes permiso para editar este perfil. Pídele a tu capitán que revise tu correo en la plantilla.');
      }
      await refreshProfile();
      setFoto(null);
      setOriginal(JSON.stringify(datos));
      aviso.ok('Perfil guardado.');
    } catch (err) {
      aviso.error('Error al guardar: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setGuardando(false);
    }
  };

  if (!playerProfile) {
    return (
      <div className="fade-in flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <UserCircle size={44} className="text-white/25" />
        <div>
          <h2 className="font-headline text-xl font-bold text-white mb-1">Sin perfil de jugador</h2>
          <p className="text-white/55 text-sm max-w-sm">Tu cuenta no está vinculada a ningún jugador. Pídele a tu capitán que registre tu correo en la plantilla.</p>
        </div>
      </div>
    );
  }
  if (!datos) return null;

  const estado = ESTADOS.find(e => e.valor === playerProfile.status) ?? ESTADOS[0];
  const rating = Number(playerProfile.rating) || 0;

  return (
    <div className="fade-in pb-40 md:pb-24 max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-soccer-green mb-1">Cuenta</p>
        <h1 className="font-headline text-3xl font-black text-white tracking-tight">Mi perfil</h1>
      </div>

      {/* Ficha */}
      <section className="rounded-[20px] p-5 flex flex-col items-center text-center" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>
        <button type="button" onClick={() => archivo.current?.click()} aria-label="Cambiar foto de perfil" className="relative cursor-pointer">
          <span className="block w-24 h-24 rounded-full overflow-hidden" style={{ background: '#262a31', border: '3px solid rgba(68,243,169,0.5)' }}>
            {vistaFoto
              ? <img src={vistaFoto} alt="" className="w-full h-full object-cover" />
              : <span className="w-full h-full flex items-center justify-center font-headline text-3xl font-black text-white/30">{playerProfile.name?.charAt(0)}</span>}
          </span>
          <span className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#44f3a9', color: '#003822', border: '3px solid #181c22' }}>
            <Camera size={15} />
          </span>
        </button>
        <input ref={archivo} type="file" accept="image/*" className="hidden" onChange={elegirFoto} />
        <h2 className="font-headline text-xl font-bold text-white mt-3">{playerProfile.name}</h2>
        {playerProfile.nickname && <p className="text-sm italic text-white/55">"{playerProfile.nickname}"</p>}
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold text-white/85" style={{ background: '#262a31' }}>{playerProfile.position || 'Sin posición'}</span>
          <span className="px-3 py-1 rounded-full text-xs font-bold" style={estado.activo}>{playerProfile.status}</span>
        </div>
        <div className="flex items-center gap-1 mt-3" aria-label={`Nivel ${rating} de 7`}>
          {Array.from({ length: 7 }, (_, i) => (
            <Star key={i} size={15} fill={i < rating ? '#ffd08b' : 'transparent'} color={i < rating ? '#ffd08b' : 'rgba(255,255,255,0.25)'} />
          ))}
          <span className="ml-1 text-sm font-bold text-[#ffd08b] tabular-nums">{rating}/7</span>
        </div>
        <p className="text-xs text-white/50 mt-1">El nivel lo define tu capitán</p>
      </section>

      {/* Tu año */}
      <section className="rounded-[20px] p-4" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-soccer-green mb-3">Tu {new Date().getFullYear()}</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl py-3" style={{ background: '#10141a' }}>
            <p className="font-headline text-2xl font-black text-white tabular-nums">{anio.jugados}</p>
            <p className="text-xs text-white/55">jugados</p>
          </div>
          <div className="rounded-xl py-3" style={{ background: '#10141a' }}>
            <p className="font-headline text-2xl font-black text-white tabular-nums">{anio.total}</p>
            <p className="text-xs text-white/55">partidos</p>
          </div>
          <div className="rounded-xl py-2 flex flex-col items-center" style={{ background: '#10141a' }}>
            <AnilloAsistencia porcentaje={anio.pct} />
            <p className="text-xs text-white/55">asistencia</p>
          </div>
        </div>
        <Link to="/temporada" className="mt-3 h-11 px-4 rounded-full flex items-center justify-between text-sm font-bold text-white" style={{ background: '#262a31' }}>
          Ver mi temporada y compartirla <ChevronRight size={16} />
        </Link>
      </section>

      {playerProfile.team_id && <MisPagos playerId={playerProfile.id} teamId={playerProfile.team_id} />}

      <PedidosRefuerzo />
      <MiRefuerzo playerId={playerProfile.id} />

      <Seccion titulo="Mis datos">
        <div>
          <label htmlFor="pf-nombre" className={etiqueta}>Nombre</label>
          <input id="pf-nombre" type="text" required autoComplete="name" className="input-field" value={datos.name} onChange={e => cambiar('name')(e.target.value)} />
        </div>
        <div>
          <label htmlFor="pf-apodo" className={etiqueta}>Apodo (opcional)</label>
          <input id="pf-apodo" type="text" className="input-field" value={datos.nickname} onChange={e => cambiar('nickname')(e.target.value)} placeholder="Ej. La Pulga" />
        </div>
        <div>
          <label htmlFor="pf-nac" className={etiqueta}>Fecha de nacimiento</label>
          <input id="pf-nac" type="date" className="input-field" value={datos.birth_date} onChange={e => cambiar('birth_date')(e.target.value)} />
          <p className="text-xs text-white/50 mt-1.5">Para avisarle al equipo de tu cumpleaños en el calendario.</p>
        </div>
        <div>
          <label htmlFor="pf-pos" className={etiqueta}>Posición principal</label>
          <SelectorPosicion id="pf-pos" valor={datos.position} cambiar={cambiar('position')} />
        </div>
        <div>
          <label htmlFor="pf-pos2" className={etiqueta}>Posición secundaria</label>
          <SelectorPosicion id="pf-pos2" valor={datos.secondary_position} cambiar={cambiar('secondary_position')} conNinguna />
        </div>
      </Seccion>

      <Seccion titulo="Estado">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl" role="radiogroup" aria-label="Estado" style={{ background: '#10141a' }}>
          {ESTADOS.map(e => (
            <button key={e.valor} type="button" role="radio" aria-checked={datos.status === e.valor} onClick={() => cambiar('status')(e.valor)}
              className="h-11 rounded-lg text-sm font-bold transition-colors cursor-pointer"
              style={datos.status === e.valor ? e.activo : { color: 'rgba(255,255,255,0.6)' }}>
              {e.valor}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/50">Si estás lesionado o inactivo, el capitán lo verá al armar los equipos.</p>
      </Seccion>

      <Seccion titulo="Avisos">
        <AvisosCelular modo="ajuste" />
      </Seccion>

      <BarraGuardar visible={hayCambios} guardando={guardando} guardar={guardar} />
    </div>
  );
}
