import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, RotateCcw, Swords } from 'lucide-react';
import { createBoard, applyMove, getStatus, getAiMove, type Board, type Cell } from '../../games/tictactoe/engine';

const PLAYER: Cell = 'X';
const AI: Cell = 'O';
type GamePhase = 'playing' | 'resolving' | 'finished';

const REVEAL_DELAY = 2000;
const DRAW_DELAY = 1500;

const WIN_LINE_STYLE: Record<number, React.CSSProperties> = {
  // rows
  0: { top: '16.5%', left: '5%', width: '90%', height: '2px' },
  1: { top: '49.5%', left: '5%', width: '90%', height: '2px' },
  2: { top: '82.5%', left: '5%', width: '90%', height: '2px' },
  // cols
  3: { top: '5%', left: '16.5%', width: '2px', height: '90%' },
  4: { top: '5%', left: '49.5%', width: '2px', height: '90%' },
  5: { top: '5%', left: '82.5%', width: '2px', height: '90%' },
  // diag
  6: { top: '50%', left: '50%', width: '126%', height: '2px', transform: 'translate(-50%, -50%) rotate(45deg)' },
  7: { top: '50%', left: '50%', width: '126%', height: '2px', transform: 'translate(-50%, -50%) rotate(-45deg)' },
};

const WIN_LINES_IDX = [
  [0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6],
] as const;

function getLineIndex(winLine: number[]): number {
  return WIN_LINES_IDX.findIndex(l => l.every((v,i) => v === winLine[i]));
}

