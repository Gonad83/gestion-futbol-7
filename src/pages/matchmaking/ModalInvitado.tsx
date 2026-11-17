import type { Dispatch, SetStateAction } from 'react';
import { X } from 'lucide-react';
import { type Equipo } from '../../lib/matchmaking';
import { Capa } from '../../components/Capa';

interface Props {
  showGuestModal: { team: Equipo };
  setShowGuestModal: Dispatch<SetStateAction<{ team: Equipo } | null>>;
  guestModalName: string;
  setGuestModalName: Dispatch<SetStateAction<string>>;
  guestModalRating: string;
  setGuestModalRating: Dispatch<SetStateAction<string>>;
  addGuestToTeam: (team: Equipo) => void;
}

export function ModalInvitado({ showGuestModal, setShowGuestModal, guestModalName, setGuestModalName, guestModalRating, setGuestModalRating, addGuestToTeam }: Props) {
  return (
    <Capa>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 fade-in" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}>
      <div className="glass-card w-full max-w-sm border-2 border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-[11px] font-black text-soccer-green uppercase tracking-widest mb-1">Nueva incorporación</p>
            <h3 className="font-headline text-2xl font-black text-white italic uppercase tracking-tighter">Invitado · Equipo {showGuestModal.team}</h3>
          </div>
          <button onClick={() => setShowGuestModal(null)} className="p-2 rounded-xl bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-white/50 uppercase tracking-widest block italic">Ficha Técnica · Nombre</label>
            <input type="text" className="input-field bg-black/40 border-white/10" placeholder="Ej: Juan Pérez" value={guestModalName}
              onChange={e => setGuestModalName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-black text-white/50 uppercase tracking-widest block italic">Habilidad · Rating (1–7)</label>
            <input type="number" className="input-field bg-black/40 border-white/10" min="1" max="7" value={guestModalRating}
              onChange={e => setGuestModalRating(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={() => setShowGuestModal(null)} className="flex-1 py-4 rounded-2xl bg-white/5 text-[11px] font-black uppercase tracking-widest text-white/50 hover:bg-white/10 transition-all">Cancelar</button>
            <button onClick={() => addGuestToTeam(showGuestModal.team)} className="flex-1 py-4 rounded-2xl bg-soccer-green text-[11px] font-black uppercase tracking-widest text-black shadow-xl shadow-soccer-green/20 hover:scale-[1.02] transition-all">Incorporar</button>
          </div>
        </div>
      </div>
    </div>
    </Capa>
  );
}
