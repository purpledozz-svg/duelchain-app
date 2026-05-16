import { getRankInfo, getDivisionProgress, type RankInfo } from '../../lib/ranks';

interface RankBadgeProps {
  rp: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  showRp?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  xs: { badge: 18, fontSize: '7px', labelSize: 'text-[8px]', rpSize: 'text-[7px]' },
  sm: { badge: 26, fontSize: '9px', labelSize: 'text-[10px]', rpSize: 'text-[9px]' },
  md: { badge: 38, fontSize: '12px', labelSize: 'text-xs', rpSize: 'text-[10px]' },
  lg: { badge: 56, fontSize: '16px', labelSize: 'text-sm', rpSize: 'text-xs' },
};

function RankIcon({ info, size }: { info: RankInfo; size: number }) {
  const { tier, color, glow, gradient } = info;

  // Sovereign — star with neon aura
  if (tier === 'Sovereign') {
    return (
      <div
        className="flex items-center justify-center rounded-full relative"
        style={{
          width: size,
          height: size,
          background: gradient,
          boxShadow: `0 0 ${size * 0.5}px ${glow}88, 0 0 ${size}px ${color}33`,
          border: `1.5px solid ${info.border}`,
        }}
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"
            fill={color}
            stroke={glow}
            strokeWidth="0.5"
          />
        </svg>
      </div>
    );
  }

  // Legendary — flame / crown hybrid
  if (tier === 'Legendary') {
    return (
      <div
        className="flex items-center justify-center rounded-xl relative"
        style={{
          width: size,
          height: size,
          background: gradient,
          boxShadow: `0 0 ${size * 0.4}px ${glow}66`,
          border: `1.5px solid ${info.border}`,
        }}
      >
        <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none">
          <path
            d="M5 21c0-5.5 3.5-9 7-12 0 2.5 1.5 4 3 5.5C16.5 12 17 9 16 7c3 2.5 4 6 4 8 0 3.3-2.7 6-6 6H9c-2.2 0-4-1.8-4-4z"
            fill={color}
          />
        </svg>
      </div>
    );
  }

  // Mythic — eye / gem
  if (tier === 'Mythic') {
    return (
      <div
        className="flex items-center justify-center rounded-xl relative"
        style={{
          width: size,
          height: size,
          background: gradient,
          boxShadow: `0 0 ${size * 0.4}px ${glow}55`,
          border: `1.5px solid ${info.border}`,
        }}
      >
        <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none">
          <path d="M12 4L4 9l8 11 8-11z" fill={color} />
          <path d="M12 4L4 9l8 4 8-4z" fill={glow} opacity="0.7" />
        </svg>
      </div>
    );
  }

  // Obsidian — void / crystal
  if (tier === 'Obsidian') {
    return (
      <div
        className="flex items-center justify-center rounded-xl relative"
        style={{
          width: size,
          height: size,
          background: gradient,
          boxShadow: `0 0 ${size * 0.35}px ${glow}44`,
          border: `1.5px solid ${info.border}`,
        }}
      >
        <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
          <path d="M12 3L3 9l9 12 9-12z" fill={color} opacity="0.9" />
          <path d="M12 3L3 9h18z" fill={glow} opacity="0.5" />
        </svg>
      </div>
    );
  }

  // Diamond — actual diamond shape
  if (tier === 'Diamond') {
    return (
      <div
        className="flex items-center justify-center rounded-xl"
        style={{
          width: size,
          height: size,
          background: gradient,
          boxShadow: `0 0 ${size * 0.3}px ${glow}44`,
          border: `1.5px solid ${info.border}`,
        }}
      >
        <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
          <path d="M12 2l8 7-8 13L4 9z" fill={color} />
          <path d="M4 9h16L12 2z" fill={glow} opacity="0.6" />
        </svg>
      </div>
    );
  }

  // Platinum — hexagon
  if (tier === 'Platinum') {
    return (
      <div
        className="flex items-center justify-center rounded-xl"
        style={{
          width: size,
          height: size,
          background: gradient,
          boxShadow: `0 0 ${size * 0.25}px ${glow}33`,
          border: `1.5px solid ${info.border}`,
        }}
      >
        <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
          <path d="M12 2l8.66 5v10L12 22 3.34 17V7z" fill={color} />
        </svg>
      </div>
    );
  }

  // Iron / Bronze / Silver / Gold — shield
  const shieldColors: Record<string, string> = {
    Iron: '#4a5568',
    Bronze: '#7c4a1e',
    Silver: '#6b7280',
    Gold: '#b8860b',
  };

  return (
    <div
      className="flex items-center justify-center rounded-lg"
      style={{
        width: size,
        height: size,
        background: gradient,
        border: `1.5px solid ${info.border}`,
      }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L4 6v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V6z" fill={color} />
        <path d="M12 2L4 6v6c0 5 3.5 9.5 8 11" fill={shieldColors[tier] || '#333'} opacity="0.4" />
      </svg>
    </div>
  );
}

export function RankBadge({ rp, size = 'sm', showProgress = false, showRp = false, className = '' }: RankBadgeProps) {
  const info = getRankInfo(rp);
  const progress = getDivisionProgress(rp);
  const cfg = SIZE_CONFIG[size];

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <div className="inline-flex items-center gap-1.5">
        <RankIcon info={info} size={cfg.badge} />
        <div className="flex flex-col">
          <span
            className={`font-heading font-bold ${cfg.labelSize} leading-none`}
            style={{ color: info.color }}
          >
            {info.label}
          </span>
          {showRp && (
            <span className={`font-mono ${cfg.rpSize} text-white/40 leading-none mt-0.5`}>
              {rp.toLocaleString()} RP
            </span>
          )}
        </div>
      </div>

      {showProgress && info.tier !== 'Sovereign' && (
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)', width: cfg.badge * 3 }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%`, background: info.gradient }}
          />
        </div>
      )}
    </div>
  );
}

