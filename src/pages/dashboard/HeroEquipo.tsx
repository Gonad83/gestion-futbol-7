import type { AjustesEquipoDash } from '../../lib/api/dashboard';

interface Props {
  teamSettings: AjustesEquipoDash;
  isAdmin: boolean;
}

export function HeroEquipo({ teamSettings, isAdmin }: Props) {
  return (
    <div className="relative w-full h-36 md:h-48 rounded-2xl overflow-hidden"
      style={!teamSettings.banner_url ? { background: 'linear-gradient(135deg, #0a0e14 0%, #141a24 50%, #0e1820 100%)' } : undefined}>
      {teamSettings.banner_url && (
        <img
          src={teamSettings.banner_url}
          alt={teamSettings.team_name}
          className="w-full h-full object-cover object-center"
        />
      )}
      {/* gradient overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(10,14,20,0.85) 0%, rgba(10,14,20,0.4) 50%, rgba(10,14,20,0.1) 100%)' }} />
      {!teamSettings.banner_url && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(68,243,169,0.06) 0%, transparent 60%)' }} />
      )}
      {/* title + join code */}
      <div className="absolute inset-0 flex flex-col justify-center pl-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-soccer-green/80 mb-1">Panel de Control</p>
        <h1 className="text-3xl md:text-4xl font-headline font-black text-white italic tracking-tight uppercase drop-shadow-lg">
          {teamSettings.team_name.split(' ')[0]} <span className="text-soccer-green">{teamSettings.team_name.split(' ').slice(1).join(' ')}</span>
        </h1>
        {isAdmin && teamSettings.join_code && (
          <div className="mt-3 flex items-center gap-2 animate-in fade-in duration-700">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">Código de Invitación</span>
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
              <span className="font-headline font-black text-sm tracking-[0.2em] text-soccer-green uppercase select-all">
                {teamSettings.join_code}
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-soccer-green animate-pulse" />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
