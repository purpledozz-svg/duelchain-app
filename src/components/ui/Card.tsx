import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card = ({ children, className = '', hover = false, onClick }: CardProps) => {
  return (
    <div
      onClick={onClick}
      className={`bg-secondary/80 backdrop-blur-xl border border-glass-border rounded-2xl p-6 transition-all duration-300 ${
        hover
          ? 'hover:border-neon-purple/40 hover:shadow-neon cursor-pointer'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
