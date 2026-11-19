import type { Dispatch, SetStateAction } from 'react';
import { X, Edit2, Check, Copy } from 'lucide-react';
import { CanchaMovil } from './CanchaMovil';
import { FichaJugador } from './FichaJugador';
import { JERSEY_COLORS, getPosition, getAvg, hexCamiseta, type JugadorMM, type SeleccionCambio, type Equipo, type Formacion } from '../../lib/matchmaking';

interface Props {
  teamA: JugadorMM[];
  teamB: JugadorMM[];
  formationA: string;
  setFormationA: Dispatch<SetStateAction<string>>;
  formationB: string;
  setFormationB: Dispatch<SetStateAction<string>>;
  colorA: string;
  setColorA: Dispatch<SetStateAction<string>>;
  colorB: string;
  setColorB: Dispatch<SetStateAction<string>>;
  swapSelection: SeleccionCambio | null;
  setSaved: Dispatch<SetStateAction<boolean>>;
  editingGuestId: string | null;
  setEditingGuestId: Dispatch<SetStateAction<string | null>>;
  editingGuestName: string;
  setEditingGuestName: Dispatch<SetStateAction<string>>;
  copied: boolean;
  setShowGuestModal: Dispatch<SetStateAction<{ team: Equipo } | null>>;
  setGuestModalName: Dispatch<SetStateAction<string>>;
  setGuestModalRating: Dispatch<SetStateAction<string>>;
  isPastMatch: boolean;
  canEdit: boolean;
  getMatchFormations: () => Formacion[];
  removeFromPool: (jugador: JugadorMM) => void;
  saveGuestName: (guestId: string) => void;
  handleSwap: (team: Equipo, index: number) => void;
  copyTeamsForWhatsApp: () => void;
}

/**
 * Alto de las láminas en la cancha horizontal: lo que deja la línea más poblada
 * a lo alto y la separación entre líneas a lo ancho (cada equipo usa un 44%).
 * Se mide con las dos formaciones para que ambos equipos queden del mismo tamaño.
 */
function altoLamina(...formaciones: string[]): string {
  const medidas = formaciones.flatMap((formacion) => {
    const lineas = [1, ...formacion.split('-').map(Number)];
    const porAlto = (90 / (Math.max(...lineas) + 1)) * 0.95;
    const porAncho = (44 / lineas.length) * 0.92 * (4 / 3);
    return [`${porAlto.toFixed(2)}cqh`, `${porAncho.toFixed(2)}cqw`];
  });
  return `min(${medidas.join(', ')})`;
}

