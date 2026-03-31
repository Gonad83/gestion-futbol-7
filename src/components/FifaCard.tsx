

interface Player {
  id: string;
  name: string;
  nickname?: string;
  position?: string;
  photo_url?: string | null;
  rating: number;
}

interface FifaCardProps {
  player: Player;
  color: string;
  index: number;
  isSelected?: boolean;
}

export default function FifaCard({ player, color, index, isSelected }: FifaCardProps) {
  const cardColorClass = color === 'emerald' ? 'emerald' : 
                        color === 'blue' ? 'blue' : 
                        color === 'white' ? 'white' : 
                        color === 'yellow' ? 'yellow' : 
                        color === 'red' ? 'red' : 
                        color === 'purple' ? 'purple' : 
                        color === 'lightblue' ? 'lightblue' : 
                        color === 'gold' ? 'gold' : 'blue';
  
  const displayName = player.name.replace(/\s*\(I\)\s*$/i, '').trim();

  return (
    <div className={`fifa-card-container fade-in ${isSelected ? 'scale-110 -translate-y-4 brightness-125 z-50' : 'z-10'}`} style={{ animationDelay: `${index * 50}ms` }}>
      <div className={`fifa-card ${cardColorClass} ${isSelected ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-transparent shadow-[0_0_30px_rgba(250,204,21,0.6)]' : ''}`}>
        <div className="card-top">
          <div className="card-pos">{player.position?.split(' ')[0].substring(0, 3).toUpperCase() || 'INV'}</div>
        </div>
        <div className="card-photo">
          {player.photo_url
            ? <img src={player.photo_url} alt={displayName} />
            : <div className="card-placeholder font-bold text-white/20 italic">{displayName.charAt(0)}</div>
          }
        </div>
        <div className="card-bottom">
          <div className="card-name">{displayName}</div>
          {player.nickname && <div className="card-nickname italic">"{player.nickname}"</div>}
        </div>
      </div>
    </div>
  );
}
