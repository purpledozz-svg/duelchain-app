import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface ChessMatchHUDProps {
  capturePoints: { w: number; b: number };
  clock: {
    wMs: number;
    bMs: number;
    active: 'w' | 'b';
    lastTickMs: number;
  };
  playerColor: 'white' | 'black';
  gameOver: boolean;
}

export function ChessMatchHUD({ capturePoints, clock, playerColor, gameOver }: ChessMatchHUDProps) {
  const [displayWMs, setDisplayWMs] = useState(clock.wMs);
  const [displayBMs, setDisplayBMs] = useState(clock.bMs);

  useEffect(() => {
    if (gameOver) {
      setDisplayWMs(clock.wMs);
      setDisplayBMs(clock.bMs);
      return;
    }

    setDisplayWMs(clock.wMs);
    setDisplayBMs(clock.bMs);

    const interval = setInterval(() => {
      const elapsed = Date.now() - clock.lastTickMs;
      if (clock.active === 'w') {
        setDisplayWMs(Math.max(0, clock.wMs - elapsed));
        setDisplayBMs(clock.bMs);
      } else {
        setDisplayWMs(clock.wMs);
        setDisplayBMs(Math.max(0, clock.bMs - elapsed));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [clock, gameOver]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isWhiteActive = clock.active === 'w';
  const isBlackActive = clock.active === 'b';
  const isWhiteLow = displayWMs < 30000;
  const isBlackLow = displayBMs < 30000;

  const advantage = capturePoints.w - capturePoints.b;

  // Show the opponent timer on top, player timer on bottom
  const topSide = playerColor === 'white' ? 'b' : 'w';
  const botSide = playerColor === 'white' ? 'w' : 'b';

  const timerBlock = (side: 'w' | 'b') => {
    const ms = side === 'w' ? displayWMs : displayBMs;
    const active = (side === 'w' ? isWhiteActive : isBlackActive) && !gameOver;
    const low = side === 'w' ? isWhiteLow : isBlackLow;
    const label = side === 'w' ? 'White' : 'Black';
    const isPlayer = (side === 'w' && playerColor === 'white') || (side === 'b' && playerColor === 'black');

    return (
      <div
        className="rounded-xl p-3 transition-all"
        style={{
          background: active ? 'rgba(255,38,122,0.08)' : 'rgba(255,255,255,0.025)',
          border: active ? '1px solid rgba(255,38,122,0.35)' : '1px solid rgba(255,255,255,0.06)',
          boxShadow: active ? '0 0 20px rgba(255,38,122,0.12)' : 'none',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: side === 'w' ? '#fff' : '#1a1a1a', border: '1px solid rgba(255,255,255,0.2)' }} />
            <span className="text-xs font-heading uppercase tracking-[0.15em] text-white/50">
              {label}{isPlayer && <span className="ml-1.5 text-[#FF267A]">(You)</span>}
            </span>
          </div>
          <span
            className={`text-xl font-mono font-bold ${
              low && active ? 'text-[#FF4040] animate-pulse' : active ? 'text-white' : 'text-white/60'
            }`}
          >
            {formatTime(ms)}
          </span>
        </div>
        {active && (
          <div className="mt-2 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full animate-pulse" style={{ width: '100%', background: low ? '#FF4040' : '#FF267A' }} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Clock */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-[#FF267A]" />
          <span className="text-[10px] font-heading uppercase tracking-[0.25em] text-white/40">Clock · 5+2</span>
        </div>
        <div className="space-y-2">
          {timerBlock(topSide)}
          {timerBlock(botSide)}
        </div>
        {!gameOver && (
          <p className="mt-2 text-[10px] font-mono text-white/25 text-center">
            {isWhiteActive ? "White" : "Black"}&apos;s turn
          </p>
        )}
      </div>

      {/* Material */}
      {(capturePoints.w > 0 || capturePoints.b > 0) && (
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <span className="text-[10px] font-heading uppercase tracking-[0.25em] text-white/40">Material</span>
          <div className="flex items-center justify-between mt-2">
            <span className="font-mono text-sm text-white/60">White {capturePoints.w}</span>
            <span className="font-mono text-sm text-white/60">Black {capturePoints.b}</span>
          </div>
          {advantage !== 0 && (
            <p className="text-center text-xs font-mono mt-1" style={{ color: '#38F5B3' }}>
              {advantage > 0 ? `White +${advantage}` : `Black +${Math.abs(advantage)}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
