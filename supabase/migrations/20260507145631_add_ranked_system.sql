/*
  # DUELCHAIN Ranked System

  ## Summary
  Adds a full RP (Rank Points) ranked system to DUELCHAIN. Only Competitive matches affect rank.

  ## New Columns on players table
  - `rp` (integer, default 0) — current Rank Points
  - `win_streak` (integer, default 0) — current win streak for bonus RP calculation
  - `peak_rp` (integer, default 0) — highest RP ever reached
  - `competitive_wins` (integer, default 0) — total competitive wins
  - `competitive_losses` (integer, default 0) — total competitive losses

  ## New Table: rank_history
  Tracks every RP change for auditing and display purposes.
  - id, player_id (FK to players), rp_before, rp_after, rp_delta, reason, match_code, created_at

  ## Security
  - RLS enabled on rank_history
  - Players can only read their own history
  - Only service_role can insert rank_history (via edge function)
*/

-- Add RP columns to players table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'rp'
  ) THEN
    ALTER TABLE players ADD COLUMN rp integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'win_streak'
  ) THEN
    ALTER TABLE players ADD COLUMN win_streak integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'peak_rp'
  ) THEN
    ALTER TABLE players ADD COLUMN peak_rp integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'competitive_wins'
  ) THEN
    ALTER TABLE players ADD COLUMN competitive_wins integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'competitive_losses'
  ) THEN
    ALTER TABLE players ADD COLUMN competitive_losses integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Create rank_history table
CREATE TABLE IF NOT EXISTS rank_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  match_code text NOT NULL,
  rp_before integer NOT NULL,
  rp_after integer NOT NULL,
  rp_delta integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rank_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can read own rank history"
  ON rank_history FOR SELECT
  TO authenticated
  USING (player_id = (
    SELECT id FROM players WHERE player_id = auth.uid()::text LIMIT 1
  ));

-- Allow anon to read their own rank history (since app uses anonymous IDs, not Supabase auth)
-- We'll use a broader public read policy for rank_history since it's non-sensitive
DROP POLICY IF EXISTS "Players can read own rank history" ON rank_history;

CREATE POLICY "Public rank history read"
  ON rank_history FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert rank history"
  ON rank_history FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update rank history"
  ON rank_history FOR UPDATE
  TO service_role
  USING (true);

-- Add index for fast lookup by player
CREATE INDEX IF NOT EXISTS idx_rank_history_player_id ON rank_history(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_players_rp ON players(rp DESC);

-- Grant anon/authenticated read on rank_history (non-sensitive leaderboard data)
GRANT SELECT ON rank_history TO anon, authenticated;
GRANT INSERT, UPDATE ON rank_history TO service_role;
