import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, RotateCcw, Swords, ChevronDown } from 'lucide-react';

// ── Pure game engine ──────────────────────────────────────────────────────────

const ROWS = 6;
const COLS = 7;
type Cell = null | 'P1' | 'P2';
type Board = Cell[][];
type GamePhase = 'playing' | 'resolving' | 'finished';

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

const LINES: Array<Array<[number, number]>> = [];
// horizontal
for (let r = 0; r < ROWS; r++)
  for (let c = 0; c <= COLS - 4; c++)
    LINES.push([[r,c],[r,c+1],[r,c+2],[r,c+3]]);
// vertical
for (let c = 0; c < COLS; c++)
  for (let r = 0; r <= ROWS - 4; r++)
    LINES.push([[r,c],[r+1,c],[r+2,c],[r+3,c]]);
// diag ↘
for (let r = 0; r <= ROWS - 4; r++)
  for (let c = 0; c <= COLS - 4; c++)
    LINES.push([[r,c],[r+1,c+1],[r+2,c+2],[r+3,c+3]]);
// diag ↗
for (let r = 3; r < ROWS; r++)
  for (let c = 0; c <= COLS - 4; c++)
    LINES.push([[r,c],[r-1,c+1],[r-2,c+2],[r-3,c+3]]);

function checkWinner(board: Board): { winner: 'P1' | 'P2' | 'draw' | null; line: Array<[number,number]> | null } {
  for (const line of LINES) {
    const vals = line.map(([r,c]) => board[r][c]);
    if (vals[0] && vals.every(v => v === vals[0])) {
      return { winner: vals[0] as 'P1'|'P2', line };
    }
  }
  if (board.every(row => row.every(c => c !== null))) return { winner: 'draw', line: null };
  return { winner: null, line: null };
}

function dropDisc(board: Board, col: number, player: 'P1' | 'P2'): { board: Board; row: number } | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === null) {
      const next = board.map(row => [...row]);
      next[r][col] = player;
      return { board: next, row: r };
    }
  }
  return null; // column full
}

// ── Component ─────────────────────────────────────────────────────────────────

const P1_COLOR = '#FF267A';
const P2_COLOR = '#38F5B3';
const REVEAL_DELAY = 2000;

function cellStyle(cell: Cell, isWin: boolean, isResolving: boolean): React.CSSProperties {
  if (cell === 'P1') return {
    background: isWin
      ? `radial-gradient(circle at 35% 35%, #ff6fa8, ${P1_COLOR})`
      : `radial-gradient(circle at 35% 35%, #ff6fa8, #c41960)`,
    boxShadow: isWin
      ? `0 0 24px ${P1_COLOR}, 0 0 48px ${P1_COLOR}99`
      : isResolving
        ? `0 2px 8px ${P1_COLOR}22, inset 0 1px 0 rgba(255,255,255,0.1)`
        : `0 4px 16px ${P1_COLOR}55, inset 0 1px 0 rgba(255,255,255,0.2)`,
    opacity: isResolving && !isWin ? 0.45 : 1,
    transition: 'all 0.3s ease',
  };
  if (cell === 'P2') return {
    background: isWin
      ? `radial-gradient(circle at 35% 35%, #6ffce2, ${P2_COLOR})`
      : `radial-gradient(circle at 35% 35%, #6ffce2, #20b58a)`,
    boxShadow: isWin
      ? `0 0 24px ${P2_COLOR}, 0 0 48px ${P2_COLOR}99`
      : isResolving
        ? `0 2px 8px ${P2_COLOR}22, inset 0 1px 0 rgba(255,255,255,0.1)`
        : `0 4px 16px ${P2_COLOR}55, inset 0 1px 0 rgba(255,255,255,0.2)`,
    opacity: isResolving && !isWin ? 0.45 : 1,
    transition: 'all 0.3s ease',
  };
  return {
    background: 'rgba(255,255,255,0.04)',
    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
    opacity: isResolving ? 0.35 : 1,
    transition: 'opacity 0.3s ease',
  };
}

