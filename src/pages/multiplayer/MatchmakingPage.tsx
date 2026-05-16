import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Radar, Users, Clock, Swords, AlertTriangle, Shuffle, Coins, Zap } from 'lucide-react';
import { useAccount } from 'wagmi';
import { base } from 'wagmi/chains';
import { useConnectModal, useChainModal } from '@rainbow-me/rainbowkit';
import { partyService, GameType } from '../../lib/partyService';
import { getPlayerId } from '../../lib/playerId';
import { useStore } from '../../store/useStore';
import { RankChip } from '../../components/ui/RankBadge';
import { isGameEnabled, isGameComingSoon, COMPETITIVE_GAME_IDS } from '../../config/games';

interface LocationState {
  mode?: 'competitive' | 'classic';
  currency?: 'ETH' | 'USDC';
  wager?: number;
  cryptoAmount?: string;
}

const GAME_NAMES: Record<string, string> = {
  chess: 'Chess',
  'connect-four': 'Connect Four',
  tictactoe: 'Tic-Tac-Toe',
  'tic-tac-toe': 'Tic-Tac-Toe',
  rps: 'Rock Paper Scissors',
  'stop-it': 'Stop It',
  'flappy-duel': 'Flappy Duel',
  'stop-at-10': 'Stop at 10',
  'hot-potato': 'Hot Potato',
  reaction: 'Reaction Duel',
};

const SCAN_MESSAGES_CLASSIC = [
  'Scanning active duel rooms',
  'Matching game preference',
  'Syncing network',
  'Preparing arena',
];

const SCAN_MESSAGES_COMPETITIVE = [
  'Matching stake bracket',
  'Scanning duel rooms',
  'Verifying stake alignment',
  'Drawing game after match',
];

const POLL_INTERVAL_MS = 2000;

