import { Trophy } from 'lucide-react';
import { PROGRAMAS } from '../lib/programaInterGen';

const ORO = '#ffd08b';
const PLATA = '#9acbff';

/** Formato del torneo y reglas de clasificación y cruces del programa oficial. */
export default function ReglasInterGen({ year }: { year: number }) {
  const programa = PROGRAMAS[year];
  if (!programa) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-headline font-bold text-xl text-white flex items-center gap-2">
        <Trophy size={18} style={{ color: ORO }} /> Clasificación y cruces
      </h2>

      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,208,139,0.1)', boxShadow: `inset 3px 0 0 ${ORO}` }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: ORO }}>Regla central</p>
        <p className="text-sm font-semibold text-white mt-1">{programa.reglaCentral}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {programa.formato.map(f => (
          <div key={f.titulo} className="rounded-2xl p-4" style={{ background: '#1c2026' }}>
            <p className="font-headline font-bold flex items-center gap-2" style={{ color: f.copa === 'oro' ? ORO : PLATA }}>
              <Trophy size={16} /> {f.titulo}
            </p>
            <p className="text-sm text-white/70 mt-1">{f.texto}</p>
          </div>
        ))}
        {programa.reglas.map((r, i) => (
          <div key={r.titulo} className={`rounded-2xl p-4 ${i === programa.reglas.length - 1 && i % 2 === 0 ? 'md:col-span-2' : ''}`} style={{ background: '#181c22' }}>
            <p className="font-headline font-bold text-white flex items-center gap-2">
              <span className="text-xs font-black" style={{ color: ORO }}>{String(i + 1).padStart(2, '0')}</span>{r.titulo}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-white/70">
              {r.puntos.map(p => <li key={p}>{p}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
