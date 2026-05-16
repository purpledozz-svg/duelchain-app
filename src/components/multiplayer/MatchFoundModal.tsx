import { Trophy } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BetSummary } from '../../hooks/useRoom';

interface MatchFoundModalProps {
  opponent: string;
  betSummary: BetSummary;
  onConfirm: () => void;
  countdown?: number;
}

export default function MatchFoundModal({
  opponent,
  betSummary,
  onConfirm,
  countdown = 3
}: MatchFoundModalProps) {
  const currencySymbol = betSummary.currency === 'ETH' ? 'Ξ' : '$';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
      <Card className="p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[#F0B429] to-[#D4A017] rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Match Found!</h2>
          <p className="text-gray-400">
            Opponent: <span className="text-white font-mono">{opponent}</span>
          </p>
        </div>

        <div className="bg-white/5 rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-4 text-center text-[#F0B429]">BET SUMMARY</h3>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Your bet:</span>
              <span className="font-semibold">{currencySymbol} {betSummary.yourBet.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Opponent:</span>
              <span className="font-semibold">{currencySymbol} {betSummary.opponentBet.toFixed(3)}</span>
            </div>

            <div className="border-t border-white/10 pt-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Total pot:</span>
                <span className="font-semibold">{currencySymbol} {betSummary.totalPot.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Platform fee (5%):</span>
                <span className="text-gray-400">{currencySymbol} {betSummary.platformFee.toFixed(3)}</span>
              </div>
            </div>

            <div className="border-t border-white/10 pt-3">
              <div className="flex justify-between text-green-400">
                <span>If you win:</span>
                <span className="font-bold">+ {currencySymbol} {betSummary.potentialWin.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>If you lose:</span>
                <span className="font-bold">- {currencySymbol} {betSummary.potentialLoss.toFixed(3)}</span>
              </div>
            </div>
          </div>
        </div>

        {countdown > 0 ? (
          <div className="text-center">
            <p className="text-gray-400 mb-4">Starting in...</p>
            <div className="text-5xl font-bold text-[#F0B429] animate-pulse">
              {countdown}
            </div>
          </div>
        ) : (
          <Button
            onClick={onConfirm}
            variant="primary"
            className="w-full"
          >
            Start Game
          </Button>
        )}
      </Card>
    </div>
  );
}
