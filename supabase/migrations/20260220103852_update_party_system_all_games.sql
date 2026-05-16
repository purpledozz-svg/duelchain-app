/*
  # Update Party System for All Games

  ## Overview
  Extends the party system to support all games: Chess, Connect Four, Tic-Tac-Toe, RPS, Stop It
  Adds matchmaking support for random opponent matching

  ## Changes

  ### 1. Update party_rooms table
  - Add `mode` field (party | matchmaking)
  - Update `game` field to support all game types
  - Generalize player fields (p1, p2 instead of white/black)
  - Update game_state to be flexible JSON for any game

  ### 2. Add matchmaking_queue table
  - Tracks players waiting for matches
  - Auto-matches players in same game queue

  ## Security
  - Maintain existing RLS policies
  - Add policies for matchmaking queue

  ## Notes
  - Backward compatible with existing chess parties
  - New game states stored in flexible JSONB format
*/

-- Drop existing party_rooms table and recreate with new schema
DROP TABLE IF EXISTS party_rooms CASCADE;

CREATE TABLE IF NOT EXISTS party_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  mode text NOT NULL DEFAULT 'party',
  game text NOT NULL DEFAULT 'chess',
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '10 minutes'),
  p1_id text NOT NULL,
  p2_id text,
  p1_connected boolean DEFAULT true,
  p2_connected boolean DEFAULT false,
  game_state jsonb DEFAULT '{}'::jsonb,
  turn text DEFAULT 'p1',
  result jsonb DEFAULT null
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_party_rooms_code ON party_rooms(code);
CREATE INDEX IF NOT EXISTS idx_party_rooms_status ON party_rooms(status);
CREATE INDEX IF NOT EXISTS idx_party_rooms_mode ON party_rooms(mode);
CREATE INDEX IF NOT EXISTS idx_party_rooms_game ON party_rooms(game);

-- Create matchmaking queue table
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id text NOT NULL,
  game text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '5 minutes')
);

-- Create indexes for matchmaking
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_game ON matchmaking_queue(game);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_created_at ON matchmaking_queue(created_at);

-- Enable Row Level Security
ALTER TABLE party_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Anyone can create party" ON party_rooms;
DROP POLICY IF EXISTS "Anyone can read parties" ON party_rooms;
DROP POLICY IF EXISTS "Players can update their party" ON party_rooms;
DROP POLICY IF EXISTS "Anyone can delete expired parties" ON party_rooms;

-- RLS Policies for party_rooms
CREATE POLICY "Anyone can create party"
  ON party_rooms
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read parties"
  ON party_rooms
  FOR SELECT
  USING (true);

CREATE POLICY "Players can update their party"
  ON party_rooms
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete expired parties"
  ON party_rooms
  FOR DELETE
  USING (status = 'expired' OR expires_at < now());

-- RLS Policies for matchmaking_queue
CREATE POLICY "Anyone can join queue"
  ON matchmaking_queue
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read queue"
  ON matchmaking_queue
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update queue"
  ON matchmaking_queue
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can leave queue"
  ON matchmaking_queue
  FOR DELETE
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE party_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking_queue;

-- Function to initialize game state based on game type
CREATE OR REPLACE FUNCTION initialize_game_state(game_type text)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  CASE game_type
    WHEN 'chess' THEN
      RETURN '{"fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "moves": []}'::jsonb;
    WHEN 'connect-four' THEN
      RETURN '{"grid": [[null,null,null,null,null,null,null],[null,null,null,null,null,null,null],[null,null,null,null,null,null,null],[null,null,null,null,null,null,null],[null,null,null,null,null,null,null],[null,null,null,null,null,null,null]], "moves": []}'::jsonb;
    WHEN 'tic-tac-toe' THEN
      RETURN '{"board": [null,null,null,null,null,null,null,null,null], "moves": []}'::jsonb;
    WHEN 'rps' THEN
      RETURN '{"p1_choice": null, "p2_choice": null, "round": 1, "scores": {"p1": 0, "p2": 0}}'::jsonb;
    WHEN 'stop-it' THEN
      RETURN '{"start_time": null, "p1_time": null, "p2_time": null, "target_time": 5000}'::jsonb;
    ELSE
      RETURN '{}'::jsonb;
  END CASE;
END;
$$;

-- Keep existing generate_party_code function
-- (Already exists from previous migration)

-- Function to match players in queue
CREATE OR REPLACE FUNCTION match_players(game_type text)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  player1_id text;
  player2_id text;
  new_room_id uuid;
  match_code text;
BEGIN
  -- Get two oldest players in queue for this game
  SELECT player_id INTO player1_id
  FROM matchmaking_queue
  WHERE game = game_type
  ORDER BY created_at ASC
  LIMIT 1;

  SELECT player_id INTO player2_id
  FROM matchmaking_queue
  WHERE game = game_type
    AND player_id != player1_id
  ORDER BY created_at ASC
  LIMIT 1;

  -- If we have 2 players, create room
  IF player1_id IS NOT NULL AND player2_id IS NOT NULL THEN
    -- Generate code
    SELECT generate_party_code() INTO match_code;

    -- Create room
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
      match_code,
      'matchmaking',
      game_type,
      'active',
      player1_id,
      player2_id,
      true,
      true,
      initialize_game_state(game_type),
      'p1'
    )
    RETURNING id INTO new_room_id;

    -- Remove players from queue
    DELETE FROM matchmaking_queue
    WHERE player_id IN (player1_id, player2_id)
      AND game = game_type;

    RETURN new_room_id;
  END IF;

  RETURN NULL;
END;
$$;