export default function MatchmakingPage() {
  const navigate = useNavigate();
  const { game } = useParams<{ game: string }>();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;
  const { currentPlayer } = useStore();

  const isCompetitive = state.mode === 'competitive' || game === 'competitive';
  const classicGame = !isCompetitive ? (game as GameType) : undefined;
  const playerId = getPlayerId();

  const { address, chainId, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { openChainModal } = useChainModal();
  const isOnBase = chainId === base.id;

  const [error, setError] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [scanIdx, setScanIdx] = useState(0);
  const [matchedGame, setMatchedGame] = useState<GameType | null>(null);
  const [matchFound, setMatchFound] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const navigatedRef = useRef(false);

  // A game is "disabled" if it's coming soon OR simply not in the enabled list.
  // For competitive mode the game param is 'competitive' — that's always allowed.
  const isDisabled = !isCompetitive && game ? !isGameEnabled(game) || isGameComingSoon(game) : false;

  useEffect(() => {
    if (isDisabled) return;

    // Competitive mode requires a connected wallet on Base before entering queue
    if (isCompetitive) {
      if (!isConnected) {
        setError('Connect your wallet to enter competitive matchmaking.');
        return;
      }
      if (!isOnBase) {
        setError('Switch to Base network to enter competitive matchmaking.');
        return;
      }
    }

    const mode = isCompetitive ? 'competitive' : 'classic';
    const stake = isCompetitive ? (state.wager ?? null) : null;
    const currency = isCompetitive ? (state.currency ?? null) : null;
    const queueGame: GameType = isCompetitive ? 'chess' : (classicGame as GameType);

    cancelledRef.current = false;
    navigatedRef.current = false;

    // Hard block: classic game must be enabled. Competitive uses server-drawn game.
    if (!isCompetitive && !isGameEnabled(queueGame)) {
      setError('This game is not available yet.');
      return;
    }

    // Competitive: validate that the server game pool is non-empty
    if (isCompetitive && COMPETITIVE_GAME_IDS.length === 0) {
      setError('No competitive games are currently available.');
      return;
    }

    const doNavigate = (roomGame: string, code: string, competitive: boolean) => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeRef.current) clearInterval(timeRef.current);
      // Competitive: go to escrow funding page first; Classic: go straight to game
      if (competitive) {
        navigate(`/escrow/${code}`);
      } else {
        navigate(`/game/${roomGame}/${code}`);
      }
    };

    const doPoll = async () => {
      if (cancelledRef.current || navigatedRef.current) return;

      const walletAddr = isCompetitive ? (address ?? null) : null;
      const result = await partyService.matchmakePlayer(playerId, queueGame, {
        mode,
        stake,
        currency,
        walletAddress: walletAddr,
      });

      if (cancelledRef.current || navigatedRef.current) return;

      if (result.status === 'matched') {
        const roomGame = result.game ?? queueGame;
        // Safety: never route to a disabled game
        if (!isGameEnabled(roomGame)) {
          setError(`Matched game "${roomGame}" is not available. Please try again.`);
          partyService.leaveMatchmaking(playerId);
          return;
        }
        if (isCompetitive) {
          setMatchedGame(roomGame as GameType);
          setMatchFound(true);
          setTimeout(() => doNavigate(roomGame, result.code, true), 2200);
        } else {
          doNavigate(roomGame, result.code, false);
        }
        return;
      }

      if (result.status === 'error') {
        setError(result.message);
        return;
      }

      // status === 'waiting' — update queue count
      try {
        const counts = await partyService.getQueueCounts();
        if (cancelledRef.current) return;
        if (isCompetitive) {
          setQueueCount(counts.reduce((s, c) => s + Number(c.player_count), 0));
        } else {
          const entry = counts.find((c) => c.game_id === classicGame);
          setQueueCount(entry ? Number(entry.player_count) : 0);
        }
      } catch {
        // queue count is cosmetic — ignore errors
      }
    };

    // Run immediately, then every POLL_INTERVAL_MS
    doPoll();
    pollRef.current = setInterval(doPoll, POLL_INTERVAL_MS);

    timeRef.current = setInterval(() => {
      if (!cancelledRef.current && !navigatedRef.current) {
        setTimeElapsed((p) => p + 1);
      }
    }, 1000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeRef.current) clearInterval(timeRef.current);
      if (!navigatedRef.current) {
        partyService.leaveMatchmaking(playerId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  useEffect(() => {
    const msgs = isCompetitive ? SCAN_MESSAGES_COMPETITIVE : SCAN_MESSAGES_CLASSIC;
    const i = setInterval(() => setScanIdx((idx) => (idx + 1) % msgs.length), 2200);
    return () => clearInterval(i);
  }, [isCompetitive]);

  const handleCancel = async () => {
    cancelledRef.current = true;
    navigatedRef.current = true;
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeRef.current) clearInterval(timeRef.current);
    await partyService.leaveMatchmaking(playerId);
    navigate('/lobby');
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const scanMessages = isCompetitive ? SCAN_MESSAGES_COMPETITIVE : SCAN_MESSAGES_CLASSIC;
  const gameName = classicGame ? (GAME_NAMES[classicGame] || classicGame) : null;

  if (isDisabled) {
    return (
      <div className="min-h-screen bg-[#050609] text-white pt-20 pb-24 px-4">
        <div className="max-w-md mx-auto">
          <div className="glass-card p-8 text-center" style={{ border: '1px solid rgba(255,38,122,0.25)' }}>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'rgba(255,38,122,0.12)', border: '1px solid rgba(255,38,122,0.3)' }}>
              <Clock size={22} className="text-[#FF267A]" />
            </div>
            <h2 className="font-heading text-xl font-bold mb-2">Coming Soon</h2>
            <p className="text-sm text-white/55 mb-6">This game is still in development. Check back soon!</p>
            <button onClick={() => navigate('/lobby')}
              className="w-full px-5 py-3 rounded-xl font-heading font-semibold text-sm tracking-wider text-white transition-all"
              style={{ background: 'linear-gradient(135deg, rgba(176,38,255,0.3), rgba(255,38,122,0.22))', border: '1px solid rgba(255,38,122,0.45)', boxShadow: '0 0 22px rgba(176,38,255,0.3)' }}>
              Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const needsWallet = error.includes('Connect your wallet');
    const needsNetwork = error.includes('Switch to Base');
    return (
      <div className="min-h-screen bg-[#050609] text-white pt-20 pb-24 px-4">
        <div className="max-w-md mx-auto">
          <div className="glass-card p-8 text-center" style={{ border: '1px solid rgba(255,64,64,0.35)' }}>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'rgba(255,64,64,0.12)', border: '1px solid rgba(255,64,64,0.4)' }}>
              <AlertTriangle size={22} className="text-[#FF4040]" />
            </div>
            <h2 className="font-heading text-xl font-bold mb-2">
              {needsWallet ? 'Wallet required' : needsNetwork ? 'Wrong network' : 'Matchmaking error'}
            </h2>
            <p className="text-sm text-white/55 mb-6">{error}</p>
            <div className="space-y-3">
              {needsWallet && (
                <button onClick={() => openConnectModal?.()}
                  className="w-full px-5 py-3 rounded-xl font-heading font-semibold text-sm tracking-wider text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #B026FF, #FF267A)', boxShadow: '0 8px 24px rgba(176,38,255,0.4)' }}>
                  Connect Wallet
                </button>
              )}
              {needsNetwork && (
                <button onClick={() => openChainModal?.()}
                  className="w-full px-5 py-3 rounded-xl font-heading font-semibold text-sm tracking-wider text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, rgba(255,64,64,0.4), rgba(255,159,67,0.3))', border: '1px solid rgba(255,64,64,0.5)' }}>
                  Switch to Base
                </button>
              )}
              <button onClick={() => navigate('/lobby')}
                className="w-full px-5 py-3 rounded-xl font-heading font-semibold text-sm tracking-wider text-white/60 hover:text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Back to Lobby
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050609] text-white pt-20 pb-24 px-4 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] opacity-80"
        style={{
          background:
            'radial-gradient(ellipse at 20% 0%, rgba(176,38,255,0.25), transparent 55%), radial-gradient(ellipse at 80% 10%, rgba(255,38,122,0.18), transparent 55%)',
        }}
      />

      <div className="relative max-w-2xl mx-auto">
        <button
          onClick={handleCancel}
          className="inline-flex items-center gap-2 text-white/55 hover:text-white transition-colors text-sm font-mono mb-8"
        >
          <ArrowLeft size={16} />
          Back to Lobby
        </button>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="glass-card p-8 md:p-10 relative overflow-hidden"
        >
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full blur-[90px] opacity-40 pointer-events-none"
            style={{ background: 'rgba(176,38,255,0.45)' }} />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-[90px] opacity-30 pointer-events-none"
            style={{ background: 'rgba(255,38,122,0.4)' }} />

          <div className="relative flex flex-col items-center text-center">
            {/* Radar */}
            <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
              {[0, 1, 2].map((i) => (
                <motion.div key={i} className="absolute inset-0 rounded-full"
                  style={{ border: '1px solid rgba(255,38,122,0.35)', boxShadow: '0 0 40px rgba(176,38,255,0.25)' }}
                  animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
                />
              ))}
              <div className="absolute inset-4 rounded-full" style={{ border: '1px dashed rgba(255,255,255,0.1)' }} />
              <motion.div className="absolute inset-4 rounded-full origin-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                style={{
                  background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,38,122,0.55) 60deg, transparent 90deg)',
                  WebkitMask: 'radial-gradient(circle, transparent 52%, #000 54%, #000 100%)',
                  mask: 'radial-gradient(circle, transparent 52%, #000 54%, #000 100%)',
                }}
              />
              <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(176,38,255,0.4), rgba(255,38,122,0.28), rgba(255,64,64,0.18))',
                  border: '1px solid rgba(255,255,255,0.22)',
                  boxShadow: '0 0 40px rgba(176,38,255,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}>
                <Radar size={30} className="text-white" strokeWidth={1.8} />
              </div>
            </div>

            <p className="text-[11px] font-heading text-[#FF267A] uppercase tracking-[0.34em] mb-3">
              Matchmaking
            </p>
            <h1 className="font-heading font-bold text-3xl md:text-4xl tracking-tight mb-2">
              {matchFound ? 'Opponent found!' : 'Finding opponent'}
            </h1>
            {currentPlayer && (
              <div className="mb-3">
                <RankChip rp={currentPlayer.rp ?? 0} />
              </div>
            )}
            <p className="text-white/55 text-sm mb-8">
              {isCompetitive
                ? matchFound ? 'Game drawn — entering duel arena' : 'Searching same stake bracket'
                : `${gameName} · Searching for opponent`}
            </p>

            {/* Pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {isCompetitive ? (
                <>
                  <Pill icon={<Coins size={12} />} label={`$${state.wager ?? '—'}`} accent />
                  <Pill label={`${state.currency ?? 'ETH'} · Base`} />
                  <Pill label="Competitive" />
                  <AnimatePresence>
                    {matchFound && matchedGame ? (
                      <motion.span key="game-pill"
                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-heading uppercase tracking-[0.2em]"
                        style={{ background: 'linear-gradient(135deg, rgba(56,245,179,0.25), rgba(56,245,179,0.1))', border: '1px solid rgba(56,245,179,0.55)', color: '#38F5B3', boxShadow: '0 0 18px rgba(56,245,179,0.3)' }}>
                        <Zap size={12} />{GAME_NAMES[matchedGame] ?? matchedGame}
                      </motion.span>
                    ) : (
                      <motion.span key="no-game-pill"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-heading uppercase tracking-[0.2em]"
                        style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.45)' }}>
                        <Shuffle size={12} />Game drawn after match
                      </motion.span>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <>
                  <Pill icon={<Swords size={12} />} label={gameName ?? ''} />
                  <Pill label="Classic" green />
                </>
              )}
            </div>

            {/* Match found reveal */}
            <AnimatePresence>
              {matchFound && matchedGame && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-sm mb-6 rounded-xl p-4 text-center"
                  style={{ background: 'linear-gradient(135deg, rgba(56,245,179,0.12), rgba(56,245,179,0.05))', border: '1px solid rgba(56,245,179,0.35)' }}>
                  <p className="text-[10px] font-heading uppercase tracking-[0.25em] text-[#38F5B3]/70 mb-1">Game selected</p>
                  <p className="font-heading font-bold text-xl text-white">{GAME_NAMES[matchedGame] ?? matchedGame}</p>
                  <p className="text-xs text-white/45 mt-1">Entering arena…</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Searching: progress bar */}
            {!matchFound && (
              <div className="w-full max-w-sm mb-6">
                <div className="relative h-[6px] w-full rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <motion.div className="absolute inset-y-0"
                    animate={{ left: ['-30%', '130%'] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                    style={{ width: '40%', background: 'linear-gradient(90deg, transparent, #B026FF, #FF267A, #FF4040, transparent)', boxShadow: '0 0 18px rgba(255,38,122,0.8), 0 0 32px rgba(176,38,255,0.5)' }}
                  />
                </div>
                <motion.p key={scanIdx}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                  className="mt-3 text-[11px] font-heading uppercase tracking-[0.28em] text-white/65">
                  {scanMessages[scanIdx]}
                </motion.p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-8">
              <StatBox icon={<Clock size={13} />} label="Queue time" value={formatTime(timeElapsed)} />
              <StatBox icon={<Users size={13} />} label="In queue" value={String(queueCount)} accent />
            </div>

            {isCompetitive && !matchFound && (
              <div className="w-full max-w-sm rounded-xl p-4 mb-6 text-left"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-[10px] font-heading uppercase tracking-[0.22em] text-white/35 mb-2">How it works</p>
                <ul className="space-y-1.5 text-xs text-white/55">
                  <li>· Match with another player at ${state.wager} {state.currency} · Base</li>
                  <li>· Game randomly drawn from Chess, Connect 4, Tic-Tac-Toe</li>
                  <li>· Both players lock funds · winner takes pot minus 2.5% fee</li>
                </ul>
              </div>
            )}

            {!matchFound && (
              <button onClick={handleCancel}
                className="px-8 py-3 rounded-xl font-heading font-semibold text-sm tracking-[0.22em] uppercase text-white transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,38,122,0.35)', boxShadow: '0 0 22px rgba(176,38,255,0.18)', backdropFilter: 'blur(10px)' }}>
                Cancel Search
              </button>
            )}
          </div>
        </motion.div>

        <p className="mt-6 text-center text-[11px] font-mono text-white/35">
          {isCompetitive
            ? `Matched by stake · $${state.wager} ${state.currency} · Queue refreshes every 2s`
            : 'Matched globally · Queue refreshes every 2s'}
        </p>
      </div>
    </div>
  );
}

const Pill = ({ icon, label, accent, green }: { icon?: React.ReactNode; label: string; accent?: boolean; green?: boolean }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-heading uppercase tracking-[0.2em]"
    style={{
      background: accent ? 'linear-gradient(135deg, rgba(176,38,255,0.22), rgba(255,38,122,0.18))' : green ? 'rgba(56,245,179,0.12)' : 'rgba(255,255,255,0.035)',
      border: accent ? '1px solid rgba(255,38,122,0.45)' : green ? '1px solid rgba(56,245,179,0.4)' : '1px solid rgba(255,255,255,0.09)',
      color: accent ? '#fff' : green ? '#38F5B3' : 'rgba(255,255,255,0.78)',
      boxShadow: accent ? '0 0 16px rgba(176,38,255,0.25)' : green ? '0 0 12px rgba(56,245,179,0.2)' : 'none',
    }}>
    {icon}{label}
  </span>
);

const StatBox = ({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) => (
  <div className="rounded-xl p-3 text-left" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
    <div className="flex items-center gap-1.5 text-[10px] font-heading uppercase tracking-[0.2em] text-white/45 mb-1">
      {icon}{label}
    </div>
    <p className={`font-mono text-lg ${accent ? 'duel-gradient font-semibold' : 'text-white'}`}>{value}</p>
  </div>
);
