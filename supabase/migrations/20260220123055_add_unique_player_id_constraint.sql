/*
  # Add Unique Constraint to player_id

  ## Problem
  The `joinMatchmaking` function uses `upsert` with `onConflict: 'player_id'`,
  but there was no unique constraint on the `player_id` column, causing
  "Failed to join matchmaking" errors.

  ## Solution
  Add a unique constraint to the `player_id` column to enable upsert functionality.
  This ensures a player can only be in the queue once.

  ## Changes
  - Add unique constraint on `matchmaking_queue.player_id`
  - This allows upsert to work correctly when a player rejoins
*/

-- Add unique constraint to player_id
ALTER TABLE matchmaking_queue 
ADD CONSTRAINT matchmaking_queue_player_id_unique UNIQUE (player_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT matchmaking_queue_player_id_unique ON matchmaking_queue IS 
'Ensures a player can only be in the matchmaking queue once. Required for upsert operations.';
