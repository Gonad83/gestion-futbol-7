import type { Dispatch, SetStateAction } from 'react';
import { RefreshCw, Save, Users, CheckCircle2, UserPlus, Send, Copy } from 'lucide-react';
import { FREE_GUEST_LIMIT, FREE_PLAYER_LIMIT, type JugadorMM } from '../../lib/matchmaking';

interface Props {
  loading: boolean;
  confirmedPlayers: JugadorMM[];
  saved: boolean;
  sendingList: boolean;
  teamsGenerated: boolean;
  showAddPlayerPanel: boolean;
  setShowAddPlayerPanel: Dispatch<SetStateAction<boolean>>;
  copied: boolean;
  showGuestForm: boolean;
  setShowGuestForm: Dispatch<SetStateAction<boolean>>;
  canEdit: boolean;
  generateTeams: () => void;
  saveTeams: () => void;
  handleSendFinalList: () => void;
  copyForWhatsApp: () => void;
  isFreePlan: boolean;
  guestCount: number;
  registeredCount: number;
}

export function BarraControles({ loading, confirmedPlayers, saved, sendingList, teamsGenerated, showAddPlayerPanel, setShowAddPlayerPanel, copied, showGuestForm, setShowGuestForm, canEdit, generateTeams, saveTeams, handleSendFinalList, copyForWhatsApp, isFreePlan, guestCount, registeredCount }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 bg-black/40 backdrop-blur-2xl p-4 rounded-[2rem] border border-glass-border shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-5 py-2.5 bg-white/5 rounded-2xl border border-white/5">
          <Users size={16} className="text-soccer-green" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-tighter">Nómina:</span>
          <span className="text-sm font-black text-white min-w-[2ch]">{confirmedPlayers.length}</span>
        </div>

        {!teamsGenerated && canEdit && (
          <>
            <button
              onClick={() => setShowGuestForm(!showGuestForm)}
              className={`btn-glass text-xs flex items-center gap-2 px-4 py-2.5 rounded-2xl border-white/10 ${showGuestForm ? 'bg-white/10' : ''}`}
            >
              <UserPlus size={14} />
              <span>{showGuestForm ? 'Cancelar' : 'Invitados'}</span>
              {isFreePlan && (
                <span className="text-[11px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: guestCount >= FREE_GUEST_LIMIT ? 'rgba(239,68,68,0.2)' : 'rgba(68,243,169,0.15)', color: guestCount >= FREE_GUEST_LIMIT ? '#f87171' : '#44f3a9' }}>
                  {guestCount}/{FREE_GUEST_LIMIT}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowAddPlayerPanel(v => !v)}
              className={`btn-glass text-xs flex items-center gap-2 px-4 py-2.5 rounded-2xl border-white/10 ${showAddPlayerPanel ? 'bg-soccer-green/10 text-soccer-green border-soccer-green/20' : ''}`}
            >
              <CheckCircle2 size={14} />
              <span>Confirmar Asistencia</span>
              {isFreePlan && (
                <span className="text-[11px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: registeredCount >= FREE_PLAYER_LIMIT ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)', color: registeredCount >= FREE_PLAYER_LIMIT ? '#f87171' : 'rgba(255,255,255,0.4)' }}>
                  {registeredCount}/{FREE_PLAYER_LIMIT}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={copyForWhatsApp}
          disabled={confirmedPlayers.length === 0}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border ${copied ? 'bg-soccer-green/20 text-soccer-green border-soccer-green/40' : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border-white/10'}`}
        >
          <Copy size={14} />
          <span>{copied ? '¡Copiado!' : 'WhatsApp'}</span>
        </button>
        {canEdit && (
          <>
            <button
              onClick={generateTeams}
              disabled={confirmedPlayers.length < 2 || loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white transition-all border border-white/5"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span>{saved ? 'Reordenar' : 'Generar'}</span>
            </button>
            <button
              onClick={saveTeams}
              disabled={!teamsGenerated || loading}
              className={`flex items-center gap-2 px-8 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl ${
                saved
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-soccer-green text-black hover:bg-soccer-green-light shadow-soccer-green/20'
              }`}
            >
              {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              <span>{saved ? 'Listo' : 'Guardar'}</span>
            </button>
            {saved && (
              <button
                onClick={handleSendFinalList}
                disabled={sendingList}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
              >
                <Send size={16} />
                <span>{sendingList ? 'Enviando...' : 'Enviar Lista'}</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
