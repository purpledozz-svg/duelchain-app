import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Users, Swords, X, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { partyService, PartyRoom, GameType } from '../../lib/partyService';
import { getPlayerId } from '../../lib/playerId';

type Step = 'select-game' | 'waiting-room';

const GAMES: Array<{ id: GameType; name: string; icon: string }> = [
  { id: 'chess', name: 'Chess', icon: '♟' },
  { id: 'connect-four', name: 'Connect 4', icon: '⬤' },
  { id: 'tic-tac-toe', name: 'Tic-Tac-Toe', icon: '✕' },
];

export default function CreateParty() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('select-game');
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [party, setParty] = useState<PartyRoom | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [launching, setLaunching] = useState(false);
  const partyRef = useRef<PartyRoom | null>(null);

  const playerId = getPlayerId();

  useEffect(() => {
    return () => { partyService.unsubscribe(); };
  }, []);

  const handleCreateRoom = async () => {
    if (!selectedGame) return;
    setCreating(true);
    setError(null);
    try {
      const { code, party: newParty } = await partyService.createParty(selectedGame, playerId);
      partyRef.current = newParty;
      setParty(newParty);
      setStep('waiting-room');

      partyService.subscribeToParty(code, (updated) => {
        partyRef.current = updated;
        setParty(updated);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create party');
    } finally {
      setCreating(false);
    }
  };

  const handleLaunch = async () => {
    if (!party || !party.p2_id) return;
    setLaunching(true);
    try {
      await partyService.launchParty(party.code);
      navigate(`/game/${party.game}/${party.code}`);
    } catch {
      navigate(`/game/${party.game}/${party.code}`);
    }
  };

  const handleCancel = async () => {
    if (!party) return;
    try {
      const { error: err } = await (await import('../../lib/supabase')).supabase
        .from('party_rooms')
        .update({ status: 'expired' })
        .eq('code', party.code);
      if (err) console.error('Cancel error:', err);
    } catch {}
    navigate('/lobby');
  };

  const copyCode = () => {
    if (!party) return;
    navigator.clipboard.writeText(party.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const copyLink = () => {
    if (!party) return;
    const link = `${window.location.origin}/multiplayer/join?code=${party.code}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const hasOpponent = party?.p2_id != null;
  const gameName = GAMES.find(g => g.id === party?.game)?.name ?? party?.game;

  return (
    <div className="min-h-screen bg-[#050609] text-white pt-20 pb-10 px-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-x-0 top-16 h-[480px]"
        style={{ background: 'radial-gradient(ellipse at 30% 0%, rgba(255,38,122,0.14), transparent 55%), radial-gradient(ellipse at 70% 10%, rgba(255,159,67,0.1), transparent 55%)' }} />

      <div className="relative max-w-md mx-auto">
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => step === 'select-game' ? navigate('/lobby') : handleCancel()}
          className="mb-8 inline-flex items-center gap-2 text-sm font-heading text-white/55 hover:text-white transition-colors group"
        >
          <span className="w-7 h-7 rounded-lg flex items-center justify-center group-hover:border-white/20"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <ArrowLeft size={13} />
          </span>
          {step === 'select-game' ? 'Back to Lobby' : 'Cancel room'}
        </motion.button>

        <AnimatePresence mode="wait">
          {/* ─── Step 1: Select Game ─────────────────────────────────────── */}
          {step === 'select-game' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl p-8"
              style={{
                background: 'rgba(255,255,255,0.028)',
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="w-16 h-16 mx-auto mb-5 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,38,122,0.22), rgba(255,159,67,0.16))',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 0 28px rgba(255,38,122,0.2), inset 0 1px 0 rgba(255,255,255,0.12)',
                  }}
                >
                  <Users size={26} className="text-white" strokeWidth={1.6} />
                </motion.div>
                <h1 className="text-3xl font-heading font-bold tracking-tight mb-2">Create a party</h1>
                <p className="text-sm text-white/50">Pick a game, then invite a friend with a private code.</p>
              </div>

              {/* Game selector */}
              <div className="space-y-3 mb-6">
                <label className="block text-[11px] font-heading uppercase tracking-[0.22em] text-white/45 mb-2">
                  Select game
                </label>
                {GAMES.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGame(g.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-200"
                    style={{
                      background: selectedGame === g.id ? 'rgba(255,38,122,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selectedGame === g.id ? 'rgba(255,38,122,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      boxShadow: selectedGame === g.id ? '0 0 20px rgba(255,38,122,0.1)' : 'none',
                    }}
                  >
                    <span className="text-2xl w-8 text-center">{g.icon}</span>
                    <span className="font-heading font-semibold text-sm text-white">{g.name}</span>
                    {selectedGame === g.id && (
                      <Check size={16} className="ml-auto text-[#FF267A]" />
                    )}
                  </button>
                ))}
              </div>

              {/* Mode badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-6"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Swords size={12} className="text-white/40" />
                <span className="text-[11px] font-heading uppercase tracking-[0.2em] text-white/40">Classic mode (no wager)</span>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl px-4 py-3 mb-4"
                  style={{ background: 'rgba(255,64,64,0.08)', border: '1px solid rgba(255,64,64,0.3)' }}>
                  <p className="text-[#FF6B6B] text-sm">{error}</p>
                </motion.div>
              )}

              {/* CTA */}
              <button
                onClick={handleCreateRoom}
                disabled={!selectedGame || creating}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-heading font-semibold text-sm tracking-[0.2em] uppercase text-white transition-all"
                style={selectedGame && !creating
                  ? { background: 'linear-gradient(135deg, #B026FF 0%, #FF267A 60%, #FF4040 100%)', boxShadow: '0 8px 32px rgba(176,38,255,0.45), inset 0 1px 0 rgba(255,255,255,0.18)' }
                  : { background: 'linear-gradient(135deg, rgba(176,38,255,0.18), rgba(255,38,122,0.12))', border: '1px solid rgba(255,255,255,0.08)', cursor: 'not-allowed' }
                }
              >
                {creating ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Creating...</>
                ) : (
                  'Create room'
                )}
              </button>
            </motion.div>
          )}

          {/* ─── Step 2: Waiting Room ────────────────────────────────────── */}
          {step === 'waiting-room' && party && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl p-8"
              style={{
                background: 'rgba(255,255,255,0.028)',
                border: '1px solid rgba(255,255,255,0.09)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Header */}
              <div className="text-center mb-6">
                <p className="text-[11px] font-heading text-[#FF267A] uppercase tracking-[0.3em] mb-2">Private party</p>
                <h2 className="text-2xl font-heading font-bold">{gameName}</h2>
                <p className="text-[10px] font-mono text-white/30 mt-1 uppercase tracking-[0.2em]">Classic mode</p>
              </div>

              {/* Party code display */}
              <div className="rounded-xl p-6 mb-6 text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-[10px] font-heading uppercase tracking-[0.25em] text-white/45 mb-3">Party code</p>
                <p className="text-5xl font-heading font-bold tracking-[0.3em]"
                  style={{ color: '#FF267A', textShadow: '0 0 30px rgba(255,38,122,0.4)' }}>
                  {party.code}
                </p>
              </div>

              {/* Copy buttons */}
              <div className="flex gap-3 mb-6">
                <button onClick={copyCode}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-heading text-xs uppercase tracking-[0.15em] text-white/70 hover:text-white transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {codeCopied ? <><Check size={13} className="text-[#38F5B3]" /> Copied</> : <><Copy size={13} /> Copy code</>}
                </button>
                <button onClick={copyLink}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-heading text-xs uppercase tracking-[0.15em] text-white/70 hover:text-white transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {linkCopied ? <><Check size={13} className="text-[#38F5B3]" /> Copied</> : <><Copy size={13} /> Copy link</>}
                </button>
              </div>

              {/* Players list */}
              <div className="rounded-xl p-4 mb-6"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-[10px] font-heading uppercase tracking-[0.22em] text-white/40 mb-3">Players</p>
                <div className="space-y-3">
                  {/* Player 1 (creator) */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,38,122,0.15)', border: '1px solid rgba(255,38,122,0.3)' }}>
                      <span className="text-xs font-heading font-bold text-[#FF267A]">P1</span>
                    </div>
                    <span className="text-sm font-heading text-white">You (Host)</span>
                    <span className="ml-auto text-[10px] font-mono text-[#38F5B3]">Connected</span>
                  </div>
                  {/* Player 2 */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: hasOpponent ? 'rgba(56,245,179,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${hasOpponent ? 'rgba(56,245,179,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                      <span className="text-xs font-heading font-bold" style={{ color: hasOpponent ? '#38F5B3' : 'rgba(255,255,255,0.3)' }}>P2</span>
                    </div>
                    {hasOpponent ? (
                      <>
                        <span className="text-sm font-heading text-white">Opponent</span>
                        <span className="ml-auto text-[10px] font-mono text-[#38F5B3]">Joined</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-heading text-white/40">Waiting...</span>
                        <span className="ml-auto">
                          <span className="inline-block w-2 h-2 rounded-full animate-pulse bg-white/30" />
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Launch / Waiting state */}
              <button
                onClick={handleLaunch}
                disabled={!hasOpponent || launching}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-heading font-semibold text-sm tracking-[0.2em] uppercase text-white transition-all"
                style={hasOpponent
                  ? { background: 'linear-gradient(135deg, #B026FF 0%, #FF267A 60%, #FF4040 100%)', boxShadow: '0 8px 32px rgba(176,38,255,0.45), inset 0 1px 0 rgba(255,255,255,0.18)' }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'not-allowed', color: 'rgba(255,255,255,0.3)' }
                }
              >
                {launching ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Launching...</>
                ) : hasOpponent ? (
                  <><Play size={15} /> Launch game</>
                ) : (
                  <><Users size={15} /> Waiting for player 2</>
                )}
              </button>

              {/* Cancel */}
              <button onClick={handleCancel}
                className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl text-white/35 hover:text-white/70 transition-colors text-xs font-heading uppercase tracking-[0.15em]">
                <X size={12} /> Cancel room
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
