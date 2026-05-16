import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { NoiseBackground } from '../components/ui/ParticlesBackground';
import { supabase } from '../lib/supabase';
import { Player } from '../types';
import { formatEth, calculateWinRate, generateAvatar } from '../lib/wallet';

export const Leaderboard = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [sortBy, setSortBy] = useState<'earnings' | 'wins' | 'winrate'>('earnings');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy]);

  const fetchLeaderboard = async () => {
    setLoading(true);

    let query = supabase.from('leaderboard_overall').select('*');

    if (sortBy === 'earnings') {
      query = query.order('total_earned_usd', { ascending: false });
    } else if (sortBy === 'wins') {
      query = query.order('total_wins', { ascending: false });
    } else {
      query = query.order('total_wins', { ascending: false });
    }

    const { data } = await query.limit(50);

    if (data) {
      let sortedData = [...(data as Player[])];

      if (sortBy === 'winrate') {
        sortedData = sortedData
          .filter((p) => p.total_games >= 3)
          .sort((a, b) => {
            const winRateA = calculateWinRate(a.total_wins, a.total_games);
            const winRateB = calculateWinRate(b.total_wins, b.total_games);
            return winRateB - winRateA;
          });
      }

      setPlayers(sortedData);
    }

    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="text-yellow-400" size={32} />;
    if (rank === 2) return <Medal className="text-gray-300" size={32} />;
    if (rank === 3) return <Award className="text-orange-400" size={32} />;
    return <span className="text-2xl font-bold text-gray-400">#{rank}</span>;
  };

  const sortOptions = [
    { value: 'earnings', label: 'Top Earners', icon: Trophy },
    { value: 'wins', label: 'Most Wins', icon: Award },
    { value: 'winrate', label: 'Win Rate', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-primary text-text-primary pt-20 pb-20">
      <NoiseBackground />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="text-center mb-8">
            <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Leaderboard
            </h1>
            <p className="text-gray-400 text-lg">
              Compete with the best players in DuelChain
            </p>
          </div>

          <div className="flex justify-center gap-4 mb-8">
            {sortOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value as typeof sortBy)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                    sortBy === option.value
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                      : 'bg-black/40 border border-purple-500/30 text-gray-400 hover:border-purple-500'
                  }`}
                >
                  <Icon size={20} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {loading ? (
          <div className="text-center py-20">
            <div className="text-2xl text-gray-400">Loading leaderboard...</div>
          </div>
        ) : players.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-12 text-center">
            <Trophy size={64} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No players yet. Be the first!</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {players.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-black/60 backdrop-blur-xl border ${
                  index < 3 ? 'border-purple-500/60' : 'border-purple-500/30'
                } rounded-2xl p-6 hover:border-purple-500 transition-all group`}
              >
                <Link to={`/profile/${player.username}`}>
                  <div className="flex items-center gap-6">
                    <div className="w-16 flex items-center justify-center">
                      {getRankIcon(index + 1)}
                    </div>

                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: generateAvatar(player.avatar_seed) }}
                    >
                      {player.username.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-cyan-400 group-hover:bg-clip-text transition-all">
                        {player.username}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {player.total_games} games played
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-8 text-center">
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Earnings</p>
                        <p className="text-lg font-bold text-green-400">
                          {formatEth(player.total_earnings)} ETH
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Wins</p>
                        <p className="text-lg font-bold text-cyan-400">
                          {player.total_wins}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm mb-1">Win Rate</p>
                        <p className="text-lg font-bold text-purple-400">
                          {calculateWinRate(player.total_wins, player.total_games)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        {players.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-center"
          >
            <div className="inline-block bg-gradient-to-r from-purple-600/20 to-cyan-600/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6">
              <p className="text-gray-400">
                Showing top {players.length} players
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
