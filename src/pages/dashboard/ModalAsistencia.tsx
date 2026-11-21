import { useState } from 'react';
import { X, CheckCircle2, XCircle, Clock, List, ListChecks } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DashboardStats, Invitado, JugadorConAsistencia, EstadoAsistencia } from '../../lib/api/dashboard';
import { Capa } from '../../components/Capa';
import { PanelRefuerzos } from '../../components/PanelRefuerzos';

interface Props {
  stats: DashboardStats;
  isMatchmaker: boolean;
  attendanceList: JugadorConAsistencia[];
  attendanceLoading: boolean;
  guestList: Invitado[];
  guestInput: string;
  setGuestInput: (valor: string) => void;
  addGuest: () => void;
  /** Para los refuerzos; sin él no se muestra el panel. */
  teamId?: number | null;
  sumarInvitado?: (invitado: Invitado) => void;
  removeGuest: (id: string) => void;
  handleAttendanceChange: (playerId: string, estado: EstadoAsistencia) => void;
  setShowAttendanceModal: (abierto: boolean) => void;
}

/** Los grupos de la vista de lista, en el orden en que se leen. */
const GRUPOS: { estado: EstadoAsistencia; titulo: string; color: string }[] = [
  { estado: 'Voy', titulo: 'Confirmo', color: '#44f3a9' },
  { estado: 'Espera', titulo: 'En espera', color: '#fcd34d' },
  { estado: 'Tal vez', titulo: 'Tal vez', color: '#9acbff' },
  { estado: 'No voy', titulo: 'No voy', color: '#f87171' },
  { estado: 'Pendiente', titulo: 'Sin responder', color: '#fbbf24' },
];