export function Pizarra({ teamA, teamB, formationA, setFormationA, formationB, setFormationB, colorA, setColorA, colorB, setColorB, swapSelection, setSaved, editingGuestId, setEditingGuestId, editingGuestName, setEditingGuestName, copied, setShowGuestModal, setGuestModalName, setGuestModalRating, isPastMatch, canEdit, getMatchFormations, removeFromPool, saveGuestName, handleSwap, copyTeamsForWhatsApp }: Props) {
  return (
    <div className="space-y-8">
      {/* Táctica y camiseta de cada equipo: compacto para que entre en el celular. */}
      <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto">
        {(['A', 'B'] as const).map((t) => {
          const formacion = t === 'A' ? formationA : formationB;
          const color = t === 'A' ? colorA : colorB;
          return (
            <div key={t} className="p-3 rounded-2xl space-y-2.5" style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.06)' }}>
              <label className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: hexCamiseta(color) }} />
                <span className="font-headline font-bold text-white text-sm">{t}</span>
                <select value={formacion} disabled={isPastMatch} aria-label={`Formación del equipo ${t}`}
                  onChange={e => { if (t === 'A') setFormationA(e.target.value); else setFormationB(e.target.value); setSaved(false); }}
                  className="flex-1 min-w-0 h-10 px-2 rounded-xl text-sm font-bold text-white cursor-pointer disabled:opacity-60"
                  style={{ background: '#10141a', border: '1px solid #262a31' }}>
                  {getMatchFormations().map(f => <option key={f.value} value={f.value}>{f.value}</option>)}
                </select>
              </label>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Camiseta del equipo ${t}`}>
                {JERSEY_COLORS.map(c => (
                  <button key={c.value} type="button" disabled={isPastMatch} title={c.name} aria-label={c.name} aria-pressed={color === c.value}
                    onClick={() => { if (t === 'A') setColorA(c.value); else setColorB(c.value); setSaved(false); }}
                    className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer disabled:cursor-default"
                    style={{ border: color === c.value ? '2px solid #fff' : '2px solid transparent' }}>
                    <span className={`w-5 h-5 rounded-full border ${c.class}`} />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="md:hidden">
        <CanchaMovil teamA={teamA} teamB={teamB} formationA={formationA} formationB={formationB} colorA={colorA} colorB={colorB}
          swapSelection={swapSelection} canEdit={canEdit && !isPastMatch} handleSwap={handleSwap} />
      </div>

      <div className="hidden md:block relative w-full aspect-[16/8] rounded-[3rem] overflow-hidden border-[6px] p-6 group shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)]"
        style={{ containerType: 'size', background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', borderColor: '#0f172a' }}>
        <div className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10%, rgba(255,255,255,0.05) 10%, rgba(255,255,255,0.05) 20%)', backgroundSize: '200% 100%' }} />
        <div className="absolute inset-8 border-2 border-white/20 rounded-[2rem] pointer-events-none" />
        <div className="absolute left-1/2 top-8 bottom-8 w-0.5 bg-white/20 pointer-events-none" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-64 md:h-64 border-2 border-white/20 rounded-full pointer-events-none" />
        <div className="absolute left-8 top-1/2 -translate-y-1/2 w-20 h-44 md:w-36 md:h-72 border-2 border-white/20 border-l-0 rounded-r-2xl pointer-events-none" />
        <div className="absolute right-8 top-1/2 -translate-y-1/2 w-20 h-44 md:w-36 md:h-72 border-2 border-white/20 border-r-0 rounded-l-2xl pointer-events-none" />

        <div className="pitch-team-label left-12 top-10 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${JERSEY_COLORS.find(c => c.value === colorA)?.class}`} />
          EQUIPO A
        </div>
        <div className="pitch-team-label right-12 top-10 flex items-center gap-2">
          EQUIPO B
          <div className={`w-3 h-3 rounded-full ${JERSEY_COLORS.find(c => c.value === colorB)?.class}`} />
        </div>

        {teamA.map((p, i) => (
          <div key={p.id} className="pitch-player transition-all duration-700" style={getPosition(i, 'A', teamA.length, formationA)}>
            <FichaJugador jugador={p} color={hexCamiseta(colorA)} arquero={i === 0} alto={altoLamina(formationA, formationB)} orden={i}
              elegido={swapSelection?.team === 'A' && swapSelection?.index === i} onClick={() => handleSwap('A', i)} />
          </div>
        ))}
        {teamB.map((p, i) => (
          <div key={p.id} className="pitch-player transition-all duration-700" style={getPosition(i, 'B', teamB.length, formationB)}>
            <FichaJugador jugador={p} color={hexCamiseta(colorB)} arquero={i === 0} alto={altoLamina(formationA, formationB)} orden={i}
              elegido={swapSelection?.team === 'B' && swapSelection?.index === i} onClick={() => handleSwap('B', i)} />
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={copyTeamsForWhatsApp}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border ${copied ? 'bg-soccer-green/20 text-soccer-green border-soccer-green/40' : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border-white/10'}`}
        >
          <Copy size={14} />
          <span>{copied ? '¡Copiado!' : 'Compartir Equipos por WhatsApp'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {(['A', 'B'] as const).map(team => {
          const players = team === 'A' ? teamA : teamB;
          const color = team === 'A' ? colorA : colorB;
          const colorHex = hexCamiseta(color);
          return (
            <div key={team} className="glass-card overflow-hidden group/card shadow-2xl transition-all hover:bg-white/[0.03]" style={{ borderTop: `4px solid ${colorHex}` }}>
              <div className="flex justify-between items-center mb-6 px-2">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black italic shadow-lg ${team === 'A' ? 'bg-soccer-green text-black' : 'bg-blue-600 text-white'}`}>
                    {team}
                  </div>
                  <div>
                    <h3 className="font-headline text-lg font-black uppercase tracking-tighter" style={{ color: colorHex }}>Equipo {team}</h3>
                    <p className="text-[11px] text-white/50 font-bold uppercase tracking-widest">{players.length} Jugadores Seleccionados</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xl font-black text-white italic">{getAvg(players)}</span>
                  <span className="text-[11px] font-black text-white/50 uppercase tracking-[0.2em]">Rating Promedio</span>
                </div>
              </div>

              <div className="space-y-2">
                {players.map((p) => (
                  <div key={p.id} className="flex justify-between items-center px-4 py-3.5 rounded-2xl transition-all hover:translate-x-1 group/item" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden border border-white/10 bg-black/20 group-hover/item:border-white/30 transition-all flex-shrink-0">
                        {p.photo_url ? <img src={p.photo_url} className="w-full h-full object-cover object-center" alt={p.name} /> : <span className="text-[11px] font-black opacity-30">{p.name.charAt(0)}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        {(p.isGuest || p.name.includes('(I)')) && canEdit && editingGuestId === p.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              className="bg-black/40 border border-soccer-green/30 rounded-lg px-2 py-1 text-[11px] flex-1 min-w-0 outline-none text-white"
                              value={editingGuestName}
                              onChange={e => setEditingGuestName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && saveGuestName(p.id)}
                              autoFocus
                            />
                            <button onClick={() => saveGuestName(p.id)} className="text-soccer-green flex-shrink-0">
                              <Check size={14} />
                            </button>
                            <button onClick={() => setEditingGuestId(null)} className="text-slate-500 flex-shrink-0">
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-black text-xs text-white/90 uppercase tracking-tight truncate group-hover/item:text-white transition-colors">
                              {p.name}
                            </span>
                            {(p.isGuest || p.name.includes('(I)')) && canEdit && (
                              <button
                                onClick={() => {
                                  setEditingGuestId(p.id);
                                  setEditingGuestName(p.name.replace(/\(I\)$/i, '').trim());
                                }}
                                className="text-soccer-green/60 hover:text-soccer-green flex-shrink-0 transition-colors"
                              >
                                <Edit2 size={11} />
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => removeFromPool(p)}
                                aria-label={`Sacar a ${p.name}`}
                                className="md:opacity-0 md:group-hover/item:opacity-100 text-red-400/70 hover:text-red-400 flex-shrink-0 transition-all ml-1 p-1.5 -m-1"
                              >
                                <X size={11} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-white/50 uppercase italic ml-2 flex-shrink-0">{p.position?.split(' ')[0]}</span>
                  </div>
                ))}
              </div>

              {canEdit && (
                <button
                  onClick={() => { setShowGuestModal({ team }); setGuestModalName(''); setGuestModalRating('5'); }}
                  className="w-full mt-6 py-4 rounded-2xl border-2 border-dashed border-white/5 text-[11px] font-black uppercase tracking-[0.3em] text-white/50 hover:text-white/60 hover:border-white/20 hover:bg-white/[0.02] transition-all"
                >
                  + Integrar Invitado
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
