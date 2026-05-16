import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface PlayerTimerProps {
  initialTime: number;
  isActive: boolean;
  onTimeout: () => void;
  playerName: string;
  isCurrentTurn: boolean;
}

export default function PlayerTimer({
  initialTime,
  isActive,
  onTimeout,
  playerName,
  isCurrentTurn
}: PlayerTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    setTimeLeft(initialTime);
  }, [initialTime]);

  useEffect(() => {
    if (!isActive || !isCurrentTurn) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isCurrentTurn, onTimeout]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isLowTime = timeLeft < 30;

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg transition-all
        ${isCurrentTurn ? 'bg-gradient-to-r from-[#F0B429]/20 to-[#D4A017]/20 ring-2 ring-[#F0B429]' : 'bg-white/5'}
        ${isLowTime && isCurrentTurn ? 'animate-pulse' : ''}
      `}
    >
      <Clock className={`w-5 h-5 ${isCurrentTurn ? 'text-[#F0B429]' : 'text-gray-400'}`} />
      <div className="flex-1">
        <div className="text-sm text-gray-400">{playerName}</div>
        <div
          className={`
            text-2xl font-mono font-bold
            ${isLowTime && isCurrentTurn ? 'text-red-400' : isCurrentTurn ? 'text-[#F0B429]' : 'text-white'}
          `}
        >
          {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
      </div>
    </div>
  );
}