export const TicTacToe = () => {
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board>(createBoard());
  const [gameStatus, setGameStatus] = useState<'playing' | 'win' | 'draw'>('playing');
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [lastMover, setLastMover] = useState<Cell>(null);
  const [isAiTurn, setIsAiTurn] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  // Resolve → finished transition
  useEffect(() => {
    if (phase !== 'resolving') return;
    const delay = gameStatus === 'draw' ? DRAW_DELAY : REVEAL_DELAY;
    const t = setTimeout(() => setPhase('finished'), delay);
    return () => clearTimeout(t);
  }, [phase, gameStatus]);

  useEffect(() => {
    if (!isAiTurn || gameStatus !== 'playing') return;
    const t = setTimeout(() => {
      const idx = getAiMove(board, 'O', 'X');
      const next = applyMove(board, idx, AI)!;
      const { status, winLine: wl } = getStatus(next, AI);
      setBoard(next);
      setMoveCount(c => c + 1);
      setLastMover(AI);
      setGameStatus(status);
      if (status !== 'playing') {
        if (wl) setWinLine(wl);
        setPhase('resolving');
      }
      setIsAiTurn(false);
    }, 380);
    return () => clearTimeout(t);
  }, [isAiTurn, board, gameStatus]);

  const handleClick = (idx: number) => {
    if (phase !== 'playing' || board[idx] !== null || isAiTurn) return;
    const next = applyMove(board, idx, PLAYER);
    if (!next) return;
    const { status, winLine: wl } = getStatus(next, PLAYER);
    setBoard(next);
    setMoveCount(c => c + 1);
    setLastMover(PLAYER);
    setGameStatus(status);
    if (status !== 'playing') {
      if (wl) setWinLine(wl);
      setPhase('resolving');
      return;
    }
    setIsAiTurn(true);
  };

  const reset = () => {
    setBoard(createBoard());
    setGameStatus('playing');
    setPhase('playing');
    setWinLine(null);
    setLastMover(null);
    setIsAiTurn(false);
    setMoveCount(0);
  };

  const playerWon = gameStatus === 'win' && lastMover === PLAYER;
  const aiWon = gameStatus === 'win' && lastMover === AI;
  const lineIdx = winLine ? getLineIndex(winLine) : -1;
  const winColor = playerWon ? '#FF267A' : '#38F5B3';

  const isLocked = phase !== 'playing';
  const isResolving = phase === 'resolving';
  const isFinished = phase === 'finished';

  const cellSymbol = (cell: Cell, cellIdx: number) => {
    const isWinCell = winLine?.includes(cellIdx) ?? false;
    if (cell === 'X') return (
      <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="font-heading font-black text-5xl sm:text-6xl select-none"
        style={{
          color: '#FF267A',
          textShadow: isWinCell && isResolving
            ? '0 0 30px #FF267A, 0 0 60px #FF267A88'
            : '0 0 20px #FF267A88',
          filter: isResolving && !isWinCell ? 'brightness(0.4)' : 'brightness(1)',
          transition: 'filter 0.3s ease',
        }}>
        X
      </motion.div>
    );
    if (cell === 'O') return (
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="font-heading font-black text-5xl sm:text-6xl select-none"
        style={{
          color: '#38F5B3',
          textShadow: isWinCell && isResolving
            ? '0 0 30px #38F5B3, 0 0 60px #38F5B388'
            : '0 0 20px #38F5B388',
          filter: isResolving && !isWinCell ? 'brightness(0.4)' : 'brightness(1)',
          transition: 'filter 0.3s ease',
        }}>
        O
      </motion.div>
    );
    return null;
  };

  return (
    <div className="min-h-screen bg-[#050609] text-white pt-20 pb-24 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full blur-[100px] opacity-15"
          style={{ background: '#FF267A' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-[100px] opacity-12"
          style={{ background: '#38F5B3' }} />
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/lobby')}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-mono">
            <ArrowLeft size={16} /> Back to Lobby
          </button>
          <div className="text-center">
            <p className="text-[11px] font-heading text-[#FF267A] uppercase tracking-[0.3em]">DUELCHAIN</p>
            <h1 className="text-3xl font-heading font-bold">Tic-Tac-Toe</h1>
          </div>
          <button onClick={reset}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-mono">
            <RotateCcw size={15} /> Reset
          </button>
        </div>

        {/* Turn / status indicator */}
        <div className="text-center mb-6 h-8">
          {!isLocked && (
            <motion.div key={isAiTurn ? 'ai' : 'you'} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: isAiTurn ? '#38F5B3' : '#FF267A' }} />
              <span className="font-mono text-sm text-white/60">
                {isAiTurn ? 'Opponent thinking…' : 'Your turn (X)'}
              </span>
            </motion.div>
          )}
          {isResolving && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full"
                style={{ background: gameStatus === 'draw' ? 'rgba(255,255,255,0.4)' : winColor, boxShadow: `0 0 8px ${winColor}` }} />
              <span className="font-mono text-sm" style={{ color: gameStatus === 'draw' ? 'rgba(255,255,255,0.5)' : winColor }}>
                {gameStatus === 'draw' ? 'Draw!' : playerWon ? 'You got three in a row!' : 'Opponent got three in a row!'}
              </span>
            </motion.div>
          )}
        </div>

        {/* Board */}
        <div className="flex justify-center mb-8">
          <div className="relative" style={{ width: 'min(360px, 90vw)', aspectRatio: '1' }}>
            {/* Grid lines */}
            <div className="absolute inset-0">
              <div className="absolute inset-y-4" style={{ left: '33.33%', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <div className="absolute inset-y-4" style={{ left: '66.66%', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <div className="absolute inset-x-4" style={{ top: '33.33%', height: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <div className="absolute inset-x-4" style={{ top: '66.66%', height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            </div>

            {/* Win line overlay */}
            <AnimatePresence>
              {winLine && lineIdx >= 0 && (isResolving || isFinished) && (
                <motion.div
                  key="win-line"
                  initial={{ scaleX: 0, scaleY: 0, opacity: 0 }}
                  animate={{ scaleX: 1, scaleY: 1, opacity: isFinished ? 0.6 : 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="absolute rounded-full"
                  style={{
                    ...WIN_LINE_STYLE[lineIdx],
                    background: winColor,
                    boxShadow: `0 0 18px ${winColor}, 0 0 36px ${winColor}66`,
                    transformOrigin: 'center',
                  }}
                />
              )}
            </AnimatePresence>

            {/* Cells */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
              {board.map((cell, i) => (
                <button
                  key={i}
                  onClick={() => handleClick(i)}
                  disabled={isLocked || cell !== null || isAiTurn}
                  className="flex items-center justify-center transition-all relative group"
                  style={{ cursor: isLocked || cell !== null || isAiTurn ? 'default' : 'pointer' }}
                >
                  {!cell && !isLocked && !isAiTurn && (
                    <div className="absolute inset-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(255,38,122,0.06)', border: '1px solid rgba(255,38,122,0.15)' }} />
                  )}
                  {cellSymbol(cell, i)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result (shown after delay) */}
        <AnimatePresence>
          {isFinished && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="rounded-2xl p-8 text-center mb-8"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${playerWon ? 'rgba(255,38,122,0.4)' : aiWon ? 'rgba(56,245,179,0.3)' : 'rgba(255,255,255,0.1)'}`,
                boxShadow: playerWon ? '0 0 40px rgba(255,38,122,0.15)' : aiWon ? '0 0 40px rgba(56,245,179,0.1)' : 'none',
              }}
            >
              {playerWon && <>
                <Trophy size={44} className="mx-auto mb-3" style={{ color: '#FF267A' }} strokeWidth={1.5} />
                <h2 className="text-4xl font-heading font-bold mb-1" style={{ color: '#FF267A' }}>Victory</h2>
                <p className="text-white/40 font-mono text-sm">You got three in a row.</p>
              </>}
              {aiWon && <>
                <Swords size={44} className="mx-auto mb-3 text-white/30" strokeWidth={1.5} />
                <h2 className="text-4xl font-heading font-bold mb-1 text-white/50">Defeat</h2>
                <p className="text-white/40 font-mono text-sm">Opponent got three in a row.</p>
              </>}
              {gameStatus === 'draw' && <>
                <Swords size={44} className="mx-auto mb-3 text-white/30" strokeWidth={1.5} />
                <h2 className="text-4xl font-heading font-bold mb-1 text-white/50">Draw</h2>
                <p className="text-white/40 font-mono text-sm">All squares filled, no winner.</p>
              </>}
              <div className="flex justify-center gap-4 mt-7">
                <button onClick={reset}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-heading font-semibold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #B026FF, #FF267A)', boxShadow: '0 8px 24px rgba(176,38,255,0.35)' }}>
                  <RotateCcw size={14} /> Play Again
                </button>
                <button onClick={() => navigate('/lobby')}
                  className="px-6 py-3 rounded-xl font-heading font-semibold text-sm text-white/60 hover:text-white transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
                  Back to Lobby
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rules */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-[10px] font-heading uppercase tracking-[0.28em] text-white/35 mb-3">Rules</h3>
          <ul className="text-sm font-mono text-white/45 space-y-1.5">
            <li>You are X (pink). Opponent is O (teal). X always goes first.</li>
            <li>Click any empty cell to place your mark.</li>
            <li>First to get 3 in a row (horizontally, vertically, or diagonally) wins.</li>
            <li>If all 9 cells fill with no winner, the game is a Draw.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
