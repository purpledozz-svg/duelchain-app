import { Card } from '../../components/ui/Card';

interface PromotionModalProps {
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
}

export default function PromotionModal({ onSelect }: PromotionModalProps) {
  const pieces = [
    { type: 'q', name: 'Queen', symbol: '♕' },
    { type: 'r', name: 'Rook', symbol: '♖' },
    { type: 'b', name: 'Bishop', symbol: '♗' },
    { type: 'n', name: 'Knight', symbol: '♘' },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <Card className="p-6 max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Choose Promotion Piece
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {pieces.map(({ type, name, symbol }) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="flex flex-col items-center gap-2 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border-2 border-transparent hover:border-[#F0B429]"
            >
              <span className="text-6xl">{symbol}</span>
              <span className="text-sm font-medium">{name}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
