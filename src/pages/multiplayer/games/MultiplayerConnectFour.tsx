import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Flag, ChevronDown } from 'lucide-react';
import { partyService, PartyRoom } from '../../../lib/partyService';
import { getPlayerId } from '../../../lib/playerId';
import { EndOfMatchModal } from '../../../components/multiplayer/EndOfMatchModal';
import { useAwardRp } from '../../../hooks/useAwardRp';

interface Props {
  code: string;
}

type Cell = 'p1' | 'p2' | null;

const P1_COLOR = '#FF267A';
const P2_COLOR = '#38F5B3';
const REVEAL_DELAY = 2000;

// Returns the 4 cells forming the winning line, or null
function findWinningCells(
  grid: Cell[][],
  row: number,
  col: number,
  player: 'p1' | 'p2'
): Array<[number, number]> | null {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]] as const;
  for (const [dr, dc] of directions) {
    const cells: Array<[number, number]> = [[row, col]];
    for (let i = 1; i < 4; i++) {
      const r = row + dr * i, c = col + dc * i;
      if (r < 0 || r >= 6 || c < 0 || c >= 7 || grid[r][c] !== player) break;
      cells.push([r, c]);
    }
    for (let i = 1; i < 4; i++) {
      const r = row - dr * i, c = col - dc * i;
      if (r < 0 || r >= 6 || c < 0 || c >= 7 || grid[r][c] !== player) break;
      cells.push([r, c]);
    }
    if (cells.length >= 4) return cells.slice(0, 4);
  }
  return null;
}

// Scan entire board for winning cells (used when result arrives from remote)
function scanWinningCells(grid: Cell[][], player: 'p1' | 'p2'): Array<[number, number]> | null {
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      if (grid[r][c] !== player) continue;
      const cells = findWinningCells(grid, r, c, player);
      if (cells) return cells;
    }
  }
  return null;
}

