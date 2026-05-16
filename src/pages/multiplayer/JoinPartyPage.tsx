import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { partyService, PartyRoom } from '../../lib/partyService';
import { getPlayerId } from '../../lib/playerId';

type Phase = 'input' | 'waiting';

export default function JoinPartyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledCode = searchParams.get('code') || '';

  const [phase, setPhase] = useState<Phase>('input');
  const [code, setCode] = useState(prefilledCode.toUpperCase());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [party, setParty] = useState<PartyRoom | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const playerId = getPlayerId();

  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  useEffect(() => {
    if (party && party.status === 'active') {
      navigate(`/game/${party.game}/${party.code}`);
    }
  }, [party, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('Please enter a 6-character party code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const joined = await partyService.joinParty(code, playerId);
      setParty(joined);

      if (joined.status === 'active') {
        navigate(`/game/${joined.game}/${joined.code}`);
        return;
      }

      unsubRef.current = partyService.subscribeToParty(joined.code, (updated) => {
        setParty(updated);
      });

      setPhase('waiting');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join party';

      if (message.includes('not found')) {
        setError('Party code not found. Please check the code and try again.');
      } else if (message.includes('full')) {
        setError('This party is already full. Only 2 players allowed.');
      } else if (message.includes('expired') || message.includes('started')) {
        setError('This party has expired or already started.');
      } else {
        setError(message);
      }

      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(value);
    setError(null);
  };

  const handleLeave = () => {
    if (unsubRef.current) unsubRef.current();
    navigate('/lobby');
  };

  const canSubmit = code.length === 6 && !loading;

  return (
    <div className="min-h-screen bg-[#050609] text-white pt-20 pb-10 px-4">
      <div
        className="pointer-events-none fixed inset-x-0 top-16 h-[480px]"
        style={{
          background:
            'radial-gradient(ellipse at 20% 0%, rgba(176,38,255,0.18), transparent 55%), radial-gradient(ellipse at 80% 10%, rgba(255,38,122,0.12), transparent 55%)',
        }}
      />

      <div className="relative max-w-md mx-auto">
        <motion.button
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleLeave}
          className="mb-8 inline-flex items-center gap-2 text-sm font-heading text-white/55 hover:text-white transition-colors duration-200 group"
        >
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:border-white/20"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <ArrowLeft size={13} />
          </span>
          Back to Lobby
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.028)',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {phase === 'input' && (
            <>
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.35 }}
                  className="w-16 h-16 mx-auto mb-5 rounded-xl flex items-center justify-center"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(176,38,255,0.22), rgba(255,38,122,0.16))',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 0 28px rgba(176,38,255,0.3), inset 0 1px 0 rgba(255,255,255,0.12)',
                  }}
                >
                  <Users size={26} className="text-white" strokeWidth={1.6} />
                </motion.div>

                <h1 className="text-3xl font-heading font-bold tracking-tight mb-2">
                  Join a Party
                </h1>
                <p className="text-sm font-body text-white/50 leading-relaxed">
                  Enter the 6-character code from your friend.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="code"
                    className="block text-[11px] font-heading uppercase tracking-[0.22em] text-white/45 mb-2"
                  >
                    Party Code
                  </label>
                  <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={handleCodeChange}
                    placeholder="ABC123"
                    className="w-full px-4 py-4 rounded-xl text-center text-2xl font-mono tracking-[0.35em] uppercase transition-all duration-200 focus:outline-none placeholder-white/20"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${code.length > 0 ? 'rgba(255,38,122,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      boxShadow:
                        code.length > 0
                          ? '0 0 0 3px rgba(255,38,122,0.08), inset 0 1px 0 rgba(255,255,255,0.04)'
                          : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                      color: '#fff',
                    }}
                    maxLength={6}
                    autoFocus
                    disabled={loading}
                  />
                  <p
                    className="text-[11px] font-mono mt-2 text-center transition-colors duration-200"
                    style={{ color: code.length === 6 ? 'rgba(56,245,179,0.8)' : 'rgba(255,255,255,0.28)' }}
                  >
                    {code.length}/6 characters
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl px-4 py-3"
                    style={{
                      background: 'rgba(255,64,64,0.08)',
                      border: '1px solid rgba(255,64,64,0.3)',
                    }}
                  >
                    <p className="text-[#FF6B6B] text-sm font-body">{error}</p>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full relative inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl font-heading font-semibold text-sm tracking-[0.2em] uppercase text-white transition-all duration-300"
                  style={
                    canSubmit
                      ? {
                          background:
                            'linear-gradient(135deg, #B026FF 0%, #FF267A 60%, #FF4040 100%)',
                          boxShadow:
                            '0 8px 32px rgba(176,38,255,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
                        }
                      : {
                          background:
                            'linear-gradient(135deg, rgba(176,38,255,0.18), rgba(255,38,122,0.12))',
                          border: '1px solid rgba(255,255,255,0.08)',
                          cursor: 'not-allowed',
                        }
                  }
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join Party'
                  )}
                </button>
              </form>

              <div
                className="mt-6 pt-6"
                style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
              >
                <p className="text-[11px] font-body text-white/32 text-center leading-relaxed">
                  Make sure you have the correct code. Party codes are case-insensitive and expire after 10 minutes.
                </p>
              </div>
            </>
          )}

          {phase === 'waiting' && party && (
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-16 h-16 mx-auto mb-5 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(56,245,179,0.15), rgba(56,245,179,0.08))',
                  border: '1px solid rgba(56,245,179,0.25)',
                  boxShadow: '0 0 28px rgba(56,245,179,0.15)',
                }}
              >
                <Users size={26} className="text-[#38F5B3]" strokeWidth={1.6} />
              </motion.div>

              <h2 className="text-2xl font-heading font-bold mb-2">You're in!</h2>
              <p className="text-sm text-white/50 mb-6">Waiting for the host to start the game...</p>

              <div className="rounded-xl p-5 mb-6"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[10px] font-heading uppercase tracking-[0.22em] text-white/40 mb-2">Game</p>
                <p className="text-lg font-heading font-semibold text-white capitalize">
                  {party.game.replace(/-/g, ' ')}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 mb-6">
                <Loader2 size={16} className="animate-spin text-[#38F5B3]" />
                <span className="text-sm font-mono text-white/45">Host is getting ready...</span>
              </div>

              <button
                onClick={handleLeave}
                className="w-full py-3 rounded-xl font-heading text-sm text-white/40 hover:text-white/70 transition-colors"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                Leave party
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
