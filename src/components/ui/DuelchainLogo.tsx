interface DuelchainLogoProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

export function DuelchainLogo({ size = 40, className = '', glow = true }: DuelchainLogoProps) {
  return (
    <img
      src="/LOGO_DUELCHAIN.png"
      alt="DUELCHAIN"
      width={size}
      height={size}
      draggable={false}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        flexShrink: 0,
        display: 'block',
        filter: glow ? 'drop-shadow(0 0 10px rgba(196,45,255,0.35))' : 'none',
      }}
    />
  );
}
