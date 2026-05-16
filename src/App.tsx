import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense, useState } from 'react';
import { useAccount } from 'wagmi';
import { Web3Provider } from './providers/Web3Provider';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/ui/Toast';
import { MobileNav } from './components/layout/MobileNav';
import { CreateProfileModal } from './components/ui/CreateProfileModal';
import { useStore } from './store/useStore';
import { priceService } from './lib/priceService';
import { profileService } from './lib/profileService';
import { getPlayerId } from './lib/playerId';
import { Player } from './types';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const Lobby = lazy(() => import('./pages/Lobby').then((m) => ({ default: m.Lobby })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));
const Leaderboard = lazy(() =>
  import('./pages/LeaderboardV2').then((m) => ({ default: m.LeaderboardV2 }))
);
const ConnectWallet = lazy(() =>
  import('./pages/ConnectWallet').then((m) => ({ default: m.ConnectWallet }))
);
const ReactionGame = lazy(() =>
  import('./pages/games/ReactionGame').then((m) => ({ default: m.ReactionGame }))
);
const TicTacToe = lazy(() =>
  import('./pages/games/TicTacToe').then((m) => ({ default: m.TicTacToe }))
);
const RockPaperScissors = lazy(() =>
  import('./pages/games/RockPaperScissors').then((m) => ({ default: m.RockPaperScissors }))
);
const Chess = lazy(() => import('./pages/games/Chess'));
const ConnectFour = lazy(() => import('./pages/games/ConnectFour'));
const CreatePartyPage = lazy(() => import('./pages/multiplayer/CreatePartyPage'));
const JoinPartyPage = lazy(() => import('./pages/multiplayer/JoinPartyPage'));
const MatchmakingPage = lazy(() => import('./pages/multiplayer/MatchmakingPage'));
const MultiplayerGame = lazy(() => import('./pages/multiplayer/MultiplayerGame'));
const CreateParty = lazy(() => import('./pages/party/CreateParty'));
const EscrowFundingPage = lazy(() => import('./pages/multiplayer/EscrowFundingPage'));

function WalletSync() {
  const { address, isConnected } = useAccount();
  const { setWalletAddress } = useStore();

  useEffect(() => {
    setWalletAddress(isConnected && address ? address : null);
  }, [isConnected, address, setWalletAddress]);

  return null;
}

function PlayerSync() {
  const { currentPlayer, setCurrentPlayer } = useStore();

  useEffect(() => {
    // If we already have a player from localStorage, refresh their data from DB.
    // Otherwise try to find them by device ID (first-visit or cleared storage).
    const refresh = async () => {
      if (currentPlayer?.id) {
        const fresh = await profileService.getProfileByPlayerId(currentPlayer.player_id ?? '');
        if (fresh) { setCurrentPlayer(fresh); return; }
        // Fallback: look up by username in case player_id changed
        const byUsername = await profileService.getProfileByUsername(currentPlayer.username ?? '');
        if (byUsername) setCurrentPlayer(byUsername);
        return;
      }
      // No stored player — try device ID
      const playerId = getPlayerId();
      const player = await profileService.getProfileByPlayerId(playerId);
      if (player) setCurrentPlayer(player);
    };
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary">
      <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#FF267A] animate-spin" />
    </div>
  );
}

function AppContent() {
  const { toasts, removeToast, setPrices, setIsPriceLive, setCurrentPlayer, walletAddress } = useStore();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const [showAccountModal, setShowAccountModal] = useState(false);

  const handleProfileCreated = (player: Player) => {
    setCurrentPlayer(player);
    setShowAccountModal(false);
  };

  useEffect(() => {
    priceService.start();
    const unsubscribe = priceService.subscribe((prices) => {
      setPrices(prices);
      setIsPriceLive(priceService.isLiveFeed());
    });

    return () => {
      priceService.stop();
      unsubscribe();
    };
  }, [setPrices, setIsPriceLive]);

  return (
    <div className="min-h-screen bg-primary pb-16 md:pb-0">
      <WalletSync />
      <PlayerSync />
      {!isLandingPage && <Header onOpenAccountModal={() => setShowAccountModal(true)} />}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      {!isLandingPage && <MobileNav />}
      {/* Modal lives at root so it's never clipped by any stacking context */}
      <CreateProfileModal
        open={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onCreated={handleProfileCreated}
        walletAddress={walletAddress}
      />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<Home />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/connect" element={<ConnectWallet />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/games/reaction" element={<ReactionGame />} />
          <Route path="/games/stop-it" element={<ReactionGame />} />
          <Route path="/games/tictactoe" element={<TicTacToe />} />
          <Route path="/games/rps" element={<RockPaperScissors />} />
          <Route path="/games/chess" element={<Chess />} />
          <Route path="/games/connect-four" element={<ConnectFour />} />
          <Route path="/party/create" element={<CreateParty />} />
          <Route path="/escrow/:code" element={<EscrowFundingPage />} />
          <Route path="/multiplayer/create/:game" element={<CreatePartyPage />} />
          <Route path="/multiplayer/join" element={<JoinPartyPage />} />
          <Route path="/multiplayer/matchmaking/competitive" element={<MatchmakingPage />} />
          <Route path="/multiplayer/matchmaking/:game" element={<MatchmakingPage />} />
          <Route path="/game/:game/:code" element={<MultiplayerGame />} />
        </Routes>
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <Web3Provider>
      <Router>
        <AppContent />
      </Router>
    </Web3Provider>
  );
}

export default App;
