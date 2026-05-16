import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Flag, RotateCcw, Users, Wifi, WifiOff } from 'lucide-react';
import { Chess } from 'chess.js';
import ChessBoard from '../../games/chess/ChessBoard';
import PromotionModal from '../../games/chess/PromotionModal';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { partyService, PartyRoom } from '../../lib/partyService';

export default function PartyChess() {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const [party, setParty] = useState<PartyRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chess] = useState(() => new Chess());
  const [playerRole, setPlayerRole] = useState<'w' | 'b' | null>(null);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: string;
    to: string;
  } | null>(null);

  const playerId = `player-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    if (!code) {
      navigate('/lobby');
      return;
    }

    const initParty = async () => {
      try {
        const partyData = await partyService.getParty(code);
        if (!partyData) {
          setError('Party not found');
          setLoading(false);
          return;
        }

        setParty(partyData);
        chess.load(partyData.game_state.fen);

        const role = partyData.white_player_id === playerId ? 'w' : 'b';
        setPlayerRole(role);

        setLoading(false);

        const unsubscribe = partyService.subscribeToParty(code, (updatedParty) => {
          setParty(updatedParty);
          chess.load(updatedParty.game_state.fen);
        });

        return () => unsubscribe();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load party');
        setLoading(false);
      }
    };

    initParty();

    return () => {
      partyService.unsubscribe();
    };
  }, [code]);

  const handleMove = useCallback(
    async (from: string, to: string) => {
      if (!party || !code || !playerRole) return;

      if (party.game_state.turn !== playerRole) {
        console.log('Not your turn');
        return;
      }

      if (party.game_state.result) {
        console.log('Game is over');
        return;
      }

      const piece = chess.get(from as any);
      if (
        piece?.type === 'p' &&
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'))
      ) {
        setPendingPromotion({ from, to });
        return;
      }

      try {
        const move = chess.move({ from: from as any, to: to as any });
        if (!move) return;

        const newGameState = {
          fen: chess.fen(),
          moves: [
            ...party.game_state.moves,
            { san: move.san, from: move.from, to: move.to },
          ],
          turn: chess.turn(),
          result: getGameResult(),
        };

        await partyService.updateGameState(code, newGameState);
      } catch (err) {
        console.error('Invalid move:', err);
        chess.load(party.game_state.fen);
      }
    },
    [party, code, playerRole, chess]
  );

  const handlePromotion = useCallback(
    async (piece: 'q' | 'r' | 'b' | 'n') => {
      if (!pendingPromotion || !party || !code) return;

      try {
        const move = chess.move({
          from: pendingPromotion.from as any,
          to: pendingPromotion.to as any,
          promotion: piece,
        });

        if (!move) return;

        const newGameState = {
          fen: chess.fen(),
          moves: [
            ...party.game_state.moves,
            { san: move.san, from: move.from, to: move.to },
          ],
          turn: chess.turn(),
          result: getGameResult(),
        };

        await partyService.updateGameState(code, newGameState);
        setPendingPromotion(null);
      } catch (err) {
        console.error('Invalid promotion:', err);
        chess.load(party.game_state.fen);
        setPendingPromotion(null);
      }
    },
    [pendingPromotion, party, code, chess]
  );

  const getGameResult = () => {
    if (chess.isCheckmate()) {
      const winner = chess.turn() === 'w' ? 'b' : 'w';
      return { type: 'checkmate' as const, winner };
    }
    if (chess.isStalemate()) {
      return { type: 'stalemate' as const };
    }
    if (chess.isDraw()) {
      return { type: 'draw' as const };
    }
    return null;
  };

  const handleResign = async () => {
    if (!code || !playerRole) return;
    try {
      await partyService.resignGame(code, playerRole);
      setShowResignConfirm(false);
    } catch (err) {
      console.error('Failed to resign:', err);
    }
  };

  const getStatusMessage = () => {
    if (!party) return '';

    const result = party.game_state.result;
    if (result) {
      if (result.type === 'checkmate') {
        const winner = result.winner === 'w' ? 'White' : 'Black';
        return `Checkmate! ${winner} wins!`;
      }
      if (result.type === 'stalemate') return 'Stalemate!';
      if (result.type === 'draw') return 'Draw!';
      if (result.type === 'resign') {
        const winner = result.winner === 'w' ? 'White' : 'Black';
        return `${winner} wins by resignation!`;
      }
    }

    if (chess.isCheck()) return 'Check!';

    const turn = party.game_state.turn === 'w' ? 'White' : 'Black';
    const isYourTurn = party.game_state.turn === playerRole;
    return `${turn}'s turn ${isYourTurn ? '(You)' : ''}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <Card className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F0B429] mx-auto mb-4"></div>
            <p className="text-gray-400">Loading game...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !party) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center p-6">
        <Card className="p-8 max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-red-500">Error</h2>
          <p className="text-gray-400 mb-6">{error || 'Party not found'}</p>
          <Button onClick={() => navigate('/lobby')} className="w-full">
            Back to Lobby
          </Button>
        </Card>
      </div>
    );
  }

  const isGameOver = party.game_state.result !== null;
  const isCheck = chess.isCheck() && !isGameOver;

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
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold">Multiplayer Chess</h1>
                  <p className="text-sm text-gray-400">
                    Party Code: <span className="font-mono text-[#F0B429]">{code}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded">
                    {party.white_connected ? (
                      <Wifi className="w-4 h-4 text-green-400" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-sm">White</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 rounded">
                    {party.black_connected ? (
                      <Wifi className="w-4 h-4 text-green-400" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-sm">Black</span>
                  </div>
                </div>
              </div>

              <div className="text-center mb-6">
                <p
                  className={`text-xl font-semibold ${
                    isCheck
                      ? 'text-red-500 animate-pulse'
                      : isGameOver
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }`}
                >
                  {getStatusMessage()}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  You are playing as {playerRole === 'w' ? 'White' : 'Black'}
                </p>
              </div>

              <ChessBoard fen={party.game_state.fen} onMove={handleMove} />

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
                {isGameOver && (
                  <Button
                    variant="primary"
                    onClick={() => navigate('/lobby')}
                    className="flex items-center gap-2"
                  >
                    Back to Lobby
                  </Button>
                )}
              </div>
            </Card>
          </div>

          <div>
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Move History</h2>
              <div className="max-h-[600px] overflow-y-auto">
                {party.game_state.moves.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No moves yet</p>
                ) : (
                  <div className="space-y-2">
                    {party.game_state.moves.map((move, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 bg-gray-800/50 rounded"
                      >
                        <span className="text-gray-400 font-mono text-sm w-8">
                          {Math.floor(index / 2) + 1}.
                        </span>
                        <span className="font-semibold">{move.san}</span>
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
              Are you sure you want to resign? Your opponent will win the game.
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
