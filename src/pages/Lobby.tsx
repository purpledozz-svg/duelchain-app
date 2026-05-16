import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Swords,
  Wallet,
  ArrowRight,
  Activity,
  Trophy,
  Sparkles,
  Gamepad2,
  Flame,
  Users,
  Check,
  Shuffle,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useAccount, useBalance, useSwitchChain } from 'wagmi';
import { base } from 'wagmi/chains';
import { truncateAddress } from '../lib/wallet';
import { BASE_USDC_ADDRESS } from '../lib/wagmi';
import { useConnectModal, useChainModal } from '@rainbow-me/rainbowkit';
import { CreateProfileModal } from '../components/ui/CreateProfileModal';
import { Player } from '../types';
import { RankChip } from '../components/ui/RankBadge';
import { GAME_CONFIGS, COMPETITIVE_GAMES } from '../config/games';

export { COMPETITIVE_GAMES };

type Mode = 'classic' | 'competitive';
type Currency = 'ETH' | 'USDC';

const GAME_ICONS: Record<string, React.ElementType> = {
  chess: Swords,
  'connect-four': Gamepad2,
  tictactoe: Flame,
  rps: Sparkles,
  reaction: Activity,
};

const GAME_ACCENTS: Record<string, string> = {
  chess: '#B026FF',
  'connect-four': '#FF267A',
  tictactoe: '#FF4040',
  rps: '#B026FF',
  reaction: '#FF267A',
};

const GAMES = GAME_CONFIGS.map((g) => ({
  id: g.id,
  name: g.name,
  players: '2P',
  icon: GAME_ICONS[g.id] ?? Swords,
  accent: GAME_ACCENTS[g.id] ?? '#B026FF',
  comingSoon: g.comingSoon,
}));

const WAGERS = [5, 10, 20, 50, 100, 200, 500, 1000];

const RECENT = [
  { player: 'nova.base', game: 'Chess', amount: 50, result: 'won', time: '2m' },
  { player: 'shadowx', game: 'Connect 4', amount: 20, result: 'won', time: '6m' },
  { player: 'kito', game: 'Reaction', amount: 10, result: 'lost', time: '9m' },
  { player: 'zero.one', game: 'Chess', amount: 200, result: 'won', time: '14m' },
];

const LEADERS = [
  { rank: 1, player: 'wallstreetwolf', winnings: 2840 },
  { rank: 2, player: 'deltabravo', winnings: 1920 },
  { rank: 3, player: 'nightshade', winnings: 1655 },
  { rank: 4, player: 'crypt0.eth', winnings: 1340 },
];