export default function MultiplayerConnectFour({ code }: Props) {
  const navigate = useNavigate();
  const [party, setParty] = useState<PartyRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerRole, setPlayerRole] = useState<'p1' | 'p2' | null>(null);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  // Reveal phase state
  const [showModal, setShowModal] = useState(false);
  const [winningCells, setWinningCells] = useState<Array<[number, number]> | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rpAward = useAwardRp(party, playerRole);
  const playerId = getPlayerId();

  // Start reveal sequence when a result is detected
  const startReveal = useCallback((grid: Cell[][], result: PartyRoom['result']) => {
    if (!result || revealTimerRef.current) return;
    if (result.type === 'win' && result.winner) {
      const cells = scanWinningCells(grid, result.winner);
      setWinningCells(cells);
    }
    revealTimerRef.current = setTimeout(() => {
      setShowModal(true);
    }, REVEAL_DELAY);
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

        // If game already over on load, start reveal immediately
        if (partyData.result) {
          startReveal(partyData.game_state.grid, partyData.result);
        }

        const unsubscribe = partyService.subscribeToParty(code, (updatedParty) => {
          setParty(prev => {
            // Detect fresh result
            if (!prev?.result && updatedParty.result) {
              startReveal(updatedParty.game_state.grid, updatedParty.result);
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

  const handleColumnClick = async (col: number) => {
    if (!party || !playerRole) return;
    if (party.turn !== playerRole) return;
    if (party.result) return;

    const grid: Cell[][] = party.game_state.grid;

    for (let row = 5; row >= 0; row--) {
      if (grid[row][col] === null) {
        const newGrid = grid.map((r) => [...r]);
        newGrid[row][col] = playerRole;

        const result = checkWinner(newGrid, row, col, playerRole);
        const newTurn = party.turn === 'p1' ? 'p2' : 'p1';

        const newGameState = {
          grid: newGrid,
          moves: [...(party.game_state.moves || []), { col, row, player: playerRole }],
        };

        await partyService.updateGameState(code, newGameState, newTurn, result);
        break;
      }
    }
  };

  const checkWinner = (grid: Cell[][], row: number, col: number, player: 'p1' | 'p2') => {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]] as const;
    for (const [dr, dc] of directions) {
      let count = 1;
      for (let i = 1; i < 4; i++) {
        const r = row + dr * i, c = col + dc * i;
        if (r < 0 || r >= 6 || c < 0 || c >= 7 || grid[r][c] !== player) break;
        count++;
      }
      for (let i = 1; i < 4; i++) {
        const r = row - dr * i, c = col - dc * i;
        if (r < 0 || r >= 6 || c < 0 || c >= 7 || grid[r][c] !== player) break;
        count++;
      }
      if (count >= 4) return { type: 'win' as const, winner: player };
    }
    const isFull = grid[0].every((cell) => cell !== null);
    if (isFull) return { type: 'draw' as const };
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
      if (result.type === 'win') return `${result.winner === 'p1' ? 'Pink (P1)' : 'Teal (P2)'} wins!`;
      if (result.type === 'draw') return 'Draw!';
      if (result.type === 'resign') return `${result.winner === 'p1' ? 'Pink (P1)' : 'Teal (P2)'} wins by resignation!`;
    }
    const isYourTurn = party.turn === playerRole;
    return `${party.turn === 'p1' ? 'Pink (P1)' : 'Teal (P2)'}'s turn ${isYourTurn ? '(You)' : ''}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050609] text-white flex items-center justify-center relative overflow-hidden">
        <div className="pointer-events-none absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-20" style={{ background: P1_COLOR }} />
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/10 border-t-[#FF267A] mx-auto mb-4" />
          <p className="text-white/40 font-mono text-sm">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !party) {
    return (
      <div className="min-h-screen bg-[#050609] text-white flex items-center justify-center p-6 relative overflow-hidden">
        <div className="pointer-events-none absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-20" style={{ background: P1_COLOR }} />
        <div className="relative p-8 max-w-md w-full rounded-2xl"
          style={{ background: 'rgba(8,6,14,0.95)', border: '1px solid rgba(255,64,64,0.3)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
          <h2 className="text-2xl font-bold mb-4 text-[#FF4040]">Error</h2>
          <p className="text-white/50 mb-6 font-mono text-sm">{error || 'Party not found'}</p>
          <button onClick={() => navigate('/lobby')}
            className="w-full py-3 rounded-xl font-heading text-sm font-semibold uppercase tracking-[0.15em] text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #B026FF, #FF267A)', boxShadow: '0 8px 24px rgba(176,38,255,0.3)' }}>
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  const isGameOver = party.result !== null;
  const isRevealing = isGameOver && !showModal;
  const grid: Cell[][] = party.game_state.grid;
  const currentTurnColor = party.turn === 'p1' ? P1_COLOR : P2_COLOR;
  const isMyTurn = party.turn === playerRole;

  const isWinCell = (r: number, c: number) =>
    winningCells?.some(([wr, wc]) => wr === r && wc === c) ?? false;

  const winnerColor = party.result?.winner === 'p1' ? P1_COLOR : P2_COLOR;

  return (
    <div className="min-h-screen bg-[#050609] text-white relative overflow-hidden">
      <div className="pointer-events-none absolute top-[-300px] left-1/4 w-[500px] h-[500px] rounded-full blur-[150px] opacity-10" style={{ background: P1_COLOR }} />
      <div className="pointer-events-none absolute bottom-[-200px] right-1/4 w-[400px] h-[400px] rounded-full blur-[120px] opacity-10" style={{ background: P2_COLOR }} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => navigate('/lobby')} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-mono">Back</span>
        </button>

        <div className="text-center mb-6">
          <p className="text-[11px] font-heading text-[#FF267A] uppercase tracking-[0.3em] mb-1">Multiplayer</p>
          <h1 className="text-3xl font-heading font-bold text-white">Connect Four</h1>
          <p className="text-xs text-white/30 font-mono mt-1">Code: <span className="text-[#FF267A]">{code}</span></p>
        </div>

        {/* Status / reveal banner */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full font-mono text-sm"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="w-3 h-3 rounded-full"
              style={{ background: isRevealing && party.result?.type === 'win' ? winnerColor : currentTurnColor,
                boxShadow: `0 0 8px ${isRevealing && party.result?.type === 'win' ? winnerColor : currentTurnColor}60` }} />
            <span className="text-white/70">{getStatusMessage()}</span>
          </div>
        </div>

        <p className="text-center text-xs text-white/30 font-mono mb-4">
          You are {playerRole === 'p1' ? 'Pink (Player 1)' : 'Teal (Player 2)'}
        </p>

        {/* Board */}
        <div className="flex flex-col items-center">
          <div className="grid grid-cols-7 gap-1.5 mb-2" style={{ width: 'fit-content' }}>
            {[0, 1, 2, 3, 4, 5, 6].map((col) => (
              <button key={col} onClick={() => handleColumnClick(col)}
                onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)}
                disabled={isGameOver || !isMyTurn}
                className="w-12 h-8 sm:w-14 sm:h-8 flex items-center justify-center disabled:opacity-0 transition-opacity">
                <AnimatePresence>
                  {hoveredCol === col && isMyTurn && !isGameOver && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                      <ChevronDown className="w-5 h-5" style={{ color: currentTurnColor }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            ))}
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${isRevealing && party.result?.type === 'win' ? winnerColor + '55' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '16px',
            padding: '12px',
            transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
            boxShadow: isRevealing && party.result?.type === 'win'
              ? `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${winnerColor}22`
              : '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <div className="grid grid-cols-7 gap-1.5">
              {grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const win = isWinCell(rowIndex, colIndex);
                  return (
                    <motion.div
                      key={`${rowIndex}-${colIndex}`}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full cursor-pointer"
                      onClick={() => handleColumnClick(colIndex)}
                      animate={win && isRevealing
                        ? { scale: [1, 1.14, 1], filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'] }
                        : {}
                      }
                      transition={win && isRevealing
                        ? { duration: 0.6, repeat: Infinity, repeatDelay: 0.3, ease: 'easeInOut' }
                        : { duration: 0.1 }
                      }
                      style={
                        cell === 'p1'
                          ? {
                              background: `radial-gradient(circle at 35% 35%, #FF6CA8, ${P1_COLOR} 60%, #B8004E)`,
                              boxShadow: win && isRevealing
                                ? `0 0 20px ${P1_COLOR}, 0 0 40px ${P1_COLOR}88`
                                : isRevealing && !win
                                  ? `0 0 6px ${P1_COLOR}20`
                                  : `0 0 12px ${P1_COLOR}50, inset 0 1px 2px rgba(255,255,255,0.2)`,
                              opacity: isRevealing && !win ? 0.45 : 1,
                              transition: 'opacity 0.3s ease, box-shadow 0.3s ease',
                            }
                          : cell === 'p2'
                          ? {
                              background: `radial-gradient(circle at 35% 35%, #7EFFD4, ${P2_COLOR} 60%, #1AAD7A)`,
                              boxShadow: win && isRevealing
                                ? `0 0 20px ${P2_COLOR}, 0 0 40px ${P2_COLOR}88`
                                : isRevealing && !win
                                  ? `0 0 6px ${P2_COLOR}20`
                                  : `0 0 12px ${P2_COLOR}50, inset 0 1px 2px rgba(255,255,255,0.2)`,
                              opacity: isRevealing && !win ? 0.45 : 1,
                              transition: 'opacity 0.3s ease, box-shadow 0.3s ease',
                            }
                          : {
                              background: 'rgba(255,255,255,0.04)',
                              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
                              opacity: isRevealing ? 0.35 : 1,
                              transition: 'opacity 0.3s ease',
                            }
                      }
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          {!isGameOver && (
            <button onClick={() => setShowResignConfirm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-sm text-[#FF4040] transition-all hover:brightness-125"
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

      {/* Resign confirmation modal */}
      <AnimatePresence>
        {showResignConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}>
            <motion.div initial={{ scale: 0.92, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="relative w-full max-w-sm rounded-2xl p-6"
              style={{ background: 'rgba(8,6,14,0.97)', border: '1px solid rgba(255,64,64,0.25)', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
              <div className="absolute inset-x-0 top-0 h-px pointer-events-none rounded-t-2xl"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,64,64,0.5), transparent)' }} />
              <h2 className="text-xl font-heading font-bold text-white mb-3">Resign Game?</h2>
              <p className="text-white/40 font-mono text-sm mb-6">Are you sure you want to resign? Your opponent will win the game.</p>
              <div className="flex gap-3">
                <button onClick={handleResign}
                  className="flex-1 py-3 rounded-xl font-heading text-sm font-semibold uppercase tracking-[0.1em] text-white transition-all"
                  style={{ background: 'rgba(255,64,64,0.2)', border: '1px solid rgba(255,64,64,0.4)' }}>
                  Yes, Resign
                </button>
                <button onClick={() => setShowResignConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-heading text-sm text-white/50 hover:text-white/80 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End of match modal — shown after reveal delay */}
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
