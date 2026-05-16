import { Info } from 'lucide-react';

interface FairBetNoticeProps {
  originalBet: number;
  adjustedBet: number;
  refundAmount: number;
  currency: string;
}

export default function FairBetNotice({
  originalBet,
  adjustedBet,
  refundAmount,
  currency
}: FairBetNoticeProps) {
  if (refundAmount <= 0) return null;

  const currencySymbol = currency === 'ETH' ? 'Ξ' : '$';

  return (
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
      <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="font-semibold text-blue-400 mb-1">Bet Adjusted for Fair Play</h4>
        <p className="text-sm text-gray-300">
          Your bet has been adjusted from{' '}
          <span className="font-semibold">{currencySymbol} {originalBet.toFixed(3)}</span> to{' '}
          <span className="font-semibold">{currencySymbol} {adjustedBet.toFixed(3)}</span> to match your opponent's lower bet.
        </p>
        <p className="text-sm text-green-400 mt-1">
          {currencySymbol} {refundAmount.toFixed(3)} returned to your wallet immediately.
        </p>
      </div>
    </div>
  );
}
