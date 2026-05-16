import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
}: ButtonProps) => {
  const sizeClasses = {
    sm: 'px-5 py-2.5 text-sm',
    md: 'px-7 py-3.5 text-base',
    lg: 'px-10 py-5 text-lg',
  };

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-neon-purple to-neon-blue text-white shadow-neon hover:shadow-neon-strong',
    secondary:
      'bg-elevated border border-glass-border text-white hover:bg-secondary',
    outline:
      'bg-transparent border border-neon-purple/40 text-neon-blue hover:border-neon-blue/60 hover:shadow-neon-blue',
    ghost:
      'bg-transparent border border-glass-border text-text-secondary hover:text-text-primary hover:border-glass-border',
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      className={`font-heading font-semibold rounded-xl transition-all duration-300 ${variantClasses[variant]} ${sizeClasses[size]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
    >
      {children}
    </motion.button>
  );
};
