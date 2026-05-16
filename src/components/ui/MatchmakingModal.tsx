import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { BET_PRESETS } from '../../lib/games';
import { formatEth } from '../../lib/wallet';

interface MatchmakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMatch: (betAmount: number) => void;
  isSearching: boolean;
}

export const MatchmakingModal = ({
  isOpen,
  onClose,
  onStartMatch,
  isSearching,
}: MatchmakingModalProps) => {
  const handleBetSelect = (amount: number) => {
    onStartMatch(amount);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative max-w-md w-full pointer-events-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-cyan-600/30 rounded-3xl blur-2xl" />

              <div className="relative bg-black/90 backdrop-blur-xl border border-purple-500/50 rounded-3xl p-8">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>

                {!isSearching ? (
                  <div>
                    <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                      Select Bet Amount
                    </h2>
                    <p className="text-gray-400 mb-6">
                      Choose how much ETH you want to wager
                    </p>

                    <div className="space-y-3">
                      {BET_PRESETS.map((amount) => (
                        <button
                          key={amount}
                          onClick={() => handleBetSelect(amount)}
                          className="w-full p-4 bg-black/40 border border-purple-500/30 rounded-xl hover:border-purple-500 hover:bg-purple-500/10 transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-white group-hover:text-purple-400 transition-colors">
                              {formatEth(amount)} ETH
                            </span>
                            <span className="text-sm text-gray-400">
                              Win: {formatEth(amount * 2 * 0.95)} ETH
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-full flex items-center justify-center"
                    >
                      <Loader2 size={48} className="text-white" />
                    </motion.div>

                    <h3 className="text-2xl font-bold mb-2 text-white">
                      Finding Opponent...
                    </h3>
                    <p className="text-gray-400 mb-6">
                      Searching for a worthy challenger
                    </p>

                    <div className="flex justify-center space-x-2 mb-6">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                          className="w-3 h-3 bg-purple-500 rounded-full"
                        />
                      ))}
                    </div>

                    <Button onClick={onClose} variant="outline">
                      Cancel Search
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
