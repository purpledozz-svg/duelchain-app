export type GameType = 'chess' | 'connect-four' | 'tictactoe' | 'tic-tac-toe' | 'rps' | 'reaction' | 'stop-it' | 'flappy-duel' | 'stop-at-10' | 'hot-potato';

export interface Player {
  id: string;
  player_id: string | null;
  wallet_address: string | null;
  username: string;
  username_lower: string;
  bio: string;
  avatar_seed: string | null;
  avatar_url: string | null;
  total_games: number;
  total_wins: number;
  total_losses?: number;
  total_earnings: number;
  total_earned_usd: number;
  rp: number;
  peak_rp: number;
  win_streak: number;
  competitive_wins: number;
  competitive_losses: number;
  created_at: string;
  updated_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
}

export interface Match {
  id: string;
  game_type: GameType;
  player1_id: string;
  player2_id: string;
  bet_amount: number;
  winner_id: string | null;
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  game_data: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface GameInfo {
  id: GameType;
  name: string;
  description: string;
  icon: string;
  minPlayers: number;
  maxPlayers: number;
  estimatedTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface MatchWithPlayers extends Match {
  player1?: Player;
  player2?: Player;
  winner?: Player;
}
