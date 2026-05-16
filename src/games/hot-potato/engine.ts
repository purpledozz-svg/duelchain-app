export type HotPotatoStatus = 'waiting' | 'countdown' | 'playing' | 'exploded' | 'finished';

export interface HotPotatoState {
  holder: 'p1' | 'p2';
  passCount: number;
  explodeAtMs: number;    // absolute timestamp when potato explodes
  startedAtMs: number;
  status: HotPotatoStatus;
  loser: 'p1' | 'p2' | null;
  lastPassAtMs: number;   // prevents spam passing
}

export const PASS_COOLDOWN_MS = 500;
export const MIN_FUSE_MS = 5000;
export const MAX_FUSE_MS = 15000;

export function createInitialState(startDelayMs = 3000): HotPotatoState {
  const now = Date.now();
  const fuse = MIN_FUSE_MS + Math.random() * (MAX_FUSE_MS - MIN_FUSE_MS);
  return {
    holder: 'p1',
    passCount: 0,
    explodeAtMs: now + startDelayMs + fuse,
    startedAtMs: now + startDelayMs,
    status: 'countdown',
    loser: null,
    lastPassAtMs: 0,
  };
}

export function canPass(state: HotPotatoState, role: 'p1' | 'p2', nowMs: number): boolean {
  if (state.status !== 'playing') return false;
  if (state.holder !== role) return false;
  if (nowMs - state.lastPassAtMs < PASS_COOLDOWN_MS) return false;
  return true;
}

export function applyPass(state: HotPotatoState, role: 'p1' | 'p2', nowMs: number): HotPotatoState | null {
  if (!canPass(state, role, nowMs)) return null;
  return {
    ...state,
    holder: role === 'p1' ? 'p2' : 'p1',
    passCount: state.passCount + 1,
    lastPassAtMs: nowMs,
  };
}

export function checkExplosion(state: HotPotatoState, nowMs: number): HotPotatoState {
  if (state.status !== 'playing') return state;
  if (nowMs >= state.explodeAtMs) {
    return { ...state, status: 'exploded', loser: state.holder };
  }
  return state;
}

export function getRemainingMs(state: HotPotatoState, nowMs: number): number {
  return Math.max(0, state.explodeAtMs - nowMs);
}
