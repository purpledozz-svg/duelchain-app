import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { partyService, PartyRoom, GameType } from '../../lib/partyService';
import { getPlayerId } from '../../lib/playerId';

export default function CreatePartyPage() {
  const navigate = useNavigate();
  const { game } = useParams<{ game: string }>();

  const [party, setParty] = useState<PartyRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const partyRef = useRef<PartyRoom | null>(null);
  const countdownStartedRef = useRef(false);

  const playerId = getPlayerId();

  useEffect(() => {
    const initParty = async () => {
      try {
        console.log('[CreateParty] Creating party for player:', playerId);
        const { code, party: newParty } = await partyService.createParty(
          game as GameType,
          playerId
        );
        console.log('[CreateParty] Party created:', code, newParty);
        partyRef.current = newParty;
        setParty(newParty);
        setLoading(false);

        const unsubscribe = partyService.subscribeToParty(code, (updatedParty) => {
          console.log('[CreateParty] Party updated:', updatedParty);
          partyRef.current = updatedParty;
          setParty(updatedParty);

          if (updatedParty.status === 'active' && updatedParty.p2_id && !countdownStartedRef.current) {
            console.log('[CreateParty] Starting countdown - opponent joined');
            countdownStartedRef.current = true;
            startCountdown(updatedParty);
          }
        });

        return () => unsubscribe();
      } catch (err) {
        console.error('[CreateParty] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to create party');
        setLoading(false);
      }
    };

    initParty();

    return () => {
      partyService.unsubscribe();
    };
  }, [game, playerId]);

  const startCountdown = (currentParty: PartyRoom) => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          navigate(`/game/${currentParty.game}/${currentParty.code}`);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const copyCode = () => {
    if (party) {
      navigator.clipboard.writeText(party.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const copyLink = () => {
    if (party) {
      const link = `${window.location.origin}/multiplayer/join?code=${party.code}`;
      navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const getGameName = (gameId: string) => {
    const names: Record<string, string> = {
      chess: 'Chess',
      'connect-four': 'Connect Four',
      'tic-tac-toe': 'Tic-Tac-Toe',
      rps: 'Rock Paper Scissors',
      'stop-it': 'Stop It',
      'flappy-duel': 'Flappy Duel',
      'stop-at-10': 'Stop at 10',
      'hot-potato': 'Hot Potato',
    };
    return names[gameId] || gameId;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <Card className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F0B429] mx-auto mb-4"></div>
            <p className="text-gray-400">Creating party...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center p-6">
        <Card className="p-8 max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-red-500">Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button onClick={() => navigate('/lobby')} className="w-full">
            Back
          </Button>
        </Card>
      </div>
    );
  }

  if (!party) return null;

  const isWaiting = party.status === 'waiting' || !party.p2_id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/lobby')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Party Created!</h1>
            <p className="text-gray-400">
              {getGameName(party.game)} - Share this code with your friend
            </p>
          </div>

          <div className="bg-gray-900/50 rounded-lg p-8 mb-8">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-400 mb-2">Party Code</p>
              <p className="text-6xl font-bold tracking-wider text-[#F0B429] font-mono">
                {party.code}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={copyCode}
                className="flex-1 flex items-center justify-center gap-2"
                variant={codeCopied ? 'secondary' : 'primary'}
              >
                {codeCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Code
                  </>
                )}
              </Button>
              <Button
                onClick={copyLink}
                className="flex-1 flex items-center justify-center gap-2"
                variant={linkCopied ? 'secondary' : 'primary'}
              >
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="text-center">
            {countdown !== null ? (
              <div>
                <div className="text-6xl font-bold text-[#F0B429] mb-4 animate-pulse">
                  {countdown}
                </div>
                <p className="text-xl text-gray-300">Starting game...</p>
              </div>
            ) : isWaiting ? (
              <div>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Users className="w-6 h-6 text-gray-400 animate-pulse" />
                  <p className="text-xl text-gray-300">Waiting for opponent...</p>
                </div>
                <p className="text-sm text-gray-500">You are Player 1</p>
              </div>
            ) : (
              <div>
                <p className="text-xl text-green-400 mb-2">Opponent joined!</p>
                <p className="text-sm text-gray-400">Get ready...</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
