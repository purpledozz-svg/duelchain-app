import { useNavigate } from 'react-router-dom';
import { Trophy, RotateCcw, Home, Swords, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyRoom } from '../../lib/partyService';
import { RankChip } from '../ui/RankBadge';

interface Props {
  party: PartyRoom;
  playerRole: 'p1' | 'p2';
  onRematchRequest: () => void;
  onRematchAccept: () => void;
  onRematchDecline: () => void;
  rematchLoading: boolean;
  rpDelta?: number | null;
  newRp?: number | null;
}

export function EndOfMatchModal({
  party,
  playerRole,
  onRematchRequest,
  onRematchAccept,
  onRematchDecline,
  rematchLoading,
  rpDelta,
  newRp,
}: Props) {
  const navigate = useNavigate();
  if (!party.result) return null;

  const isWinner = party.result.winner === playerRole;
  const isDraw = party.result.type === 'draw';
  const isResign = party.result.type === 'resign';

  const myAccepted = playerRole === 'p1' ? party.rematch_p1_accepted : party.rematch_p2_accepted;
  const opponentAccepted = playerRole === 'p1' ? party.rematch_p2_accepted : party.rematch_p1_accepted;
  const rematchDeclined = party.rematch_status === 'declined';
  const rematchRequested = party.rematch_status === 'requested';

  // Result config
  const config = isDraw
    ? { title: 'Draw', sub: 'Well played by both sides.', color: 'rgba(255,255,255,0.55)', icon: <Swords size={52} strokeWidth={1.5} className="text-white/30" /> }
    : isWinner
      ? { title: 'Victory', sub: isResign ? 'Opponent resigned.' : 'You won the match!', color: '#FF267A', icon: <Trophy size={52} strokeWidth={1.5} style={{ color: '#FF267A' }} /> }
      : { title: 'Defeat', sub: isResign ? 'You resigned.' : 'Better luck next time.', color: 'rgba(255,255,255,0.4)', icon: <Swords size={52} strokeWidth={1.5} className="text-white/20" /> };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 22 }}
          className="relative w-full max-w-md rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(8,6,14,0.97)',
            border: `1px solid ${isWinner ? 'rgba(255,38,122,0.35)' : isDraw ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: isWinner
              ? '0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(255,38,122,0.18)'
              : '0 32px 80px rgba(0,0,0,0.7)',
          }}
        >
          {/* Top glow line */}
          <div className="absolute inset-x-0 top-0 h-px pointer-events-none"
            style={{
              background: isWinner
                ? 'linear-gradient(90deg, transparent, rgba(255,38,122,0.7), rgba(176,38,255,0.5), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
            }} />

          {/* Winner ambient glow */}
          {isWinner && (
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full blur-[80px] opacity-25 pointer-events-none"
              style={{ background: '#FF267A' }} />
          )}

          <div className="relative p-8 text-center">
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}>
                {config.icon}
              </motion.div>
            </div>

            {/* Title */}
            <h2 className="text-5xl font-heading font-bold mb-2" style={{ color: config.color }}>
              {config.title}
            </h2>
            <p className="text-white/40 font-mono text-sm mb-3">{config.sub}</p>

            {/* Mode badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-5"
              style={{
                background: party.mode === 'matchmaking' ? 'rgba(56,245,179,0.08)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${party.mode === 'matchmaking' ? 'rgba(56,245,179,0.25)' : 'rgba(255,255,255,0.1)'}`,
              }}>
              <div className="w-1.5 h-1.5 rounded-full"
                style={{ background: party.mode === 'matchmaking' ? '#38F5B3' : 'rgba(255,255,255,0.35)' }} />
              <span className="text-[10px] font-heading uppercase tracking-[0.22em] text-white/50">
                {party.mode === 'matchmaking' ? 'Ranked match' : 'Classic duel'}
              </span>
            </div>

            {/* RP delta (competitive mode only) */}
            {party.mode === 'matchmaking' && rpDelta !== null && rpDelta !== undefined && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mb-6 flex flex-col items-center gap-2"
              >
                <span
                  className="text-2xl font-heading font-bold tabular-nums"
                  style={{
                    color: isDraw ? 'rgba(255,255,255,0.45)' : rpDelta >= 0 ? '#38F5B3' : '#FF4040',
                    textShadow: isDraw ? 'none' : rpDelta >= 0
                      ? '0 0 20px rgba(56,245,179,0.5)'
                      : '0 0 20px rgba(255,64,64,0.5)',
                  }}
                >
                  {isDraw ? '± 0 RP' : rpDelta >= 0 ? `+${rpDelta} RP` : `${rpDelta} RP`}
                </span>
                {newRp !== null && newRp !== undefined && (
                  <RankChip rp={newRp} />
                )}
              </motion.div>
            )}

            {/* Rematch declined */}
            {rematchDeclined && (
              <div className="mb-6 px-4 py-3 rounded-xl text-sm font-mono text-[#FF4040]"
                style={{ background: 'rgba(255,64,64,0.08)', border: '1px solid rgba(255,64,64,0.2)' }}>
                Rematch declined by opponent.
              </div>
            )}

            <div className="space-y-3">
              {/* Waiting for opponent to accept */}
              {rematchRequested && myAccepted && !opponentAccepted && (
                <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-mono text-sm text-white/50"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Loader2 size={14} className="animate-spin" />
                  Waiting for opponent to accept…
                </div>
              )}

              {/* Opponent wants a rematch */}
              {rematchRequested && !myAccepted && opponentAccepted && (
                <>
                  <div className="px-4 py-3 rounded-xl text-sm font-mono text-white/60 text-center"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,38,122,0.2)' }}>
                    Opponent wants a rematch!
                  </div>
                  <button
                    onClick={onRematchAccept}
                    disabled={rematchLoading}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-heading font-semibold text-sm tracking-[0.15em] uppercase text-white transition-all disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, #B026FF, #FF267A)',
                      boxShadow: '0 8px 24px rgba(176,38,255,0.35)',
                    }}>
                    {rematchLoading ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                    Accept Rematch
                  </button>
                  <button
                    onClick={onRematchDecline}
                    disabled={rematchLoading}
                    className="w-full py-3 rounded-xl font-heading text-sm text-white/40 hover:text-white/70 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    Decline
                  </button>
                </>
              )}

              {/* Initial state or declined */}
              {(!rematchRequested || rematchDeclined) && (
                <button
                  onClick={onRematchRequest}
                  disabled={rematchLoading || rematchDeclined}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-heading font-semibold text-sm tracking-[0.15em] uppercase text-white transition-all disabled:opacity-40"
                  style={{
                    background: rematchDeclined ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #B026FF, #FF267A)',
                    boxShadow: rematchDeclined ? 'none' : '0 8px 24px rgba(176,38,255,0.35)',
                  }}>
                  {rematchLoading ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                  {rematchDeclined ? 'Rematch Declined' : 'Request Rematch'}
                </button>
              )}

              <button
                onClick={() => navigate('/lobby')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-heading text-sm text-white/45 hover:text-white/80 transition-colors"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Home size={14} /> Back to Lobby
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
