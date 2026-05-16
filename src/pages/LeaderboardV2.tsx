import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, ArrowLeft, Crown, Flame, Clock, Swords } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { RankBadge } from '../components/ui/RankBadge';
import { PlayerAvatar } from '../components/ui/PlayerAvatar';

interface LeaderboardEntry {
  wallet: string;
  username: string;
  avatar_url?: string | null;
  games_played: number;
  wins: number;
  earned_usd: number;
  rank: number;
  prize_usd: number;
  rp?: number;
}

const PRIZE_POOLS_USD = {
  overall: [6400, 3200, 1600, 640, 320, 160, 160, 160, 160, 160],
  perGame: [1600, 800, 320, 80, 80, 80, 80, 80, 80, 80],
};

const GAMES = [
  { id: 'overall', name: 'Overall' },
  { id: 'ranked', name: 'Ranked' },
  { id: 'chess', name: 'Chess' },
  { id: 'connect-four', name: 'Connect 4' },
  { id: 'tictactoe', name: 'Tic-Tac-Toe' },
];

const ACCENT = '#FF267A';
const ACCENT_2 = '#B026FF';
const ACCENT_3 = '#FF4040';

export const LeaderboardV2 = () => {
  const [selectedGame, setSelectedGame] = useState<string>('overall');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeUntilReset, setTimeUntilReset] = useState('');
  const { walletAddress } = useStore();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      const currentMonth = new Date().toISOString().slice(0, 7);

      if (selectedGame === 'overall') {
        const { data: players } = await supabase
          .from('leaderboard_overall')
          .select('*')
          .limit(10);

        if (players) {
          setEntries(
            players.map((p, idx) => ({
              wallet: p.wallet_address,
              username: p.username,
              avatar_url: p.avatar_url ?? null,
              games_played: p.total_games || 0,
              wins: p.total_wins || 0,
              earned_usd: p.total_earned_usd || 0,
              rank: idx + 1,
              prize_usd: PRIZE_POOLS_USD.overall[idx] ?? 0,
              rp: p.rp || 0,
            }))
          );
        } else {
          setEntries([]);
        }
      } else if (selectedGame === 'ranked') {
        const { data: players } = await supabase
          .from('leaderboard_ranked')
          .select('*')
          .limit(10);

        if (players) {
          setEntries(
            players.map((p, idx) => ({
              wallet: p.wallet_address,
              username: p.username,
              avatar_url: p.avatar_url ?? null,
              games_played: (p.competitive_wins || 0) + (p.competitive_losses || 0),
              wins: p.competitive_wins || 0,
              earned_usd: p.total_earned_usd || 0,
              rank: idx + 1,
              prize_usd: PRIZE_POOLS_USD.overall[idx] ?? 0,
              rp: p.rp || 0,
            }))
          );
        } else {
          setEntries([]);
        }
      } else {
        const { data: stats } = await supabase
          .from('leaderboard_game_stats')
          .select('*')
          .eq('game_type', selectedGame)
          .eq('month', currentMonth)
          .order('earned_usd', { ascending: false })
          .limit(10);

        if (stats) {
          setEntries(
            stats.map((s: any, idx: number) => ({
              wallet: s.wallet_address,
              username: s.username,
              avatar_url: s.avatar_url ?? null,
              games_played: s.games_played || 0,
              wins: s.wins || 0,
              earned_usd: s.earned_usd || 0,
              rank: idx + 1,
              prize_usd: PRIZE_POOLS_USD.perGame[idx] ?? 0,
            }))
          );
        } else {
          setEntries([]);
        }
      }

      setLoading(false);
    };

    fetchLeaderboard();
  }, [selectedGame]);

  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const diff = nextMonth.getTime() - now.getTime();
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      setTimeUntilReset(`${days}d ${hours}h`);
    };
    calc();
    const i = setInterval(calc, 60000);
    return () => clearInterval(i);
  }, []);

  const totalPool =
    selectedGame === 'overall'
      ? PRIZE_POOLS_USD.overall.reduce((a, b) => a + b, 0)
      : PRIZE_POOLS_USD.perGame.reduce((a, b) => a + b, 0);

  const myEntry = walletAddress ? entries.find((e) => e.wallet === walletAddress) : undefined;
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="min-h-screen bg-[#050609] text-white pt-20 pb-24 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px] opacity-80"
        style={{
          background:
            'radial-gradient(ellipse at 20% 0%, rgba(176,38,255,0.25), transparent 55%), radial-gradient(ellipse at 80% 10%, rgba(255,38,122,0.2), transparent 55%)',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/lobby"
          className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-mono mb-8"
        >
          <ArrowLeft size={16} />
          Back to Lobby
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <div>
            <p className="text-[11px] font-heading text-[#FF267A] uppercase tracking-[0.3em] mb-3">
              Monthly rankings
            </p>
            <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tight">
              Leaderboard
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 text-white/60 text-sm font-mono">
            <Clock size={14} className="text-[#FF267A]" />
            Resets in {timeUntilReset}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="glass-card p-6 md:col-span-2 relative overflow-hidden">
            <div
              className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-[80px] opacity-50"
              style={{ background: 'rgba(176,38,255,0.4)' }}
            />
            <p className="text-[11px] font-heading text-white/50 uppercase tracking-[0.22em] mb-2 relative">
              Total prize pool
            </p>
            <p className="font-heading font-bold text-4xl md:text-5xl duel-gradient relative">
              ${totalPool.toLocaleString()}
            </p>
            <p className="text-sm text-white/55 mt-2 relative">
              Split across the top 10 {selectedGame === 'overall' ? 'duelists' : 'players in this game'} this month.
            </p>
          </div>

          <div className="glass-card p-6">
            <p className="text-[11px] font-heading text-white/50 uppercase tracking-[0.22em] mb-2">
              Your rank
            </p>
            {myEntry ? (
              <>
                <p className="font-heading font-bold text-3xl text-white">#{myEntry.rank}</p>
                <p className="text-sm text-white/55 mt-1">
                  ${myEntry.earned_usd.toFixed(0)} earned · ${myEntry.prize_usd} prize
                </p>
              </>
            ) : (
              <>
                <p className="font-heading font-bold text-3xl text-white/40">—</p>
                <p className="text-sm text-white/55 mt-1">
                  Play a ranked duel to enter.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {GAMES.map((g) => {
            const active = selectedGame === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGame(g.id)}
                className="px-4 py-2 rounded-lg text-xs font-heading uppercase tracking-[0.2em] transition-all"
                style={{
                  background: active
                    ? 'linear-gradient(135deg, rgba(176,38,255,0.28), rgba(255,38,122,0.22))'
                    : 'rgba(255,255,255,0.03)',
                  border: active
                    ? '1px solid rgba(255,38,122,0.5)'
                    : '1px solid rgba(255,255,255,0.08)',
                  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                  boxShadow: active ? '0 0 18px rgba(176,38,255,0.3)' : 'none',
                }}
              >
                {g.name}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="glass-card p-12 text-center text-white/50 font-mono text-sm">
            Loading leaderboard…
          </div>
        ) : entries.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Trophy size={32} className="mx-auto mb-4 text-white/20" strokeWidth={1.5} />
            <p className="font-heading font-semibold text-white/40 text-sm mb-1">No ranked matches yet</p>
            <p className="text-white/25 font-mono text-xs">Competitive results will appear here once duels are played.</p>
          </div>
        ) : (
          <>
            {top3.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {top3.map((entry) => {
                  const accent =
                    entry.rank === 1 ? ACCENT : entry.rank === 2 ? ACCENT_2 : ACCENT_3;
                  const winRate =
                    entry.games_played > 0
                      ? ((entry.wins / entry.games_played) * 100).toFixed(0)
                      : '0';
                  return (
                    <motion.div
                      key={`${entry.rank}-${entry.username}`}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: entry.rank * 0.08 }}
                      className="relative rounded-2xl p-6 overflow-hidden"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))',
                        border: `1px solid ${accent}55`,
                        boxShadow: `0 10px 40px rgba(0,0,0,0.45), 0 0 32px ${accent}22`,
                      }}
                    >
                      <div
                        className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-[70px] opacity-40"
                        style={{ background: accent }}
                      />
                      <div className="relative flex items-center justify-between mb-5">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{
                            background: `${accent}22`,
                            border: `1px solid ${accent}55`,
                          }}
                        >
                          {entry.rank === 1 ? (
                            <Crown size={18} color={accent} />
                          ) : (
                            <Flame size={16} color={accent} />
                          )}
                        </div>
                        <span
                          className="font-heading font-bold text-4xl"
                          style={{ color: accent, opacity: 0.3 }}
                        >
                          #{entry.rank}
                        </span>
                      </div>
                      <Link
                        to={`/profile/${entry.username}`}
                        className="relative block group"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <PlayerAvatar
                            username={entry.username}
                            avatarUrl={entry.avatar_url}
                            size={40}
                            shape="circle"
                          />
                          <p className="font-heading font-semibold text-white text-lg leading-tight group-hover:opacity-90">
                            {entry.username}
                          </p>
                        </div>
                        {entry.wallet && (
                          <p className="text-[11px] font-mono text-white/40 mb-2">
                            {entry.wallet.slice(0, 6)}…{entry.wallet.slice(-4)}
                          </p>
                        )}
                        {entry.rp !== undefined && (
                          <div className="mb-3">
                            <RankBadge rp={entry.rp} size="xs" showRp />
                          </div>
                        )}
                        <div className={`grid grid-cols-3 gap-3 ${entry.wallet || entry.rp !== undefined ? '' : 'mt-5'}`}>
                          <MiniStat label="Games" value={entry.games_played} />
                          <MiniStat label="Win %" value={`${winRate}%`} />
                          <MiniStat label="Prize" value={`$${entry.prize_usd}`} emphasis />
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-[10px] font-heading uppercase tracking-[0.22em] text-white/40 border-b border-white/5">
                <div className="col-span-1">Rank</div>
                <div className="col-span-4">Player</div>
                <div className="col-span-2">Games</div>
                <div className="col-span-2">Win rate</div>
                <div className="col-span-2">{selectedGame === 'ranked' ? 'RP' : 'Earned'}</div>
                <div className="col-span-1 text-right">Prize</div>
              </div>

              {rest.map((entry, idx) => {
                const winRate =
                  entry.games_played > 0
                    ? ((entry.wins / entry.games_played) * 100).toFixed(0)
                    : '0';
                const isMe = walletAddress ? entry.wallet === walletAddress : false;
                return (
                  <motion.div
                    key={`${entry.rank}-${entry.username}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <Link
                      to={`/profile/${entry.username}`}
                      className="grid grid-cols-2 md:grid-cols-12 gap-4 items-center px-6 py-4 transition-colors hover:bg-white/[0.03] border-t border-white/5"
                      style={{
                        background: isMe
                          ? 'linear-gradient(90deg, rgba(255,38,122,0.08), transparent)'
                          : 'transparent',
                      }}
                    >
                      <div className="md:col-span-1">
                        <span className="font-heading font-semibold text-white/70">
                          #{entry.rank}
                        </span>
                      </div>
                      <div className="md:col-span-4 flex items-center gap-3">
                        <PlayerAvatar
                          username={entry.username}
                          avatarUrl={entry.avatar_url}
                          size={32}
                          shape="circle"
                        />
                        <div className="min-w-0">
                          <p className="font-heading font-semibold text-white truncate">
                            {entry.username}
                            {isMe && (
                              <span className="ml-2 text-[10px] font-heading uppercase tracking-[0.2em] text-[#FF267A]">
                                You
                              </span>
                            )}
                          </p>
                          {entry.rp !== undefined
                            ? <RankBadge rp={entry.rp} size="xs" />
                            : entry.wallet && (
                              <p className="text-[11px] font-mono text-white/40 truncate">
                                {entry.wallet.slice(0, 6)}…{entry.wallet.slice(-4)}
                              </p>
                            )
                          }
                        </div>
                      </div>
                      <div className="md:col-span-2 font-mono text-sm text-white/75">
                        {entry.games_played}
                      </div>
                      <div className="md:col-span-2 font-mono text-sm text-white/75">
                        {winRate}%
                      </div>
                      <div className="md:col-span-2 font-mono text-sm text-white">
                        {selectedGame === 'ranked'
                          ? `${(entry.rp ?? 0).toLocaleString()} RP`
                          : `$${entry.earned_usd.toFixed(0)}`
                        }
                      </div>
                      <div className="md:col-span-1 md:text-right">
                        <span
                          className="font-heading font-semibold text-sm"
                          style={{
                            color:
                              entry.prize_usd > 0 ? '#FF267A' : 'rgba(255,255,255,0.4)',
                          }}
                        >
                          ${entry.prize_usd}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const MiniStat = ({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string | number;
  emphasis?: boolean;
}) => (
  <div>
    <p className="text-[9px] font-heading uppercase tracking-[0.2em] text-white/40 mb-1">
      {label}
    </p>
    <p
      className={`font-heading font-semibold text-sm ${
        emphasis ? 'duel-gradient' : 'text-white'
      }`}
    >
      {value}
    </p>
  </div>
);

export default LeaderboardV2;
