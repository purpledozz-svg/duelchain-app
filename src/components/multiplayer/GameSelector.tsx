import { Card } from '../ui/Card';

interface GameSelectorProps {
  onSelectGame: (game: string) => void;
  onBack: () => void;
}

export default function GameSelector({ onSelectGame, onBack }: GameSelectorProps) {
  const games: Array<{ id: string; name: string; icon: string; liveCount: number; badge?: string }> = [
    { id: 'chess', name: 'Chess', icon: '♟️', liveCount: 234 },
    { id: 'connect-four', name: 'Connect Four', icon: '🔴', liveCount: 89 },
    { id: 'tictactoe', name: 'Tic-Tac-Toe', icon: '⬜', liveCount: 93 },
    { id: 'flappy-duel', name: 'Flappy Duel', icon: '🐦', liveCount: 0, badge: 'NEW' },
    { id: 'stop-at-10', name: 'Stop at 10', icon: '⏱️', liveCount: 0, badge: 'NEW' },
    { id: 'hot-potato', name: 'Hot Potato', icon: '🥔', liveCount: 0, badge: 'NEW' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
      </div>

      <h2 className="text-3xl font-bold text-center mb-8">Choose Your Game</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {games.map((game) => (
          <Card
            key={game.id}
            className="p-6 hover:border-[#F0B429] transition-all cursor-pointer group text-center relative overflow-hidden"
            onClick={() => onSelectGame(game.id)}
          >
            {game.badge && (
              <span className="absolute top-2 right-2 bg-[#F0B429] text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {game.badge}
              </span>
            )}
            <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">
              {game.icon}
            </div>
            <h3 className="font-bold mb-1">{game.name}</h3>
            <p className="text-sm text-gray-400">
              {game.liveCount > 0 ? `${game.liveCount} live` : 'Multiplayer'}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
