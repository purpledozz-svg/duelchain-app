import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { EndOfMatchModal } from '../../../components/multiplayer/EndOfMatchModal';
import { useAwardRp } from '../../../hooks/useAwardRp';
import { partyService, PartyRoom } from '../../../lib/partyService';
import { getPlayerId } from '../../../lib/playerId';

interface Props {
  code: string;
}

const CANVAS_W = 360;
const CANVAS_H = 500;
const BIRD_X = 80;
const BIRD_R = 14;
const GRAVITY = 0.45;
const JUMP_VEL = -8;
const PIPE_W = 52;
const PIPE_GAP = 150;
const PIPE_SPEED = 2.8;
const PIPE_INTERVAL = 1600;
const MAX_DURATION_MS = 60000;

interface Pipe {
  x: number;
  topH: number;
}

interface BirdState {
  y: number;
  vy: number;
  alive: boolean;
  score: number;
  pipes: Pipe[];
  frameScore: number;
}

function useFlappyPhysics(
  running: boolean,
  onDeathRef: React.MutableRefObject<(score: number, deathMs: number, startMs: number) => void>
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<BirdState>({
    y: CANVAS_H / 2,
    vy: 0,
    alive: true,
    score: 0,
    pipes: [],
    frameScore: 0,
  });
  const animRef = useRef<number>(0);
  const lastPipeRef = useRef<number>(0);
  const startMsRef = useRef<number>(0);
  const reportedRef = useRef(false);

  const jump = useCallback(() => {
    if (stateRef.current.alive) {
      stateRef.current.vy = JUMP_VEL;
    }
  }, []);

  useEffect(() => {
    if (!running) {
      cancelAnimationFrame(animRef.current);
      return;
    }

    startMsRef.current = Date.now();
    reportedRef.current = false;
    stateRef.current = {
      y: CANVAS_H / 2,
      vy: 0,
      alive: true,
      score: 0,
      pipes: [],
      frameScore: 0,
    };
    lastPipeRef.current = Date.now();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const loop = () => {
      const s = stateRef.current;
      if (!s.alive) return;

      const now = Date.now();
      const elapsed = now - startMsRef.current;

      if (elapsed >= MAX_DURATION_MS) {
        s.alive = false;
        if (!reportedRef.current) {
          reportedRef.current = true;
          onDeathRef.current(s.score, MAX_DURATION_MS, startMsRef.current);
        }
        return;
      }

      s.vy += GRAVITY;
      s.y += s.vy;

      if (now - lastPipeRef.current > PIPE_INTERVAL) {
        const topH = 60 + Math.random() * (CANVAS_H - PIPE_GAP - 120);
        s.pipes.push({ x: CANVAS_W, topH });
        lastPipeRef.current = now;
      }

      s.pipes = s.pipes.filter(p => p.x > -PIPE_W);
      s.pipes.forEach(p => { p.x -= PIPE_SPEED; });

      s.frameScore = Math.floor(elapsed / 100);

      const birdTop = s.y - BIRD_R;
      const birdBottom = s.y + BIRD_R;
      const birdLeft = BIRD_X - BIRD_R;
      const birdRight = BIRD_X + BIRD_R;

      if (birdTop <= 0 || birdBottom >= CANVAS_H) {
        s.alive = false;
        if (!reportedRef.current) {
          reportedRef.current = true;
          onDeathRef.current(s.frameScore, elapsed, startMsRef.current);
        }
        return;
      }

      for (const p of s.pipes) {
        const pLeft = p.x;
        const pRight = p.x + PIPE_W;
        const gapTop = p.topH;
        const gapBottom = p.topH + PIPE_GAP;

        if (birdRight > pLeft && birdLeft < pRight) {
          if (birdTop < gapTop || birdBottom > gapBottom) {
            s.alive = false;
            if (!reportedRef.current) {
              reportedRef.current = true;
              onDeathRef.current(s.frameScore, elapsed, startMsRef.current);
            }
            return;
          }
        }
      }

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.fillStyle = '#08060e';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.fillStyle = '#0d0a16';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(i * 130 + ((elapsed * 0.3) % 130) - 130, 0, 80, CANVAS_H);
      }

      s.pipes.forEach(p => {
        const grad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
        grad.addColorStop(0, '#1a0f2e');
        grad.addColorStop(1, '#2a1540');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(p.x, 0, PIPE_W, p.topH, [0, 0, 8, 8]);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(p.x, p.topH + PIPE_GAP, PIPE_W, CANVAS_H - p.topH - PIPE_GAP, [8, 8, 0, 0]);
        ctx.fill();

        ctx.fillStyle = '#FF267A';
        ctx.fillRect(p.x - 4, p.topH - 16, PIPE_W + 8, 16);
        ctx.fillRect(p.x - 4, p.topH + PIPE_GAP, PIPE_W + 8, 16);
      });

      const birdGrad = ctx.createRadialGradient(BIRD_X, s.y, 2, BIRD_X, s.y, BIRD_R);
      birdGrad.addColorStop(0, '#fef08a');
      birdGrad.addColorStop(1, '#f59e0b');
      ctx.beginPath();
      ctx.arc(BIRD_X, s.y, BIRD_R, 0, Math.PI * 2);
      ctx.fillStyle = birdGrad;
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(BIRD_X + 5, s.y - 4, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(BIRD_X + BIRD_R - 2, s.y);
      ctx.lineTo(BIRD_X + BIRD_R + 6, s.y - 3);
      ctx.lineTo(BIRD_X + BIRD_R + 6, s.y + 3);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`${s.frameScore}`, 12, 30);

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [running]);

  return { canvasRef, jump };
}

export default function MultiplayerFlappyDuel({ code }: Props) {
  const navigate = useNavigate();
  const [party, setParty] = useState<PartyRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerRole, setPlayerRole] = useState<'p1' | 'p2' | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gameRunning, setGameRunning] = useState(false);
  const [deathReported, setDeathReported] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  const rpAward = useAwardRp(party, playerRole);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownStartedRef = useRef(false);
  const deathReportedRef = useRef(false);
  const playerRoleRef = useRef<'p1' | 'p2' | null>(null);
  const partyRef = useRef<PartyRoom | null>(null);

  const playerId = getPlayerId();

  const handleDeathFn = useCallback(
    async (score: number, deathMs: number, _startMs: number) => {
      if (deathReportedRef.current) return;
      const currentParty = partyRef.current;
      const currentRole = playerRoleRef.current;
      if (!currentParty || !currentRole) return;

      deathReportedRef.current = true;
      setDeathReported(true);
      setGameRunning(false);

      const gs = currentParty.game_state;
      const deathOffset = Math.max(0, Math.min(deathMs, gs.maxDurationMs + 2000));

      const newState = { ...gs };
      if (currentRole === 'p1') {
        newState.p1_alive = false;
        newState.p1_deathMs = deathOffset;
        newState.p1_score = score;
      } else {
        newState.p2_alive = false;
        newState.p2_deathMs = deathOffset;
        newState.p2_score = score;
      }

      const p1Dead = currentRole === 'p1' ? true : gs.p1_deathMs !== null;
      const p2Dead = currentRole === 'p2' ? true : gs.p2_deathMs !== null;

      let result: PartyRoom['result'] = null;

      if (p1Dead && p2Dead) {
        const p1Death = currentRole === 'p1' ? deathOffset : gs.p1_deathMs ?? Infinity;
        const p2Death = currentRole === 'p2' ? deathOffset : gs.p2_deathMs ?? Infinity;

        if (p1Death > p2Death) result = { type: 'win', winner: 'p1' };
        else if (p2Death > p1Death) result = { type: 'win', winner: 'p2' };
        else {
          const p1Score = currentRole === 'p1' ? score : gs.p1_score;
          const p2Score = currentRole === 'p2' ? score : gs.p2_score;
          if (p1Score > p2Score) result = { type: 'win', winner: 'p1' };
          else if (p2Score > p1Score) result = { type: 'win', winner: 'p2' };
          else result = { type: 'draw' };
        }
        newState.winner = result?.winner || 'draw';
        newState.status = 'finished';
      } else if (p1Dead && !p2Dead) {
        result = { type: 'win', winner: 'p2' };
        newState.winner = 'p2';
        newState.status = 'finished';
      } else if (p2Dead && !p1Dead) {
        result = { type: 'win', winner: 'p1' };
        newState.winner = 'p1';
        newState.status = 'finished';
      }

      try {
        await partyService.updateGameState(code, newState, currentParty.turn, result || undefined);
      } catch (err) {
        console.error('[FlappyDuel] Failed to report death:', err);
      }
    },
    [code]
  );

  const onDeathRef = useRef(handleDeathFn);
  useEffect(() => {
    onDeathRef.current = handleDeathFn;
  }, [handleDeathFn]);

  const { canvasRef, jump } = useFlappyPhysics(gameRunning, onDeathRef);

  useEffect(() => {
    const initParty = async () => {
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
      } catch (err) {
        console.error('[FlappyDuel] Init error:', err);
        setError('Failed to load room');
      } finally {
        setLoading(false);
      }
    };

    initParty();
    return () => partyService.unsubscribe();
  }, [code, playerId]);

  useEffect(() => {
    if (!party || party.result) return;
    if (party.status !== 'active') return;
    if (gameRunning) return;
    if (countdownStartedRef.current) return;

    const gs = party.game_state;
    const role = playerRoleRef.current;

    if (gs.startTimeMs) {
      countdownStartedRef.current = true;
      const elapsed = Date.now() - gs.startTimeMs;
      if (elapsed < 3000) {
        const remaining = Math.ceil((3000 - elapsed) / 1000);
        setCountdown(remaining);
        countdownRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(countdownRef.current!);
              setCountdown(null);
              setGameRunning(true);
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setCountdown(null);
        setGameRunning(true);
      }
    } else if (role === 'p1') {
      const newGs = { ...gs, startTimeMs: Date.now() };
      partyService.updateGameState(code, newGs, party.turn).catch(console.error);
    }

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [party?.status, party?.game_state?.startTimeMs, party?.result, gameRunning, code]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); jump(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [jump]);

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
      deathReportedRef.current = false;
      setDeathReported(false);
      setGameRunning(false);
      setCountdown(null);
      countdownStartedRef.current = false;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050609] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#FF267A] animate-spin" />
          <p className="text-white/40 font-mono text-sm">Loading game…</p>
        </div>
      </div>
    );
  }
  if (error || !party) {
    return (
      <div className="min-h-screen bg-[#050609] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-[#FF4040] font-mono">{error || 'Unknown error'}</p>
        <Button onClick={() => navigate('/lobby')}>Back to Lobby</Button>
      </div>
    );
  }

  const gs = party.game_state;
  const isGameOver = !!party.result;
  const opponentRole = playerRole === 'p1' ? 'p2' : 'p1';
  const opponentAlive = opponentRole === 'p1' ? gs.p1_alive : gs.p2_alive;
  const myScore = playerRole === 'p1' ? gs.p1_score : gs.p2_score;
  const opponentScore = opponentRole === 'p1' ? gs.p1_score : gs.p2_score;

  return (
    <div className="min-h-screen bg-[#050609] text-white relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-[0.07] pointer-events-none" style={{ background: '#FF267A' }} />

      <div className="relative max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/lobby')} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-heading text-sm text-white/50 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div className="text-center">
            <p className="text-[10px] font-heading text-[#FF267A] uppercase tracking-[0.3em]">DUELCHAIN ARENA</p>
            <h1 className="text-xl font-heading font-bold">Flappy Duel</h1>
          </div>
          <div className="w-24" />
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
          <div className="relative rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 40px rgba(255,38,122,0.08)' }}>
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="cursor-pointer touch-none select-none block"
              onClick={jump}
              onTouchStart={(e) => { e.preventDefault(); jump(); }}
            />

            <AnimatePresence>
              {countdown !== null && !isGameOver && (
                <motion.div
                  key={countdown}
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
                  style={{ background: 'rgba(5,6,9,0.85)', backdropFilter: 'blur(4px)' }}
                >
                  <p className="text-white/50 font-heading text-sm uppercase tracking-[0.2em] mb-3">Get Ready</p>
                  <p className="text-8xl font-black text-[#FF267A]">{countdown}</p>
                  <p className="text-white/30 text-xs font-mono mt-4">Click / Tap / Space to flap</p>
                </motion.div>
              )}

              {!gameRunning && !isGameOver && !countdown && deathReported && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
                  style={{ background: 'rgba(5,6,9,0.85)', backdropFilter: 'blur(4px)' }}
                >
                  <p className="text-3xl font-heading font-bold text-[#FF4040] mb-2">You Died!</p>
                  <p className="text-xl font-mono text-white/70">Score: {myScore}</p>
                  <p className="text-white/30 text-xs font-mono mt-4">Waiting for opponent...</p>
                </motion.div>
              )}

              {party.status === 'waiting' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
                  style={{ background: 'rgba(5,6,9,0.9)' }}
                >
                  <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#FF267A] animate-spin mb-4" />
                  <p className="text-white/60 font-heading text-sm">Waiting for opponent...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-full lg:w-64 space-y-4">
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-[10px] font-heading uppercase tracking-[0.25em] text-[#FF267A] mb-4">Live Status</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <p className="text-[10px] text-white/40 font-mono">You</p>
                    <p className="font-heading font-semibold text-white text-sm">{playerRole?.toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-white/40 font-mono">Score</p>
                    <p className="font-mono font-bold text-[#FF267A] text-lg">{myScore}</p>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#38F5B3] animate-pulse" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <p className="text-[10px] text-white/40 font-mono">Opponent</p>
                    <p className="font-heading font-semibold text-white text-sm">{opponentRole.toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-white/40 font-mono">Score</p>
                    <p className="font-mono font-bold text-white/60 text-lg">{opponentScore}</p>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${opponentAlive ? 'bg-[#38F5B3] animate-pulse' : 'bg-[#FF4040]'}`} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="text-[10px] font-heading uppercase tracking-[0.25em] text-white/40 mb-3">How to Play</h3>
              <ul className="text-xs text-white/50 space-y-2 font-mono">
                <li className="flex items-start gap-2">
                  <span className="text-[#FF267A]">-</span>
                  Click, tap, or press <kbd className="px-1 rounded text-[10px]" style={{ background: 'rgba(255,255,255,0.06)' }}>Space</kbd> to flap
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FF267A]">-</span>
                  Survive longer than your opponent
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FF267A]">-</span>
                  If tied, higher score wins
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FF267A]">-</span>
                  Max duration: 60 seconds
                </li>
              </ul>
            </div>
          </div>
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
