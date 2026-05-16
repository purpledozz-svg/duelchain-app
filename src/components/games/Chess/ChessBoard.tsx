import { Chessboard } from 'react-chessboard';
import { Square } from 'chess.js';

interface ChessBoardProps {
  position: string;
  onSquareClick?: (square: Square) => void;
  onPieceDrop?: (sourceSquare: Square, targetSquare: Square) => boolean;
  selectedSquare: Square | null;
  possibleMoves: Square[];
  lastMove: { from: Square; to: Square } | null;
  isCheck: boolean;
  boardOrientation?: 'white' | 'black';
  disabled?: boolean;
}

export default function ChessBoardComponent({
  position,
  onSquareClick,
  onPieceDrop,
  selectedSquare,
  possibleMoves,
  lastMove,
  isCheck,
  boardOrientation = 'white',
  disabled = false
}: ChessBoardProps) {
  const customSquareStyles: Record<string, React.CSSProperties> = {};

  if (selectedSquare) {
    customSquareStyles[selectedSquare] = {
      background: 'rgba(240, 180, 41, 0.4)',
      border: '2px solid #F0B429'
    };
  }

  possibleMoves.forEach(square => {
    customSquareStyles[square] = {
      background: 'radial-gradient(circle, rgba(240, 180, 41, 0.5) 25%, transparent 25%)',
      borderRadius: '50%'
    };
  });

  if (lastMove) {
    customSquareStyles[lastMove.from] = {
      background: 'rgba(240, 180, 41, 0.2)'
    };
    customSquareStyles[lastMove.to] = {
      background: 'rgba(240, 180, 41, 0.3)'
    };
  }

  return (
    <div className="relative">
      <Chessboard
        position={position}
        onPieceDrop={onPieceDrop}
        onSquareClick={onSquareClick}
        boardOrientation={boardOrientation}
        customSquareStyles={customSquareStyles}
        customBoardStyle={{
          borderRadius: '8px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
        }}
        customDarkSquareStyle={{ backgroundColor: '#2A2A3A' }}
        customLightSquareStyle={{ backgroundColor: '#4A4A5A' }}
        arePiecesDraggable={!disabled}
        isDraggablePiece={() => !disabled}
      />
      {isCheck && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="text-6xl font-bold text-red-500 animate-pulse drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]">
            CHECK!
          </div>
        </div>
      )}
    </div>
  );
}
