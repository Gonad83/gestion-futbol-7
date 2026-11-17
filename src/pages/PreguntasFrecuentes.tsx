import StaticLayout from '../components/StaticLayout';
import { PREGUNTAS_FRECUENTES } from '../lib/contenidoPublico';

/**
 * Las respuestas van en <details>: están en el HTML aunque estén cerradas, así
 * los buscadores y asistentes con IA las leen sin tener que abrirlas.
 */
export default function PreguntasFrecuentes() {
  return (
    <StaticLayout>
      <span className="inline-block text-[11px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full mb-6"
        style={{ background: 'rgba(68,243,169,0.1)', color: '#44f3a9', border: '1px solid rgba(68,243,169,0.2)' }}>
        FAQ
      </span>
      <h1 className="font-headline font-black text-4xl sm:text-5xl text-white mb-4 leading-tight">
        Preguntas frecuentes
      </h1>
      <p className="text-base mb-12" style={{ color: 'rgba(255,255,255,0.55)' }}>
        Todo lo que necesitas saber sobre MiClubPro antes de empezar.
      </p>

      <div className="space-y-3">
        {PREGUNTAS_FRECUENTES.map(([q, a]) => (
          <details key={q} className="group rounded-2xl overflow-hidden" style={{ background: 'rgba(28,32,38,0.7)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <summary className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <h2 className="font-semibold text-white text-base">{q}</h2>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#44f3a9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <p className="px-6 pb-5" style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.75 }}>{a}</p>
          </details>
        ))}
      </div>
    </StaticLayout>
  );
}
