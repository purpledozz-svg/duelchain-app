import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, User, Loader2 } from 'lucide-react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { NeonButton } from '../components/ui/NeonButton';
import { AnimatedBackground } from '../components/ui/ParticlesBackground';
import { DuelchainConnectButton } from '../components/wallet/DuelchainConnectButton';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { getPlayerId } from '../lib/playerId';
import { Player } from '../types';

export const ConnectWallet = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { setCurrentPlayer, setWalletAddress, addToast } = useStore();
  const [step, setStep] = useState<'connect' | 'username'>('connect');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkExistingPlayer = async () => {
      if (isConnected && address) {
        setIsLoading(true);
        setWalletAddress(address);

        try {
          const { data: existingRows, error } = await supabase.rpc(
            'get_player_by_wallet',
            { p_wallet: address }
          );
          const existingPlayer = existingRows && existingRows.length > 0 ? existingRows[0] : null;

          if (error) {
            addToast('error', 'Failed to check existing player');
            setIsLoading(false);
            return;
          }

          if (existingPlayer) {
            setCurrentPlayer(existingPlayer as Player);
            addToast('success', `Welcome back, ${existingPlayer.username}!`);
            navigate('/lobby');
          } else {
            setStep('username');
          }
        } catch (err) {
          console.error('Unexpected error:', err);
          addToast('error', 'Connection error');
        }

        setIsLoading(false);
      }
    };

    checkExistingPlayer();
  }, [isConnected, address, setWalletAddress, setCurrentPlayer, navigate, addToast]);

  const handleCreateProfile = async () => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (username.length < 3 || username.length > 16) {
      setError('Username must be between 3 and 16 characters');
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      setError('Username can only contain letters and numbers');
      return;
    }

    setIsLoading(true);
    setError('');

    const { data: isTaken } = await supabase.rpc('check_username_taken', {
      p_username: username,
    });

    if (isTaken) {
      setError('Username already taken');
      setIsLoading(false);
      return;
    }

    const { data: rows, error: insertError } = await supabase.rpc('create_player_profile', {
      p_username: username,
      p_username_lower: username.toLowerCase(),
      p_player_id: getPlayerId(),
      p_password_hash: '',
      p_wallet_address: address ?? '',
      p_bio: '',
    });

    if (insertError) {
      setError(
        insertError.message?.includes('USERNAME_TAKEN')
          ? 'Username already taken'
          : 'Failed to create profile. Please try again.'
      );
      setIsLoading(false);
      return;
    }

    const newPlayer = Array.isArray(rows) ? rows[0] : rows;
    if (!newPlayer) {
      setError('Failed to create profile. Please try again.');
      setIsLoading(false);
      return;
    }

    setCurrentPlayer(newPlayer as Player);
    addToast('success', `Welcome to DuelChain, ${username}!`);
    navigate('/lobby');
  };

  return (
    <div className="min-h-screen bg-primary text-text-primary flex items-center justify-center p-4">
      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-md w-full"
      >
        <div className="rounded-2xl bg-secondary/80 backdrop-blur-xl border border-glass-border p-8 shadow-glass">
          {step === 'connect' ? (
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-16 h-16 mx-auto mb-6 rounded-xl bg-gradient-to-br from-[#B026FF]/20 to-[#FF267A]/20 border border-glass-border flex items-center justify-center shadow-neon"
              >
                <Wallet size={28} className="text-white" strokeWidth={1.5} />
              </motion.div>

              <h2 className="text-3xl font-heading font-bold mb-4 text-text-primary">
                Connect <span className="text-gradient">Wallet</span>
              </h2>

              <p className="text-sm font-body text-text-secondary mb-8 leading-relaxed">
                Connect your crypto wallet on Base to access DUELCHAIN
              </p>

              <div className="flex justify-center mb-6">
                <DuelchainConnectButton compact />
              </div>

              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-white/60 text-sm">
                  <Loader2 className="animate-spin" size={16} />
                  <span>Loading profile...</span>
                </div>
              )}

              <p className="text-xs font-body text-text-muted mt-4">
                MetaMask · Rabby · WalletConnect · Browser wallet
              </p>
            </div>
          ) : (
            <div>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="w-16 h-16 mx-auto mb-6 rounded-xl bg-gradient-to-br from-[#B026FF]/20 to-[#FF267A]/20 border border-glass-border flex items-center justify-center shadow-neon"
              >
                <User size={28} className="text-white" strokeWidth={1.5} />
              </motion.div>

              <h2 className="text-3xl font-heading font-bold mb-4 text-center text-text-primary">
                Create <span className="text-gradient">Username</span>
              </h2>

              <p className="text-sm font-body text-text-secondary mb-6 text-center leading-relaxed">
                Choose a unique username for your profile
              </p>

              <div className="mb-6">
                <label className="block text-xs font-body font-medium text-text-secondary mb-2 uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateProfile()}
                  placeholder="Enter username"
                  className="w-full px-4 py-3 bg-primary/50 border border-glass-border rounded-xl font-body text-text-primary placeholder-text-muted focus:outline-none focus:border-[#FF267A]/50 focus:shadow-neon transition-all duration-300"
                  disabled={isLoading}
                />
                {error && (
                  <p className="text-accent-red text-xs font-body mt-2">{error}</p>
                )}
              </div>

              <NeonButton
                onClick={handleCreateProfile}
                disabled={isLoading}
                glow="purple"
                size="lg"
                className="w-full"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="animate-spin" size={18} />
                    <span>Creating...</span>
                  </div>
                ) : (
                  'Create Profile'
                )}
              </NeonButton>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
