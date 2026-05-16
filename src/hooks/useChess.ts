import { useState, useCallback } from 'react';
import { Chess, Square } from 'chess.js';

export type GameStatus = 'playing' | 'checkmate' | 'stalemate' | 'draw' | 'resigned' | 'timeout';

export interface ChessMove {
  from: Square;
  to: Square;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export const useChess = (initialFen?: string) => {
  const [game] = useState(() => new Chess(initialFen));
  const [fen, setFen] = useState(game.fen());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [status, setStatus] = useState<GameStatus>('playing');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [showPromotion, setShowPromotion] = useState(false);
  const [promotionMove, setPromotionMove] = useState<{ from: Square; to: Square } | null>(null);

  const updateGameState = useCallback(() => {
    setFen(game.fen());
    setMoveHistory(game.history());

    if (game.isCheckmate()) {
      setStatus('checkmate');
    } else if (game.isStalemate()) {
      setStatus('stalemate');
    } else if (game.isDraw()) {
      setStatus('draw');
    }
  }, [game]);

  const makeMove = useCallback((move: ChessMove): boolean => {
    try {
      const result = game.move(move);
      if (result) {
        setLastMove({ from: move.from, to: move.to });
        setSelectedSquare(null);
        setPossibleMoves([]);
        updateGameState();
        return true;
      }
    } catch (e) {
      console.error('Invalid move:', e);
    }
    return false;
  }, [game, updateGameState]);

  const onSquareClick = useCallback((square: Square) => {
    if (status !== 'playing') return;

    const piece = game.get(square);

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }

      const move = { from: selectedSquare, to: square };
      const movingPiece = game.get(selectedSquare);

      if (
        movingPiece?.type === 'p' &&
        ((movingPiece.color === 'w' && square[1] === '8') ||
         (movingPiece.color === 'b' && square[1] === '1'))
      ) {
        setPromotionMove(move);
        setShowPromotion(true);
        return;
      }

      const success = makeMove(move);
      if (!success && piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        const moves = game.moves({ square, verbose: true });
        setPossibleMoves(moves.map(m => m.to));
      }
    } else {
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        const moves = game.moves({ square, verbose: true });
        setPossibleMoves(moves.map(m => m.to));
      }
    }
  }, [game, selectedSquare, status, makeMove]);

  const handlePromotion = useCallback((piece: 'q' | 'r' | 'b' | 'n') => {
    if (promotionMove) {
      makeMove({ ...promotionMove, promotion: piece });
      setShowPromotion(false);
      setPromotionMove(null);
    }
  }, [promotionMove, makeMove]);

  const resign = useCallback(() => {
    setStatus('resigned');
  }, []);

  const timeout = useCallback(() => {
    setStatus('timeout');
  }, []);

  const resetGame = useCallback(() => {
    game.reset();
    setFen(game.fen());
    setSelectedSquare(null);
    setPossibleMoves([]);
    setLastMove(null);
    setStatus('playing');
    setMoveHistory([]);
  }, [game]);

  const loadFen = useCallback((newFen: string) => {
    try {
      game.load(newFen);
      updateGameState();
      setLastMove(null);
    } catch (e) {
      console.error('Invalid FEN:', e);
    }
  }, [game, updateGameState]);

  return {
    fen,
    game,
    selectedSquare,
    possibleMoves,
    lastMove,
    status,
    moveHistory,
    showPromotion,
    currentTurn: game.turn(),
    isCheck: game.isCheck(),
    isGameOver: game.isGameOver(),
    winner: status === 'checkmate' ? (game.turn() === 'w' ? 'black' : 'white') : null,
    onSquareClick,
    makeMove,
    handlePromotion,
    resign,
    timeout,
    resetGame,
    loadFen
  };
};
