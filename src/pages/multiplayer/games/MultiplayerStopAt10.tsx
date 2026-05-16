import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, StopCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { EndOfMatchModal } from '../../../components/multiplayer/EndOfMatchModal';
import { useAwardRp } from '../../../hooks/useAwardRp';
import { partyService, PartyRoom } from '../../../lib/partyService';
import { getPlayerId } from '../../../lib/playerId';

interface Props {
  code: string;
}

type RoundPhase = 'waiting' | 'pre-countdown' | 'hidden' | 'result';

export default function MultiplayerStopAt10({ code }: Props) {
  const navigate = useNavigate();
  const [party, setParty] = useState<PartyRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerRole, setPlayerRole] = useState<'p1' | 'p2' | null>(null);
  const [phase, setPhase] = useState<RoundPhase>('waiting');
  const [preCountdown, setPreCountdown] = useState(4);
  const [hasStopped, setHasStopped] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  const rpAward = useAwardRp(party, playerRole);

  const preIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initSentRef = useRef(false);
  const hiddenTransitionSentRef = useRef(false);
  const playerId = getPlayerId();
  const playerRoleRef = useRef<'p1' | 'p2' | null>(null);
  const partyRef = useRef<PartyRoom | null>(null);
  const hasStopped_ref = useRef(false);

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
    return () => partyService.unsubscribe();
  }, [code, playerId]);

  useEffect(() => {
    if (!party || !playerRole) return;

    const gs = party.game_state;

    if (party.result) {
      setPhase('result');
      clearInterval(preIntervalRef.current!);
      return;
    }

    if (gs.status === 'waiting' && party.status === 'active' && playerRole === 'p1' && !initSentRef.current) {
      initSentRef.current = true;
      const newGs = {
        ...gs,
        status: 'pre-countdown',
        roundStartMs: Date.now() + gs.preCountdownMs,
        p1_stopMs: null,
        p2_stopMs: null,
        p1_elapsed: null,
        p2_elapsed: null,
      };
      partyService.updateGameState(code, newGs, party.turn).catch(console.error);
      return;
    }

    if (gs.status === 'pre-countdown' && gs.roundStartMs) {
      setPhase('pre-countdown');
      setHasStopped(false);
      hasStopped_ref.current = false;
      hiddenTransitionSentRef.current = false;

      clearInterval(preIntervalRef.current!);
      const roundStart = gs.roundStartMs;

      preIntervalRef.current = setInterval(() => {
        const remaining = Math.max(0, roundStart - Date.now());
        setPreCountdown(Math.ceil(remaining / 1000));

        if (remaining <= 0) {
          clearInterval(preIntervalRef.current!);
          setPhase('hidden');

          if (playerRoleRef.current === 'p1' && !hiddenTransitionSentRef.current) {
            hiddenTransitionSentRef.current = true;
            const currentParty = partyRef.current;
            if (currentParty) {
              const updatedGs = { ...currentParty.game_state, status: 'hidden' };
              partyService.updateGameState(code, updatedGs, currentParty.turn).catch(console.error);
            }
          }
        }
      }, 50);
    }

    if (gs.status === 'hidden') {
      setPhase('hidden');
      clearInterval(preIntervalRef.current!);
    }

    if (gs.status === 'revealing') {
      setPhase('result');
      clearInterval(preIntervalRef.current!);
    }

    return () => {
      clearInterval(preIntervalRef.current!);
    };
  }, [party?.game_state?.status, party?.game_state?.roundStartMs, party?.status, party?.result, playerRole, code]);

  const handleStop = useCallback(async () => {
    if (hasStopped_ref.current) return;
    const currentParty = partyRef.current;
    const currentRole = playerRoleRef.current;
    if (!currentParty || !currentRole) return;

    const gs = currentParty.game_state;
    if (gs.status !== 'hidden') return;

    hasStopped_ref.current = true;
    setHasStopped(true);

    const stopNow = Date.now();
    const elapsed = gs.roundStartMs ? stopNow - gs.roundStartMs : 0;

    const newGs = { ...gs };
    if (currentRole === 'p1') {
      newGs.p1_stopMs = stopNow;
      newGs.p1_elapsed = elapsed;
    } else {
      newGs.p2_stopMs = stopNow;
      newGs.p2_elapsed = elapsed;
    }

    const otherElapsed = currentRole === 'p1' ? gs.p2_elapsed : gs.p1_elapsed;
    const bothDone = otherElapsed !== null;

    if (bothDone) {
      newGs.status = 'revealing';
      const p1El = currentRole === 'p1' ? elapsed : gs.p1_elapsed;
      const p2El = currentRole === 'p2' ? elapsed : gs.p2_elapsed;
      const target = gs.targetMs;

      const p1Busted = p1El > target;
      const p2Busted = p2El > target;

      let result: PartyRoom['result'] = null;

      if (p1Busted && !p2Busted) result = { type: 'win', winner: 'p2' };
      else if (p2Busted && !p1Busted) result = { type: 'win', winner: 'p1' };
      else if (p1Busted && p2Busted) result = { type: 'draw' };
      else {
        const d1 = Math.abs(p1El - target);
        const d2 = Math.abs(p2El - target);
        if (d1 < d2) result = { type: 'win', winner: 'p1' };
        else if (d2 < d1) result = { type: 'win', winner: 'p2' };
        else result = { type: 'draw' };
      }

      try {
        await partyService.updateGameState(code, newGs, currentParty.turn, result);
      } catch (err) {
        console.error('[StopAt10] Failed to submit stop:', err);
      }
    } else {
      newGs.status = 'hidden';
      try {
        await partyService.updateGameState(code, newGs, currentParty.turn);
      } catch (err) {
        console.error('[StopAt10] Failed to submit stop:', err);
      }
    }
  }, [code]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); handleStop(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleStop]);

  const handleRematchRequest = async () => {
    setRematchLoading(true);
    try { await partyService.requestRematch(code, playerId); }
    catch (err) { console.error(err); }
    finally { setRematchLoading(false); }
  };
  const handleRematchAccept = async () => {
    setRematchLoading(true);
    try {
      await partyService.acceptRematch(code, playerId);
      hasStopped_ref.current = false;
      initSentRef.current = false;
      hiddenTransitionSentRef.current = false;
      setHasStopped(false);
      setPhase('waiting');
    }
    catch (err) { console.error(err); }
    finally { setRematchLoading(false); }
  };
  const handleRematchDecline = async () => {
    setRematchLoading(true);
    try { await partyService.declineRematch(code); }
    catch (err) { console.error(err); }
    finally { setRematchLoading(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050609] text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#FF267A] animate-spin" />
        <p className="text-white/40 font-mono text-sm">Loading game…</p>
      </div>
    </div>
  );

  if (error || !party) return (
    <div className="min-h-screen bg-[#050609] text-white flex flex-col items-center justify-center gap-4">
      <p className="text-[#FF4040] font-mono">{error || 'Unknown error'}</p>
      <Button onClick={() => navigate('/lobby')}>Back to Lobby</Button>
    </div>
  );

  const gs = party.game_state;
  const isGameOver = !!party.result;
  const opponentRole = playerRole === 'p1' ? 'p2' : 'p1';
  const myElapsed = playerRole === 'p1' ? gs.p1_elapsed : gs.p2_elapsed;
  const opponentElapsed = opponentRole === 'p1' ? gs.p1_elapsed : gs.p2_elapsed;
  const opponentStopped = opponentElapsed !== null;

  const formatMs = (ms: number | null) => {
    if (ms === null) return '--';
    const s = (ms / 1000).toFixed(3);
    return `${s}s`;
  };

  const getResultForPlayer = () => {
    if (myElapsed == null || opponentElapsed == null) return null;
    const target = gs.targetMs;
    const myBusted = myElapsed > target;
    const oppBusted = opponentElapsed > target;
    const myDist = Math.abs(myElapsed - target);
    const oppDist = Math.abs(opponentElapsed - target);

    return { my: myElapsed, opp: opponentElapsed, myBusted, oppBusted, myDist, oppDist };
  };

  const resultData = isGameOver ? getResultForPlayer() : null;

  return (
    <div className="min-h-screen bg-[#050609] text-white relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-[0.07] pointer-events-none" style={{ background: '#FF267A' }} />

      <div className="relative max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/lobby')} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-heading text-sm text-white/50 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div className="text-center">
            <p className="text-[10px] font-heading text-[#FF267A] uppercase tracking-[0.3em]">DUELCHAIN ARENA</p>
            <h1 className="text-xl font-heading font-bold">Stop at 10</h1>
          </div>
          <div className="w-24" />
        </div>

        {party.status === 'waiting' && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#FF267A] animate-spin" />
            <p className="text-white/50 font-heading text-sm">Waiting for opponent to join...</p>
          </div>
        )}

        {party.status === 'active' && !isGameOver && (
          <div className="flex flex-col items-center">
            <AnimatePresence mode="wait">
              {phase === 'pre-countdown' && (
                <motion.div
                  key="pre"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-12"
                >
                  <p className="text-white/40 font-heading text-sm uppercase tracking-[0.2em] mb-4">Get ready...</p>
                  <motion.div
                    key={preCountdown}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-9xl font-black text-[#FF267A]"
                  >
                    {preCountdown}
                  </motion.div>
                  <p className="text-white/25 mt-4 text-xs font-mono">Timer hidden after countdown</p>
                </motion.div>
              )}

              {phase === 'hidden' && (
                <motion.div
                  key="hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 w-full max-w-sm"
                >
                  <div className="rounded-2xl p-8 mb-8" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-[10px] text-white/40 uppercase tracking-[0.25em] font-heading mb-3">Timer</p>
                    <div className="text-6xl font-mono font-black select-none">
                      {hasStopped ? (
                        <span className="text-[#38F5B3]">{formatMs(myElapsed)}</span>
                      ) : (
                        <span className="text-white/20">??:???</span>
                      )}
                    </div>
                    <p className="text-white/30 text-xs font-mono mt-3">Target: 10.000s</p>
                  </div>

                  {!hasStopped ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleStop}
                      className="w-full py-6 rounded-2xl text-white font-heading font-black text-3xl uppercase tracking-[0.1em] transition-all"
                      style={{ background: 'linear-gradient(135deg, #FF267A, #FF4040)', boxShadow: '0 8px 32px rgba(255,38,122,0.35)' }}
                    >
                      <StopCircle className="w-10 h-10 mx-auto mb-1" />
                      STOP!
                    </motion.button>
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-[#38F5B3] font-heading font-semibold text-xl">
                        You stopped at {formatMs(myElapsed)}
                      </p>
                      <p className="text-white/30 mt-2 flex items-center justify-center gap-2 font-mono text-sm">
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-white/10 border-t-[#FF267A] rounded-full" />
                        Waiting for opponent...
                      </p>
                    </div>
                  )}

                  {opponentStopped && !hasStopped && (
                    <div className="mt-4 rounded-xl p-3 text-center" style={{ background: 'rgba(255,38,122,0.06)', border: '1px solid rgba(255,38,122,0.2)' }}>
                      <p className="text-[#FF267A] text-sm font-mono">Opponent has stopped — hurry!</p>
                    </div>
                  )}

                  <p className="text-white/20 text-xs mt-6 font-mono">Press Space or click STOP</p>
                </motion.div>
              )}

              {phase === 'waiting' && (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#FF267A] animate-spin mx-auto mb-4" />
                  <p className="text-white/50 font-heading text-sm">Starting round...</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-full max-w-sm mt-4">
              <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-[10px] font-heading uppercase tracking-[0.25em] text-white/40 mb-3">Round Status</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl text-center" style={{ background: hasStopped ? 'rgba(56,245,179,0.06)' : 'rgba(255,255,255,0.03)', border: hasStopped ? '1px solid rgba(56,245,179,0.2)' : '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-[10px] text-white/40 mb-1 font-mono">You</p>
                    <p className={`font-mono font-bold text-sm ${hasStopped ? 'text-[#38F5B3]' : 'text-white/50'}`}>
                      {hasStopped ? formatMs(myElapsed) : 'Playing...'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: opponentStopped ? 'rgba(255,38,122,0.06)' : 'rgba(255,255,255,0.03)', border: opponentStopped ? '1px solid rgba(255,38,122,0.2)' : '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-[10px] text-white/40 mb-1 font-mono">Opponent</p>
                    <p className={`font-mono font-bold text-sm ${opponentStopped ? 'text-[#FF267A]' : 'text-white/50'}`}>
                      {opponentStopped ? 'Stopped' : 'Playing...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isGameOver && resultData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-6 max-w-sm mx-auto"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <h3 className="text-sm font-heading font-bold text-center mb-4 uppercase tracking-[0.15em] text-white/70">Round Results</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: resultData.myBusted ? 'rgba(255,64,64,0.06)' : 'rgba(56,245,179,0.06)', border: resultData.myBusted ? '1px solid rgba(255,64,64,0.2)' : '1px solid rgba(56,245,179,0.2)' }}>
                <span className="text-sm font-heading text-white/70">You</span>
                <div className="text-right">
                  <span className="font-mono font-bold text-white">{formatMs(myElapsed)}</span>
                  {resultData.myBusted ? (
                    <span className="ml-2 text-[#FF4040] text-xs font-mono">BUST</span>
                  ) : (
                    <span className="ml-2 text-white/30 text-xs font-mono">{'\u00B1'}{(resultData.myDist / 1000).toFixed(3)}s</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: resultData.oppBusted ? 'rgba(255,64,64,0.06)' : 'rgba(255,255,255,0.03)', border: resultData.oppBusted ? '1px solid rgba(255,64,64,0.2)' : '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-sm font-heading text-white/70">Opponent</span>
                <div className="text-right">
                  <span className="font-mono font-bold text-white">{formatMs(opponentElapsed)}</span>
                  {resultData.oppBusted ? (
                    <span className="ml-2 text-[#FF4040] text-xs font-mono">BUST</span>
                  ) : (
                    <span className="ml-2 text-white/30 text-xs font-mono">{'\u00B1'}{(resultData.oppDist / 1000).toFixed(3)}s</span>
                  )}
                </div>
              </div>
              <div className="text-center text-xs text-white/25 font-mono mt-2">Target: 10.000s</div>
            </div>
          </motion.div>
        )}

        <div className="mt-6 max-w-sm mx-auto rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-[10px] font-heading uppercase tracking-[0.25em] text-white/40 mb-2">Rules</h3>
          <ul className="text-xs text-white/40 space-y-1 font-mono">
            <li><span className="text-[#FF267A]">-</span> Watch a 4-second countdown, then the timer hides</li>
            <li><span className="text-[#FF267A]">-</span> Press STOP when you think 10 seconds have passed</li>
            <li><span className="text-[#FF267A]">-</span> Go over 10s = Bust (instant lose)</li>
            <li><span className="text-[#FF267A]">-</span> Closest to 10s without busting wins</li>
          </ul>
        </div>
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
