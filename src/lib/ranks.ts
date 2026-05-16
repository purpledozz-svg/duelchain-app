export type RankTier =
  | 'Iron'
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'Obsidian'
  | 'Mythic'
  | 'Legendary'
  | 'Sovereign';

export type Division = 'III' | 'II' | 'I' | null;

export interface RankInfo {
  tier: RankTier;
  division: Division;
  rp: number;
  minRp: number;
  maxRp: number;
  label: string;
  /** CSS color for primary accent */
  color: string;
  /** Secondary/glow color */
  glow: string;
  /** Background gradient for badge */
  gradient: string;
  /** Border color */
  border: string;
}

interface TierConfig {
  tier: RankTier;
  minRp: number;
  maxRp: number;
  color: string;
  glow: string;
  gradient: string;
  border: string;
}

const TIER_CONFIGS: TierConfig[] = [
  {
    tier: 'Iron',
    minRp: 0,
    maxRp: 299,
    color: '#8c9aad',
    glow: '#8c9aad',
    gradient: 'linear-gradient(135deg, #4a5568, #718096)',
    border: 'rgba(140,154,173,0.4)',
  },
  {
    tier: 'Bronze',
    minRp: 300,
    maxRp: 699,
    color: '#cd7f32',
    glow: '#cd7f32',
    gradient: 'linear-gradient(135deg, #7c4a1e, #cd7f32)',
    border: 'rgba(205,127,50,0.4)',
  },
  {
    tier: 'Silver',
    minRp: 700,
    maxRp: 1199,
    color: '#c0c0c0',
    glow: '#c0c0c0',
    gradient: 'linear-gradient(135deg, #6b7280, #c0c0c0)',
    border: 'rgba(192,192,192,0.45)',
  },
  {
    tier: 'Gold',
    minRp: 1200,
    maxRp: 1799,
    color: '#FFD700',
    glow: '#FFD700',
    gradient: 'linear-gradient(135deg, #b8860b, #FFD700)',
    border: 'rgba(255,215,0,0.5)',
  },
  {
    tier: 'Platinum',
    minRp: 1800,
    maxRp: 2499,
    color: '#4ade80',
    glow: '#22d3ee',
    gradient: 'linear-gradient(135deg, #0e7490, #4ade80)',
    border: 'rgba(74,222,128,0.45)',
  },
  {
    tier: 'Diamond',
    minRp: 2500,
    maxRp: 3299,
    color: '#7dd3fc',
    glow: '#38bdf8',
    gradient: 'linear-gradient(135deg, #0369a1, #7dd3fc)',
    border: 'rgba(125,211,252,0.5)',
  },
  {
    tier: 'Obsidian',
    minRp: 3300,
    maxRp: 4199,
    color: '#a78bfa',
    glow: '#7c3aed',
    gradient: 'linear-gradient(135deg, #1e0940, #4c1d95, #7c3aed)',
    border: 'rgba(167,139,250,0.5)',
  },
  {
    tier: 'Mythic',
    minRp: 4200,
    maxRp: 5199,
    color: '#e879f9',
    glow: '#d946ef',
    gradient: 'linear-gradient(135deg, #4a044e, #a21caf, #e879f9)',
    border: 'rgba(232,121,249,0.55)',
  },
  {
    tier: 'Legendary',
    minRp: 5200,
    maxRp: 6499,
    color: '#FF267A',
    glow: '#FF9F43',
    gradient: 'linear-gradient(135deg, #7f1d1d, #FF267A, #FF9F43)',
    border: 'rgba(255,38,122,0.6)',
  },
  {
    tier: 'Sovereign',
    minRp: 6500,
    maxRp: Infinity,
    color: '#ffffff',
    glow: '#B026FF',
    gradient: 'linear-gradient(135deg, #1a0040, #B026FF, #FF267A, #ffffff)',
    border: 'rgba(255,255,255,0.6)',
  },
];

const DIVISIONS_PER_TIER = 3; // III, II, I

