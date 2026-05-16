import { useState } from 'react';
import { BET_BRACKETS, BetBracket } from '../../hooks/useMatchmaking';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface BracketSelectorProps {
  onSelectBracket: (bracket: BetBracket, amount: number) => void;
  onBack: () => void;
  ethPrice?: number;
}

export default function BracketSelector({
  onSelectBracket,
  onBack,
  ethPrice = 3280
}: BracketSelectorProps) {
  const [selectedBracket, setSelectedBracket] = useState<BetBracket>('standard');
  const [customAmount, setCustomAmount] = useState<string>('0.05');

  const handleSubmit = () => {
    const amount = parseFloat(customAmount);
    if (amount > 0 && amount <= BET_BRACKETS.find(b => b.id === selectedBracket)!.maxBet) {
      onSelectBracket(selectedBracket, amount);
    }
  };

  const selectedBracketInfo = BET_BRACKETS.find(b => b.id === selectedBracket)!;
  const usdValue = (parseFloat(customAmount) * ethPrice).toFixed(2);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
      </div>

      <Card className="p-8">
        <h2 className="text-2xl font-bold text-center mb-2">How much are you willing to risk?</h2>
        <p className="text-gray-400 text-center mb-6">Choose your maximum bet:</p>

        <div className="space-y-3 mb-6">
          {BET_BRACKETS.map((bracket) => (
            <button
              key={bracket.id}
              onClick={() => {
                setSelectedBracket(bracket.id);
                setCustomAmount(bracket.maxBet.toString());
              }}
              className={`
                w-full p-4 rounded-lg transition-all text-left
                ${selectedBracket === bracket.id
                  ? 'bg-[#F0B429]/20 border-2 border-[#F0B429]'
                  : 'bg-white/5 border-2 border-transparent hover:border-white/20'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center
                    ${selectedBracket === bracket.id ? 'border-[#F0B429]' : 'border-gray-600'}
                  `}>
                    {selectedBracket === bracket.id && (
                      <div className="w-3 h-3 rounded-full bg-[#F0B429]" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">{bracket.label}</div>
                    <div className="text-sm text-gray-400">
                      Up to Ξ{bracket.maxBet} {bracket.usdValue}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  {bracket.queueCount} in queue
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="border-t border-white/10 pt-6">
          <label className="block text-sm font-medium mb-2">
            Your exact bet:
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              step="0.001"
              min="0.001"
              max={selectedBracketInfo.maxBet}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F0B429]"
              placeholder="0.05"
            />
            <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 flex items-center">
              ETH
            </div>
          </div>
          <div className="text-sm text-gray-400 mb-6">
            = ${usdValue}
          </div>

          <Button
            onClick={handleSubmit}
            variant="primary"
            className="w-full"
            disabled={!customAmount || parseFloat(customAmount) <= 0 || parseFloat(customAmount) > selectedBracketInfo.maxBet}
          >
            Find Opponent
          </Button>
        </div>
      </Card>
    </div>
  );
}