/** Todo el plantel de un vistazo: nombres cortos agrupados por respuesta, sin botones. */
function VistaLista({ attendanceList, guestList }: { attendanceList: JugadorConAsistencia[]; guestList: Invitado[] }) {
  return (
    <div className="space-y-3">
      {GRUPOS.map(({ estado, titulo, color }) => {
        const jugadores = attendanceList.filter(p => p.attendanceStatus === estado);
        const invitados = estado === 'Voy' ? guestList : [];
        if (jugadores.length + invitados.length === 0) return null;
        return (
          <div key={estado}>
            <p className="text-[11px] font-black uppercase tracking-widest mb-1.5" style={{ color }}>
              {`${titulo} · ${jugadores.length + invitados.length}`}
            </p>
            <div className="grid grid-cols-2 gap-1">
              {jugadores.map(player => (
                <div key={player.id} className="flex items-center gap-2 px-2 py-1 rounded-lg min-w-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[9px] font-black flex-shrink-0" style={{ background: '#31353c' }}>
                    {player.photo_url ? <img src={player.photo_url} alt="" className="w-full h-full object-cover" /> : player.name.charAt(0)}
                  </div>
                  <span className="text-xs font-semibold text-white truncate" title={player.name}>{player.name}</span>
                </div>
              ))}
              {invitados.map(g => (
                <div key={g.id} className="flex items-center gap-2 px-2 py-1 rounded-lg min-w-0" style={{ background: 'rgba(154,203,255,0.06)' }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0" style={{ background: 'rgba(154,203,255,0.15)', color: '#9acbff' }}>
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-white truncate" title={g.name}>{g.name}</span>
                  <span className="text-[9px] font-bold uppercase text-[#9acbff]/70 flex-shrink-0">Inv.</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ModalAsistencia({ stats, isMatchmaker, attendanceList, attendanceLoading, guestList, guestInput, setGuestInput, addGuest, teamId, sumarInvitado, removeGuest, handleAttendanceChange, setShowAttendanceModal }: Props) {
  const [vista, setVista] = useState<'lista' | 'marcar'>('lista');
  return (
    <Capa>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-card w-full max-w-md max-h-[80vh] flex flex-col" style={{ background: '#1c2026' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-headline font-black text-white text-lg">Asistencia Manual</h2>
            <p className="text-xs text-white/50 mt-0.5">{stats.nextMatch && format(new Date(stats.nextMatch.date), 'dd MMM yyyy — HH:mm', { locale: es })}</p>
          </div>
          <button onClick={() => setShowAttendanceModal(false)} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2 mb-4 text-[11px] font-bold uppercase tracking-widest">
          <span className="flex items-center gap-1 text-soccer-green"><CheckCircle2 size={11} />{attendanceList.filter(p => p.attendanceStatus === 'Voy').length} Confirmados</span>
          <span className="flex items-center gap-1 text-red-400 ml-3"><XCircle size={11} />{attendanceList.filter(p => p.attendanceStatus === 'No voy').length} No Voy</span>
          <span className="flex items-center gap-1 text-amber-400 ml-3"><Clock size={11} />{attendanceList.filter(p => p.attendanceStatus === 'Pendiente').length} Pendiente</span>
          {attendanceList.some(p => p.attendanceStatus === 'Tal vez') && <span className="ml-3 text-[#9acbff]">{attendanceList.filter(p => p.attendanceStatus === 'Tal vez').length} Tal vez</span>}
          {attendanceList.some(p => p.attendanceStatus === 'Espera') && <span className="ml-3 text-amber-300">{attendanceList.filter(p => p.attendanceStatus === 'Espera').length} En espera</span>}
        </div>

        <div className="flex gap-1 p-1 mb-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.25)' }}>
          {([['lista', 'Lista', List], ['marcar', 'Marcar', ListChecks]] as const).map(([clave, texto, Icono]) => (
            <button key={clave} onClick={() => setVista(clave)} aria-pressed={vista === clave}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-black transition-all ${vista === clave ? 'bg-soccer-green text-black' : 'text-white/50 hover:text-white'}`}
            ><Icono size={13} />{texto}</button>
          ))}
        </div>

        <div className="overflow-y-auto custom-scrollbar space-y-2 pr-1 flex-1">
          {attendanceLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 rounded-full border-2 border-t-soccer-green animate-spin" />
            </div>
          ) : vista === 'lista' ? (
            <VistaLista attendanceList={attendanceList} guestList={guestList} />
          ) : (
            <>
              {/* Jugadores del squad */}
              {attendanceList.map(player => (
                <div key={player.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: '#31353c' }}>
                      {player.photo_url ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" /> : player.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">{player.name}</p>
                      {player.nickname && <p className="text-[11px] text-white/50">"{player.nickname}"</p>}
                      {player.attendanceStatus === 'Tal vez' && <p className="text-[11px] font-bold text-[#9acbff]">Tal vez</p>}
                      {player.attendanceStatus === 'Espera' && <p className="text-[11px] font-bold text-amber-300">En lista de espera · "Confirmo" lo hace entrar igual</p>}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleAttendanceChange(player.id, 'Voy')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all ${player.attendanceStatus === 'Voy' ? 'bg-soccer-green text-black' : 'bg-soccer-green/10 text-soccer-green/50 hover:bg-soccer-green/20'}`}
                    >Confirmo</button>
                    <button onClick={() => handleAttendanceChange(player.id, 'No voy')}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all ${player.attendanceStatus === 'No voy' ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-400/50 hover:bg-red-500/20'}`}
                    >No voy</button>
                    {player.attendanceStatus !== 'Pendiente' && (
                      <button onClick={() => handleAttendanceChange(player.id, 'Pendiente')}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-white/5 text-white/50 hover:bg-white/10 transition-all"
                        title="Quitar respuesta"
                      ><X size={10} /></button>
                    )}
                  </div>
                </div>
              ))}

              {/* Sección invitados — solo capitán/subcapitán */}
              {isMatchmaker && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <span className="text-[11px] font-black uppercase tracking-widest px-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Invitados</span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  </div>

                  {/* Lista de invitados */}
                  {guestList.map(g => (
                    <div key={g.id} className="flex items-center justify-between p-2.5 rounded-xl mb-1.5" style={{ background: 'rgba(154,203,255,0.06)', border: '1px solid rgba(154,203,255,0.12)' }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: 'rgba(154,203,255,0.15)', color: '#9acbff' }}>
                          {g.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white leading-tight">{g.name}</p>
                          <p className="text-[11px]" style={{ color: 'rgba(154,203,255,0.6)' }}>Invitado · Confirmado</p>
                        </div>
                      </div>
                      <button onClick={() => removeGuest(g.id)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/20"
                        style={{ color: 'rgba(255,255,255,0.25)' }}
                      ><X size={11} /></button>
                    </div>
                  ))}

                  {/* Input agregar invitado */}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Nombre del invitado..."
                      value={guestInput}
                      onChange={e => setGuestInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addGuest()}
                      className="flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(154,203,255,0.2)' }}
                    />
                    <button
                      onClick={addGuest}
                      disabled={!guestInput.trim()}
                      className="px-3 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-40"
                      style={{ background: 'rgba(154,203,255,0.15)', color: '#9acbff', border: '1px solid rgba(154,203,255,0.2)' }}
                    >+ Agregar</button>
                  </div>
                  {teamId && sumarInvitado && stats.nextMatch && (
                    <PanelRefuerzos matchId={stats.nextMatch.id} teamId={teamId} nombresActuales={guestList.map(g => g.name)} alSumar={sumarInvitado} />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </Capa>
  );
}