/** Inline chip version — just the badge icon + label in one line, no progress */
export function RankChip({ rp, className = '' }: { rp: number; className?: string }) {
  const info = getRankInfo(rp);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-heading font-bold uppercase tracking-[0.08em] ${className}`}
      style={{
        background: `${info.gradient.replace('linear-gradient(135deg, ', 'linear-gradient(135deg, ').replace(/,\s*[^)]+\)$/, ', transparent)')}`,
        border: `1px solid ${info.border}`,
        color: info.color,
      }}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: info.color, boxShadow: `0 0 6px ${info.glow}` }}
      />
      {info.label}
    </span>
  );
}

/** Large featured rank display for profile page */
export function RankCard({ rp, peakRp }: { rp: number; peakRp?: number }) {
  const info = getRankInfo(rp);
  const progress = getDivisionProgress(rp);
  const progressPct = Math.round(progress * 100);
  const nextDivRp = info.tier === 'Sovereign'
    ? null
    : info.minRp + Math.round((info.maxRp - info.minRp) / 3) * (['III', 'II', 'I'].indexOf(info.division!) + 1);

  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${info.border}`,
        boxShadow: `0 0 40px ${info.glow}18`,
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-20 pointer-events-none"
        style={{ background: info.glow }}
      />

      <div className="relative">
        <p className="text-[9px] font-heading uppercase tracking-[0.28em] text-white/40 mb-3">Rank</p>

        <div className="flex items-center gap-3 mb-4">
          <RankIcon info={info} size={52} />
          <div>
            <p className="font-heading font-black text-2xl leading-none" style={{ color: info.color }}>
              {info.label}
            </p>
            <p className="font-mono text-sm text-white/50 mt-0.5">
              {rp.toLocaleString()} RP
            </p>
          </div>
        </div>

        {info.tier !== 'Sovereign' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
              <span>{info.minRp}</span>
              <span>{progressPct}% to {info.division === 'I' ? 'next tier' : 'next div'}</span>
              <span>{nextDivRp ?? info.maxRp}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%`, background: info.gradient }}
              />
            </div>
          </div>
        )}

        {info.tier === 'Sovereign' && (
          <p className="text-[10px] font-heading uppercase tracking-[0.2em] text-white/50">
            Elite Rank — Top of DUELCHAIN
          </p>
        )}

        {peakRp !== undefined && peakRp > rp && (
          <p className="mt-2 text-[9px] font-mono text-white/30">
            Peak: {peakRp.toLocaleString()} RP ({getRankInfo(peakRp).label})
          </p>
        )}
      </div>
    </div>
  );
}
