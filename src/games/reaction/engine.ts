export const TARGET_SECONDS = 10;
export const VISIBLE_SECONDS = 4; // timer visible for first 4 seconds, then hidden

export type Phase = 'idle' | 'countdown' | 'running' | 'hidden' | 'done';

export interface StopResult {
  elapsed: number;       // seconds with ms precision
  diff: number;          // absolute diff from TARGET
  busted: boolean;       // went over target
  score: number;         // 0-1000, higher is better precision (only valid if not busted)
}

export function computeResult(elapsed: number): StopResult {
  const diff = Math.abs(elapsed - TARGET_SECONDS);
  const busted = elapsed > TARGET_SECONDS;
  // Score: perfect = 1000, each 0.1s off = -100 points, minimum 0
  const score = busted ? 0 : Math.max(0, Math.round(1000 - diff * 1000));
  return { elapsed, diff, busted, score };
}

// Compares two results. Returns 'p1' | 'p2' | 'draw'
export function compareResults(p1: StopResult, p2: StopResult): 'p1' | 'p2' | 'draw' {
  // Both busted: draw (or closest to target)
  if (p1.busted && p2.busted) {
    if (p1.diff < p2.diff) return 'p1';
    if (p2.diff < p1.diff) return 'p2';
    return 'draw';
  }
  if (p1.busted) return 'p2';
  if (p2.busted) return 'p1';
  if (p1.diff < p2.diff) return 'p1';
  if (p2.diff < p1.diff) return 'p2';
  return 'draw';
}
