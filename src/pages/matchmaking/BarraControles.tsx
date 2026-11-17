import type { Dispatch, SetStateAction } from 'react';
import { Shuffle, Save, Users, CheckCircle2, UserPlus, Send, Copy } from 'lucide-react';
import { Capa } from '../../components/Capa';
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

const chip = 'shrink-0 h-10 px-3.5 rounded-full flex items-center gap-2 text-sm font-bold transition-colors cursor-pointer';

/**
 * Arriba: cuántos van y los botones para sumar gente. Las acciones (mezclar,
 * WhatsApp, guardar, enviar) van en una barra pegada abajo en el celular, a
 * mano del pulgar; en pantallas grandes quedan en su lugar.
 */
export function BarraControles({ loading, confirmedPlayers, saved, sendingList, teamsGenerated, showAddPlayerPanel, setShowAddPlayerPanel, copied, showGuestForm, setShowGuestForm, canEdit, generateTeams, saveTeams, handleSendFinalList, copyForWhatsApp, isFreePlan, guestCount, registeredCount }: Props) {
  const acciones = (
    <div className="flex items-center gap-2">
      <button type="button" onClick={copyForWhatsApp} disabled={confirmedPlayers.length === 0} aria-label="Copiar para WhatsApp"
        className="h-12 px-4 rounded-full flex items-center gap-2 text-sm font-bold border transition-colors cursor-pointer disabled:opacity-40"
        style={copied ? { background: 'rgba(68,243,169,0.15)', color: '#44f3a9', borderColor: 'rgba(68,243,169,0.4)' } : { background: '#181c22', color: 'rgba(255,255,255,0.8)', borderColor: '#31353c' }}>
        <Copy size={16} /> <span className="hidden min-[400px]:inline">{copied ? '¡Copiado!' : 'WhatsApp'}</span>
      </button>
      {canEdit && (
        <>
          <button type="button" onClick={generateTeams} disabled={confirmedPlayers.length < 2 || loading}
            className="h-12 px-4 rounded-full flex items-center gap-2 text-sm font-bold text-white border cursor-pointer disabled:opacity-40"
            style={{ background: '#181c22', borderColor: '#31353c' }}>
            <Shuffle size={16} className={loading ? 'animate-spin' : ''} /> {teamsGenerated ? 'Mezclar' : 'Armar'}
          </button>
          {teamsGenerated && !saved && (
            <button type="button" onClick={saveTeams} disabled={loading}
              className="flex-1 h-12 px-5 rounded-full flex items-center justify-center gap-2 font-headline font-bold text-[#003822] whitespace-nowrap cursor-pointer disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #44f3a9, #00d68f)', boxShadow: '0 8px 24px -8px rgba(68,243,169,0.6)' }}>
              <Save size={17} /> Guardar
            </button>
          )}
          {saved && (
            <button type="button" onClick={handleSendFinalList} disabled={sendingList}
              className="flex-1 h-12 px-5 rounded-full flex items-center justify-center gap-2 font-headline font-bold whitespace-nowrap cursor-pointer disabled:opacity-60"
              style={{ background: '#9acbff', color: '#002541' }}>
              {sendingList ? 'Enviando...' : <><Send size={16} /> Enviar lista</>}
            </button>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 md:mx-0 md:px-0 md:flex-wrap md:items-center md:justify-between">
        <div className="flex gap-2">
          <span className={`${chip} cursor-default text-white`} style={{ background: '#181c22', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Users size={16} className="text-soccer-green" /> <span className="tabular-nums">{confirmedPlayers.length}</span> convocados
            {saved && <span className="inline-flex items-center gap-1 text-soccer-green text-xs"><CheckCircle2 size={13} /> guardado</span>}
          </span>
          {!teamsGenerated && canEdit && (
            <>
              <button type="button" onClick={() => setShowAddPlayerPanel(v => !v)} aria-pressed={showAddPlayerPanel} className={chip}
                style={showAddPlayerPanel ? { background: 'rgba(68,243,169,0.15)', color: '#44f3a9' } : { background: '#262a31', color: 'rgba(255,255,255,0.8)' }}>
                <CheckCircle2 size={15} /> Sumar jugador
                {isFreePlan && <span className="text-xs tabular-nums opacity-70">{registeredCount}/{FREE_PLAYER_LIMIT}</span>}
              </button>
              <button type="button" onClick={() => setShowGuestForm(!showGuestForm)} aria-pressed={showGuestForm} className={chip}
                style={showGuestForm ? { background: 'rgba(154,203,255,0.15)', color: '#9acbff' } : { background: '#262a31', color: 'rgba(255,255,255,0.8)' }}>
                <UserPlus size={15} /> Invitado
                {isFreePlan && (
                  <span className="text-xs tabular-nums" style={{ color: guestCount >= FREE_GUEST_LIMIT ? '#f87171' : undefined, opacity: guestCount >= FREE_GUEST_LIMIT ? 1 : 0.7 }}>
                    {guestCount}/{FREE_GUEST_LIMIT}
                  </span>
                )}
              </button>
            </>
          )}
        </div>
        <div className="hidden md:block">{acciones}</div>
      </div>

      {/* Celular: acciones fijas sobre la barra de navegación. */}
      <Capa>
        <div className="md:hidden fixed inset-x-0 z-30 px-4 pt-3 pb-3 bottom-[calc(4rem+env(safe-area-inset-bottom))]"
          style={{ background: 'linear-gradient(180deg, rgba(16,20,26,0) 0%, rgba(16,20,26,0.95) 30%)' }}>
          {acciones}
        </div>
      </Capa>
    </>
  );
}
