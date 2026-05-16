import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface MatchmakingScreenProps {
  game: string;
  bracket: string;
  betAmount: number;
  currency: string;
  usdValue: string;
  queuePosition: number;
  onCancel: () => void;
}

export default function MatchmakingScreen({
  game,
  bracket,
  betAmount,
  currency,
  usdValue,
  queuePosition,
  onCancel
}: MatchmakingScreenProps) {
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const progress = Math.min((timeElapsed / 60) * 100, 100);

  return (
    <div className="max-w-md mx-auto">
      <Card className="p-8 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-[#F0B429] to-[#D4A017] rounded-full flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>

        <h2 className="text-2xl font-bold mb-2">Finding opponent...</h2>
        <p className="text-gray-400 mb-6">This may take a moment</p>

        <div className="text-left bg-white/5 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Game:</span>
            <span className="font-semibold capitalize">{game}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Bracket:</span>
            <span className="font-semibold capitalize">{bracket}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Your bet:</span>
            <span className="font-semibold">
              {currency === 'ETH' ? 'Ξ' : '$'} {betAmount} ({usdValue})
            </span>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>{timeElapsed}s</span>
            <span>Players in queue: {queuePosition}</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#F0B429] to-[#D4A017] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Button
          onClick={onCancel}
          variant="secondary"
          className="w-full"
        >
          Cancel Search
        </Button>

        <div className="mt-6 p-4 bg-white/5 rounded-lg">
          <p className="text-sm text-gray-400">
            We're searching for an opponent in your bracket. The game will start automatically when a match is found.
          </p>
        </div>
      </Card>
    </div>
  );
}
