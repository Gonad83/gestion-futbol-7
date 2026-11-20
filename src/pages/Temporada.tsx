import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Share2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { cargarTemporada } from '../lib/api/temporada';
import { resumenTemporada, type ResumenTemporada } from '../lib/temporada';
import { compartirImagen, dibujarTarjeta } from '../lib/tarjetaImagen';
import { aviso } from '../lib/avisos';

function Dato({ valor, texto, color = '#fff' }: { valor: string | number; texto: string; color?: string }) {
  return (
    <div className="rounded-2xl py-4 px-2 text-center" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>
      <p className="font-headline text-3xl font-black tabular-nums" style={{ color }}>{valor}</p>
      <p className="text-xs text-white/60 mt-1">{texto}</p>
    </div>
  );
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** "Mi temporada": el resumen del año de cada jugador, para ver y compartir. */
export default function Temporada() {
  const { playerProfile, teamId } = useAuth();
  const actual = new Date().getFullYear();
  const [anio, setAnio] = useState(actual);
  const [resumen, setResumen] = useState<ResumenTemporada | null>(null);
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [error, setError] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);

  useEffect(() => {
    if (!teamId || !playerProfile?.id) return;
    let vivo = true;
    setResumen(null);
    setError(false);
    Promise.all([
      cargarTemporada(teamId, new Date(anio, 0, 1).toISOString()),
      supabase.from('team_settings').select('team_name').eq('id', teamId).maybeSingle(),
    ])
      .then(([datos, equipo]) => {
        if (!vivo) return;
        setResumen(resumenTemporada(datos, playerProfile, anio));
        setNombreEquipo(equipo.data?.team_name ?? '');
      })
      .catch(() => vivo && setError(true));
    return () => { vivo = false; };
  }, [teamId, playerProfile, anio]);

  if (!playerProfile) return null;
  const nombre = playerProfile.nickname || playerProfile.name;
  const record = resumen && resumen.ganados + resumen.empatados + resumen.perdidos > 0
    ? `${resumen.ganados}G ${resumen.empatados}E ${resumen.perdidos}P` : null;

  const compartir = async () => {
    if (!resumen) return;
    setCompartiendo(true);
    try {
      const filas = [
        { etiqueta: 'Partidos jugados', valor: `${resumen.jugados} de ${resumen.partidosEquipo}` },
        { etiqueta: 'Asistencia', valor: `${resumen.asistenciaPct}%` },
        ...(resumen.goles || resumen.asistencias ? [{ etiqueta: 'Goles · asistencias', valor: `${resumen.goles} · ${resumen.asistencias}` }] : []),
        ...(record ? [{ etiqueta: 'Récord', valor: record }] : []),
        ...(resumen.mvps ? [{ etiqueta: 'MVP', valor: plural(resumen.mvps, 'vez', 'veces') }] : []),
        ...(resumen.mejorRacha > 1 ? [{ etiqueta: 'Mejor racha', valor: plural(resumen.mejorRacha, 'partido', 'partidos') }] : []),
        ...(resumen.socio ? [{ etiqueta: 'Socio en la cancha', valor: resumen.socio.nombre }] : []),
        ...(resumen.mesTop ? [{ etiqueta: 'Mes más futbolero', valor: resumen.mesTop }] : []),
      ];
      const imagen = await dibujarTarjeta({ equipo: nombreEquipo || 'MiClubPro', titulo: `Mi temporada ${anio}`, destacado: nombre, bajada: playerProfile.position || undefined, filas });
      const r = await compartirImagen(imagen, `temporada-${anio}.png`, `Mi temporada ${anio} en ${nombreEquipo || 'MiClubPro'}`);
      if (r === 'descargada') aviso.ok('Imagen descargada: compártela en WhatsApp o Instagram.');
    } catch (e) {
      aviso.error('No se pudo crear la imagen: ' + (e as Error).message);
    } finally {
      setCompartiendo(false);
    }
  };

  return (
    <div className="fade-in pb-40 md:pb-24 max-w-2xl mx-auto space-y-6">
      <Link to="/profile" className="inline-flex items-center gap-1.5 h-11 text-sm text-white/60 hover:text-white"><ArrowLeft size={16} /> Mi perfil</Link>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-soccer-green mb-1">{nombreEquipo || 'Tu equipo'}</p>
        <h1 className="font-headline text-3xl font-black text-white tracking-tight">Mi temporada {anio}</h1>
        <div className="flex gap-2 mt-3" role="group" aria-label="Año">
          {[actual, actual - 1].map((a) => (
            <button key={a} type="button" onClick={() => setAnio(a)} aria-pressed={anio === a}
              className="h-9 px-4 rounded-full text-sm font-bold cursor-pointer"
              style={anio === a ? { background: '#44f3a9', color: '#003822' } : { background: '#262a31', color: '#fff' }}>{a}</button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-300">No se pudo cargar la temporada. Intenta de nuevo.</p>}
      {!error && !resumen && <p className="text-sm text-white/60">Calculando tu temporada…</p>}

      {resumen && resumen.partidosEquipo === 0 && (
        <p className="text-sm text-white/60">No hay partidos jugados en {anio}.</p>
      )}

      {resumen && resumen.partidosEquipo > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Dato valor={resumen.jugados} texto={`de ${resumen.partidosEquipo} partidos`} color="#44f3a9" />
            <Dato valor={`${resumen.asistenciaPct}%`} texto="asistencia" color="#9acbff" />
            <Dato valor={resumen.goles} texto={resumen.goles === 1 ? 'gol' : 'goles'} />
            <Dato valor={resumen.asistencias} texto={resumen.asistencias === 1 ? 'asistencia de gol' : 'asistencias de gol'} />
            <Dato valor={resumen.mvps} texto={resumen.mvps === 1 ? 'vez MVP' : 'veces MVP'} color="#ffd08b" />
            <Dato valor={resumen.mejorRacha} texto="partidos seguidos (mejor racha)" />
          </div>

          <ul className="rounded-[20px] divide-y divide-white/[0.06]" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.05)' }}>
            <li className="flex justify-between gap-3 p-4 text-sm"><span className="text-white/60">Récord de tu equipo</span><span className="font-bold text-white">{record ?? 'Sin resultados cargados'}</span></li>
            <li className="flex justify-between gap-3 p-4 text-sm"><span className="text-white/60">Socio en la cancha</span><span className="font-bold text-white text-right">{resumen.socio ? `${resumen.socio.nombre} (${plural(resumen.socio.veces, 'partido', 'partidos')})` : '—'}</span></li>
            <li className="flex justify-between gap-3 p-4 text-sm"><span className="text-white/60">Mes más futbolero</span><span className="font-bold text-white capitalize">{resumen.mesTop ?? '—'}</span></li>
          </ul>

          <button type="button" onClick={compartir} disabled={compartiendo}
            className="w-full h-12 rounded-full font-bold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: '#44f3a9', color: '#003822' }}>
            <Share2 size={18} /> {compartiendo ? 'Creando imagen…' : 'Compartir mi temporada'}
          </button>
          <p className="text-xs text-white/50 text-center">Goles, récord y MVP se cuentan de los partidos con resultado cargado.</p>
        </>
      )}
    </div>
  );
}
