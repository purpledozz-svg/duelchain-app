import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Flame, HandMetal } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { EndOfMatchModal } from '../../../components/multiplayer/EndOfMatchModal';
import { useAwardRp } from '../../../hooks/useAwardRp';
import { partyService, PartyRoom } from '../../../lib/partyService';
import { getPlayerId } from '../../../lib/playerId';

interface Props {
  code: string;
}

const PASS_COOLDOWN_MS = 600;
const FUSE_SHOW_BELOW_MS = 5000; // show countdown when < 5s left

// Minimal loading/error shell styled for DUELCHAIN
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050609] text-white flex items-center justify-center">
      {children}
    </div>
  );
}

export function MultiplayerHotPotato({ code }: Props) {
  const navigate = useNavigate();
  const [party, setParty] = useState<PartyRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerRole, setPlayerRole] = useState<'p1' | 'p2' | null>(null);
  const [rematchLoading, setRematchLoading] = useState(false);
  const rpAward = useAwardRp(party, playerRole);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [lastPassMs, setLastPassMs] = useState(0);

  const playerId = getPlayerId();
  const playerRoleRef = useRef<'p1' | 'p2' | null>(null);
  const partyRef = useRef<PartyRoom | null>(null);
  const initSentRef = useRef(false);
  const explodedRef = useRef(false);
  const rafRef = useRef<number>(0);

  // Subscribe to room
  useEffect(() => {
    const init = async () => {
      try {
        const partyData = await partyService.getParty(code);
        if (!partyData) { setError('Room not found'); setLoading(false); return; }

        const role = partyData.p1_id === playerId ? 'p1' : 'p2';
        playerRoleRef.current = role;
        partyRef.current = partyData;
        setParty(partyData);
        setPlayerRole(role);

        partyService.subscribeToParty(code, (updated) => {
          partyRef.current = updated;
          setParty(updated);
        });
      } catch {
        setError('Failed to load room');
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => { partyService.unsubscribe(); cancelAnimationFrame(rafRef.current); };
  }, [code, playerId]);

  // P1 kicks off the game once both players are active
  useEffect(() => {
    if (!party || party.result) return;
    if (party.status !== 'active') return;
    if (playerRoleRef.current !== 'p1') return;
    if (initSentRef.current) return;

    const gs = party.game_state;
    if (gs.status !== 'waiting') return;

    initSentRef.current = true;
    const now = Date.now();
    const fuse = 6000 + Math.random() * 9000; // 6–15s
    const countdown = 3000;
    const newGs = {
      ...gs,
      status: 'countdown',
      holderId: 'p1',
      roundStartMs: now + countdown,
      explosionAtMs: now + countdown + fuse,
    };
    partyService.updateGameState(code, newGs, party.turn).catch(console.error);
  }, [party?.status, party?.game_state?.status, code]);

  // Countdown → playing transition (client-side, triggered by p1)
  useEffect(() => {
    if (!party || party.result) return;
    const gs = party.game_state;
    if (gs.status !== 'countdown' || !gs.roundStartMs) return;
    if (playerRoleRef.current !== 'p1') return;

    const delay = gs.roundStartMs - Date.now();
    if (delay <= 0) return;

    const t = setTimeout(() => {
      const current = partyRef.current;
      if (!current || current.game_state.status !== 'countdown') return;
      const updated = { ...current.game_state, status: 'playing' };
      partyService.updateGameState(code, updated, current.turn).catch(console.error);
    }, delay);

    return () => clearTimeout(t);
  }, [party?.game_state?.status, party?.game_state?.roundStartMs, code]);

  // rAF loop: update remaining time & detect explosion
  useEffect(() => {
    if (!party || party.result) { cancelAnimationFrame(rafRef.current); return; }
    const gs = party.game_state;
    if (gs.status !== 'playing' || !gs.explosionAtMs) return;

    const tick = () => {
      const current = partyRef.current;
      if (!current || current.result) return;
      const cgs = current.game_state;
      if (cgs.status !== 'playing') return;

      const rem = cgs.explosionAtMs - Date.now();
      setRemainingMs(Math.max(0, rem));

      if (rem <= 0 && !explodedRef.current) {
        explodedRef.current = true;
        // Only p1 writes the result to avoid race
        if (playerRoleRef.current === 'p1') {
          const loser = cgs.holderId as 'p1' | 'p2';
          const winner = loser === 'p1' ? 'p2' : 'p1';
          const finalGs = { ...cgs, status: 'exploded', loser };
          partyService.updateGameState(code, finalGs, current.turn, { type: 'win', winner }).catch(console.error);
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    explodedRef.current = false;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [party?.game_state?.status, party?.game_state?.explosionAtMs, party?.result, code]);

  const handlePass = useCallback(async () => {
    const now = Date.now();
    const current = partyRef.current;
    const role = playerRoleRef.current;
    if (!current || !role || current.result) return;

    const gs = current.game_state;
    if (gs.status !== 'playing') return;
    if (gs.holderId !== role) return;
    if (now - lastPassMs < PASS_COOLDOWN_MS) return;

    setLastPassMs(now);
    const newHolder = role === 'p1' ? 'p2' : 'p1';
    const newGs = { ...gs, holderId: newHolder };
    try {
      await partyService.updateGameState(code, newGs, current.turn);
    } catch (err) {
      console.error('[HotPotato] pass failed:', err);
    }
  }, [code, lastPassMs]);

  // Spacebar / Enter to pass
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); handlePass(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlePass]);

  const handleRematchRequest = async () => {
    setRematchLoading(true);
    try { await partyService.requestRematch(code, playerId); } catch (e) { console.error(e); }
    finally { setRematchLoading(false); }
  };
  const handleRematchAccept = async () => {
    setRematchLoading(true);
    try {
      await partyService.acceptRematch(code, playerId);
      initSentRef.current = false;
      explodedRef.current = false;
      setRemainingMs(null);
      setLastPassMs(0);
    } catch (e) { console.error(e); }
    finally { setRematchLoading(false); }
  };
  const handleRematchDecline = async () => {
    setRematchLoading(true);
    try { await partyService.declineRematch(code); } catch (e) { console.error(e); }
    finally { setRematchLoading(false); }
  };

  if (loading) return (
    <Shell>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#FF267A] animate-spin" />
        <p className="text-white/40 font-mono text-sm">Loading game…</p>
      </div>
    </Shell>
  );

  if (error || !party) return (
    <Shell>
      <div className="flex flex-col items-center gap-4">
        <p className="text-[#FF4040] font-mono">{error ?? 'Unknown error'}</p>
        <button onClick={() => navigate('/lobby')}
          className="px-6 py-3 rounded-xl font-heading text-sm text-white/70 hover:text-white transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          Back to Lobby
        </button>
      </div>
    </Shell>
  );

  const gs = party.game_state;
  const isGameOver = !!party.result;
  const iAmHolder = gs.holderId === playerRole;
  const showCountdown = gs.status === 'countdown' && gs.roundStartMs;
  const countdownSec = showCountdown ? Math.max(0, Math.ceil((gs.roundStartMs - Date.now()) / 1000)) : 0;
  const showRemainingTimer = gs.status === 'playing' && remainingMs !== null && remainingMs < FUSE_SHOW_BELOW_MS;
  const canPass = gs.status === 'playing' && iAmHolder && Date.now() - lastPassMs >= PASS_COOLDOWN_MS;

  return (
    <div className="min-h-screen bg-[#050609] text-white relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 rounded-full blur-[120px] opacity-20"
          style={{ background: iAmHolder ? '#FF4040' : '#FF267A' }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/lobby')}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-mono">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="text-center">
            <p className="text-[11px] font-heading text-[#FF267A] uppercase tracking-[0.3em]">DUELCHAIN ARENA</p>
            <h1 className="text-3xl font-heading font-bold">Hot Potato</h1>
          </div>
          <div className="w-24" />
        </div>

        {/* Waiting for opponent */}
        {party.status === 'waiting' && (
          <div className="flex flex-col items-center py-24 gap-5">
            <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-[#FF267A] animate-spin" />
            <p className="text-white/40 font-mono">Waiting for opponent…</p>
          </div>
        )}

        {/* Countdown */}
        {party.status === 'active' && !isGameOver && showCountdown && (
          <div className="flex flex-col items-center py-20">
            <p className="text-white/40 font-mono text-sm mb-4">Get ready…</p>
            <motion.p
              key={countdownSec}
              initial={{ scale: 1.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-9xl font-mono font-black"
              style={{ color: '#FF267A', textShadow: '0 0 60px rgba(255,38,122,0.5)' }}>
              {countdownSec}
            </motion.p>
          </div>
        )}

        {/* Playing */}
        {party.status === 'active' && !isGameOver && gs.status === 'playing' && (
          <div className="flex flex-col items-center gap-8">
            {/* Potato visual */}
            <motion.div
              animate={iAmHolder ? { scale: [1, 1.06, 1], rotate: [-2, 2, -2, 0] } : {}}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="w-48 h-48 rounded-full flex items-center justify-center relative"
              style={{
                background: iAmHolder
                  ? 'radial-gradient(circle at 35% 35%, #FF7A00, #FF4040)'
                  : 'rgba(255,255,255,0.05)',
                border: `2px solid ${iAmHolder ? 'rgba(255,64,64,0.6)' : 'rgba(255,255,255,0.1)'}`,
                boxShadow: iAmHolder ? '0 0 60px rgba(255,64,64,0.4), 0 0 100px rgba(255,64,64,0.2)' : 'none',
              }}
            >
              <Flame size={80} strokeWidth={1.5}
                style={{ color: iAmHolder ? 'white' : 'rgba(255,255,255,0.15)' }} />

              {/* Danger pulse ring when < 5s */}
              {iAmHolder && showRemainingTimer && (
                <motion.div
                  animate={{ scale: [1, 1.3], opacity: [0.4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border-4 border-[#FF4040]"
                />
              )}
            </motion.div>

            {/* Status */}
            <div className="text-center">
              <p className="text-2xl font-heading font-bold">
                {iAmHolder
                  ? <span style={{ color: '#FF4040' }}>You have the potato!</span>
                  : <span className="text-white/50">Opponent has the potato</span>}
              </p>
              {showRemainingTimer && remainingMs !== null && (
                <motion.p
                  key={Math.floor(remainingMs / 500)}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-4xl font-mono font-black mt-2"
                  style={{ color: remainingMs < 2000 ? '#FF4040' : '#FF9F43' }}>
                  {(remainingMs / 1000).toFixed(1)}s
                </motion.p>
              )}
            </div>

            {/* Pass button */}
            {iAmHolder && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePass}
                disabled={!canPass}
                className="flex items-center gap-3 px-10 py-5 rounded-2xl font-heading font-black text-xl text-white transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #FF4040, #FF267A)',
                  boxShadow: '0 8px 40px rgba(255,64,64,0.45)',
                }}
              >
                <HandMetal size={24} /> Pass it!
              </motion.button>
            )}

            {!iAmHolder && (
              <p className="text-white/25 font-mono text-sm">Waiting for opponent to pass…</p>
            )}

            <p className="text-white/15 font-mono text-xs">Press Space or Enter to pass</p>
          </div>
        )}

        {/* Rules */}
        {!isGameOver && (
          <div className="mt-10 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-[10px] font-heading uppercase tracking-[0.28em] text-white/35 mb-3">Rules</h3>
            <ul className="text-sm font-mono text-white/45 space-y-1.5">
              <li>The potato explodes at a random time between 6 and 15 seconds after start.</li>
              <li>Whoever is holding the potato when it explodes loses.</li>
              <li>Click "Pass it!" (or press Space) to hand the potato to your opponent.</li>
              <li>You can only pass when you are the holder. Passing has a brief cooldown.</li>
            </ul>
          </div>
        )}
      </div>

      {isGameOver && (
        <EndOfMatchModal
          party={party}
          playerRole={playerRole!}
          onRematchRequest={handleRematchRequest}
          onRematchAccept={handleRematchAccept}
          onRematchDecline={handleRematchDecline}
          rematchLoading={rematchLoading}
          rpDelta={rpAward?.myDelta}
          newRp={rpAward?.myNewRp}
        />
      )}
    </div>
  );
}

export default MultiplayerHotPotato;
