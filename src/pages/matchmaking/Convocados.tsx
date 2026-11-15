import type { Dispatch, SetStateAction } from 'react';
import { CheckCircle2, UserPlus, X, Star, Edit2, Check, Zap } from 'lucide-react';
import { FREE_GUEST_LIMIT, FREE_PLAYER_LIMIT, type JugadorMM } from '../../lib/matchmaking';

interface Props {
  confirmedPlayers: JugadorMM[];
  declinedPlayers: JugadorMM[];
  editingGuestId: string | null;
  setEditingGuestId: Dispatch<SetStateAction<string | null>>;
  editingGuestName: string;
  setEditingGuestName: Dispatch<SetStateAction<string>>;
  showAddPlayerPanel: boolean;
  allActivePlayers: JugadorMM[];
  showGuestForm: boolean;
  guestName: string;
  setGuestName: Dispatch<SetStateAction<string>>;
  guestRating: string;
  setGuestRating: Dispatch<SetStateAction<string>>;
  canEdit: boolean;
  addPlayerToConfirmed: (jugador: JugadorMM) => void;
  addGuestToPool: () => void;
  removeFromPool: (jugador: JugadorMM) => void;
  saveGuestName: (guestId: string) => void;
  isFreePlan: boolean;
  guestCount: number;
  registeredCount: number;
  canAddGuest: boolean;
  canAddRegistered: boolean;
}

