import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface NeonButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  glow?: 'purple' | 'blue' | 'green' | 'gold' | 'coral';
}

const glowShadowMap = {
  purple: 'shadow-[0_0_30px_rgba(124,123,255,0.22)]',
  blue: 'shadow-[0_0_30px_rgba(77,235,255,0.22)]',
  green: 'shadow-[0_0_30px_rgba(56,245,179,0.22)]',
  gold: 'shadow-[0_0_30px_rgba(255,159,67,0.22)]',
  coral: 'shadow-[0_0_30px_rgba(255,95,143,0.22)]',
};

const sizeClasses = {
  sm: 'px-5 py-2.5 text-sm',
  md: 'px-7 py-3.5 text-base',
  lg: 'px-9 py-4 text-base tracking-wider',
};

export function NeonButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  glow = 'blue',
}: NeonButtonProps) {
  const glowShadow = glowShadowMap[glow] ?? glowShadowMap.blue;

  if (variant === 'primary') {
    return (
      <motion.button
        onClick={onClick}
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        className={`group relative overflow-hidden glass-button-primary rounded-lg font-heading font-semibold tracking-wide text-white transition-all duration-300 ${glowShadow} ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      >
        <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
        <span
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background:
              'radial-gradient(120% 80% at 50% 0%, rgba(77,235,255,0.25), transparent 60%)',
          }}
        />
      </motion.button>
    );
  }

  if (variant === 'outline') {
    return (
      <motion.button
        onClick={onClick}
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        className={`relative rounded-lg font-heading font-semibold tracking-wide text-white glass-button-secondary transition-all duration-300 ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={`font-heading font-medium tracking-wide text-text-secondary hover:text-text-primary transition-colors duration-300 ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {children}
    </motion.button>
  );
}
