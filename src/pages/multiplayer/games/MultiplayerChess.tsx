import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Flag } from 'lucide-react';
import { motion } from 'framer-motion';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import PromotionModal from '../../../games/chess/PromotionModal';
import { partyService, PartyRoom } from '../../../lib/partyService';
import { getPlayerId } from '../../../lib/playerId';
import { EndOfMatchModal } from '../../../components/multiplayer/EndOfMatchModal';
import { ChessMatchHUD } from '../../../components/games/Chess/ChessMatchHUD';
import { useAwardRp } from '../../../hooks/useAwardRp';

const CHESS_REVEAL_DELAY = 1800;

interface Props {
  code: string;
}

export default function MultiplayerChess({ code }: Props) {
  const navigate = useNavigate();
  const [party, setParty] = useState<PartyRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chess] = useState(() => new Chess());
  const [playerRole, setPlayerRole] = useState<'p1' | 'p2' | null>(null);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rpAward = useAwardRp(party, playerRole);

  const playerId = getPlayerId();

  useEffect(() => {
    const initParty = async () => {
      try {
        const partyData = await partyService.getParty(code);
        if (!partyData) { setError('Party not found'); setLoading(false); return; }

        setParty(partyData);
        chess.load(partyData.game_state.fen);
        const role = partyData.p1_id === playerId ? 'p1' : 'p2';
        setPlayerRole(role);
        setLoading(false);

        // If already finished on load, start reveal
        if (partyData.result && !revealTimerRef.current) {
          revealTimerRef.current = setTimeout(() => setShowModal(true), CHESS_REVEAL_DELAY);
        }

        partyService.subscribeToParty(code, (updated) => {
          setParty(prev => {
            if (!prev?.result && updated.result && !revealTimerRef.current) {
              revealTimerRef.current = setTimeout(() => setShowModal(true), CHESS_REVEAL_DELAY);
            }
            return updated;
          });
          chess.load(updated.game_state.fen);
        });
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
  }, [code, playerId]);

  // Clock timeout
  useEffect(() => {
    if (!party || party.result || !party.game_state.clock) return;
    const interval = setInterval(() => {
      const clock = party.game_state.clock;
      const now = Date.now();
      const elapsed = now - clock.lastTickMs;
      const timeLeft = clock.active === 'w' ? clock.wMs - elapsed : clock.bMs - elapsed;
      if (timeLeft <= 0) {
        const winner = clock.active === 'w' ? 'p2' : 'p1';
        partyService.updateGameState(code, party.game_state, party.turn, { type: 'win', winner }).catch(console.error);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [party, code]);

  const handleMove = useCallback(async (source: string, target: string): Promise<boolean> => {
    if (!party || !playerRole) return false;
    if (party.turn !== playerRole) return false;
    if (party.result) return false;

    const piece = chess.get(source as any);
    if (piece?.type === 'p' &&
      ((piece.color === 'w' && target[1] === '8') || (piece.color === 'b' && target[1] === '1'))) {
      setPendingPromotion({ from: source, to: target });
      return false;
    }

    try {
      const move = chess.move({ from: source as any, to: target as any });
      if (!move) return false;

      const newTurn = party.turn === 'p1' ? 'p2' : 'p1';
      const result = getGameResult();
      await partyService.updateChessMove(code, { san: move.san, from: move.from, to: move.to, captured: move.captured, color: move.color }, chess.fen(), party.game_state, newTurn, result);
      return true;
    } catch {
      chess.load(party.game_state.fen);
      return false;
    }
  }, [party, playerRole, chess, code]);

  const handlePromotion = useCallback(async (piece: 'q' | 'r' | 'b' | 'n') => {
    if (!pendingPromotion || !party || !playerRole) return;
    try {
      const move = chess.move({ from: pendingPromotion.from as any, to: pendingPromotion.to as any, promotion: piece });
      if (!move) return;
      const newTurn = party.turn === 'p1' ? 'p2' : 'p1';
      const result = getGameResult();
      await partyService.updateChessMove(code, { san: move.san, from: move.from, to: move.to, captured: move.captured, color: move.color }, chess.fen(), party.game_state, newTurn, result);
      setPendingPromotion(null);
    } catch {
      chess.load(party.game_state.fen);
      setPendingPromotion(null);
    }
  }, [pendingPromotion, party, playerRole, chess, code]);

  const getGameResult = () => {
    if (chess.isCheckmate()) return { type: 'win' as const, winner: chess.turn() === 'w' ? 'p2' : 'p1' };
    if (chess.isStalemate() || chess.isDraw()) return { type: 'draw' as const };
    return null;
  };

  const handleResign = async () => {
    if (!playerRole) return;
    await partyService.resignGame(code, playerRole).catch(console.error);
    setShowResignConfirm(false);
  };

  const handleRematchRequest = async () => {
    setRematchLoading(true);
    try { await partyService.requestRematch(code, playerId); } catch {} finally { setRematchLoading(false); }
  };
  const handleRematchAccept = async () => {
    setRematchLoading(true);
    try { await partyService.acceptRematch(code, playerId); chess.reset(); } catch {} finally { setRematchLoading(false); }
  };
  const handleRematchDecline = async () => {
    setRematchLoading(true);
    try { await partyService.declineRematch(code); } catch {} finally { setRematchLoading(false); }
  };

  const getStatusMessage = () => {
    if (!party) return '';
    if (party.result) {
      if (party.result.type === 'win') {
        const isTimeout = party.game_state.clock && (party.game_state.clock.wMs <= 0 || party.game_state.clock.bMs <= 0);
        const w = party.result.winner === 'p1' ? 'White' : 'Black';
        return isTimeout ? `Time out! ${w} wins` : `Checkmate! ${w} wins`;
      }
      if (party.result.type === 'draw') return 'Draw';
      if (party.result.type === 'resign') return `${party.result.winner === 'p1' ? 'White' : 'Black'} wins by resignation`;
    }
    if (chess.isCheck()) return 'Check!';
    const isYourTurn = party.turn === playerRole;
    return isYourTurn ? 'Your move' : "Opponent's move";
  };

  // ─── Loading / Error ──────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#050609] text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#FF267A] animate-spin" />
        <p className="text-white/40 font-mono text-sm">Loading game…</p>
      </div>
    </div>
  );

  if (error || !party) return (
    <div className="min-h-screen bg-[#050609] text-white flex items-center justify-center p-4">
      <div className="rounded-2xl p-8 max-w-md text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,64,64,0.3)' }}>
        <h2 className="font-heading font-bold text-xl text-[#FF4040] mb-2">Error</h2>
        <p className="text-white/50 font-mono text-sm mb-6">{error || 'Party not found'}</p>
        <button onClick={() => navigate('/lobby')}
          className="px-6 py-3 rounded-xl font-heading text-sm text-white/70 hover:text-white transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
          Back to Lobby
        </button>
      </div>
    </div>
  );

  // ─── Game UI ──────────────────────────────────────────────────────
  const isGameOver = party.result !== null;
  const isCheck = chess.isCheck() && !isGameOver;
  const orientation = playerRole === 'p1' ? 'white' : 'black';
  const isMyTurn = party.turn === playerRole && !isGameOver;

  return (
    <div className="min-h-screen bg-[#050609] text-white relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-72 rounded-full blur-[120px] opacity-15" style={{ background: '#B026FF' }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-72 rounded-full blur-[120px] opacity-12" style={{ background: '#FF267A' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/lobby')}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-mono">
            <ArrowLeft size={16} /> Back to Lobby
          </button>
          <div className="text-center">
            <p className="text-[11px] font-heading text-[#FF267A] uppercase tracking-[0.3em]">DUELCHAIN ARENA</p>
            <h1 className="text-2xl font-heading font-bold">Chess</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/30 uppercase">Room</span>
            <span className="px-2 py-1 rounded-lg text-xs font-mono text-[#FF267A]"
              style={{ background: 'rgba(255,38,122,0.1)', border: '1px solid rgba(255,38,122,0.25)' }}>
              {code}
            </span>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {isMyTurn && !isGameOver && (
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#FF267A', boxShadow: '0 0 8px #FF267A' }} />
          )}
          <p className={`font-heading font-semibold text-lg ${isCheck ? 'text-[#FF4040]' : isGameOver ? 'text-white/50' : 'text-white/80'}`}>
            {getStatusMessage()}
          </p>
          <span className="text-[10px] font-mono text-white/25 px-2 py-0.5 rounded-md"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {playerRole === 'p1' ? 'White' : 'Black'}
          </span>
        </div>

        {/* Game grid */}
        <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start">
          {/* Board */}
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-[560px] rounded-2xl p-3 relative overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            >
              {/* Corner accent */}
              <div className="absolute top-0 left-0 w-24 h-24 rounded-full blur-[40px] opacity-20 pointer-events-none" style={{ background: '#B026FF' }} />

              <Chessboard
                position={party.game_state.fen}
                onPieceDrop={handleMove}
                boardOrientation={orientation}
                customDarkSquareStyle={{ backgroundColor: '#1a1428' }}
                customLightSquareStyle={{ backgroundColor: '#2c2438' }}
                customBoardStyle={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
                animationDuration={200}
              />
            </motion.div>

            {/* Resign button */}
            {!isGameOver && (
              <button
                onClick={() => setShowResignConfirm(true)}
                className="flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl text-sm font-heading text-white/50 hover:text-white/80 transition-all"
                style={{ background: 'rgba(255,64,64,0.08)', border: '1px solid rgba(255,64,64,0.2)' }}
              >
                <Flag size={14} /> Resign
              </button>
            )}
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            <ChessMatchHUD
              capturePoints={party.game_state.capturePoints || { w: 0, b: 0 }}
              clock={party.game_state.clock || { wMs: 300000, bMs: 300000, active: 'w', lastTickMs: Date.now() }}
              playerColor={orientation}
              gameOver={isGameOver}
            />

            {/* Move history */}
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="text-[10px] font-heading uppercase tracking-[0.25em] text-white/40">Moves</span>
              <div className="mt-3 max-h-[260px] overflow-y-auto space-y-1 scrollbar-thin">
                {(!party.game_state.moves || party.game_state.moves.length === 0) ? (
                  <p className="text-white/20 font-mono text-xs text-center py-6">No moves yet</p>
                ) : (
                  party.game_state.moves.map((move: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/[0.02]">
                      <span className="text-[10px] font-mono text-white/20 w-5">{Math.floor(idx / 2) + 1}.</span>
                      <span className="font-mono text-sm text-white/70">{move.san}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Promotion modal */}
      {pendingPromotion && <PromotionModal onSelect={handlePromotion} />}

      {/* Resign confirm */}
      {showResignConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-2xl p-7 text-center"
            style={{ background: 'rgba(8,6,14,0.97)', border: '1px solid rgba(255,64,64,0.25)' }}
          >
            <Flag size={28} className="mx-auto mb-4 text-[#FF4040]" />
            <h2 className="font-heading font-bold text-xl mb-2">Resign?</h2>
            <p className="text-white/40 font-mono text-sm mb-6">Your opponent will win the game.</p>
            <div className="flex gap-3">
              <button onClick={handleResign}
                className="flex-1 py-3 rounded-xl font-heading font-semibold text-sm text-white"
                style={{ background: 'rgba(255,64,64,0.2)', border: '1px solid rgba(255,64,64,0.4)' }}>
                Yes, Resign
              </button>
              <button onClick={() => setShowResignConfirm(false)}
                className="flex-1 py-3 rounded-xl font-heading font-semibold text-sm text-white/60 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* End of match — shown after reveal delay */}
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