export function Convocados({ confirmedPlayers, declinedPlayers, editingGuestId, setEditingGuestId, editingGuestName, setEditingGuestName, showAddPlayerPanel, allActivePlayers, showGuestForm, guestName, setGuestName, guestRating, setGuestRating, canEdit, addPlayerToConfirmed, addGuestToPool, removeFromPool, saveGuestName, isFreePlan, guestCount, registeredCount, canAddGuest, canAddRegistered }: Props) {
  return (
    <div className="space-y-6">
      {showGuestForm && canEdit && (
        <div className="flex flex-col gap-4 p-6 rounded-3xl fade-in bg-white/5 border border-white/10 backdrop-blur-xl">
          {!canAddGuest ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,208,139,0.1)', border: '1px solid rgba(255,208,139,0.3)' }}>
                  <UserPlus size={16} style={{ color: '#ffd08b' }} />
                </div>
                <div>
                  <p className="text-xs font-black text-white">Límite de invitados alcanzado</p>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>El plan Starter permite hasta {FREE_GUEST_LIMIT} invitados por partido.</p>
                </div>
              </div>
              <a href="/#pricing" className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-black px-4 py-2 rounded-xl uppercase tracking-wider transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #ffd08b, #ffb830)', color: '#1a0e00' }}>
                <Zap size={11} /> Actualizar plan
              </a>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-2">
                <label className="block text-[11px] font-black uppercase tracking-widest text-soccer-green italic">
                  Nuevo Invitado {isFreePlan && <span style={{ color: 'rgba(255,255,255,0.3)' }}>({guestCount}/{FREE_GUEST_LIMIT})</span>}
                </label>
                <input
                  type="text"
                  className="input-field bg-black/20"
                  placeholder="Nombre del fenómeno"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addGuestToPool()}
                  autoFocus
                />
              </div>
              <div className="w-full sm:w-32 space-y-2">
                <label className="block text-[11px] font-black uppercase tracking-widest text-soccer-green italic">Rating (1–7)</label>
                <input
                  type="number"
                  className="input-field bg-black/20"
                  min="1" max="7" step="1"
                  value={guestRating}
                  onChange={e => setGuestRating(e.target.value)}
                />
              </div>
              <button onClick={addGuestToPool} className="btn-primary py-3.5 px-8 text-xs font-black uppercase tracking-widest w-full sm:w-auto">
                Añadir
              </button>
            </div>
          )}
        </div>
      )}

      {showAddPlayerPanel && canEdit && (() => {
        const confirmedIds = new Set(confirmedPlayers.map(p => p.id));
        const unconfirmed = allActivePlayers.filter(p => !confirmedIds.has(p.id));
        return (
          <div className="p-5 rounded-3xl fade-in bg-soccer-green/5 border border-soccer-green/20 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-widest text-soccer-green">Sin respuesta — click para confirmar asistencia</p>
              {isFreePlan && (
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: registeredCount >= FREE_PLAYER_LIMIT ? 'rgba(239,68,68,0.15)' : 'rgba(68,243,169,0.1)', color: registeredCount >= FREE_PLAYER_LIMIT ? '#f87171' : '#44f3a9' }}>
                  {registeredCount}/{FREE_PLAYER_LIMIT} jugadores
                </span>
              )}
            </div>
            {!canAddRegistered ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-2">
                <p className="text-xs text-white/50">Límite de {FREE_PLAYER_LIMIT} jugadores registrados alcanzado en el plan Starter.</p>
                <a href="/#pricing" className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-black px-4 py-2 rounded-xl uppercase tracking-wider transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #ffd08b, #ffb830)', color: '#1a0e00' }}>
                  <Zap size={11} /> Actualizar plan
                </a>
              </div>
            ) : unconfirmed.length === 0 ? (
              <p className="text-sm text-white/30 italic">Todos los jugadores activos ya están en la nómina.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {unconfirmed.map(player => (
                  <button
                    key={player.id}
                    onClick={() => canAddRegistered && addPlayerToConfirmed(player)}
                    className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-black/30 border border-white/10 hover:border-soccer-green/40 hover:bg-soccer-green/10 transition-all group"
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-black flex-shrink-0" style={{ background: '#31353c' }}>
                      {player.photo_url ? <img src={player.photo_url} className="w-full h-full object-cover" alt={player.name} /> : player.name.charAt(0)}
                    </div>
                    <span className="text-xs font-bold text-white/70 group-hover:text-white transition-colors">{player.name}</span>
                    <CheckCircle2 size={12} className="text-soccer-green/40 group-hover:text-soccer-green transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {confirmedPlayers.map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-4 px-5 py-4 rounded-3xl transition-all hover:translate-y-[-2px] hover:shadow-xl bg-slate-900/40 border border-white/5 hover:border-white/10 group"
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden bg-slate-800 border-2 border-white/10">
                {player.photo_url
                  ? <img src={player.photo_url} className="w-full h-full object-cover" alt={player.name} />
                  : <span className="text-white/40 font-black">{player.name.charAt(0)}</span>
                }
              </div>
              {player.isGuest && (
                <div className="absolute -top-2 -right-2 bg-yellow-500 text-black p-1 rounded-lg">
                  <UserPlus size={10} />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm uppercase tracking-tight truncate leading-none mb-1">{player.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">{player.position || 'Invitado'}</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-black/30 rounded-xl border border-white/5">
                <Star size={10} className="text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-black text-white/80">{player.rating}</span>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  {(player.isGuest || player.name.includes('(I)')) && (
                    <button
                      onClick={() => {
                        setEditingGuestId(player.id);
                        setEditingGuestName(player.name.replace(/\(I\)$/i, '').trim());
                      }}
                      className="opacity-0 group-hover:opacity-100 text-soccer-green/50 hover:text-soccer-green transition-all"
                    >
                      <Edit2 size={12} />
                    </button>
                  )}
                  <button onClick={() => removeFromPool(player)} className="opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-500 transition-all">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {editingGuestId === player.id && (
              <div className="absolute inset-0 z-50 bg-slate-900 rounded-3xl flex items-center gap-3 px-5 border-2 border-soccer-green/50">
                <input 
                  type="text"
                  className="flex-1 bg-transparent border-none outline-none text-white font-black text-sm uppercase italic"
                  value={editingGuestName}
                  onChange={e => setEditingGuestName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveGuestName(player.id)}
                  autoFocus
                />
                <button onClick={() => saveGuestName(player.id)} className="text-soccer-green">
                  <Check size={18} />
                </button>
                <button onClick={() => setEditingGuestId(null)} className="text-slate-500">
                  <X size={18} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {declinedPlayers.length > 0 && (
        <div className="pt-8 space-y-4">
          <div className="flex items-center gap-3 px-4">
            <X size={16} className="text-red-500" />
            <h3 className="font-headline font-bold text-white/50 uppercase tracking-widest text-sm italic">Bajas Confirmadas ({declinedPlayers.length})</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {declinedPlayers.map(player => (
              <div key={player.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/2 border border-white/5 grayscale opacity-60">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-800 border border-white/10 flex-shrink-0">
                  {player.photo_url 
                    ? <img src={player.photo_url} className="w-full h-full object-cover" alt={player.name} />
                    : <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-white/50">{player.name.charAt(0)}</div>
                  }
                </div>
                <span className="text-xs font-bold text-white/50 truncate">{player.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