export default function ConnectFour() {
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board>(emptyBoard());
  const [current, setCurrent] = useState<'P1' | 'P2'>('P1');
  const [winner, setWinner] = useState<'P1' | 'P2' | 'draw' | null>(null);
  const [winLine, setWinLine] = useState<Array<[number,number]> | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [phase, setPhase] = useState<GamePhase>('playing');

  // Transition resolving → finished after delay
  useEffect(() => {
    if (phase !== 'resolving') return;
    const t = setTimeout(() => setPhase('finished'), REVEAL_DELAY);
    return () => clearTimeout(t);
  }, [phase]);

  const isWinCell = useCallback((r: number, c: number) => {
    return winLine?.some(([wr, wc]) => wr === r && wc === c) ?? false;
  }, [winLine]);

  const handleColClick = useCallback((col: number) => {
    if (phase !== 'playing') return;
    const result = dropDisc(board, col, current);
    if (!result) return;

    const { winner: w, line } = checkWinner(result.board);
    setBoard(result.board);
    if (w) {
      setWinner(w);
      setWinLine(line);
      // draw has no line to highlight — shorter delay
      if (w === 'draw') {
        setTimeout(() => setPhase('finished'), 1500);
      } else {
        setPhase('resolving');
      }
    } else {
      setCurrent(current === 'P1' ? 'P2' : 'P1');
    }
  }, [board, current, phase]);

  const resetGame = () => {
    setBoard(emptyBoard());
    setCurrent('P1');
    setWinner(null);
    setWinLine(null);
    setHoverCol(null);
    setPhase('playing');
  };

  const playerLabel = (p: 'P1' | 'P2') => p === 'P1' ? 'Player 1' : 'Player 2';
  const playerColor = (p: 'P1' | 'P2') => p === 'P1' ? P1_COLOR : P2_COLOR;

  const isResolving = phase === 'resolving';
  const isFinished = phase === 'finished';
  const isLocked = phase !== 'playing';

  return (
    <div className="min-h-screen bg-[#050609] text-white pt-20 pb-24 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-20"
          style={{ background: P1_COLOR }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-[120px] opacity-15"
          style={{ background: P2_COLOR }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/lobby')}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-mono">
            <ArrowLeft size={16} /> Back to Lobby
          </button>
          <div className="text-center">
            <p className="text-[11px] font-heading text-[#FF267A] uppercase tracking-[0.3em]">DUELCHAIN ARENA</p>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Connect Four</h1>
          </div>
          <button onClick={resetGame}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-mono">
            <RotateCcw size={15} /> Reset
          </button>
        </div>

        {/* Score / turn banner */}
        <div className="flex items-center justify-center gap-6 mb-8">
          {(['P1','P2'] as const).map(p => (
            <div key={p}
              className="flex items-center gap-3 px-5 py-3 rounded-2xl transition-all"
              style={{
                background: !isLocked && current === p ? `${playerColor(p)}18` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${!isLocked && current === p ? playerColor(p) + '55' : 'rgba(255,255,255,0.07)'}`,
                boxShadow: !isLocked && current === p ? `0 0 20px ${playerColor(p)}22` : 'none',
              }}>
              <div className="w-5 h-5 rounded-full flex-shrink-0"
                style={{ background: playerColor(p), boxShadow: `0 0 8px ${playerColor(p)}` }} />
              <span className="font-heading font-semibold text-sm">
                {playerLabel(p)}
                {!isLocked && current === p && <span className="ml-2 text-[10px] uppercase tracking-[0.2em] opacity-70">Your turn</span>}
              </span>
            </div>
          ))}
        </div>

        {/* Resolving banner */}
        <AnimatePresence>
          {isResolving && winner && winner !== 'draw' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center mb-4"
            >
              <p className="font-heading text-sm uppercase tracking-[0.3em]"
                style={{ color: playerColor(winner as 'P1'|'P2') }}>
                {playerLabel(winner as 'P1'|'P2')} connected 4!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Board */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {/* Column hover arrows */}
            {!isLocked && (
              <div className="grid mb-2" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: '8px', padding: '0 8px' }}>
                {Array.from({ length: COLS }, (_, c) => (
                  <div key={c} className="flex items-center justify-center h-7">
                    <AnimatePresence>
                      {hoverCol === c && (
                        <motion.div key="arrow" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          <ChevronDown size={16} style={{ color: playerColor(current) }} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}

            {/* Grid */}
            <div
              className="rounded-2xl p-3"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${isResolving && winner && winner !== 'draw' ? playerColor(winner as 'P1'|'P2') + '55' : 'rgba(255,255,255,0.1)'}`,
                boxShadow: isResolving && winner && winner !== 'draw'
                  ? `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${playerColor(winner as 'P1'|'P2')}22`
                  : '0 20px 60px rgba(0,0,0,0.5)',
                transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
              }}
            >
              {board.map((row, r) => (
                <div key={r} className="flex gap-2 mb-2 last:mb-0">
                  {row.map((cell, c) => {
                    const isWin = isWinCell(r, c);
                    const isHover = hoverCol === c && !isLocked && cell === null;
                    return (
                      <motion.button
                        key={c}
                        onClick={() => handleColClick(c)}
                        onMouseEnter={() => setHoverCol(c)}
                        onMouseLeave={() => setHoverCol(null)}
                        disabled={isLocked || (cell !== null && !board.some(row => row[c] === null))}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full relative overflow-hidden"
                        style={{
                          ...cellStyle(cell, isWin, isResolving),
                          outline: isHover ? `2px solid ${playerColor(current)}88` : 'none',
                          cursor: isLocked ? 'default' : 'pointer',
                        }}
                        animate={isWin && isResolving
                          ? { scale: [1, 1.14, 1], filter: ['brightness(1)', 'brightness(1.4)', 'brightness(1)'] }
                          : {}
                        }
                        transition={isWin && isResolving
                          ? { duration: 0.6, repeat: Infinity, repeatDelay: 0.3, ease: 'easeInOut' }
                          : {}
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Result modal (shown only after reveal delay) */}
        <AnimatePresence>
          {isFinished && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="rounded-2xl p-8 text-center mb-8 relative overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${winner === 'draw' ? 'rgba(255,255,255,0.15)' : playerColor(winner as 'P1'|'P2') + '44'}`,
                boxShadow: winner !== 'draw' ? `0 0 40px ${playerColor(winner as 'P1'|'P2')}22` : 'none',
              }}
            >
              {winner === 'draw' ? (
                <>
                  <Swords size={48} className="mx-auto mb-4 text-white/40" strokeWidth={1.5} />
                  <h2 className="text-5xl font-heading font-bold text-white/60 mb-2">Draw</h2>
                  <p className="text-white/40 font-mono text-sm">The board is full — no winner.</p>
                </>
              ) : (
                <>
                  <Trophy size={48} className="mx-auto mb-4" strokeWidth={1.5}
                    style={{ color: playerColor(winner!) }} />
                  <h2 className="text-5xl font-heading font-bold mb-2"
                    style={{ color: playerColor(winner!) }}>
                    {playerLabel(winner!)} Wins!
                  </h2>
                  <p className="text-white/40 font-mono text-sm">Connected 4 in a row.</p>
                </>
              )}
              <div className="flex justify-center gap-4 mt-8">
                <button onClick={resetGame}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-heading font-semibold text-sm text-white transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #B026FF, #FF267A)',
                    boxShadow: '0 8px 24px rgba(176,38,255,0.35)',
                  }}>
                  <RotateCcw size={15} /> Play Again
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
            <li>Click a column to drop your disc — it falls to the lowest empty row.</li>
            <li>Connect 4 discs in a line (horizontal, vertical, or diagonal) to win.</li>
            <li>Player 1 (pink) goes first. Players alternate turns.</li>
            <li>Full column clicks are ignored. If the board fills with no winner, it is a Draw.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
