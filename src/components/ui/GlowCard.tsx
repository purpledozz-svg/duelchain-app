import { ReactNode, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  glowColor?: 'purple' | 'blue' | 'pink' | 'green' | 'gold';
  hover3d?: boolean;
}

const glowColors = {
  purple: 'rgba(182, 32, 224, 0.4)',
  blue: 'rgba(0, 212, 255, 0.4)',
  pink: 'rgba(255, 0, 110, 0.4)',
  green: 'rgba(0, 255, 136, 0.4)',
  gold: 'rgba(255, 215, 0, 0.4)',
};

export function GlowCard({
  children,
  className = '',
  onClick,
  glowColor = 'purple',
  hover3d = true,
}: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !hover3d) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setRotateX((y - 0.5) * -10);
    setRotateY((x - 0.5) * 10);
    setGlowPosition({ x: x * 100, y: y * 100 });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlowPosition({ x: 50, y: 50 });
  };

  return (
    <div className="perspective-1000" onClick={onClick}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        animate={{
          rotateX: hover3d ? rotateX : 0,
          rotateY: hover3d ? rotateY : 0,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`relative overflow-hidden rounded-2xl bg-glass-strong backdrop-blur-xl border border-glass-border transition-shadow duration-300 hover:shadow-neon ${className}`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${glowPosition.x}% ${glowPosition.y}%, ${glowColors[glowColor]}, transparent 60%)`,
          }}
        />
        <div className="relative z-10">{children}</div>
      </motion.div>
    </div>
  );
}
