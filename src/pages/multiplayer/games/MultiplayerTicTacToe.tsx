import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Flag } from 'lucide-react';
import { partyService, PartyRoom } from '../../../lib/partyService';
import { getPlayerId } from '../../../lib/playerId';
import { EndOfMatchModal } from '../../../components/multiplayer/EndOfMatchModal';
import { useAwardRp } from '../../../hooks/useAwardRp';

interface Props {
  code: string;
}

type Cell = 'p1' | 'p2' | null;

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6],          // diag
] as const;

const WIN_LINE_STYLE: Record<number, React.CSSProperties> = {
  0: { top: '16.5%', left: '5%', width: '90%', height: '2px' },
  1: { top: '49.5%', left: '5%', width: '90%', height: '2px' },
  2: { top: '82.5%', left: '5%', width: '90%', height: '2px' },
  3: { top: '5%', left: '16.5%', width: '2px', height: '90%' },
  4: { top: '5%', left: '49.5%', width: '2px', height: '90%' },
  5: { top: '5%', left: '82.5%', width: '2px', height: '90%' },
  6: { top: '50%', left: '50%', width: '126%', height: '2px', transform: 'translate(-50%, -50%) rotate(45deg)' },
  7: { top: '50%', left: '50%', width: '126%', height: '2px', transform: 'translate(-50%, -50%) rotate(-45deg)' },
};

const REVEAL_DELAY = 2000;
const DRAW_DELAY = 1500;

function findWinLineIdx(board: Cell[], player: 'p1' | 'p2'): { lineIdx: number; cells: number[] } | null {
  for (let i = 0; i < WIN_LINES.length; i++) {
    const [a, b, c] = WIN_LINES[i];
    if (board[a] === player && board[b] === player && board[c] === player) {
      return { lineIdx: i, cells: [a, b, c] };
    }
  }
  return null;
}

