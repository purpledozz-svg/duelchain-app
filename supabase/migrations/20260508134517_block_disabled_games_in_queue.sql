/*
  # Block disabled games from matchmaking queue

  1. Changes
    - Deletes any existing queue rows with disabled games (reaction, rps, stop-it)
    - Adds a CHECK constraint on matchmaking_queue.game to only allow enabled multiplayer games
    - Deletes any party_rooms in matchmaking mode with disabled games and marks them cancelled

  2. Enabled games for matchmaking
    - chess
    - connect-four
    - tictactoe (also tic-tac-toe alias)

  3. Notes
    - Reaction and RPS are not yet implemented; any rows with these game IDs are invalid
    - The SQL matchmake_player function already draws only from ['chess','connect-four','tictactoe']
    - This migration adds a DB-level safety net so no invalid rows can enter the queue
*/

-- Delete stale queue rows for disabled games
DELETE FROM public.matchmaking_queue
WHERE game IN ('reaction', 'rps', 'stop-it', 'flappy-duel', 'stop-at-10', 'hot-potato');

-- Add check constraint to prevent future invalid inserts
ALTER TABLE public.matchmaking_queue
  DROP CONSTRAINT IF EXISTS matchmaking_queue_game_enabled;

ALTER TABLE public.matchmaking_queue
  ADD CONSTRAINT matchmaking_queue_game_enabled
  CHECK (game IN ('chess', 'connect-four', 'tictactoe', 'tic-tac-toe'));

-- Cancel any matchmaking party_rooms that were created with disabled games
UPDATE public.party_rooms
SET status = 'expired'
WHERE mode = 'matchmaking'
  AND game IN ('reaction', 'rps', 'stop-it', 'flappy-duel', 'stop-at-10', 'hot-potato')
  AND status IN ('waiting', 'active');
