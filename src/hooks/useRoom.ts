import { useState, useCallback } from 'react';

export interface Room {
  id: string;
  code: string;
  game: string;
  type: 'private' | 'public';
  bracket?: string;
  player1: {
    wallet: string;
    betAmount: number;
    currency: string;
  };
  player2?: {
    wallet: string;
    betAmount: number;
    currency: string;
  };
  alignedBet?: number;
  status: 'waiting' | 'ready' | 'playing' | 'finished';
}

export interface BetSummary {
  yourBet: number;
  opponentBet: number;
  totalPot: number;
  platformFee: number;
  potentialWin: number;
  potentialLoss: number;
  currency: string;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array(6)
    .fill(0)
    .map(() => chars[Math.floor(Math.random() * chars.length)])
    .join('');
}

export function calculateBetSummary(
  yourBet: number,
  opponentBet: number,
  currency: string = 'ETH'
): BetSummary {
  const alignedBet = Math.min(yourBet, opponentBet);
  const totalPot = alignedBet * 2;
  const platformFee = totalPot * 0.05;
  const potentialWin = totalPot - platformFee;
  const potentialLoss = alignedBet;

  return {
    yourBet: alignedBet,
    opponentBet: alignedBet,
    totalPot,
    platformFee,
    potentialWin,
    potentialLoss,
    currency
  };
}

export const useRoom = () => {
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRoom = useCallback(async (
    game: string,
    betAmount: number,
    currency: string,
    wallet: string
  ): Promise<{ roomId: string; code: string } | null> => {
    setIsCreating(true);
    setError(null);

    try {
      const code = generateRoomCode();
      const room: Room = {
        id: `room_${Date.now()}`,
        code,
        game,
        type: 'private',
        player1: { wallet, betAmount, currency },
        status: 'waiting'
      };

      setCurrentRoom(room);
      setIsCreating(false);

      return { roomId: room.id, code: room.code };
    } catch (e) {
      setError('Failed to create room');
      setIsCreating(false);
      return null;
    }
  }, []);

  const joinRoom = useCallback(async (
    _code: string,
    _betAmount: number,
    _currency: string,
    _wallet: string
  ): Promise<boolean> => {
    setIsJoining(true);
    setError(null);

    try {
      // In a real implementation, this would call the server
      // For now, simulate finding a room
      await new Promise(resolve => setTimeout(resolve, 500));

      setIsJoining(false);
      return true;
    } catch (e) {
      setError('Failed to join room. Invalid or expired code.');
      setIsJoining(false);
      return false;
    }
  }, []);

  const cancelRoom = useCallback(() => {
    setCurrentRoom(null);
    setError(null);
  }, []);

  return {
    currentRoom,
    isCreating,
    isJoining,
    error,
    createRoom,
    joinRoom,
    cancelRoom
  };
};
