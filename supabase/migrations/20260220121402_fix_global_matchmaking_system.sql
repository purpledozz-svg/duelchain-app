/*
  # Fix Global Matchmaking System

  ## Overview
  Implements robust global matchmaking with heartbeat, TTL cleanup,
  atomic matching, and queue observability.

  ## Changes

  ### 1. Add heartbeat column to matchmaking_queue
  - `last_seen_at` for heartbeat tracking
  - Allows automatic cleanup of stale entries

  ### 2. Improve match_players function
  - Atomic matching with SELECT FOR UPDATE SKIP LOCKED
  - Prevents race conditions
  - Returns match info for both players

  ### 3. Add cleanup functions
  - `cleanup_stale_queue_entries()` - removes entries older than 30s
  - `get_queue_counts()` - returns waiting players per game

  ### 4. Add automatic trigger for heartbeat updates
  - Updates last_seen_at on queue entry updates

  ## Security
  - RLS policies maintained
  - All operations are atomic
*/

-- Add last_seen_at column for heartbeat
ALTER TABLE matchmaking_queue 
ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();

-- Add index for efficient cleanup and matching
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_game_created 
ON matchmaking_queue(game, created_at);

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_last_seen 
ON matchmaking_queue(last_seen_at);

-- Update last_seen_at trigger
CREATE OR REPLACE FUNCTION update_matchmaking_heartbeat()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS matchmaking_heartbeat_trigger ON matchmaking_queue;
CREATE TRIGGER matchmaking_heartbeat_trigger
  BEFORE UPDATE ON matchmaking_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_matchmaking_heartbeat();

-- Cleanup stale queue entries (older than 30 seconds)
CREATE OR REPLACE FUNCTION cleanup_stale_queue_entries()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM matchmaking_queue
  WHERE last_seen_at < now() - interval '30 seconds';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Get queue counts per game
CREATE OR REPLACE FUNCTION get_queue_counts()
RETURNS TABLE (
  game_id text,
  player_count bigint
)
LANGUAGE sql
AS $$
  SELECT 
    game,
    COUNT(*) as player_count
  FROM matchmaking_queue
  WHERE last_seen_at >= now() - interval '30 seconds'
  GROUP BY game;
$$;

-- Improved atomic match_players function
DROP FUNCTION IF EXISTS match_players(text);

CREATE OR REPLACE FUNCTION match_players(game_type text)
RETURNS TABLE (
  match_id uuid,
  match_code text,
  player1_id text,
  player2_id text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_player1_id text;
  v_player2_id text;
  v_match_id uuid;
  v_match_code text;
  v_game_state jsonb;
BEGIN
  -- Clean up stale entries first
  PERFORM cleanup_stale_queue_entries();
  
  -- Select two players atomically (prevents race conditions)
  SELECT q.player_id INTO v_player1_id
  FROM matchmaking_queue q
  WHERE q.game = game_type
    AND q.last_seen_at >= now() - interval '30 seconds'
  ORDER BY q.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  -- If no first player, exit
  IF v_player1_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Select second player (different from first)
  SELECT q.player_id INTO v_player2_id
  FROM matchmaking_queue q
  WHERE q.game = game_type
    AND q.player_id != v_player1_id
    AND q.last_seen_at >= now() - interval '30 seconds'
  ORDER BY q.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  -- If no second player, exit
  IF v_player2_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Generate unique code
  v_match_code := generate_party_code();
  
  -- Get initial game state
  v_game_state := initialize_game_state(game_type);
  
  -- Create match room
  INSERT INTO party_rooms (
    code,
    mode,
    game,
    status,
    p1_id,
    p2_id,
    p1_connected,
    p2_connected,
    game_state,
    turn
  ) VALUES (
    v_match_code,
    'matchmaking',
    game_type,
    'active',
    v_player1_id,
    v_player2_id,
    true,
    true,
    v_game_state,
    'p1'
  )
  RETURNING id INTO v_match_id;
  
  -- Remove both players from queue atomically
  DELETE FROM matchmaking_queue
  WHERE player_id IN (v_player1_id, v_player2_id)
    AND game = game_type;
  
  -- Return match info
  RETURN QUERY SELECT 
    v_match_id,
    v_match_code,
    v_player1_id,
    v_player2_id;
END;
$$;

-- Function to update heartbeat
CREATE OR REPLACE FUNCTION update_queue_heartbeat(p_player_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE matchmaking_queue
  SET last_seen_at = now()
  WHERE player_id = p_player_id;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION match_players(text) IS 
'Atomically matches two players in queue for the same game. Uses row locking to prevent race conditions.';

COMMENT ON FUNCTION cleanup_stale_queue_entries() IS 
'Removes queue entries with last_seen_at older than 30 seconds. Should be called periodically.';

COMMENT ON FUNCTION get_queue_counts() IS 
'Returns the number of active players waiting in queue per game.';

COMMENT ON FUNCTION update_queue_heartbeat(text) IS 
'Updates the last_seen_at timestamp for a player in queue to keep them active.';