export default function MultiplayerTicTacToe({ code }: Props) {
  const navigate = useNavigate();
  const [party, setParty] = useState<PartyRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerRole, setPlayerRole] = useState<'p1' | 'p2' | null>(null);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  // Reveal phase
  const [showModal, setShowModal] = useState(false);
  const [winLineIdx, setWinLineIdx] = useState<number | null>(null);
  const [winCells, setWinCells] = useState<number[]>([]);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rpAward = useAwardRp(party, playerRole);
  const playerId = getPlayerId();

  const startReveal = useCallback((board: Cell[], result: PartyRoom['result']) => {
    if (!result || revealTimerRef.current) return;
    if (result.type === 'win' && result.winner) {
      const found = findWinLineIdx(board, result.winner);
      if (found) {
        setWinLineIdx(found.lineIdx);
        setWinCells(found.cells);
      }
    }
    const delay = result.type === 'draw' ? DRAW_DELAY : REVEAL_DELAY;
    revealTimerRef.current = setTimeout(() => setShowModal(true), delay);
  }, []);

  useEffect(() => {
    const initParty = async () => {
      try {
        const partyData = await partyService.getParty(code);
        if (!partyData) {
          setError('Party not found');
          setLoading(false);
          return;
        }

        setParty(partyData);
        const role = partyData.p1_id === playerId ? 'p1' : 'p2';
        setPlayerRole(role);
        setLoading(false);

        if (partyData.result) {
          startReveal(partyData.game_state.board, partyData.result);
        }

        const unsubscribe = partyService.subscribeToParty(code, (updatedParty) => {
          setParty(prev => {
            if (!prev?.result && updatedParty.result) {
              startReveal(updatedParty.game_state.board, updatedParty.result);
            }
            return updatedParty;
          });
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
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, [code]);

  const handleCellClick = async (index: number) => {
    if (!party || !playerRole) return;
    if (party.turn !== playerRole) return;
    if (party.result) return;

    const board: Cell[] = party.game_state.board;
    if (board[index] !== null) return;

    const newBoard = [...board];
    newBoard[index] = playerRole;

    const result = checkWinner(newBoard);
    const newTurn = party.turn === 'p1' ? 'p2' : 'p1';

    const newGameState = {
      board: newBoard,
      moves: [...(party.game_state.moves || []), { index, player: playerRole }],
    };

    await partyService.updateGameState(code, newGameState, newTurn, result);
  };

  const checkWinner = (board: Cell[]) => {
    for (const [a, b, c] of WIN_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { type: 'win' as const, winner: board[a] as 'p1' | 'p2' };
      }
    }
    if (board.every((cell) => cell !== null)) return { type: 'draw' as const };
    return null;
  };

  const handleResign = async () => {
    if (!playerRole) return;
    try {
      await partyService.resignGame(code, playerRole);
      setShowResignConfirm(false);
    } catch (err) {
      console.error('Failed to resign:', err);
    }
  };

  const handleRematchRequest = async () => {
    setRematchLoading(true);
    try { await partyService.requestRematch(code, playerId); }
    catch (err) { console.error('[Rematch] Failed to request:', err); }
    finally { setRematchLoading(false); }
  };

  const handleRematchAccept = async () => {
    setRematchLoading(true);
    try { await partyService.acceptRematch(code, playerId); }
    catch (err) { console.error('[Rematch] Failed to accept:', err); }
    finally { setRematchLoading(false); }
  };

  const handleRematchDecline = async () => {
    setRematchLoading(true);
    try { await partyService.declineRematch(code); }
    catch (err) { console.error('[Rematch] Failed to decline:', err); }
    finally { setRematchLoading(false); }
  };

  const getStatusMessage = () => {
    if (!party) return '';
    const result = party.result;
    if (result) {
      if (result.type === 'win') return `${result.winner === 'p1' ? 'X (P1)' : 'O (P2)'} wins!`;
      if (result.type === 'draw') return 'Draw!';
      if (result.type === 'resign') return `${result.winner === 'p1' ? 'X (P1)' : 'O (P2)'} wins by resignation!`;
    }
    const isYourTurn = party.turn === playerRole;
    return `${party.turn === 'p1' ? 'X (P1)' : 'O (P2)'}'s turn ${isYourTurn ? '(You)' : ''}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050609] text-white flex items-center justify-center relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(255,38,122,0.08)_0%,transparent_70%)]" />
        </div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/10 border-t-[#FF267A] mx-auto mb-4" />
          <p className="text-white/50 text-sm">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !party) {
    return (
      <div className="min-h-screen bg-[#050609] text-white flex items-center justify-center p-6 relative overflow-hidden">
        <div className="relative z-10 max-w-md w-full p-8 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="text-xl font-heading font-bold text-red-400 mb-4">Error</h2>
          <p className="text-white/50 mb-6">{error || 'Party not found'}</p>
          <button onClick={() => navigate('/lobby')}
            className="w-full py-3 px-4 rounded-lg text-sm font-medium text-white/80 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  const isGameOver = party.result !== null;
  const isRevealing = isGameOver && !showModal;
  const board: Cell[] = party.game_state.board;
  const winnerColor = party.result?.winner === 'p1' ? '#FF267A' : '#38F5B3';

  return (
    <div className="min-h-screen bg-[#050609] text-white p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(255,38,122,0.07)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(160,50,255,0.05)_0%,transparent_70%)]" />
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        <button onClick={() => navigate('/lobby')} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>

        <div className="text-center mb-8">
          <p className="text-[11px] font-heading text-[#FF267A] uppercase tracking-[0.3em] mb-1">DUELCHAIN ARENA</p>
          <h1 className="text-3xl font-heading font-bold text-white">Tic-Tac-Toe</h1>
          <p className="text-xs text-white/30 mt-2 font-mono">Party: {code}</p>
        </div>

        <div className="rounded-2xl p-6 md:p-8"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Turn indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: party.turn === 'p1' ? '#FF267A' : '#38F5B3',
                  boxShadow: party.turn === 'p1' ? '0 0 8px #FF267A' : '0 0 8px #38F5B3',
                }} />
              <span className="text-sm text-white/70">
                {party.turn === 'p1' ? 'X' : 'O'}&apos;s turn
                {party.turn === playerRole && <span className="text-white/40 ml-1">(You)</span>}
              </span>
            </div>
          </div>

          <div className="text-center mb-6">
            <p className="text-lg font-heading text-white/90">{getStatusMessage()}</p>
            <p className="text-xs text-white/30 mt-1">You are {playerRole === 'p1' ? 'X (Player 1)' : 'O (Player 2)'}</p>
          </div>

          {/* Board with win-line overlay */}
          <div className="relative max-w-[360px] mx-auto" style={{ aspectRatio: '1' }}>
            {/* Win line */}
            <AnimatePresence>
              {isRevealing && winLineIdx !== null && (
                <motion.div
                  key="win-line"
                  initial={{ scaleX: 0, scaleY: 0, opacity: 0 }}
                  animate={{ scaleX: 1, scaleY: 1, opacity: 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="absolute z-10 rounded-full pointer-events-none"
                  style={{
                    ...WIN_LINE_STYLE[winLineIdx],
                    background: winnerColor,
                    boxShadow: `0 0 18px ${winnerColor}, 0 0 36px ${winnerColor}66`,
                    transformOrigin: 'center',
                  }}
                />
              )}
            </AnimatePresence>

            <div className="grid grid-cols-3 gap-3 h-full">
              {board.map((cell, index) => {
                const isWinCell = winCells.includes(index);
                return (
                  <button
                    key={index}
                    onClick={() => handleCellClick(index)}
                    disabled={isGameOver || party.turn !== playerRole || cell !== null}
                    className="aspect-square rounded-xl flex items-center justify-center text-5xl font-bold transition-all duration-200 disabled:cursor-not-allowed group"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      opacity: isRevealing && !isWinCell && cell ? 0.4 : 1,
                      transition: 'opacity 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isGameOver && party.turn === playerRole && cell === null) {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,38,122,0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
                    }}
                  >
                    {cell === 'p1' && (
                      <motion.span
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        className="text-[#FF267A]"
                        style={{
                          textShadow: isWinCell && isRevealing
                            ? '0 0 30px #FF267A, 0 0 60px #FF267A88'
                            : '0 0 20px rgba(255,38,122,0.6), 0 0 40px rgba(255,38,122,0.3)',
                        }}
                      >
                        X
                      </motion.span>
                    )}
                    {cell === 'p2' && (
                      <motion.span
                        initial={{ scale: 0, rotate: 180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        className="text-[#38F5B3]"
                        style={{
                          textShadow: isWinCell && isRevealing
                            ? '0 0 30px #38F5B3, 0 0 60px #38F5B388'
                            : '0 0 20px rgba(56,245,179,0.6), 0 0 40px rgba(56,245,179,0.3)',
                        }}
                      >
                        O
                      </motion.span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            {!isGameOver && (
              <button onClick={() => setShowResignConfirm(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:text-red-200 transition-colors"
                style={{ background: 'rgba(255,64,64,0.12)', border: '1px solid rgba(255,64,64,0.3)' }}>
                <Flag className="w-4 h-4" />
                Resign
              </button>
            )}
            {isGameOver && !showModal && (
              <p className="text-white/30 font-mono text-xs animate-pulse">Reviewing result…</p>
            )}
          </div>
        </div>
      </div>

      {showResignConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.15 }}
            className="max-w-md w-full mx-4 p-6 rounded-2xl"
            style={{ background: 'rgba(20,20,30,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-xl font-heading font-bold text-white mb-3">Resign Game?</h2>
            <p className="text-white/50 text-sm mb-6">Are you sure you want to resign? Your opponent will win the game.</p>
            <div className="flex gap-3">
              <button onClick={handleResign}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-red-200 hover:text-white transition-colors"
                style={{ background: 'rgba(255,64,64,0.15)', border: '1px solid rgba(255,64,64,0.3)' }}>
                Yes, Resign
              </button>
              <button onClick={() => setShowResignConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-white/60 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {party.result && playerRole && showModal && (
        <EndOfMatchModal
          party={party}
          playerRole={playerRole}
          onRematchRequest={handleRematchRequest}
          onRematchAccept={handleRematchAccept}
          onRematchDecline={handleRematchDecline}
          rematchLoading={rematchLoading}
          rpDelta={rpAward?.myDelta}
          newRp={rpAward?.myNewRp}
        />
      )}
    </div>
  );
}