export const Lobby = () => {
  const navigate = useNavigate();
  const { currentPlayer, setCurrentPlayer, prices, isPriceLive, addToast } = useStore();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const { openChainModal } = useChainModal();
  const isOnBase = chainId === base.id;
  const { data: ethBalance } = useBalance({
    address,
    chainId: base.id,
    query: { enabled: isConnected && isOnBase },
  });
  const { data: usdcBalance } = useBalance({
    address,
    token: BASE_USDC_ADDRESS,
    chainId: base.id,
    query: { enabled: isConnected && isOnBase },
  });

  const [mode, setMode] = useState<Mode>('competitive');
  const [currency, setCurrency] = useState<Currency>('ETH');
  const [wager, setWager] = useState<number>(20);
  const [selectedGame, setSelectedGame] = useState<string>('chess');
  const [showProfileModal, setShowProfileModal] = useState(false);

  const ethPrice = prices?.ETH ?? 3200;
  const usdcPrice = 1;

  const cryptoAmount = useMemo(() => {
    if (currency === 'ETH') return (wager / ethPrice).toFixed(5);
    return (wager / usdcPrice).toFixed(2);
  }, [wager, currency, ethPrice]);

  const totalPot = wager * 2;
  const fee = Math.round(totalPot * 0.025 * 100) / 100;
  const payout = totalPot - fee;

  const goPlay = () => {
    // Both modes require a profile
    if (!currentPlayer) {
      setShowProfileModal(true);
      return;
    }

    if (mode === 'competitive') {
      if (!isConnected) {
        openConnectModal?.();
        return;
      }
      if (!isOnBase) {
        openChainModal?.();
        return;
      }
      navigate('/multiplayer/matchmaking/competitive', {
        state: { mode, currency, wager, cryptoAmount },
      });
    } else {
      const gameEntry = GAMES.find((g) => g.id === selectedGame);
      if (gameEntry?.comingSoon) {
        addToast('info', 'Coming soon — this game is still in development.');
        return;
      }
      navigate(`/multiplayer/matchmaking/${selectedGame}`, {
        state: { mode },
      });
    }
  };

  const handleProfileCreated = (player: Player) => {
    setCurrentPlayer(player);
    setShowProfileModal(false);
    // Re-run goPlay now that we have a profile — goPlay checks mode correctly
    if (mode === 'competitive') {
      if (!isConnected) { openConnectModal?.(); return; }
      if (!isOnBase) { openChainModal?.(); return; }
      navigate('/multiplayer/matchmaking/competitive', {
        state: { mode, currency, wager, cryptoAmount },
      });
    } else {
      navigate(`/multiplayer/matchmaking/${selectedGame}`, {
        state: { mode: 'classic' },
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#050609] text-white pt-20 pb-24 md:pb-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-16 h-[480px] opacity-80"
        style={{
          background:
            'radial-gradient(ellipse at 15% 0%, rgba(176,38,255,0.22), transparent 55%), radial-gradient(ellipse at 85% 10%, rgba(255,38,122,0.14), transparent 55%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-10"
        >
          <div>
            <p className="text-[11px] font-heading text-[#FF267A] uppercase tracking-[0.3em] mb-2">
              Lobby
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-heading font-bold tracking-tight">
                {currentPlayer ? `Welcome back, ${currentPlayer.username}.` : 'Pick a fight.'}
              </h1>
              {currentPlayer && (
                <RankChip rp={currentPlayer.rp ?? 0} />
              )}
            </div>
          </div>

          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl flex-wrap"
            style={{
              background: 'rgba(255,255,255,0.035)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected && isOnBase
                    ? 'bg-[#38F5B3] shadow-[0_0_8px_rgba(56,245,179,0.8)]'
                    : isConnected
                      ? 'bg-[#FF9F43] shadow-[0_0_8px_rgba(255,159,67,0.8)]'
                      : 'bg-white/30'
                }`}
              />
              <span className="text-[11px] font-heading text-white/60 uppercase tracking-wider">
                {isConnected ? (isOnBase ? 'Base' : 'Wrong network') : 'Disconnected'}
              </span>
            </div>
            <span className="w-px h-4 bg-white/10" />
            {isConnected && address ? (
              <>
                <span className="font-mono text-xs text-white/80">{truncateAddress(address)}</span>
                {isOnBase && (ethBalance || usdcBalance) && (
                  <>
                    <span className="w-px h-4 bg-white/10" />
                    <span className="font-mono text-[11px] text-white/60">
                      {ethBalance
                        ? `${Number(ethBalance.formatted).toFixed(4)} ETH`
                        : '--'}
                      {usdcBalance
                        ? ` · ${Number(usdcBalance.formatted).toFixed(2)} USDC`
                        : ''}
                    </span>
                  </>
                )}
                {!isOnBase && (
                  <button
                    onClick={() => switchChain({ chainId: base.id })}
                    disabled={isSwitching}
                    className="text-xs font-heading text-[#FF267A] hover:text-white transition-colors disabled:opacity-50"
                  >
                    {isSwitching ? 'Switching...' : 'Switch to Base'}
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => openConnectModal?.()}
                className="inline-flex items-center gap-1.5 text-xs font-heading text-white hover:text-[#FF267A] transition-colors"
              >
                <Wallet size={13} />
                Connect wallet
              </button>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <AnimatePresence mode="wait">
              {mode === 'classic' ? (
                <motion.div
                  key="game-selector"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="glass-card p-6"
                >
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="font-heading font-semibold text-white text-lg">Choose your game</h2>
                    <span className="text-[11px] font-heading text-white/40 uppercase tracking-[0.2em]">
                      {GAMES.filter((g) => !g.comingSoon).length} available
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {GAMES.map((g) => {
                      const active = selectedGame === g.id && !g.comingSoon;
                      return (
                        <button
                          key={g.id}
                          onClick={() => {
                            if (g.comingSoon) {
                              addToast('info', 'Coming soon — this game is still in development.');
                              return;
                            }
                            setSelectedGame(g.id);
                          }}
                          className="relative text-left rounded-xl p-4 transition-all duration-300"
                          style={{
                            background: active
                              ? `linear-gradient(135deg, ${g.accent}26, rgba(255,255,255,0.02))`
                              : 'rgba(255,255,255,0.025)',
                            border: active
                              ? `1px solid ${g.accent}66`
                              : '1px solid rgba(255,255,255,0.08)',
                            boxShadow: active ? `0 0 22px ${g.accent}33` : 'none',
                            opacity: g.comingSoon ? 0.55 : 1,
                          }}
                        >
                          {g.comingSoon && (
                            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-heading font-bold uppercase tracking-[0.1em]"
                              style={{ background: 'rgba(255,38,122,0.15)', border: '1px solid rgba(255,38,122,0.3)', color: '#FF267A' }}>
                              Soon
                            </span>
                          )}
                          <g.icon
                            size={20}
                            className="mb-3"
                            color={active ? g.accent : '#ffffff99'}
                            strokeWidth={1.8}
                          />
                          <p className="font-heading font-semibold text-sm text-white">{g.name}</p>
                          <p className="text-[10px] font-heading text-white/40 uppercase tracking-wider mt-0.5">
                            {g.players}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="competitive-game-notice"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="glass-card p-6 flex items-start gap-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(176,38,255,0.1), rgba(255,38,122,0.06), rgba(255,255,255,0.02))',
                    border: '1px solid rgba(176,38,255,0.3)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: 'rgba(176,38,255,0.18)',
                      border: '1px solid rgba(176,38,255,0.4)',
                    }}
                  >
                    <Shuffle size={18} className="text-[#B026FF]" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-white mb-1">
                      Game is randomly selected
                    </p>
                    <p className="text-sm text-white/60 leading-relaxed">
                      Competitive games are drawn after matchmaking. Chess, Connect Four, or Tic-Tac-Toe — each with equal probability.
                    </p>
                    <p className="text-[11px] text-white/40 mt-2 font-mono uppercase tracking-wider">
                      Revealed after both players are matched
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="glass-card p-6">
              <h2 className="font-heading font-semibold text-white text-lg mb-5">Mode</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setMode('classic')}
                  className="text-left rounded-xl p-5 transition-all duration-300"
                  style={{
                    background:
                      mode === 'classic'
                        ? 'linear-gradient(135deg, rgba(56,245,179,0.18), rgba(255,255,255,0.02))'
                        : 'rgba(255,255,255,0.025)',
                    border:
                      mode === 'classic'
                        ? '1px solid rgba(56,245,179,0.5)'
                        : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: mode === 'classic' ? '0 0 24px rgba(56,245,179,0.2)' : 'none',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-2 text-[11px] font-heading uppercase tracking-[0.22em] text-white/60">
                      <Users size={12} /> Classic
                    </span>
                    {mode === 'classic' && (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center bg-[#38F5B3]/20 border border-[#38F5B3]/50">
                        <Check size={10} className="text-[#38F5B3]" />
                      </span>
                    )}
                  </div>
                  <p className="font-heading font-semibold text-white text-lg mb-1.5">
                    No wager. Just skill.
                  </p>
                  <p className="text-xs text-white/55">
                    Challenge friends or play casual matches.
                  </p>
                </button>

                <button
                  onClick={() => setMode('competitive')}
                  className="text-left rounded-xl p-5 transition-all duration-300"
                  style={{
                    background:
                      mode === 'competitive'
                        ? 'linear-gradient(135deg, rgba(176,38,255,0.22), rgba(255,38,122,0.12), rgba(255,255,255,0.02))'
                        : 'rgba(255,255,255,0.025)',
                    border:
                      mode === 'competitive'
                        ? '1px solid rgba(176,38,255,0.6)'
                        : '1px solid rgba(255,255,255,0.08)',
                    boxShadow:
                      mode === 'competitive' ? '0 0 28px rgba(176,38,255,0.25)' : 'none',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-2 text-[11px] font-heading uppercase tracking-[0.22em] text-white/60">
                      <Flame size={12} /> Competitive
                    </span>
                    {mode === 'competitive' && (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center bg-[#FF267A]/20 border border-[#FF267A]/50">
                        <Check size={10} className="text-[#FF267A]" />
                      </span>
                    )}
                  </div>
                  <p className="font-heading font-semibold text-white text-lg mb-1.5">
                    Lock a wager. Win the pot.
                  </p>
                  <p className="text-xs text-white/55">
                    Both stakes escrowed on Base. Winner collects instantly.
                  </p>
                </button>
              </div>
            </div>

            {mode === 'competitive' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="glass-card p-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-heading font-semibold text-white text-lg">Stake</h2>
                  <div className="flex items-center gap-2">
                    {(['ETH', 'USDC'] as Currency[]).map((c) => (
                      <button
                        key={c}
                        onClick={() => setCurrency(c)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-heading uppercase tracking-[0.18em] transition-all"
                        style={{
                          background:
                            currency === c
                              ? 'linear-gradient(135deg, #B026FF, #FF267A)'
                              : 'rgba(255,255,255,0.04)',
                          border:
                            currency === c
                              ? '1px solid rgba(255,255,255,0.3)'
                              : '1px solid rgba(255,255,255,0.08)',
                          color: currency === c ? '#fff' : 'rgba(255,255,255,0.6)',
                          boxShadow:
                            currency === c ? '0 0 18px rgba(176,38,255,0.35)' : 'none',
                        }}
                      >
                        {c} · Base
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-6">
                  {WAGERS.map((w) => {
                    const active = wager === w;
                    return (
                      <button
                        key={w}
                        onClick={() => setWager(w)}
                        className="py-3 rounded-lg font-heading font-semibold text-sm transition-all duration-200"
                        style={{
                          background: active
                            ? 'linear-gradient(135deg, rgba(176,38,255,0.3), rgba(255,38,122,0.2))'
                            : 'rgba(255,255,255,0.03)',
                          border: active
                            ? '1px solid rgba(176,38,255,0.55)'
                            : '1px solid rgba(255,255,255,0.08)',
                          color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                          boxShadow: active ? '0 0 18px rgba(176,38,255,0.3)' : 'none',
                        }}
                      >
                        ${w}
                      </button>
                    );
                  })}
                </div>

                <div
                  className="rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <Stat label="Your stake" value={`$${wager}`} sub={`${cryptoAmount} ${currency}`} />
                  <Stat label="Total pot" value={`$${totalPot}`} sub="Both players" />
                  <Stat label="Fee (2.5%)" value={`$${fee}`} sub="DUELCHAIN" />
                  <Stat
                    label="Winner payout"
                    value={`$${payout}`}
                    sub="Instant settlement"
                    highlight
                  />
                </div>

                <p className="mt-4 text-[11px] text-white/40 font-mono">
                  {isPriceLive ? 'Live price feed' : 'Indicative price'} · ETH ≈ $
                  {Math.round(ethPrice).toLocaleString()}
                </p>
              </motion.div>
            )}

            {mode === 'classic' && (
              <div
                className="glass-card p-6 flex items-start gap-4"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(56,245,179,0.08), rgba(255,255,255,0.02))',
                  borderColor: 'rgba(56,245,179,0.25)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'rgba(56,245,179,0.15)',
                    border: '1px solid rgba(56,245,179,0.3)',
                  }}
                >
                  <Users size={18} className="text-[#38F5B3]" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-white">No wager. Just skill.</p>
                  <p className="text-sm text-white/60 mt-1">
                    Matched with another player searching the same game. Pure bragging rights.
                  </p>
                </div>
              </div>
            )}

            {mode === 'competitive' && (
              <p className="text-[11px] text-white/40 font-mono text-center">
                You'll be matched with another player at the same stake. Game is randomly selected after match.
              </p>
            )}

            <button
              onClick={goPlay}
              className="w-full group relative inline-flex items-center justify-center gap-3 px-8 py-5 rounded-xl font-heading font-semibold text-sm tracking-[0.24em] uppercase text-white overflow-hidden"
              style={{
                background:
                  mode === 'competitive'
                    ? 'linear-gradient(135deg, #B026FF 0%, #FF267A 60%, #FF4040 100%)'
                    : 'linear-gradient(135deg, rgba(56,245,179,0.35), rgba(176,38,255,0.25))',
                boxShadow:
                  mode === 'competitive'
                    ? '0 12px 44px rgba(176,38,255,0.5), inset 0 1px 0 rgba(255,255,255,0.2)'
                    : '0 12px 44px rgba(56,245,179,0.28), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
            >
              {mode === 'competitive' ? (
                <>
                  Find Opponent · ${wager}
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </>
              ) : (
                <>
                  Find Opponent
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>

          <div className="space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-heading font-semibold text-white text-sm uppercase tracking-[0.2em]">
                  Live duels
                </h3>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#FF267A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF267A] animate-pulse" />
                  24 online
                </span>
              </div>
              <ul className="space-y-3">
                {RECENT.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-7 h-7 rounded-full flex-shrink-0"
                        style={{
                          background:
                            'linear-gradient(135deg, #B026FF, #FF267A)',
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-white truncate">{r.player}</p>
                        <p className="text-[11px] text-white/40">
                          {r.game} · {r.time} ago
                        </p>
                      </div>
                    </div>
                    <span
                      className="font-mono text-xs"
                      style={{ color: r.result === 'won' ? '#38F5B3' : '#FF4040' }}
                    >
                      {r.result === 'won' ? '+' : '-'}${r.amount}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-heading font-semibold text-white text-sm uppercase tracking-[0.2em]">
                  Top players
                </h3>
                <button
                  onClick={() => navigate('/leaderboard')}
                  className="text-[11px] font-heading text-white/50 hover:text-white uppercase tracking-[0.2em] transition-colors inline-flex items-center gap-1"
                >
                  View all <ArrowRight size={10} />
                </button>
              </div>
              <ul className="space-y-3">
                {LEADERS.map((l) => (
                  <li key={l.rank} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-heading font-bold"
                        style={{
                          background:
                            l.rank === 1
                              ? 'linear-gradient(135deg, #FF9F43, #FF267A)'
                              : 'rgba(255,255,255,0.05)',
                          color: l.rank === 1 ? '#fff' : 'rgba(255,255,255,0.6)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {l.rank}
                      </span>
                      <span className="text-white truncate">{l.player}</span>
                    </div>
                    <span className="font-mono text-xs text-white/80">
                      ${l.winnings.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => navigate('/party/create')}
              className="w-full glass-card p-5 text-left hover:-translate-y-0.5 transition-transform"
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,38,122,0.3), rgba(255,159,67,0.2))',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  <Users size={14} className="text-white" />
                </div>
                <p className="font-heading font-semibold text-sm text-white">
                  Create a party
                </p>
              </div>
              <p className="text-xs text-white/55">
                Create a private room, choose a game, and invite a friend.
              </p>
            </button>

            <button
              onClick={() => navigate('/multiplayer/join')}
              className="w-full glass-card p-5 text-left hover:-translate-y-0.5 transition-transform"
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(176,38,255,0.3), rgba(255,38,122,0.2))',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  <Trophy size={14} className="text-white" />
                </div>
                <p className="font-heading font-semibold text-sm text-white">
                  Join with party code
                </p>
              </div>
              <p className="text-xs text-white/55">
                Got a 6-character code from a friend? Jump straight in.
              </p>
            </button>
          </div>
        </div>
      </div>

      <CreateProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onCreated={handleProfileCreated}
        walletAddress={address ?? null}
      />
    </div>
  );
};

const Stat = ({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) => (
  <div>
    <p className="text-[10px] font-heading uppercase tracking-[0.2em] text-white/40 mb-1.5">
      {label}
    </p>
    <p
      className={`font-heading font-bold text-xl ${highlight ? 'duel-gradient' : 'text-white'}`}
    >
      {value}
    </p>
    <p className="text-[11px] text-white/45 mt-0.5">{sub}</p>
  </div>
);

export default Lobby;
