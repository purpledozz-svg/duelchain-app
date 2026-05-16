interface PromotionModalProps {
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  color: 'w' | 'b';
}

export default function PromotionModal({ onSelect, color }: PromotionModalProps) {
  const pieces: Array<{ value: 'q' | 'r' | 'b' | 'n'; label: string; symbol: string }> = [
    { value: 'q', label: 'Queen', symbol: color === 'w' ? '♕' : '♛' },
    { value: 'r', label: 'Rook', symbol: color === 'w' ? '♖' : '♜' },
    { value: 'b', label: 'Bishop', symbol: color === 'w' ? '♗' : '♝' },
    { value: 'n', label: 'Knight', symbol: color === 'w' ? '♘' : '♞' }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 shadow-2xl border border-[#F0B429]/30">
        <h2 className="text-2xl font-bold text-center mb-6 text-[#F0B429]">
          Promote Your Pawn
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {pieces.map((piece) => (
            <button
              key={piece.value}
              onClick={() => onSelect(piece.value)}
              className="group relative bg-white/5 hover:bg-[#F0B429]/20 rounded-lg p-6 transition-all hover:scale-105 hover:shadow-xl border border-white/10 hover:border-[#F0B429]"
            >
              <div className="text-6xl text-center mb-2 group-hover:scale-110 transition-transform">
                {piece.symbol}
              </div>
              <div className="text-sm text-center text-gray-400 group-hover:text-[#F0B429]">
                {piece.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
