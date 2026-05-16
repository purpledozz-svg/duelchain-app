import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Timer, Trophy, RotateCcw, Swords } from 'lucide-react';
import { computeResult, TARGET_SECONDS, VISIBLE_SECONDS } from '../../games/reaction/engine';

type Phase = 'idle' | 'countdown' | 'running' | 'hidden' | 'done';

export const ReactionGame = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(3);
  const [visibleTime, setVisibleTime] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof computeResult> | null>(null);

  const startRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const stoppedRef = useRef(false);  // prevents double-stop
  const phaseRef = useRef<Phase>('idle');

  const updatePhaseRef = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  // Cleanup on unmount
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const startCountdown = () => {
    updatePhaseRef('countdown');
    setCountdown(3);
    let c = 3;
    const tick = () => {
      c--;
      setCountdown(c);
      if (c <= 0) { beginTimer(); return; }
      setTimeout(tick, 1000);
    };
    setTimeout(tick, 1000);
  };

  const beginTimer = () => {
    updatePhaseRef('running');
    stoppedRef.current = false;
    setStopped(false);
    setResult(null);
    startRef.current = performance.now();

    const loop = () => {
      const elapsed = (performance.now() - startRef.current) / 1000;
      setVisibleTime(elapsed);
      if (elapsed >= VISIBLE_SECONDS && phaseRef.current === 'running') {
        updatePhaseRef('hidden');
      }
      if (phaseRef.current !== 'done') {
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const handleStop = () => {
    if (stoppedRef.current) return;
    if (phaseRef.current !== 'running' && phaseRef.current !== 'hidden') return;

    stoppedRef.current = true;
    cancelAnimationFrame(rafRef.current);

    const elapsed = (performance.now() - startRef.current) / 1000;
    const r = computeResult(elapsed);
    setResult(r);
    updatePhaseRef('done');
    setStopped(true);
  };

  const reset = () => {
    cancelAnimationFrame(rafRef.current);
    stoppedRef.current = false;
    updatePhaseRef('idle');
    setCountdown(3);
    setVisibleTime(0);
    setStopped(false);
    setResult(null);
  };

  // Spacebar support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); handleStop(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const grade = (r: ReturnType<typeof computeResult>) => {
    if (r.busted) return { label: 'BUST!', color: '#FF4040', sub: `${r.diff.toFixed(3)}s over` };
    if (r.diff < 0.05) return { label: 'PERFECT!', color: '#FFD700', sub: `${r.diff.toFixed(3)}s off` };
    if (r.diff < 0.2) return { label: 'EXCELLENT', color: '#38F5B3', sub: `${r.diff.toFixed(3)}s off` };
    if (r.diff < 0.5) return { label: 'GOOD', color: '#FF267A', sub: `${r.diff.toFixed(3)}s off` };
    return { label: 'CLOSE', color: 'rgba(255,255,255,0.5)', sub: `${r.diff.toFixed(3)}s off` };
  };

  return (
    <div className="min-h-screen bg-[#050609] text-white pt-20 pb-24 relative overflow-hidden">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-64 rounded-full blur-[120px] opacity-20"
          style={{ background: '#FF267A' }} />
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <button onClick={() => navigate('/lobby')}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-mono">
            <ArrowLeft size={16} /> Back to Lobby
          </button>
          <div className="text-center">
            <p className="text-[11px] font-heading text-[#FF267A] uppercase tracking-[0.3em]">DUELCHAIN</p>
            <h1 className="text-3xl font-heading font-bold">Stop at 10</h1>
          </div>
          <button onClick={reset}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-mono">
            <RotateCcw size={15} /> Reset
          </button>
        </div>

        {/* Main card */}
        <div className="rounded-2xl p-8 mb-8 relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>

          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,38,122,0.6), transparent)' }} />

          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: 'rgba(255,38,122,0.12)',
                border: '1px solid rgba(255,38,122,0.3)',
              }}>
              <Timer size={28} style={{ color: '#FF267A' }} strokeWidth={1.8} />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Idle */}
            {phase === 'idle' && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-center">
                <p className="text-7xl font-mono font-black text-white/20 mb-8 select-none">0.000</p>
                <button onClick={startCountdown}
                  className="px-10 py-4 rounded-xl font-heading font-bold text-sm tracking-[0.2em] uppercase text-white transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #B026FF, #FF267A)',
                    boxShadow: '0 8px 28px rgba(176,38,255,0.4)',
                  }}>
                  Start Game
                </button>
              </motion.div>
            )}

            {/* Countdown */}
            {phase === 'countdown' && (
              <motion.div key={`cd-${countdown}`}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="text-center py-4">
                <p className="text-9xl font-mono font-black select-none"
                  style={{ color: '#FF267A', textShadow: '0 0 40px rgba(255,38,122,0.6)' }}>
                  {countdown}
                </p>
                <p className="text-white/30 font-mono text-sm mt-4">Get ready…</p>
              </motion.div>
            )}

            {/* Running */}
            {(phase === 'running' || phase === 'hidden') && !stopped && (
              <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <div className="mb-8">
                  <p className="text-[10px] font-heading uppercase tracking-[0.3em] text-white/30 mb-3">Timer</p>
                  <p className="text-8xl font-mono font-black select-none"
                    style={{ color: phase === 'running' ? 'white' : 'rgba(255,255,255,0.08)' }}>
                    {phase === 'running' ? visibleTime.toFixed(2) : '??.??'}
                  </p>
                  {phase === 'hidden' && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-xs font-mono text-white/25 mt-2">
                      Timer hidden — stop when you think it is 10 seconds
                    </motion.p>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleStop}
                  className="w-full py-6 rounded-2xl font-heading font-black text-2xl tracking-[0.15em] text-white transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #FF4040, #FF267A)',
                    boxShadow: '0 8px 40px rgba(255,64,64,0.45)',
                  }}>
                  STOP!
                </motion.button>
                <p className="text-[11px] font-mono text-white/20 mt-3">
                  Press STOP or hit Space
                </p>
              </motion.div>
            )}

            {/* Result */}
            {phase === 'done' && result && (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center">
                {(() => {
                  const g = grade(result);
                  return (
                    <>
                      {!result.busted
                        ? <Trophy size={44} className="mx-auto mb-4" strokeWidth={1.5} style={{ color: g.color }} />
                        : <Swords size={44} className="mx-auto mb-4 text-white/30" strokeWidth={1.5} />}
                      <p className="text-5xl font-heading font-black mb-2" style={{ color: g.color }}>{g.label}</p>
                      <p className="text-3xl font-mono font-bold mb-1" style={{ color: g.color }}>
                        {result.elapsed.toFixed(3)}s
                      </p>
                      <p className="text-white/35 font-mono text-sm mb-1">
                        Target: {TARGET_SECONDS}.000s
                      </p>
                      <p className="font-mono text-sm mb-2" style={{ color: g.color }}>
                        {g.sub}
                      </p>
                      {!result.busted && (
                        <p className="text-white/25 font-mono text-xs">
                          Precision score: {result.score} / 1000
                        </p>
                      )}
                    </>
                  );
                })()}
                <div className="flex justify-center gap-4 mt-8">
                  <button onClick={reset}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl font-heading font-semibold text-sm text-white"
                    style={{ background: 'linear-gradient(135deg, #B026FF, #FF267A)', boxShadow: '0 8px 24px rgba(176,38,255,0.35)' }}>
                    <RotateCcw size={14} /> Play Again
                  </button>
                  <button onClick={() => navigate('/lobby')}
                    className="px-7 py-3 rounded-xl font-heading font-semibold text-sm text-white/60 hover:text-white transition-colors"
                    style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
                    Back to Lobby
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Rules */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-[10px] font-heading uppercase tracking-[0.28em] text-white/35 mb-3">Rules</h3>
          <ul className="text-sm font-mono text-white/45 space-y-1.5">
            <li>Hit Start, wait for the countdown, then the timer begins.</li>
            <li>The timer is visible for the first {VISIBLE_SECONDS} seconds, then hides.</li>
            <li>Press STOP (or Space) when you think exactly {TARGET_SECONDS}.000 seconds have passed.</li>
            <li>Going over {TARGET_SECONDS} seconds is a Bust. Under {TARGET_SECONDS} seconds scores by precision.</li>
            <li>In multiplayer: closest to {TARGET_SECONDS}.000s without busting wins.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
