import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Flag, RotateCcw } from 'lucide-react';
import { useChess } from '../../games/chess/useChess';
import ChessBoard from '../../games/chess/ChessBoard';
import PromotionModal from '../../games/chess/PromotionModal';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useState } from 'react';

export default function Chess() {
  const navigate = useNavigate();
  const {
    fen,
    turn,
    status,
    moves,
    pendingPromotion,
    makeMove,
    reset,
    resign,
  } = useChess();

  const [showResignConfirm, setShowResignConfirm] = useState(false);

  const handleMove = (from: string, to: string) => {
    const result = makeMove(from, to);
    if (!result.ok && !result.needsPromotion) {
      console.log('Invalid move');
    }
  };

  const handlePromotion = (piece: 'q' | 'r' | 'b' | 'n') => {
    if (pendingPromotion) {
      makeMove(pendingPromotion.from, pendingPromotion.to, piece);
    }
  };

  const handleResign = () => {
    resign(turn);
    setShowResignConfirm(false);
  };

  const getStatusMessage = () => {
    if (status === 'checkmate') {
      const winner = turn === 'w' ? 'Black' : 'White';
      return `Checkmate! ${winner} wins!`;
    }
    if (status === 'stalemate') return 'Stalemate!';
    if (status === 'draw') return 'Draw!';
    if (status === 'check') return 'Check!';
    return `${turn === 'w' ? 'White' : 'Black'}'s turn`;
  };

  const isGameOver = status === 'checkmate' || status === 'stalemate' || status === 'draw';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/lobby')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Lobby
        </Button>

        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          <div>
            <Card className="p-6">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold mb-4">Chess</h1>
                <p className={`text-xl font-semibold ${
                  status === 'check' ? 'text-red-500 animate-pulse' :
                  isGameOver ? 'text-yellow-400' : 'text-gray-300'
                }`}>
                  {getStatusMessage()}
                </p>
              </div>

              <ChessBoard fen={fen} onMove={handleMove} />

              <div className="mt-6 flex justify-center gap-4">
                {!isGameOver && (
                  <Button
                    variant="secondary"
                    onClick={() => setShowResignConfirm(true)}
                    className="flex items-center gap-2"
                  >
                    <Flag className="w-4 h-4" />
                    Resign
                  </Button>
                )}
                <Button
                  variant={isGameOver ? 'primary' : 'secondary'}
                  onClick={reset}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  {isGameOver ? 'Play Again' : 'Reset Game'}
                </Button>
              </div>
            </Card>
          </div>

          <div>
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Move History</h2>
              <div className="max-h-[600px] overflow-y-auto">
                {moves.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    No moves yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {moves.map((move, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 bg-gray-800/50 rounded"
                      >
                        <span className="text-gray-400 font-mono text-sm w-8">
                          {Math.floor(index / 2) + 1}.
                        </span>
                        <span className="font-semibold">
                          {move.san}
                        </span>
                        <span className="text-xs text-gray-500">
                          {move.from} → {move.to}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {pendingPromotion && (
        <PromotionModal onSelect={handlePromotion} />
      )}

      {showResignConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <Card className="p-6 max-w-md">
            <h2 className="text-2xl font-bold mb-4">Resign Game?</h2>
            <p className="text-gray-400 mb-6">
              Are you sure you want to resign? This will end the game and your opponent will win.
            </p>
            <div className="flex gap-4">
              <Button
                variant="primary"
                onClick={handleResign}
                className="flex-1"
              >
                Yes, Resign
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowResignConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
