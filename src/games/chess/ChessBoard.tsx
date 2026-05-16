import { Chessboard } from 'react-chessboard';

interface ChessBoardProps {
  fen: string;
  onMove: (from: string, to: string) => void;
}

export default function ChessBoard({ fen, onMove }: ChessBoardProps) {
  const handlePieceDrop = (
    sourceSquare: string,
    targetSquare: string
  ): boolean => {
    onMove(sourceSquare, targetSquare);
    return true;
  };

  return (
    <div className="w-full max-w-[600px] mx-auto">
      <Chessboard
        position={fen}
        onPieceDrop={handlePieceDrop}
        customDarkSquareStyle={{ backgroundColor: '#2A2A3A' }}
        customLightSquareStyle={{ backgroundColor: '#4A4A5A' }}
        customBoardStyle={{
          borderRadius: '8px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        }}
      />
    </div>
  );
}
