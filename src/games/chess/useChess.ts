import { useState, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';

export type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw';

export interface Move {
  san: string;
  from: string;
  to: string;
  fen: string;
}

export const useChess = () => {
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [status, setStatus] = useState<GameStatus>('playing');
  const [moves, setMoves] = useState<Move[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: string;
    to: string;
  } | null>(null);

  const updateGameState = useCallback(() => {
    const game = gameRef.current;
    setFen(game.fen());
    setTurn(game.turn());

    if (game.isCheckmate()) {
      setStatus('checkmate');
    } else if (game.isStalemate()) {
      setStatus('stalemate');
    } else if (game.isDraw()) {
      setStatus('draw');
    } else if (game.isCheck()) {
      setStatus('check');
    } else {
      setStatus('playing');
    }

    const history = game.history({ verbose: true });
    const moveList: Move[] = history.map((move) => ({
      san: move.san,
      from: move.from,
      to: move.to,
      fen: game.fen(),
    }));
    setMoves(moveList);
  }, []);

  const makeMove = useCallback(
    (
      from: string,
      to: string,
      promotion?: 'q' | 'r' | 'b' | 'n'
    ): { ok: boolean; needsPromotion?: boolean } => {
      const game = gameRef.current;

      const piece = game.get(from as any);
      if (
        !promotion &&
        piece?.type === 'p' &&
        ((piece.color === 'w' && to[1] === '8') ||
          (piece.color === 'b' && to[1] === '1'))
      ) {
        setPendingPromotion({ from, to });
        return { ok: false, needsPromotion: true };
      }

      try {
        const result = game.move({
          from: from as any,
          to: to as any,
          promotion: promotion as any,
        });

        if (result) {
          updateGameState();
          setPendingPromotion(null);
          return { ok: true };
        }
      } catch (error) {
        console.error('Invalid move:', error);
      }

      return { ok: false };
    },
    [updateGameState]
  );

  const reset = useCallback(() => {
    gameRef.current.reset();
    setFen(gameRef.current.fen());
    setTurn('w');
    setStatus('playing');
    setMoves([]);
    setPendingPromotion(null);
  }, []);

  const resign = useCallback((who: 'w' | 'b') => {
    setStatus('checkmate');
    console.log(`${who === 'w' ? 'White' : 'Black'} resigned`);
  }, []);

  return {
    fen,
    turn,
    status,
    moves,
    pendingPromotion,
    makeMove,
    reset,
    resign,
  };
};
