import { useEffect, useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import MultiplayerChess from './games/MultiplayerChess';
import MultiplayerConnectFour from './games/MultiplayerConnectFour';
import MultiplayerTicTacToe from './games/MultiplayerTicTacToe';
import MultiplayerFlappyDuel from './games/MultiplayerFlappyDuel';
import MultiplayerStopAt10 from './games/MultiplayerStopAt10';
import MultiplayerHotPotato from './games/MultiplayerHotPotato';
import { ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';
import { isGameEnabled } from '../../config/games';
import { partyService, PartyRoom } from '../../lib/partyService';

function GameShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050609] text-white flex items-center justify-center p-4">
      {children}
    </div>
  );
}

export default function MultiplayerGame() {
  const { game, code } = useParams<{ game: string; code: string }>();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [escrowError, setEscrowError] = useState<string | null>(null);

  useEffect(() => {
    if (!game || !code) { setChecking(false); return; }

    const verify = async () => {
      try {
        const party = await partyService.getParty(code);
        if (!party) { setChecking(false); return; }

        // Competitive rooms must have onchain_status = funded before the game starts.
        // If they arrive at this route without funding, redirect to the escrow page.
        if (party.mode === 'matchmaking' && party.stake_usd) {
          if (party.onchain_status !== 'funded' && party.onchain_status !== 'settled') {
            navigate(`/escrow/${code}`, { replace: true });
            return;
          }
        }
        setChecking(false);
      } catch {
        setChecking(false);
      }
    };

    verify();
  }, [game, code, navigate]);

  if (!game || !code) {
    return (
      <GameShell>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: 'rgba(255,64,64,0.12)', border: '1px solid rgba(255,64,64,0.3)' }}>
            <AlertTriangle size={22} className="text-[#FF4040]" />
          </div>
          <h2 className="font-heading font-bold text-xl mb-2">Invalid game link</h2>
          <p className="text-white/40 font-mono text-sm mb-6">Missing game type or room code.</p>
          <button onClick={() => navigate('/lobby')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-heading text-sm text-white/60 hover:text-white transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
            <ArrowLeft size={14} /> Back to Lobby
          </button>
        </div>
      </GameShell>
    );
  }

  // Disabled or coming-soon games are never routed to — send back to lobby
  if (!isGameEnabled(game)) {
    return <Navigate to="/lobby" replace />;
  }

  if (checking) {
    return (
      <GameShell>
        <Loader2 size={28} className="animate-spin text-white/40" />
      </GameShell>
    );
  }

  switch (game) {
    case 'chess':
      return <MultiplayerChess code={code} />;
    case 'connect-four':
      return <MultiplayerConnectFour code={code} />;
    case 'tic-tac-toe':
    case 'tictactoe':
      return <MultiplayerTicTacToe code={code} />;
    case 'flappy-duel':
      return <MultiplayerFlappyDuel code={code} />;
    case 'stop-at-10':
      return <MultiplayerStopAt10 code={code} />;
    case 'hot-potato':
      return <MultiplayerHotPotato code={code} />;
    default:
      return (
        <GameShell>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'rgba(255,64,64,0.12)', border: '1px solid rgba(255,64,64,0.3)' }}>
              <AlertTriangle size={22} className="text-[#FF4040]" />
            </div>
            <h2 className="font-heading font-bold text-xl mb-2">Unknown game</h2>
            <p className="text-white/40 font-mono text-sm mb-6">&ldquo;{game}&rdquo; is not a valid game type.</p>
            <button onClick={() => navigate('/lobby')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-heading text-sm text-white/60 hover:text-white transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
              <ArrowLeft size={14} /> Back to Lobby
            </button>
          </div>
        </GameShell>
      );
  }
}
