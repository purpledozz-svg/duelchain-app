import { useState, useCallback } from 'react';

export type BetBracket = 'casual' | 'beginner' | 'standard' | 'pro' | 'elite' | 'whale';

export interface BracketInfo {
  id: BetBracket;
  label: string;
  maxBet: number;
  usdValue: string;
  queueCount: number;
}

export const BET_BRACKETS: BracketInfo[] = [
  { id: 'casual', label: 'Casual', maxBet: 0.002, usdValue: '~$6', queueCount: 12 },
  { id: 'beginner', label: 'Beginner', maxBet: 0.01, usdValue: '~$33', queueCount: 28 },
  { id: 'standard', label: 'Standard', maxBet: 0.05, usdValue: '~$164', queueCount: 34 },
  { id: 'pro', label: 'Pro', maxBet: 0.1, usdValue: '~$328', queueCount: 8 },
  { id: 'elite', label: 'Elite', maxBet: 0.5, usdValue: '~$1,640', queueCount: 2 },
  { id: 'whale', label: 'Whale', maxBet: 1.0, usdValue: '~$3,280', queueCount: 0 }
];

export interface MatchmakingState {
  isSearching: boolean;
  timeElapsed: number;
  roomId: string | null;
  queuePosition: number;
}

export const useMatchmaking = () => {
  const [state, setState] = useState<MatchmakingState>({
    isSearching: false,
    timeElapsed: 0,
    roomId: null,
    queuePosition: 0
  });

  const startMatchmaking = useCallback(async (
    _game: string,
    _bracket: BetBracket,
    _betAmount: number,
    _currency: string,
    _wallet: string
  ): Promise<boolean> => {
    setState({
      isSearching: true,
      timeElapsed: 0,
      roomId: `room_${Date.now()}`,
      queuePosition: 1
    });

    // Simulate matchmaking (in real app, this would use Socket.IO)
    return true;
  }, []);

  const cancelMatchmaking = useCallback(() => {
    setState({
      isSearching: false,
      timeElapsed: 0,
      roomId: null,
      queuePosition: 0
    });
  }, []);

  return {
    matchmakingState: state,
    startMatchmaking,
    cancelMatchmaking,
    getBracketInfo: (bracketId: BetBracket) => BET_BRACKETS.find(b => b.id === bracketId)
  };
};
