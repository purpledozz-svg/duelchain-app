/*
  # Enhance Existing Schema for V2 Features

  ## Changes
  1. Add missing columns to players table:
     - total_losses, total_wagered_usd, total_earned_usd
     - biggest_win tracking fields
  
  2. Add missing columns to matches table:
     - currency, bet_in_token, bet_amount_usd, prize_amount, tx_hash
  
  3. Update game_stats with unique constraint
  
  4. Update policies to be less restrictive for public data
*/

-- Add columns to players table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'total_losses'
  ) THEN
    ALTER TABLE players ADD COLUMN total_losses int DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'total_wagered_usd'
  ) THEN
    ALTER TABLE players ADD COLUMN total_wagered_usd numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'total_earned_usd'
  ) THEN
    ALTER TABLE players ADD COLUMN total_earned_usd numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'biggest_win_amount'
  ) THEN
    ALTER TABLE players ADD COLUMN biggest_win_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'biggest_win_currency'
  ) THEN
    ALTER TABLE players ADD COLUMN biggest_win_currency text DEFAULT 'ETH';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'biggest_win_game'
  ) THEN
    ALTER TABLE players ADD COLUMN biggest_win_game text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'biggest_win_date'
  ) THEN
    ALTER TABLE players ADD COLUMN biggest_win_date timestamptz;
  END IF;
END $$;

-- Add columns to matches table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'currency'
  ) THEN
    ALTER TABLE matches ADD COLUMN currency text DEFAULT 'ETH';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'bet_in_token'
  ) THEN
    ALTER TABLE matches ADD COLUMN bet_in_token numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'bet_amount_usd'
  ) THEN
    ALTER TABLE matches ADD COLUMN bet_amount_usd numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'prize_amount'
  ) THEN
    ALTER TABLE matches ADD COLUMN prize_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'tx_hash'
  ) THEN
    ALTER TABLE matches ADD COLUMN tx_hash text;
  END IF;
END $$;

-- Drop existing restrictive policies and create public read policies
DROP POLICY IF EXISTS "Players can view all profiles" ON players;
DROP POLICY IF EXISTS "Players can update own profile" ON players;
DROP POLICY IF EXISTS "Players can view all matches" ON matches;
DROP POLICY IF EXISTS "Players can create matches" ON matches;
DROP POLICY IF EXISTS "Players can update matches they're in" ON matches;

-- New permissive policies for players
CREATE POLICY "Anyone can read player profiles"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create player profiles"
  ON players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update player profiles"
  ON players FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- New permissive policies for matches
CREATE POLICY "Anyone can read matches"
  ON matches FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create matches"
  ON matches FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update matches"
  ON matches FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Update game_stats policies
DROP POLICY IF EXISTS "Anyone can view game stats" ON game_stats;

CREATE POLICY "Anyone can read game stats"
  ON game_stats FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create game stats"
  ON game_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update game stats"
  ON game_stats FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Update monthly_prizes policies
DROP POLICY IF EXISTS "Anyone can view prizes" ON monthly_prizes;

CREATE POLICY "Anyone can read monthly prizes"
  ON monthly_prizes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create monthly prizes"
  ON monthly_prizes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update monthly prizes"
  ON monthly_prizes FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Add unique constraint to game_stats if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'game_stats_unique_player_game_month'
  ) THEN
    ALTER TABLE game_stats 
    ADD CONSTRAINT game_stats_unique_player_game_month 
    UNIQUE (player_id, game_type, month);
  END IF;
END $$;
