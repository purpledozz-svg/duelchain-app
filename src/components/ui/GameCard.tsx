import { motion } from 'framer-motion';
import { Clock, Users, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GameInfo } from '../../types';
import { Button } from './Button';

interface GameCardProps {
  game: GameInfo;
  activePlayers?: number;
}

export const GameCard = ({ game, activePlayers = 0 }: GameCardProps) => {
  const difficultyColors = {
    Easy: 'text-green-400 border-green-500/30',
    Medium: 'text-orange-400 border-orange-500/30',
    Hard: 'text-red-400 border-red-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -10, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="relative group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-transparent to-cyan-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100" />

      <div className="relative bg-black/60 backdrop-blur-sm border border-purple-500/30 rounded-2xl overflow-hidden hover:border-purple-500/60 transition-all">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-600/20 to-transparent rounded-bl-full" />

        <div className="relative p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
              {game.icon}
            </div>

            <div className={`px-3 py-1 rounded-full border text-xs font-medium ${difficultyColors[game.difficulty]}`}>
              {game.difficulty}
            </div>
          </div>

          <h3 className="text-2xl font-bold mb-2 text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-cyan-400 group-hover:bg-clip-text transition-all">
            {game.name}
          </h3>

          <p className="text-gray-400 text-sm mb-4 line-clamp-2">
            {game.description}
          </p>

          <div className="flex items-center justify-between mb-4 text-sm">
            <div className="flex items-center space-x-1 text-gray-400">
              <Clock size={16} />
              <span>{game.estimatedTime}</span>
            </div>
            <div className="flex items-center space-x-1 text-gray-400">
              <Users size={16} />
              <span>{game.minPlayers}v{game.maxPlayers}</span>
            </div>
            <div className="flex items-center space-x-1 text-green-400">
              <TrendingUp size={16} />
              <span>{activePlayers} playing</span>
            </div>
          </div>

          <Link to={`/game/${game.id}`}>
            <Button className="w-full" variant="primary">
              Play Now
            </Button>
          </Link>
        </div>

        <div className="absolute inset-0 border-2 border-transparent group-hover:border-purple-500/50 rounded-2xl pointer-events-none transition-all" />
      </div>
    </motion.div>
  );
};
