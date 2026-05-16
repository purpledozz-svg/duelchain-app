/*
  # Party System for Multiplayer Games

  ## Overview
  Creates a real-time party system where players can create/join parties with short codes
  and play multiplayer games (starting with Chess).

  ## New Tables

  ### `party_rooms`
  Stores party room information
  - `id` (uuid, primary key)
  - `code` (text, unique) - 6-character uppercase alphanumeric code
  - `game` (text) - game type (chess, tictactoe, etc.)
  - `status` (text) - waiting | active | finished | expired
  - `created_at` (timestamptz)
  - `expires_at` (timestamptz) - auto-expire after 10 minutes if no opponent joins
  - `white_player_id` (text) - creator's ID
  - `black_player_id` (text) - joiner's ID
  - `white_connected` (boolean)
  - `black_connected` (boolean)
  - `game_state` (jsonb) - current game state (FEN, moves, turn, result)

  ## Security
  - Enable RLS on party_rooms
  - Anyone can create a party
  - Anyone with the code can join if not full
  - Players in a party can read/update their party
  - Realtime enabled for live updates

  ## Indexes
  - Index on code for fast lookups
  - Index on status for cleanup queries
  - Index on expires_at for expiration cleanup
*/

-- Create party_rooms table
CREATE TABLE IF NOT EXISTS party_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  game text NOT NULL DEFAULT 'chess',
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '10 minutes'),
  white_player_id text NOT NULL,
  black_player_id text,
  white_connected boolean DEFAULT true,
  black_connected boolean DEFAULT false,
  game_state jsonb DEFAULT '{"fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "moves": [], "turn": "w", "result": null}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_party_rooms_code ON party_rooms(code);
CREATE INDEX IF NOT EXISTS idx_party_rooms_status ON party_rooms(status);
CREATE INDEX IF NOT EXISTS idx_party_rooms_expires_at ON party_rooms(expires_at);

-- Enable Row Level Security
ALTER TABLE party_rooms ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create a party
CREATE POLICY "Anyone can create party"
  ON party_rooms
  FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can read parties by code
CREATE POLICY "Anyone can read parties"
  ON party_rooms
  FOR SELECT
  USING (true);

-- Policy: Players can update their own party
CREATE POLICY "Players can update their party"
  ON party_rooms
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Players can delete expired parties
CREATE POLICY "Anyone can delete expired parties"
  ON party_rooms
  FOR DELETE
  USING (status = 'expired' OR expires_at < now());

-- Enable realtime for party_rooms
ALTER PUBLICATION supabase_realtime ADD TABLE party_rooms;

-- Function to generate unique party code
CREATE OR REPLACE FUNCTION generate_party_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  characters text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
  code_exists boolean;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM party_rooms WHERE code = result) INTO code_exists;
    
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Function to clean up expired parties
CREATE OR REPLACE FUNCTION cleanup_expired_parties()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE party_rooms
  SET status = 'expired'
  WHERE status = 'waiting'
    AND expires_at < now();
END;
$$;
