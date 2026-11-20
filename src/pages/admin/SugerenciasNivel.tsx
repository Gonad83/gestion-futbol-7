import { useEffect, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cargarTemporada } from '../../lib/api/temporada';
import { sugerenciasNivel, type SugerenciaNivel } from '../../lib/temporada';
import { aviso } from '../../lib/avisos';

/**
 * Sugerencias de nivel según los resultados: a quien su equipo le gana casi
 * siempre se le sugiere subir un punto, y bajar al que pierde casi siempre.
 * El capitán decide; no se cambia nada solo. Sin sugerencias no se muestra.
 */
export function SugerenciasNivel({ teamId, alCambiar }: { teamId: number; alCambiar?: () => void }) {
  const [lista, setLista] = useState<SugerenciaNivel[]>([]);
  const [aplicando, setAplicando] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    const desde = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    cargarTemporada(teamId, desde)
      .then((d) => vivo && setLista(sugerenciasNivel(d)))
      .catch(() => { /* sin sugerencias */ });
    return () => { vivo = false; };
  }, [teamId]);

  if (lista.length === 0) return null;

  const aplicar = async (s: SugerenciaNivel) => {
    setAplicando(s.jugador.id);
    const { error } = await supabase.from('players').update({ rating: s.sugerido }).eq('id', s.jugador.id).eq('team_id', teamId);
    setAplicando(null);
    if (error) { aviso.error('No se pudo cambiar el nivel: ' + error.message); return; }
    aviso.ok(`${s.jugador.name} queda en nivel ${s.sugerido}.`);
    setLista((prev) => prev.filter((x) => x.jugador.id !== s.jugador.id));
    alCambiar?.();
  };
  const descartar = (id: string) => setLista((prev) => prev.filter((x) => x.jugador.id !== id));

  return (
    <section aria-label="Sugerencias de nivel" className="rounded-[20px] p-4" style={{ background: '#181c22', border: '1px solid rgba(255,208,139,0.25)' }}>
      <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-[#ffd08b]">Nivel según resultados</h2>
      <p className="text-xs text-white/55 mt-1 mb-3">Según cómo le fue a su equipo en los últimos partidos con resultado cargado.</p>
      <ul className="space-y-2">
        {lista.map((s) => {
          const sube = s.sugerido > s.actual;
          return (
            <li key={s.jugador.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: '#10141a' }}>
              <span className={sube ? 'text-soccer-green' : 'text-orange-300'} aria-hidden="true">{sube ? <TrendingUp size={18} /> : <TrendingDown size={18} />}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-white truncate">{s.jugador.name}</span>
                <span className="block text-xs text-white/55 tabular-nums">{s.ganados}G {s.empatados}E {s.perdidos}P · nivel {s.actual} → {s.sugerido}</span>
              </span>
              <button type="button" onClick={() => descartar(s.jugador.id)} className="h-11 px-3 text-xs font-bold text-white/55 cursor-pointer">Ahora no</button>
              <button type="button" onClick={() => aplicar(s)} disabled={aplicando !== null}
                className="h-11 px-4 rounded-full text-xs font-bold cursor-pointer disabled:opacity-60" style={{ background: '#ffd08b', color: '#2b1d00' }}>
                {aplicando === s.jugador.id ? 'Guardando…' : `Pasar a ${s.sugerido}`}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
