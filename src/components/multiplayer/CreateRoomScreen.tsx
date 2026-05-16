import { useState } from 'react';
import { Copy, Link as LinkIcon, Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface CreateRoomScreenProps {
  roomCode: string;
  game: string;
  betAmount: number;
  currency: string;
  usdValue: string;
  onCancel: () => void;
}

export default function CreateRoomScreen({
  roomCode,
  game,
  betAmount,
  currency,
  usdValue,
  onCancel
}: CreateRoomScreenProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/join/${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-6">YOUR GAME CODE</h2>

        <div className="bg-gradient-to-br from-[#F0B429]/20 to-[#D4A017]/20 border-2 border-[#F0B429] rounded-xl p-8 mb-6">
          <div className="text-5xl font-bold tracking-widest text-[#F0B429] mb-2">
            {roomCode}
          </div>
        </div>

        <div className="text-left bg-white/5 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Game:</span>
            <span className="font-semibold">{game}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Your bet:</span>
            <span className="font-semibold">
              {currency === 'ETH' ? 'Ξ' : '$'} {betAmount} ({usdValue})
            </span>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            onClick={handleCopyCode}
            variant="secondary"
            className="flex-1"
          >
            <Copy className="w-4 h-4 mr-2" />
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
          <Button
            onClick={handleCopyLink}
            variant="secondary"
            className="flex-1"
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
        </div>

        <div className="flex items-center justify-center gap-3 text-gray-400 mb-6">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Waiting for opponent...</span>
        </div>

        <Button
          onClick={onCancel}
          variant="ghost"
          className="w-full"
        >
          Cancel Game
        </Button>
      </Card>
    </div>
  );
}
