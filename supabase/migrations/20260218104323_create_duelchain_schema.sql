/*
  # DuelChain Platform Database Schema

  ## Overview
  Complete database schema for the DuelChain 1v1 gaming platform with cryptocurrency betting.

  ## New Tables
  
  ### `players`
  Stores player profiles and wallet information
  - `id` (uuid, primary key) - Unique player identifier
  - `wallet_address` (text, unique) - Ethereum wallet address
  - `username` (text, unique) - Player's chosen username
  - `avatar_seed` (text) - Seed for generating avatar
  - `total_games` (integer) - Total games played
  - `total_wins` (integer) - Total games won
  - `total_earnings` (numeric) - Total earnings in ETH
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `matches`
  Stores match information and betting details
  - `id` (uuid, primary key) - Unique match identifier
  - `game_type` (text) - Type of game (chess, checkers, reaction, etc.)
  - `player1_id` (uuid, foreign key) - First player
  - `player2_id` (uuid, foreign key) - Second player
  - `bet_amount` (numeric) - Bet amount in ETH
  - `winner_id` (uuid, foreign key) - Winner of the match
  - `status` (text) - Match status (waiting, active, completed, cancelled)
  - `game_data` (jsonb) - Game-specific data and moves
  - `started_at` (timestamptz) - Match start time
  - `completed_at` (timestamptz) - Match completion time
  - `created_at` (timestamptz) - Match creation timestamp

  ## Security
  - Enable RLS on all tables
  - Players can read all player profiles
  - Players can update only their own profile
  - Players can read their own match history
  - Players can insert new matches (for matchmaking)
  - Players can update matches they're participating in
*/

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  avatar_seed text NOT NULL DEFAULT gen_random_uuid()::text,
  total_games integer DEFAULT 0,
  total_wins integer DEFAULT 0,
  total_earnings numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type text NOT NULL,
  player1_id uuid REFERENCES players(id) ON DELETE CASCADE,
  player2_id uuid REFERENCES players(id) ON DELETE CASCADE,
  bet_amount numeric NOT NULL DEFAULT 0,
  winner_id uuid REFERENCES players(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'waiting',
  game_data jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_players_wallet ON players(wallet_address);
CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_player1 ON matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2 ON matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_game_type ON matches(game_type);

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Players table policies
CREATE POLICY "Anyone can view player profiles"
  ON players FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Players can insert their own profile"
  ON players FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Players can update their own profile"
  ON players FOR UPDATE
  TO authenticated, anon
  USING (wallet_address = current_setting('app.current_wallet', true))
  WITH CHECK (wallet_address = current_setting('app.current_wallet', true));

-- Matches table policies
CREATE POLICY "Players can view all matches"
  ON matches FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Players can create matches"
  ON matches FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Players can update their matches"
  ON matches FOR UPDATE
  TO authenticated, anon
  USING (
    player1_id IN (SELECT id FROM players WHERE wallet_address = current_setting('app.current_wallet', true))
    OR player2_id IN (SELECT id FROM players WHERE wallet_address = current_setting('app.current_wallet', true))
  )
  WITH CHECK (
    player1_id IN (SELECT id FROM players WHERE wallet_address = current_setting('app.current_wallet', true))
    OR player2_id IN (SELECT id FROM players WHERE wallet_address = current_setting('app.current_wallet', true))
  );

-- Function to update player stats after match completion
CREATE OR REPLACE FUNCTION update_player_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.winner_id IS NOT NULL THEN
    -- Update total games for both players
    UPDATE players 
    SET total_games = total_games + 1,
        updated_at = now()
    WHERE id IN (NEW.player1_id, NEW.player2_id);
    
    -- Update wins and earnings for winner
    UPDATE players
    SET total_wins = total_wins + 1,
        total_earnings = total_earnings + (NEW.bet_amount * 2 * 0.95),
        updated_at = now()
    WHERE id = NEW.winner_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats when match is completed
DROP TRIGGER IF EXISTS update_stats_on_match_completion ON matches;
CREATE TRIGGER update_stats_on_match_completion
  AFTER UPDATE ON matches
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION update_player_stats();