function getDivision(rp: number, min: number, max: number, tier: RankTier): Division {
  if (tier === 'Sovereign') return null;
  const range = max - min + 1;
  const divSize = Math.floor(range / DIVISIONS_PER_TIER);
  const offset = rp - min;
  const divIdx = Math.min(Math.floor(offset / divSize), 2);
  // 0 → III, 1 → II, 2 → I
  return (['III', 'II', 'I'] as Division[])[divIdx];
}

export function getRankInfo(rp: number): RankInfo {
  const clampedRp = Math.max(0, rp);
  const config =
    TIER_CONFIGS.find((c) => clampedRp >= c.minRp && clampedRp <= c.maxRp) ??
    TIER_CONFIGS[TIER_CONFIGS.length - 1];

  const division = getDivision(clampedRp, config.minRp, config.maxRp, config.tier);
  const label = division ? `${config.tier} ${division}` : config.tier;

  return {
    tier: config.tier,
    division,
    rp: clampedRp,
    minRp: config.minRp,
    maxRp: config.maxRp === Infinity ? 99999 : config.maxRp,
    label,
    color: config.color,
    glow: config.glow,
    gradient: config.gradient,
    border: config.border,
  };
}

/** Progress within current division (0–1) */
export function getDivisionProgress(rp: number): number {
  const info = getRankInfo(rp);
  if (info.tier === 'Sovereign') return 1;
  const range = info.maxRp - info.minRp;
  if (range <= 0) return 1;
  const divSize = Math.floor(range / DIVISIONS_PER_TIER);
  const divMin = info.minRp + (['III', 'II', 'I'].indexOf(info.division!) * divSize);
  const divMax = divMin + divSize - 1;
  return Math.min(1, Math.max(0, (rp - divMin) / (divMax - divMin)));
}

// ── RP calculation ────────────────────────────────────────────────────────────

export interface RpDeltaInput {
  outcome: 'win' | 'loss';
  myRp: number;
  opponentRp: number;
  winStreak: number;
}

export interface RpDeltaResult {
  delta: number;
  reason: string;
  streakBonus: number;
}

export function calculateRpDelta({
  outcome,
  myRp,
  opponentRp,
  winStreak,
}: RpDeltaInput): RpDeltaResult {
  const myTierIdx = TIER_CONFIGS.findIndex(
    (c) => myRp >= c.minRp && myRp <= c.maxRp
  );
  const opponentTierIdx = TIER_CONFIGS.findIndex(
    (c) => opponentRp >= c.minRp && opponentRp <= c.maxRp
  );

  const tierDiff = opponentTierIdx - myTierIdx; // positive = opponent higher tier

  let base = 0;
  let reason = '';

  if (outcome === 'win') {
    if (tierDiff === 0) {
      base = 22;
      reason = 'Win vs same rank';
    } else if (tierDiff > 0) {
      // Win against higher rank: +28 to +35 based on tier gap
      base = Math.min(35, 28 + tierDiff * 2);
      reason = `Win vs higher rank (+${tierDiff} tier)`;
    } else {
      // Win against lower rank: +12 to +18
      base = Math.max(12, 18 + tierDiff * 2); // tierDiff is negative
      reason = `Win vs lower rank (${tierDiff} tier)`;
    }
  } else {
    if (tierDiff === 0) {
      base = -14;
      reason = 'Loss vs same rank';
    } else if (tierDiff > 0) {
      // Loss against higher rank: -8 to -12
      base = Math.max(-12, -8 - tierDiff);
      reason = `Loss vs higher rank (+${tierDiff} tier)`;
    } else {
      // Loss against lower rank: -20 to -28
      base = Math.min(-20, -20 + tierDiff * 2); // tierDiff negative → more negative
      reason = `Loss vs lower rank (${tierDiff} tier)`;
    }
  }

  let streakBonus = 0;
  if (outcome === 'win') {
    const newStreak = winStreak + 1;
    if (newStreak >= 10) streakBonus = 8;
    else if (newStreak >= 5) streakBonus = 5;
    else if (newStreak >= 3) streakBonus = 3;
  }

  return {
    delta: base + streakBonus,
    reason,
    streakBonus,
  };
}

export const RANK_TIER_CONFIGS = TIER_CONFIGS;
